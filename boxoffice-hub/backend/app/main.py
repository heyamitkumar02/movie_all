import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, IS_VERCEL, SessionLocal, engine
from app.models import DailySummary, Movie
from app.routes.media import router as media_router
from app.routes.movies import router as movies_router
from app.services.catalog_service import sync_sacnilk_catalog
from app.services.seed_data import seed_database

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("boxoffice-hub")

scheduler = BackgroundScheduler()
_db_bootstrapped = False


def ensure_db_bootstrapped() -> None:
    """Create tables, seed flagship titles, and sync Indian catalog on first startup."""
    global _db_bootstrapped
    if _db_bootstrapped:
        return
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
        if db.query(Movie).count() <= 10:
            try:
                stats = sync_sacnilk_catalog(db, max_movies=120)
                logger.info("Initial Indian Box Office catalog synced: %s", stats)
            except Exception as exc:
                logger.warning("Initial catalog sync skipped/failed: %s", exc)
        _db_bootstrapped = True
        logger.info("Database ready with %d movies.", db.query(Movie).count())
    finally:
        db.close()


def refresh_live_tracking_pulse() -> None:
    """Periodic pulse for active RUNNING movies."""
    db = SessionLocal()
    try:
        live_movies = db.query(Movie).filter(Movie.status == "RUNNING").all()
        now = datetime.now(timezone.utc)
        for movie in live_movies:
            live_day = (
                db.query(DailySummary)
                .filter(DailySummary.movie_id == movie.id, DailySummary.is_live.is_(True))
                .first()
            )
            if live_day:
                movie.last_updated_at = now
        db.commit()
    except Exception as exc:
        logger.warning("Scheduled live pulse error: %s", exc)
    finally:
        db.close()


def scheduled_india_catalog_sync() -> None:
    """Automatically sync latest Indian Box Office releases every 6 hours."""
    db = SessionLocal()
    try:
        stats = sync_sacnilk_catalog(db, max_movies=120)
        logger.info("Scheduled India catalog sync finished: %s", stats)
    except Exception as exc:
        logger.warning("Scheduled catalog sync failed: %s", exc)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_db_bootstrapped()

    if not IS_VERCEL:
        scheduler.add_job(
            refresh_live_tracking_pulse,
            "interval",
            minutes=5,
            id="live_pulse",
            replace_existing=True,
        )
        scheduler.add_job(
            scheduled_india_catalog_sync,
            "interval",
            hours=6,
            id="india_catalog_sync",
            replace_existing=True,
        )
        scheduler.start()
    try:
        yield
    finally:
        if not IS_VERCEL and scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="BoxOffice Hub API",
    description="Interactive Indian Box Office Tracker, Trailer Viewer & Top 10 YouTube Reviews Aggregator",
    version="1.1.0",
    lifespan=lifespan,
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def bootstrap_middleware(request: Request, call_next):
    ensure_db_bootstrapped()
    return await call_next(request)


app.include_router(movies_router)
app.include_router(media_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "boxoffice-hub-api", "vercel": IS_VERCEL}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
