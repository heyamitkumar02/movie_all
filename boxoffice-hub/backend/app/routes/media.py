from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie
from app.schemas import ReviewOut, ReviewsResponse, TrailerOut
from app.services.youtube_service import YouTubeService

router = APIRouter(prefix="/api/movies", tags=["media"])
yt_service = YouTubeService()


@router.get("/{slug}/trailer", response_model=TrailerOut)
async def get_movie_trailer(
    slug: str,
    refresh: bool = Query(default=False, description="Bypass cache and fetch live from YouTube"),
    db: Session = Depends(get_db),
):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    trailer = await yt_service.get_trailer(movie, db, force_refresh=refresh)
    return TrailerOut(**trailer)


@router.post("/{slug}/trailer/refresh", response_model=TrailerOut)
async def refresh_movie_trailer(slug: str, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    trailer = await yt_service.get_trailer(movie, db, force_refresh=True)
    return TrailerOut(**trailer)


@router.get("/{slug}/reviews", response_model=ReviewsResponse)
async def get_movie_reviews(
    slug: str,
    refresh: bool = Query(default=False, description="Bypass cache and fetch live across Top 10 channels"),
    db: Session = Depends(get_db),
):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    reviews, source = await yt_service.get_reviews(movie, db, force_refresh=refresh)
    dist = yt_service.compute_sentiment_distribution(reviews)

    return ReviewsResponse(
        reviews=[ReviewOut.model_validate(r) for r in reviews],
        sentiment_distribution=dist,
        total_count=len(reviews),
        source=source,
    )


@router.post("/{slug}/reviews/refresh", response_model=ReviewsResponse)
async def refresh_movie_reviews(slug: str, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.slug == slug).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    reviews, source = await yt_service.get_reviews(movie, db, force_refresh=True)
    dist = yt_service.compute_sentiment_distribution(reviews)

    return ReviewsResponse(
        reviews=[ReviewOut.model_validate(r) for r in reviews],
        sentiment_distribution=dist,
        total_count=len(reviews),
        source=source,
    )
