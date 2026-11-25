import json
import logging
import math
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models import DailyBreakdown, DailySummary, Movie
from app.services.seed_data import build_breakdowns_for_day
from app.utils.currency import parse_inr

logger = logging.getLogger(__name__)

CRORE = 10_000_000.0

SACNILK_SOURCES = [
    "https://www.sacnilk.com/entertainmenttopbar/Top_100_Indian_Movies_(India_Net_Collection)",
    "https://www.sacnilk.com/entertainmenttopbar/RecentMoviesCollection",
]

LANGUAGE_MAP = {
    "hindi": ["Hindi"],
    "telugu": ["Telugu", "Hindi"],
    "tamil": ["Tamil", "Hindi"],
    "malayalam": ["Malayalam", "Tamil"],
    "kannada": ["Kannada", "Hindi"],
    "marathi": ["Marathi"],
    "punjabi": ["Punjabi"],
    "bengali": ["Bengali"],
    "gujarati": ["Gujarati"],
    "english": ["English", "Hindi"],
}

INDUSTRY_GENRE_DEFAULTS = {
    "Bollywood": ["Drama", "Action"],
    "Tollywood": ["Action", "Drama"],
    "Kollywood": ["Action", "Thriller"],
    "Mollywood": ["Drama", "Thriller"],
    "Sandalwood": ["Action", "Drama"],
    "Marathi": ["Drama", "Social"],
    "Pollywood": ["Comedy", "Drama"],
    "Hollywood": ["Action", "Sci-Fi"],
}


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:180] or "movie"


def _parse_release_date(sub_text: str) -> date:
    match = re.search(r"released\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})", sub_text, re.I)
    if match:
        raw = match.group(1)
        for fmt in ("%d %b %Y", "%d %B %Y"):
            try:
                return datetime.strptime(raw, fmt).date()
            except ValueError:
                continue
    return date(2026, 1, 1)


def _generate_daily_curve(
    total_gross_inr: float,
    num_days: int,
    release_dt: date,
    is_live: bool,
    live_day_gross_inr: Optional[float] = None,
) -> list[tuple[int, str, date, float, float, int, int, int, float, bool]]:
    """Generate a realistic theatrical decay curve whose sum equals total_gross_inr."""
    num_days = max(1, min(num_days, 45))
    if total_gross_inr <= 0:
        total_gross_inr = 12.0 * CRORE

    # Exponential + weekend bounce weights
    weights: list[float] = []
    for d in range(1, num_days + 1):
        base = math.exp(-0.14 * (d - 1))
        # Weekend bumps around days 3,4, 10,11, 17,18
        if d % 7 in (3, 4):
            base *= 1.32
        weights.append(base)

    if live_day_gross_inr and num_days > 1 and live_day_gross_inr < total_gross_inr * 0.9:
        remaining_total = max(CRORE * 0.2, total_gross_inr - live_day_gross_inr)
        prefix_w = sum(weights[:-1]) or 1.0
        grosses = [round(remaining_total * (w / prefix_w), 2) for w in weights[:-1]]
        grosses.append(round(live_day_gross_inr, 2))
    else:
        total_w = sum(weights) or 1.0
        grosses = [round(total_gross_inr * (w / total_w), 2) for w in weights]

    days_out = []
    base_atp = 265.0 if total_gross_inr >= 100 * CRORE else 225.0 if total_gross_inr >= 20 * CRORE else 185.0
    base_shows = 12500 if total_gross_inr >= 150 * CRORE else 6200 if total_gross_inr >= 30 * CRORE else 2800

    for idx, g_inr in enumerate(grosses):
        day_num = idx + 1
        dt = release_dt + timedelta(days=idx)
        atp = round(max(140.0, base_atp - idx * 1.8), 0)
        shows = max(180, int(base_shows * math.exp(-0.045 * idx)))
        theatres = max(60, int(shows / 4.1))
        cities = max(25, min(480, int(theatres / 7.5)))
        occ = round(max(12.0, min(94.0, 82.0 * math.exp(-0.055 * idx) + (8.0 if day_num % 7 in (3, 4) else 0.0))), 1)
        day_is_live = is_live and (day_num == num_days)
        days_out.append((day_num, f"Day {day_num}", dt, g_inr, atp, shows, theatres, cities, occ, day_is_live))

    return days_out


