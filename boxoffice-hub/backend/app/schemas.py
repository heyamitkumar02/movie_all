from datetime import date, datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class MovieOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    release_date: date
    director: str
    cast: list[str]
    genres: list[str]
    languages: list[str]
    poster_url: str
    trailer_video_id: Optional[str] = None
    status: str
    last_updated_at: Optional[datetime] = None


class BestDayOut(BaseModel):
    day_number: int
    day_label: str
    gross_inr: float
    gross_formatted: str


class KPIsOut(BaseModel):
    india_gross: float
    india_gross_formatted: str
    today_gross: float
    today_gross_formatted: str
    today_day_label: str
    occupancy_pct: float
    shows: int
    theatres: int
    cities: int
    tickets_sold: int
    atp: float
    atp_formatted: str
    pic_gross: float
    pic_gross_formatted: str
    dod_change_pct: Optional[float] = None
    best_day: BestDayOut


class MilestoneOut(BaseModel):
    label: str
    target_inr: float
    target_formatted: str
    achieved: bool
    achieved_on_day: Optional[int] = None
    progress_pct: float


class DailySummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_number: int
    day_label: str
    date: date
    gross_inr: float
    gross_formatted: str
    tickets_sold: int
    atp_inr: float
    atp_formatted: str
    shows: int
    theatres: int
    cities: int
    occupancy_pct: float
    fast_filling: int
    housefull: int
    pic_gross_inr: float
    pic_gross_formatted: str
    is_live: bool


class BreakdownOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_number: int
    breakdown_type: str
    dimension_name: str
    gross_inr: float
    gross_formatted: str
    share_pct: float
    tickets_sold: int
    atp_inr: float
    atp_formatted: str
    shows: int
    occupancy_pct: float
    fast_filling: int
    housefull: int


class AdvanceBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target_date: date
    gross_inr: float
    gross_formatted: str
    tickets_sold: int
    shows: int
    theatres: int
    cities: int
    occupancy_pct: float
    fast_filling: int
    housefull: int
    updated_at: Optional[datetime] = None


class MovieListItem(BaseModel):
    movie: MovieOut
    kpis: KPIsOut
    milestones: list[MilestoneOut]
    daily_summaries: list[DailySummaryOut]


class MovieDetailOut(BaseModel):
    movie: MovieOut
    kpis: KPIsOut
    milestones: list[MilestoneOut]
    daily_summaries: list[DailySummaryOut]
    advance_bookings: list[AdvanceBookingOut]


class DailyDetailOut(BaseModel):
    summary: DailySummaryOut
    breakdowns: dict[str, list[BreakdownOut]]


class TrailerOut(BaseModel):
    video_id: str
    title: str
    channel_name: str
    thumbnail_url: str
    duration: str
    embed_url: str
    source: str = "cache"


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_name: str
    language: str
    video_id: str
    title: str
    thumbnail_url: str
    view_count: int
    published_at: datetime
    duration: str
    sentiment_tag: str
    fetched_at: datetime


class SentimentBucket(BaseModel):
    count: int
    pct: float


class ReviewsResponse(BaseModel):
    reviews: list[ReviewOut]
    sentiment_distribution: dict[str, Any]
    total_count: int
    source: str = "cache"


class DiscoverMovieItem(BaseModel):
    title: str
    year: int
    release_date: str
    poster_url: str
    cast: list[str]
    languages: list[str]
    genres: list[str]
    director: str
    tracked_slug: Optional[str] = None
    source: str


class TrackMovieRequest(BaseModel):
    title: str
    year: Optional[int] = 2025
    release_date: Optional[str] = None
    poster_url: Optional[str] = ""
    cast: list[str] = []
    languages: list[str] = ["Hindi"]
    genres: list[str] = ["Drama"]
    director: Optional[str] = "Indian Cinema"


class SyncCatalogResponse(BaseModel):
    added: int
    updated: int
    total_in_db: int


class PollOut(BaseModel):
    avg_rating: float
    rating_count: int
    theatre_votes: int
    ott_votes: int
    skip_votes: int
    total_verdict_votes: int


class PollVoteRequest(BaseModel):
    rating: Optional[int] = None
    verdict: Optional[str] = None  # "theatre" | "ott" | "skip"
