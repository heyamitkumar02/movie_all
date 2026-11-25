import csv
import io
import json
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models import AdvanceBooking, DailySummary, Movie
from app.schemas import (
    AdvanceBookingOut,
    BreakdownOut,
    DailyDetailOut,
    DailySummaryOut,
    DiscoverMovieItem,
    MovieDetailOut,
    MovieListItem,
    MovieOut,
    SyncCatalogResponse,
    TrackMovieRequest,
)
from app.services.aggregator_service import compute_kpis, compute_milestones
from app.services.catalog_service import (
    create_or_get_tracked_movie,
    discover_indian_movies,
    materialize_breakdowns_for_summary,
    sync_sacnilk_catalog,
)
from app.services.youtube_service import YouTubeService
from app.utils.currency import format_inr

router = APIRouter(prefix="/api/movies", tags=["movies"])


def _serialize_movie(movie: Movie) -> MovieOut:
    return MovieOut(
        id=movie.id,
        slug=movie.slug,
        title=movie.title,
        release_date=movie.release_date,
        director=movie.director,
        cast=json.loads(movie.cast_json or "[]"),
        genres=json.loads(movie.genres_json or "[]"),
        languages=json.loads(movie.languages_json or "[]"),
        poster_url=movie.poster_url,
        trailer_video_id=movie.trailer_video_id,
        status=movie.status,
        last_updated_at=movie.last_updated_at,
    )


def _serialize_summary(s: DailySummary) -> DailySummaryOut:
    return DailySummaryOut(
        id=s.id,
        day_number=s.day_number,
        day_label=s.day_label,
        date=s.date,
        gross_inr=s.gross_inr,
        gross_formatted=format_inr(s.gross_inr),
        tickets_sold=s.tickets_sold,
        atp_inr=s.atp_inr,
        atp_formatted=format_inr(s.atp_inr),
        shows=s.shows,
        theatres=s.theatres,
        cities=s.cities,
        occupancy_pct=s.occupancy_pct,
        fast_filling=s.fast_filling,
        housefull=s.housefull,
        pic_gross_inr=s.pic_gross_inr,
        pic_gross_formatted=format_inr(s.pic_gross_inr),
        is_live=s.is_live,
    )


def _serialize_breakdown(b) -> BreakdownOut:
    return BreakdownOut(
        id=b.id,
        day_number=b.day_number,
        breakdown_type=b.breakdown_type,
        dimension_name=b.dimension_name,
        gross_inr=b.gross_inr,
        gross_formatted=format_inr(b.gross_inr),
        share_pct=b.share_pct,
        tickets_sold=b.tickets_sold,
        atp_inr=b.atp_inr,
        atp_formatted=format_inr(b.atp_inr),
        shows=b.shows,
        occupancy_pct=b.occupancy_pct,
        fast_filling=b.fast_filling,
        housefull=b.housefull,
    )


def _serialize_advance(a: AdvanceBooking) -> AdvanceBookingOut:
    return AdvanceBookingOut(
        id=a.id,
        target_date=a.target_date,
        gross_inr=a.gross_inr,
        gross_formatted=format_inr(a.gross_inr),
        tickets_sold=a.tickets_sold,
        shows=a.shows,
        theatres=a.theatres,
        cities=a.cities,
        occupancy_pct=a.occupancy_pct,
        fast_filling=a.fast_filling,
        housefull=a.housefull,
        updated_at=a.updated_at,
    )


def _compute_kpis_from_summaries(summaries: list[DailySummary]) -> dict:
    if not summaries:
        return {
            "india_gross": 0.0,
            "india_gross_formatted": "₹0",
            "today_gross": 0.0,
            "today_gross_formatted": "₹0",
            "today_day_label": "Day 1",
            "occupancy_pct": 0.0,
            "shows": 0,
            "theatres": 0,
            "cities": 0,
            "tickets_sold": 0,
            "atp": 0.0,
            "atp_formatted": "₹0",
            "pic_gross": 0.0,
            "pic_gross_formatted": "₹0",
            "dod_change_pct": None,
            "best_day": {
                "day_number": 1,
                "day_label": "Day 1",
                "gross_inr": 0.0,
                "gross_formatted": "₹0",
            },
        }
    total_gross = sum(s.gross_inr for s in summaries)
    latest = summaries[-1]
    prev = summaries[-2] if len(summaries) > 1 else None
    dod = (
        round(((latest.gross_inr - prev.gross_inr) / prev.gross_inr) * 100.0, 1)
        if prev and prev.gross_inr > 0
        else None
    )
    best = max(summaries, key=lambda s: s.gross_inr)
    return {
        "india_gross": total_gross,
        "india_gross_formatted": format_inr(total_gross),
        "today_gross": latest.gross_inr,
        "today_gross_formatted": format_inr(latest.gross_inr),
        "today_day_label": latest.day_label,
        "occupancy_pct": round(latest.occupancy_pct, 1),
        "shows": latest.shows,
        "theatres": latest.theatres,
        "cities": latest.cities,
        "tickets_sold": latest.tickets_sold,
        "atp": round(latest.atp_inr, 0),
        "atp_formatted": format_inr(latest.atp_inr),
        "pic_gross": latest.pic_gross_inr,
        "pic_gross_formatted": format_inr(latest.pic_gross_inr),
        "dod_change_pct": dod,
        "best_day": {
            "day_number": best.day_number,
            "day_label": best.day_label,
            "gross_inr": best.gross_inr,
            "gross_formatted": format_inr(best.gross_inr),
        },
    }