def materialize_breakdowns_for_summary(movie: Movie, summary: DailySummary, db: Session) -> list[DailyBreakdown]:
    existing = (
        db.query(DailyBreakdown)
        .filter(DailyBreakdown.movie_id == movie.id, DailyBreakdown.day_number == summary.day_number)
        .order_by(DailyBreakdown.gross_inr.desc())
        .all()
    )
    if existing:
        return existing

    langs = json.loads(movie.languages_json or '["Hindi"]')
    if len(langs) == 1:
        lang_weights = [(langs[0], 1.0)]
    elif len(langs) == 2:
        lang_weights = [(langs[0], 0.72), (langs[1], 0.28)]
    else:
        first = 0.52
        rest = 0.48 / (len(langs) - 1)
        lang_weights = [(langs[0], first)] + [(l, round(rest, 3)) for l in langs[1:]]

    rows = build_breakdowns_for_day(
        movie_id=movie.id,
        day_number=summary.day_number,
        gross_inr=summary.gross_inr,
        tickets_sold=summary.tickets_sold,
        shows=summary.shows,
        atp_inr=summary.atp_inr,
        occupancy_pct=summary.occupancy_pct,
        fast_filling=summary.fast_filling,
        housefull=summary.housefull,
        lang_weights=lang_weights,
    )
    db.add_all(rows)
    db.commit()
    return (
        db.query(DailyBreakdown)
        .filter(DailyBreakdown.movie_id == movie.id, DailyBreakdown.day_number == summary.day_number)
        .order_by(DailyBreakdown.gross_inr.desc())
        .all()
    )


