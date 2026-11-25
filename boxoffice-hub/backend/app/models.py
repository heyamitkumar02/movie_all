from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(200), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    release_date = Column(Date, nullable=False)
    director = Column(String(300), nullable=False)
    cast_json = Column(Text, nullable=False, default="[]")
    genres_json = Column(Text, nullable=False, default="[]")
    languages_json = Column(Text, nullable=False, default="[]")
    poster_url = Column(String(1000), nullable=False, default="")
    trailer_video_id = Column(String(50), nullable=True)
    trailer_meta_json = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="RUNNING")
    last_updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    daily_summaries = relationship(
        "DailySummary",
        back_populates="movie",
        cascade="all, delete-orphan",
        order_by="DailySummary.day_number",
    )
    daily_breakdowns = relationship(
        "DailyBreakdown",
        back_populates="movie",
        cascade="all, delete-orphan",
    )
    advance_bookings = relationship(
        "AdvanceBooking",
        back_populates="movie",
        cascade="all, delete-orphan",
        order_by="AdvanceBooking.target_date",
    )
    youtube_reviews = relationship(
        "YoutubeReview",
        back_populates="movie",
        cascade="all, delete-orphan",
        order_by="YoutubeReview.view_count.desc()",
    )


class DailySummary(Base):
    __tablename__ = "daily_summaries"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, index=True)
    day_label = Column(String(50), nullable=False)
    date = Column(Date, nullable=False)
    gross_inr = Column(Float, nullable=False, default=0.0)
    tickets_sold = Column(Integer, nullable=False, default=0)
    atp_inr = Column(Float, nullable=False, default=0.0)
    shows = Column(Integer, nullable=False, default=0)
    theatres = Column(Integer, nullable=False, default=0)
    cities = Column(Integer, nullable=False, default=0)
    occupancy_pct = Column(Float, nullable=False, default=0.0)
    fast_filling = Column(Integer, nullable=False, default=0)
    housefull = Column(Integer, nullable=False, default=0)
    pic_gross_inr = Column(Float, nullable=False, default=0.0)
    is_live = Column(Boolean, nullable=False, default=False)

    movie = relationship("Movie", back_populates="daily_summaries")


class DailyBreakdown(Base):
    __tablename__ = "daily_breakdowns"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, index=True)
    breakdown_type = Column(String(50), nullable=False, index=True)
    dimension_name = Column(String(200), nullable=False)
    gross_inr = Column(Float, nullable=False, default=0.0)
    share_pct = Column(Float, nullable=False, default=0.0)
    tickets_sold = Column(Integer, nullable=False, default=0)
    atp_inr = Column(Float, nullable=False, default=0.0)
    shows = Column(Integer, nullable=False, default=0)
    occupancy_pct = Column(Float, nullable=False, default=0.0)
    fast_filling = Column(Integer, nullable=False, default=0)
    housefull = Column(Integer, nullable=False, default=0)

    movie = relationship("Movie", back_populates="daily_breakdowns")


class AdvanceBooking(Base):
    __tablename__ = "advance_bookings"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    target_date = Column(Date, nullable=False)
    gross_inr = Column(Float, nullable=False, default=0.0)
    tickets_sold = Column(Integer, nullable=False, default=0)
    shows = Column(Integer, nullable=False, default=0)
    theatres = Column(Integer, nullable=False, default=0)
    cities = Column(Integer, nullable=False, default=0)
    occupancy_pct = Column(Float, nullable=False, default=0.0)
    fast_filling = Column(Integer, nullable=False, default=0)
    housefull = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    movie = relationship("Movie", back_populates="advance_bookings")


class YoutubeReview(Base):
    __tablename__ = "youtube_reviews"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_name = Column(String(200), nullable=False)
    language = Column(String(30), nullable=False)
    video_id = Column(String(50), nullable=False)
    title = Column(String(500), nullable=False)
    thumbnail_url = Column(String(1000), nullable=False)
    view_count = Column(Integer, nullable=False, default=0)
    published_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    duration = Column(String(30), nullable=False, default="0:00")
    sentiment_tag = Column(String(30), nullable=False, default="Neutral")
    fetched_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    movie = relationship("Movie", back_populates="youtube_reviews")