async def _enrich_movie_media_background(movie_id: int) -> None:
    db = SessionLocal()
    try:
        movie = db.query(Movie).filter(Movie.id == movie_id).first()
        if not movie:
            return
        yt = YouTubeService()
        await yt.get_trailer(movie, db, force_refresh=True)
        await yt.get_reviews(movie, db, force_refresh=True)
    finally:
        db.close()


@router.get("", response_model=list[MovieListItem], include_in_schema=False)
@router.get("/", response_model=list[MovieListItem])
def list_movies(
    language: str | None = Query(default=None),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    movies = db.query(Movie).order_by(Movie.release_date.desc()).all()
    all_summaries = (
        db.query(DailySummary)
        .order_by(DailySummary.movie_id.asc(), DailySummary.day_number.asc())
        .all()
    )
    summaries_by_movie: dict[int, list[DailySummary]] = {}
    for s in all_summaries:
        summaries_by_movie.setdefault(s.movie_id, []).append(s)

    items: list[MovieListItem] = []
    for movie in movies:
        langs = json.loads(movie.languages_json or "[]")
        if language and language.lower() != "all":
            if not any(l.lower() == language.lower() for l in langs):
                continue
        if status and status.upper() != "ALL":
            if movie.status.upper() != status.upper():
                continue
        if q:
            ql = q.strip().lower()
            cast = json.loads(movie.cast_json or "[]")
            if (
                ql not in movie.title.lower()
                and ql not in movie.director.lower()
                and not any(ql in c.lower() for c in cast)
            ):
                continue

        m_summaries = summaries_by_movie.get(movie.id, [])
        kpis = _compute_kpis_from_summaries(m_summaries)
        items.append(
            MovieListItem(
                movie=_serialize_movie(movie),
                kpis=kpis,
                milestones=[],
                daily_summaries=[_serialize_summary(s) for s in m_summaries],
            )
        )

    # Sort by cumulative India gross descending so top blockbusters & live hits lead
    items.sort(key=lambda x: x.kpis.india_gross, reverse=True)
    return items


@router.get("/discover", response_model=list[DiscoverMovieItem])
async def discover_movies(
    q: str = Query(..., min_length=2, description="Search any Indian movie across IMDb, Wikipedia & local DB"),
    db: Session = Depends(get_db),
):
    results = await discover_indian_movies(q, db)
    return [DiscoverMovieItem(**item) for item in results]


@router.post("/track", response_model=MovieOut)
async def track_movie(
    payload: TrackMovieRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    movie = create_or_get_tracked_movie(payload.model_dump(), db)
    background_tasks.add_task(_enrich_movie_media_background, movie.id)
    return _serialize_movie(movie)


@router.post("/sync", response_model=SyncCatalogResponse)
def sync_india_catalog(db: Session = Depends(get_db)):
    stats = sync_sacnilk_catalog(db, max_movies=120)
    return SyncCatalogResponse(**stats)


@router.get("/{slug}", response_model=MovieDetailOut)
def get_movie_detail(slug: str, day: int | None = None, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    summaries = (
        db.query(DailySummary)
        .filter(DailySummary.movie_id == movie.id)
        .order_by(DailySummary.day_number.asc())
        .all()
    )
    advances = (
        db.query(AdvanceBooking)
        .filter(AdvanceBooking.movie_id == movie.id)
        .order_by(AdvanceBooking.target_date.asc())
        .all()
    )
    kpis = compute_kpis(movie.id, day, db)
    milestones = compute_milestones(movie.id, db)

    return MovieDetailOut(
        movie=_serialize_movie(movie),
        kpis=kpis,
        milestones=milestones,
        daily_summaries=[_serialize_summary(s) for s in summaries],
        advance_bookings=[_serialize_advance(a) for a in advances],
    )


@router.get("/{slug}/daily/{day_number}", response_model=DailyDetailOut)
def get_daily_detail(slug: str, day_number: int, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    summary = (
        db.query(DailySummary)
        .filter(DailySummary.movie_id == movie.id, DailySummary.day_number == day_number)
        .first()
    )
    if not summary:
        raise HTTPException(status_code=404, detail=f"Day {day_number} not found")

    rows = materialize_breakdowns_for_summary(movie, summary, db)
    grouped: dict[str, list[BreakdownOut]] = {}
    for row in rows:
        grouped.setdefault(row.breakdown_type, []).append(_serialize_breakdown(row))

    return DailyDetailOut(
        summary=_serialize_summary(summary),
        breakdowns=grouped,
    )


@router.get("/{slug}/advance", response_model=list[AdvanceBookingOut])
def get_advance_bookings(slug: str, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    advances = (
        db.query(AdvanceBooking)
        .filter(AdvanceBooking.movie_id == movie.id)
        .order_by(AdvanceBooking.target_date.asc())
        .all()
    )
    return [_serialize_advance(a) for a in advances]


@router.get("/{slug}/export")
def export_movie_report(
    slug: str,
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    day: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    summaries = (
        db.query(DailySummary)
        .filter(DailySummary.movie_id == movie.id)
        .order_by(DailySummary.day_number.asc())
        .all()
    )
    kpis = compute_kpis(movie.id, day, db)

    if format == "json":
        payload = {
            "movie": _serialize_movie(movie).model_dump(mode="json"),
            "kpis": kpis,
            "daily_summaries": [_serialize_summary(s).model_dump(mode="json") for s in summaries],
        }
        if day is not None:
            target_sum = next((s for s in summaries if s.day_number == day), None)
            if target_sum:
                rows = materialize_breakdowns_for_summary(movie, target_sum, db)
                payload["day_breakdowns"] = [_serialize_breakdown(r).model_dump(mode="json") for r in rows]

        filename = f"{slug}-day-{day}-report.json" if day is not None else f"{slug}-boxoffice-report.json"
        return Response(
            content=json.dumps(payload, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    output = io.StringIO()
    writer = csv.writer(output)

    if day is not None:
        target_sum = next((s for s in summaries if s.day_number == day), None)
        if not target_sum:
            raise HTTPException(status_code=404, detail=f"Day {day} not found")
        rows = materialize_breakdowns_for_summary(movie, target_sum, db)
        writer.writerow([
            "Movie",
            "Day",
            "Date",
            "Breakdown Type",
            "Segment",
            "Gross (INR)",
            "Gross Formatted",
            "Share %",
            "Tickets Sold",
            "ATP (INR)",
            "Shows",
            "Occupancy %",
            "Fast Filling",
            "Housefull",
        ])
        for r in rows:
            writer.writerow([
                movie.title,
                target_sum.day_label,
                target_sum.date.isoformat(),
                r.breakdown_type,
                r.dimension_name,
                r.gross_inr,
                format_inr(r.gross_inr),
                r.share_pct,
                r.tickets_sold,
                r.atp_inr,
                r.shows,
                r.occupancy_pct,
                r.fast_filling,
                r.housefull,
            ])
        filename = f"{slug}-day-{day}-breakdown.csv"
    else:
        writer.writerow([
            "Movie",
            "Day Number",
            "Day Label",
            "Date",
            "Gross (INR)",
            "Gross Formatted",
            "Tickets Sold",
            "ATP (INR)",
            "Shows",
            "Theatres",
            "Cities",
            "Occupancy %",
            "Fast Filling",
            "Housefull",
            "PIC Chains Gross (INR)",
            "Live",
        ])
        for s in summaries:
            writer.writerow([
                movie.title,
                s.day_number,
                s.day_label,
                s.date.isoformat(),
                s.gross_inr,
                format_inr(s.gross_inr),
                s.tickets_sold,
                s.atp_inr,
                s.shows,
                s.theatres,
                s.cities,
                s.occupancy_pct,
                s.fast_filling,
                s.housefull,
                s.pic_gross_inr,
                s.is_live,
            ])
        filename = f"{slug}-daily-boxoffice.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