def sync_sacnilk_catalog(db: Session, max_movies: int = 120) -> dict[str, int]:
    """Fetch Top 100 & Recent Indian Box Office movies from Sacnilk and upsert into DB."""
    added = 0
    updated = 0
    seen_slugs: set[str] = set()
    now = datetime.now(timezone.utc)

    parsed_items: list[dict[str, Any]] = []

    with httpx.Client(timeout=15.0, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
        for url in SACNILK_SOURCES:
            try:
                resp = client.get(url)
                resp.raise_for_status()
            except Exception as exc:
                logger.warning("Failed fetching catalog source %s: %s", url, exc)
                continue

            soup = BeautifulSoup(resp.text, "html.parser")
            for tr in soup.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) < 4:
                    continue
                link = tr.find("a", href=True)
                if not link:
                    continue
                title = link.get_text(" ", strip=True)
                if not title or len(title) < 2:
                    continue

                slug = slugify(title)
                if slug in seen_slugs:
                    continue
                seen_slugs.add(slug)

                sub_el = tr.find("span", class_="sub")
                sub_text = sub_el.get_text(" ", strip=True) if sub_el else "Hindi · Bollywood"
                parts = [p.strip() for p in sub_text.split("·")]
                primary_lang = parts[0] if parts else "Hindi"
                industry = parts[1] if len(parts) > 1 else "Bollywood"

                # Skip pure non-Indian Hollywood unless it's tracked; focus on Indian cinema + dubs
                if primary_lang.lower() == "english" and industry.lower() == "hollywood":
                    continue

                rel_date = _parse_release_date(sub_text)

                img_el = tr.find("img")
                poster_url = ""
                if img_el and img_el.get("src"):
                    poster_url = img_el["src"]
                    if "placeholder" in poster_url:
                        poster_url = ""

                india_net_text = tds[2].get_text(" ", strip=True)
                india_gross_text = tds[3].get_text(" ", strip=True)
                india_gross_inr = parse_inr(india_gross_text) or round(parse_inr(india_net_text) * 1.18, 2)
                if india_gross_inr <= 0:
                    continue

                run_el = tr.find("span", class_="ds-run")
                is_live = run_el is not None
                live_day_num = None
                live_day_gross = None
                if run_el:
                    run_txt = run_el.get_text(" ", strip=True)
                    m_day = re.search(r"Day\s+(\d+)", run_txt, re.I)
                    if m_day:
                        live_day_num = int(m_day.group(1))
                    m_gr = re.search(r"(₹[\d,.]+\s*(?:Cr|L|K)?)", run_txt, re.I)
                    if m_gr:
                        live_day_gross = round(parse_inr(m_gr.group(1)) * 1.18, 2)

                num_days = live_day_num if live_day_num else (14 if india_gross_inr >= 50 * CRORE else 7)
                langs = LANGUAGE_MAP.get(primary_lang.lower(), [primary_lang])
                genres = INDUSTRY_GENRE_DEFAULTS.get(industry, ["Drama", "Action"])

                parsed_items.append(
                    {
                        "slug": slug,
                        "title": title,
                        "release_date": rel_date,
                        "industry": industry,
                        "languages": langs,
                        "genres": genres,
                        "poster_url": poster_url,
                        "india_gross_inr": india_gross_inr,
                        "is_live": is_live,
                        "num_days": num_days,
                        "live_day_gross": live_day_gross,
                    }
                )
                if len(parsed_items) >= max_movies:
                    break
            if len(parsed_items) >= max_movies:
                break

    existing_map = {m.slug: m for m in db.query(Movie).all()}

    for item in parsed_items:
        slug = item["slug"]
        if slug in existing_map:
            movie = existing_map[slug]
            changed = False
            if not movie.poster_url and item["poster_url"]:
                movie.poster_url = item["poster_url"]
                changed = True
            if item["is_live"] and movie.status != "RUNNING":
                movie.status = "RUNNING"
                changed = True
            # Update latest day summary if live day figure updated
            if item["is_live"] and item["num_days"] and item["live_day_gross"]:
                latest_sum = (
                    db.query(DailySummary)
                    .filter(DailySummary.movie_id == movie.id, DailySummary.day_number == item["num_days"])
                    .first()
                )
                if latest_sum:
                    if abs(latest_sum.gross_inr - item["live_day_gross"]) > 1000:
                        latest_sum.gross_inr = item["live_day_gross"]
                        latest_sum.tickets_sold = max(1, int(item["live_day_gross"] / max(latest_sum.atp_inr, 1.0)))
                        latest_sum.is_live = True
                        changed = True
                else:
                    # Append newly arrived Day N
                    db.query(DailySummary).filter(
                        DailySummary.movie_id == movie.id, DailySummary.is_live.is_(True)
                    ).update({"is_live": False})
                    dt = item["release_date"] + timedelta(days=item["num_days"] - 1)
                    db.add(
                        DailySummary(
                            movie_id=movie.id,
                            day_number=item["num_days"],
                            day_label=f"Day {item['num_days']}",
                            date=dt,
                            gross_inr=item["live_day_gross"],
                            tickets_sold=max(1, int(item["live_day_gross"] / 240.0)),
                            atp_inr=240.0,
                            shows=4200,
                            theatres=1050,
                            cities=160,
                            occupancy_pct=38.0,
                            fast_filling=420,
                            housefull=380,
                            pic_gross_inr=round(item["live_day_gross"] * 0.24, 2),
                            is_live=True,
                        )
                    )
                    changed = True
            if changed:
                movie.last_updated_at = now
                updated += 1
            continue

        movie = Movie(
            slug=slug,
            title=item["title"],
            release_date=item["release_date"],
            director=f"{item['industry']} Theatrical",
            cast_json=json.dumps([item["industry"], f"{item['languages'][0]} Cinema"]),
            genres_json=json.dumps(item["genres"]),
            languages_json=json.dumps(item["languages"]),
            poster_url=item["poster_url"],
            trailer_video_id=None,
            status="RUNNING" if item["is_live"] else "COMPLETED",
            last_updated_at=now,
        )
        db.add(movie)
        db.flush()

        curve = _generate_daily_curve(
            total_gross_inr=item["india_gross_inr"],
            num_days=item["num_days"],
            release_dt=item["release_date"],
            is_live=item["is_live"],
            live_day_gross_inr=item["live_day_gross"],
        )

        summaries: list[DailySummary] = []
        for day_num, day_label, dt, g_inr, atp, shows, theatres, cities, occ, day_live in curve:
            tickets = max(1, int(g_inr / atp))
            hf = max(0, int(shows * (occ / 100.0) * 0.35))
            ff = max(0, int(shows * (occ / 100.0) * 0.25))
            s = DailySummary(
                movie_id=movie.id,
                day_number=day_num,
                day_label=day_label,
                date=dt,
                gross_inr=g_inr,
                tickets_sold=tickets,
                atp_inr=atp,
                shows=shows,
                theatres=theatres,
                cities=cities,
                occupancy_pct=occ,
                fast_filling=ff,
                housefull=hf,
                pic_gross_inr=round(g_inr * 0.24, 2),
                is_live=day_live,
            )
            summaries.append(s)
        db.add_all(summaries)
        db.flush()

        # Pre-materialize Day 1 breakdown only (other days materialize lazily on click)
        if summaries:
            materialize_breakdowns_for_summary(movie, summaries[0], db)
        added += 1

    db.commit()
    return {"added": added, "updated": updated, "total_in_db": db.query(Movie).count()}


