import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from sqlalchemy.orm import Session

from app.config.review_channels import REVIEW_CHANNELS
from app.models import Movie, YoutubeReview

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24

POSITIVE_KEYWORDS = [
    "blockbuster",
    "masterpiece",
    "brilliant",
    "must watch",
    "phenomenal",
    "mass",
    "fire",
    "wildfire",
    "best",
    "amazing",
    "loved",
    "outstanding",
    "hit",
    "super",
    "worth watching",
    "mind blowing",
    "epic",
]
NEGATIVE_KEYWORDS = [
    "disaster",
    "flop",
    "worst",
    "disappointing",
    "boring",
    "waste",
    "bad",
    "pathetic",
    "terrible",
    "mess",
    "fail",
    "cringe",
]
MIXED_KEYWORDS = [
    "mixed",
    "average",
    "decent",
    "flawed",
    "one time",
    "okay",
    "hit and miss",
    "parts",
]


def infer_sentiment(title: str) -> str:
    lower = title.lower()
    pos_score = sum(1 for kw in POSITIVE_KEYWORDS if kw in lower)
    neg_score = sum(1 for kw in NEGATIVE_KEYWORDS if kw in lower)
    mix_score = sum(1 for kw in MIXED_KEYWORDS if kw in lower)

    if mix_score > 0 or (pos_score > 0 and neg_score > 0):
        return "Mixed"
    if pos_score > neg_score and pos_score > 0:
        return "Positive"
    if neg_score > pos_score and neg_score > 0:
        return "Negative"
    return "Neutral"


def _format_duration_seconds(seconds: Optional[int | float]) -> str:
    if not seconds:
        return "2:30"
    total = int(seconds)
    mins, secs = divmod(total, 60)
    hours, mins = divmod(mins, 60)
    if hours > 0:
        return f"{hours}:{mins:02d}:{secs:02d}"
    return f"{mins}:{secs:02d}"


def _parse_iso_duration(iso_dur: str) -> str:
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_dur or "")
    if not match:
        return "2:30"
    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


