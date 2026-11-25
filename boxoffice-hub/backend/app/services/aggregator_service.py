from sqlalchemy.orm import Session
from app.models import DailySummary
from app.utils.currency import format_inr

CRORE = 10_000_000.0

MILESTONE_TARGETS_CR = [10, 50, 100, 250, 500, 750, 1000, 1250]


def compute_kpis(movie_id: int, day_number: int | None, db: Session) -> dict:
    summaries = (
        db.query(DailySummary)
        .filter(DailySummary.movie_id == movie_id)
        .order_by(DailySummary.day_number.asc())
        .all()
    )
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

    target_summary = summaries[-1]
    if day_number is not None:
        matched = next((s for s in summaries if s.day_number == day_number), None)
        if matched is not None:
            target_summary = matched

    # Day-over-day change relative to immediately preceding summary
    dod_change_pct = None
    idx = summaries.index(target_summary)
    if idx > 0 and summaries[idx - 1].gross_inr > 0:
        prev_gross = summaries[idx - 1].gross_inr
        dod_change_pct = round(((target_summary.gross_inr - prev_gross) / prev_gross) * 100.0, 1)

    best_summary = max(summaries, key=lambda s: s.gross_inr)

    return {
        "india_gross": total_gross,
        "india_gross_formatted": format_inr(total_gross),
        "today_gross": target_summary.gross_inr,
        "today_gross_formatted": format_inr(target_summary.gross_inr),
        "today_day_label": target_summary.day_label,
        "occupancy_pct": round(target_summary.occupancy_pct, 1),
        "shows": target_summary.shows,
        "theatres": target_summary.theatres,
        "cities": target_summary.cities,
        "tickets_sold": target_summary.tickets_sold,
        "atp": round(target_summary.atp_inr, 0),
        "atp_formatted": format_inr(target_summary.atp_inr),
        "pic_gross": target_summary.pic_gross_inr,
        "pic_gross_formatted": format_inr(target_summary.pic_gross_inr),
        "dod_change_pct": dod_change_pct,
        "best_day": {
            "day_number": best_summary.day_number,
            "day_label": best_summary.day_label,
            "gross_inr": best_summary.gross_inr,
            "gross_formatted": format_inr(best_summary.gross_inr),
        },
    }


def compute_milestones(movie_id: int, db: Session) -> list[dict]:
    summaries = (
        db.query(DailySummary)
        .filter(DailySummary.movie_id == movie_id)
        .order_by(DailySummary.day_number.asc())
        .all()
    )

    cumulative_by_day: list[tuple[int, float]] = []
    running = 0.0
    for s in summaries:
        running += s.gross_inr
        cumulative_by_day.append((s.day_number, running))

    total_gross = running
    milestones: list[dict] = []

    for target_cr in MILESTONE_TARGETS_CR:
        target_inr = target_cr * CRORE
        achieved_day = None
        for day_num, cum_val in cumulative_by_day:
            if cum_val >= target_inr:
                achieved_day = day_num
                break

        achieved = achieved_day is not None
        progress_pct = min(100.0, round((total_gross / target_inr) * 100.0, 1)) if target_inr > 0 else 0.0
        milestones.append(
            {
                "label": f"₹{target_cr} Cr",
                "target_inr": target_inr,
                "target_formatted": format_inr(target_inr),
                "achieved": achieved,
                "achieved_on_day": achieved_day,
                "progress_pct": progress_pct,
            }
        )

    return milestones