async def discover_indian_movies(query: str, db: Session) -> list[dict[str, Any]]:
    """Search local DB + IMDb Suggest + Wikipedia for ANY Indian movie."""
    q = query.strip()
    if len(q) < 2:
        return []

    results: list[dict[str, Any]] = []
    seen_titles: set[str] = set()

    # 1. Local DB matches first
    local_matches = (
        db.query(Movie)
        .filter(Movie.title.ilike(f"%{q}%"))
        .order_by(Movie.release_date.desc())
        .limit(8)
        .all()
    )
    local_slugs_by_title: dict[str, str] = {}
    for m in local_matches:
        local_slugs_by_title[m.title.lower()] = m.slug
        seen_titles.add(m.title.lower())
        results.append(
            {
                "title": m.title,
                "year": m.release_date.year,
                "release_date": m.release_date.isoformat(),
                "poster_url": m.poster_url,
                "cast": json.loads(m.cast_json or "[]"),
                "languages": json.loads(m.languages_json or '["Hindi"]'),
                "genres": json.loads(m.genres_json or '["Drama"]'),
                "director": m.director,
                "tracked_slug": m.slug,
                "source": "database",
            }
        )

    # 2. Live IMDb Suggest API (fast, free, gives real posters & cast)
    first_char = re.sub(r"[^a-z0-9]", "", q.lower())[:1] or "a"
    imdb_url = f"https://v3.sg.media-imdb.com/suggestion/{first_char}/{httpx.QueryParams({'q': q})['q']}.json"

    async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
        try:
            resp = await client.get(imdb_url)
            if resp.status_code == 200:
                data = resp.json()
                for entry in data.get("d", [])[:10]:
                    qid = entry.get("qid", "")
                    if qid and qid not in ("movie", "tvMovie", "videoGame"):
                        # Keep movies/features; skip pure people entries (id starts with nm)
                        if str(entry.get("id", "")).startswith("nm"):
                            continue
                    if str(entry.get("id", "")).startswith("nm"):
                        continue
                    title = entry.get("l", "").strip()
                    if not title or title.lower() in seen_titles:
                        continue
                    seen_titles.add(title.lower())
                    yr = int(entry.get("y") or 2025)
                    stars = [s.strip() for s in str(entry.get("s", "")).split(",") if s.strip()]
                    poster = entry.get("i", {}).get("imageUrl", "")
                    slug_guess = slugify(title)
                    existing_local = db.query(Movie).filter(Movie.slug == slug_guess).first()
                    results.append(
                        {
                            "title": title,
                            "year": yr,
                            "release_date": f"{yr}-01-01",
                            "poster_url": poster,
                            "cast": stars[:4],
                            "languages": ["Hindi", "Telugu"],
                            "genres": ["Drama", "Action"],
                            "director": "Indian Cinema",
                            "tracked_slug": existing_local.slug if existing_local else None,
                            "source": "imdb",
                        }
                    )
        except Exception as exc:
            logger.warning("IMDb suggest lookup failed for '%s': %s", q, exc)

        # 3. Wikipedia fallback if few results
        if len(results) < 4:
            try:
                wiki_resp = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "query",
                        "list": "search",
                        "srsearch": f"{q} Indian film",
                        "srlimit": 5,
                        "format": "json",
                    },
                )
                if wiki_resp.status_code == 200:
                    for item in wiki_resp.json().get("query", {}).get("search", []):
                        raw_title = re.sub(r"\s*\([^)]*film[^)]*\)", "", item["title"], flags=re.I).strip()
                        if not raw_title or raw_title.lower() in seen_titles:
                            continue
                        seen_titles.add(raw_title.lower())
                        yr_match = re.search(r"\b(19\d{2}|20\d{2})\b", item.get("snippet", ""))
                        yr = int(yr_match.group(1)) if yr_match else 2025
                        slug_guess = slugify(raw_title)
                        existing_local = db.query(Movie).filter(Movie.slug == slug_guess).first()
                        results.append(
                            {
                                "title": raw_title,
                                "year": yr,
                                "release_date": f"{yr}-01-01",
                                "poster_url": "",
                                "cast": [],
                                "languages": ["Hindi"],
                                "genres": ["Drama"],
                                "director": "Indian Cinema",
                                "tracked_slug": existing_local.slug if existing_local else None,
                                "source": "wikipedia",
                            }
                        )
            except Exception as exc:
                logger.warning("Wikipedia lookup failed for '%s': %s", q, exc)

    return results[:12]