class YouTubeService:
    def __init__(self) -> None:
        self.api_key = os.getenv("YOUTUBE_API_KEY", "").strip()

    async def _search_youtube_api(self, query: str, max_results: int = 1) -> list[dict[str, Any]]:
        if not self.api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                search_resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={
                        "part": "snippet",
                        "q": query,
                        "type": "video",
                        "maxResults": max_results,
                        "key": self.api_key,
                    },
                )
                search_resp.raise_for_status()
                items = search_resp.json().get("items", [])
                if not items:
                    return []

                video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
                if not video_ids:
                    return []

                stats_resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/videos",
                    params={
                        "part": "snippet,statistics,contentDetails",
                        "id": ",".join(video_ids),
                        "key": self.api_key,
                    },
                )
                stats_resp.raise_for_status()
                results = []
                for vid in stats_resp.json().get("items", []):
                    snippet = vid.get("snippet", {})
                    stats = vid.get("statistics", {})
                    details = vid.get("contentDetails", {})
                    thumbs = snippet.get("thumbnails", {})
                    thumb_url = (
                        thumbs.get("maxres", {}).get("url")
                        or thumbs.get("high", {}).get("url")
                        or thumbs.get("medium", {}).get("url")
                        or f"https://i.ytimg.com/vi/{vid['id']}/hqdefault.jpg"
                    )
                    results.append(
                        {
                            "video_id": vid["id"],
                            "title": snippet.get("title", query),
                            "channel_name": snippet.get("channelTitle", "YouTube"),
                            "thumbnail_url": thumb_url,
                            "view_count": int(stats.get("viewCount", 0) or 0),
                            "published_at": snippet.get("publishedAt"),
                            "duration": _parse_iso_duration(details.get("duration", "")),
                        }
                    )
                return results
        except Exception as exc:
            logger.warning("YouTube Data API search failed for '%s': %s", query, exc)
            return []

    def _search_yt_dlp(self, query: str) -> Optional[dict[str, Any]]:
        try:
            import yt_dlp

            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": True,
                "skip_download": True,
                "default_search": "ytsearch1",
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch1:{query}", download=False)
                entries = info.get("entries") if info else None
                if not entries:
                    return None
                entry = entries[0]
                vid_id = entry.get("id")
                if not vid_id:
                    return None
                upload_date = entry.get("upload_date")
                published_at = None
                if upload_date and len(upload_date) == 8:
                    try:
                        published_at = datetime.strptime(upload_date, "%Y%m%d").replace(tzinfo=timezone.utc).isoformat()
                    except ValueError:
                        published_at = None
                return {
                    "video_id": vid_id,
                    "title": entry.get("title") or query,
                    "channel_name": entry.get("channel") or entry.get("uploader") or "YouTube",
                    "thumbnail_url": entry.get("thumbnail") or f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                    "view_count": int(entry.get("view_count") or 0),
                    "published_at": published_at,
                    "duration": _format_duration_seconds(entry.get("duration")),
                }
        except Exception as exc:
            logger.warning("yt-dlp search failed for '%s': %s", query, exc)
            return None

    async def search_best_video(self, query: str) -> Optional[dict[str, Any]]:
        api_results = await self._search_youtube_api(query, max_results=1)
        if api_results:
            return api_results[0]
        return self._search_yt_dlp(query)

    async def get_trailer(
        self,
        movie: Movie,
        db: Session,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        meta: dict[str, Any] = {}
        if movie.trailer_meta_json:
            try:
                meta = json.loads(movie.trailer_meta_json)
            except json.JSONDecodeError:
                meta = {}

        is_cache_fresh = False
        if movie.trailer_video_id and meta.get("fetched_at"):
            try:
                fetched_dt = datetime.fromisoformat(meta["fetched_at"])
                if fetched_dt.tzinfo is None:
                    fetched_dt = fetched_dt.replace(tzinfo=timezone.utc)
                is_cache_fresh = (datetime.now(timezone.utc) - fetched_dt) < timedelta(hours=CACHE_TTL_HOURS)
            except ValueError:
                is_cache_fresh = False

        if not force_refresh and movie.trailer_video_id and (is_cache_fresh or meta):
            return {
                "video_id": movie.trailer_video_id,
                "title": meta.get("title", f"{movie.title} - Official Trailer"),
                "channel_name": meta.get("channel_name", "Official Channel"),
                "thumbnail_url": meta.get(
                    "thumbnail_url",
                    f"https://i.ytimg.com/vi/{movie.trailer_video_id}/maxresdefault.jpg",
                ),
                "duration": meta.get("duration", "2:45"),
                "embed_url": f"https://www.youtube.com/embed/{movie.trailer_video_id}?autoplay=1&rel=0",
                "source": "cache",
            }

        fetched = await self.search_best_video(f"{movie.title} official trailer")
        if fetched:
            movie.trailer_video_id = fetched["video_id"]
            new_meta = {
                "title": fetched["title"],
                "channel_name": fetched["channel_name"],
                "thumbnail_url": fetched["thumbnail_url"],
                "duration": fetched["duration"],
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
            movie.trailer_meta_json = json.dumps(new_meta)
            db.add(movie)
            db.commit()
            db.refresh(movie)
            return {
                "video_id": fetched["video_id"],
                "title": fetched["title"],
                "channel_name": fetched["channel_name"],
                "thumbnail_url": fetched["thumbnail_url"],
                "duration": fetched["duration"],
                "embed_url": f"https://www.youtube.com/embed/{fetched['video_id']}?autoplay=1&rel=0",
                "source": "live",
            }

        fallback_id = movie.trailer_video_id or "dQw4w9WgXcQ"
        return {
            "video_id": fallback_id,
            "title": meta.get("title", f"{movie.title} - Official Trailer"),
            "channel_name": meta.get("channel_name", "Official Studio"),
            "thumbnail_url": f"https://i.ytimg.com/vi/{fallback_id}/hqdefault.jpg",
            "duration": meta.get("duration", "2:45"),
            "embed_url": f"https://www.youtube.com/embed/{fallback_id}?autoplay=1&rel=0",
            "source": "fallback",
        }

    async def get_reviews(
        self,
        movie: Movie,
        db: Session,
        force_refresh: bool = False,
    ) -> tuple[list[YoutubeReview], str]:
        existing = (
            db.query(YoutubeReview)
            .filter(YoutubeReview.movie_id == movie.id)
            .order_by(YoutubeReview.view_count.desc())
            .all()
        )

        if not force_refresh and existing:
            newest_fetch = max(r.fetched_at for r in existing)
            if newest_fetch.tzinfo is None:
                newest_fetch = newest_fetch.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - newest_fetch) < timedelta(hours=CACHE_TTL_HOURS):
                return existing, "cache"

        if not force_refresh and existing:
            return existing, "cache"

        # Live fetch across all 10 curated channels
        new_records: list[YoutubeReview] = []
        now = datetime.now(timezone.utc)
        for ch in REVIEW_CHANNELS:
            query = f"{movie.title} review {ch['name']}"
            video = await self.search_best_video(query)
            if not video:
                continue

            pub_dt = now
            if video.get("published_at"):
                try:
                    pub_dt = datetime.fromisoformat(str(video["published_at"]).replace("Z", "+00:00"))
                except ValueError:
                    pub_dt = now

            review = YoutubeReview(
                movie_id=movie.id,
                channel_name=ch["name"],
                language=ch["language"],
                video_id=video["video_id"],
                title=video["title"],
                thumbnail_url=video["thumbnail_url"],
                view_count=video["view_count"] or 0,
                published_at=pub_dt,
                duration=video["duration"] or "10:00",
                sentiment_tag=infer_sentiment(video["title"]),
                fetched_at=now,
            )
            new_records.append(review)

        if new_records:
            db.query(YoutubeReview).filter(YoutubeReview.movie_id == movie.id).delete()
            for r in new_records:
                db.add(r)
            db.commit()
            refreshed = (
                db.query(YoutubeReview)
                .filter(YoutubeReview.movie_id == movie.id)
                .order_by(YoutubeReview.view_count.desc())
                .all()
            )
            return refreshed, "live"

        return existing, "cache"

    @staticmethod
    def compute_sentiment_distribution(reviews: list[YoutubeReview]) -> dict[str, dict[str, float | int]]:
        buckets = ["Positive", "Mixed", "Negative", "Neutral"]
        total = len(reviews)
        counts = {b: 0 for b in buckets}
        for r in reviews:
            tag = r.sentiment_tag if r.sentiment_tag in counts else "Neutral"
            counts[tag] += 1

        distribution: dict[str, dict[str, float | int]] = {}
        for b in buckets:
            pct = round((counts[b] / total) * 100.0, 1) if total > 0 else 0.0
            distribution[b] = {"count": counts[b], "pct": pct}
        return distribution