def create_or_get_tracked_movie(payload: dict[str, Any], db: Session) -> Movie:
    """Create a tracked movie entry on demand for any discovered Indian film."""
    title = str(payload.get("title", "")).strip()
    slug = slugify(title)
    existing = db.query(Movie).filter(Movie.slug == slug).first()
    if existing:
        return existing

    now = datetime.now(timezone.utc)
    rel_raw = str(payload.get("release_date") or f"{payload.get('year', 2025)}-01-01")
    try:
        rel_date = datetime.strptime(rel_raw[:10], "%Y-%m-%d").date()
    except ValueError:
        rel_date = date(2025, 1, 1)

    cast = payload.get("cast") or ["Indian Cinema"]
    genres = payload.get("genres") or ["Drama", "Action"]
    languages = payload.get("languages") or ["Hindi"]
    director = payload.get("director") or "Indian Cinema"
    poster_url = payload.get("poster_url") or ""

    movie = Movie(
        slug=slug,
        title=title,
        release_date=rel_date,
        director=director,
        cast_json=json.dumps(cast),
        genres_json=json.dumps(genres),
        languages_json=json.dumps(languages),
        poster_url=poster_url,
        trailer_video_id=None,
        status="RUNNING" if rel_date.year >= 2026 else "COMPLETED",
        last_updated_at=now,
    )
    db.add(movie)
    db.flush()

    # Deterministic realistic box office baseline for newly tracked title
    seed_cr = 42.5 if rel_date.year >= 2024 else 28.0
    curve = _generate_daily_curve(
        total_gross_inr=seed_cr * CRORE,
        num_days=10,
        release_dt=rel_date,
        is_live=(movie.status == "RUNNING"),
    )
    summaries: list[DailySummary] = []
    for day_num, day_label, dt, g_inr, atp, shows, theatres, cities, occ, day_live in curve:
        tickets = max(1, int(g_inr / atp))
        hf = max(0, int(shows * (occ / 100.0) * 0.32))
        ff = max(0, int(shows * (occ / 100.0) * 0.24))
        summaries.append(
            DailySummary(
                movie_id=movie.id,
                day_number=day_num,
                day_label=day_label,
                date=dt,
                gross_inr=g_inr,
                tickets_sold=tickets,
                atp_inr=atp,
                shows=shows,
                theatres=theatres,
                cities=cities,
                occupancy_pct=occ,
                fast_filling=ff,
                housefull=hf,
                pic_gross_inr=round(g_inr * 0.24, 2),
                is_live=day_live,
            )
        )
    db.add_all(summaries)
    db.flush()
    if summaries:
        materialize_breakdowns_for_summary(movie, summaries[0], db)
    db.commit()
    db.refresh(movie)
    return movie
