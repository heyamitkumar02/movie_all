"use client";

import React, { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { HeroBento } from "@/components/HeroBento";
import { DaySelector } from "@/components/DaySelector";
import { RunShapeChart } from "@/components/RunShapeChart";
import { BreakdownTables } from "@/components/BreakdownTables";
import { AudiencePoll } from "@/components/AudiencePoll";
import { TrailerModal } from "@/components/TrailerModal";
import { WhereToWatch } from "@/components/WhereToWatch";
import { YoutubeReviewsSection } from "@/components/YoutubeReviewsSection";
import {
  fetchDailyDetail,
  fetchMovieDetail,
  fetchReviews,
  fetchTrailer,
  refreshReviews,
  type DailyDetail,
  type MovieDetail,
  type ReviewsResponse,
  type Trailer,
} from "@/lib/api";

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [movieData, setMovieData] = useState<MovieDetail | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | "advance">(1);
  const [dailyDetail, setDailyDetail] = useState<DailyDetail | null>(null);
  const [trailer, setTrailer] = useState<Trailer | null>(null);
  const [reviewsData, setReviewsData] = useState<ReviewsResponse>({
    reviews: [],
    sentiment_distribution: {},
    total_count: 0,
    source: "cache",
  });
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [refreshingReviews, setRefreshingReviews] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReviewsLoading(true);

    fetchMovieDetail(slug)
      .then((detail) => {
        if (!active) return;
        setMovieData(detail);
        if (detail && detail.daily_summaries.length > 0) {
          const latestDay = detail.daily_summaries[detail.daily_summaries.length - 1].day_number;
          setSelectedDay(latestDay);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetchTrailer(slug).then((trailerRes) => {
      if (active) setTrailer(trailerRes);
    });

    fetchReviews(slug)
      .then((reviewsRes) => {
        if (active) setReviewsData(reviewsRes);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!movieData || selectedDay === "advance") return;
    let active = true;
    setDayLoading(true);

    Promise.all([
      fetchDailyDetail(slug, selectedDay),
      fetchMovieDetail(slug, selectedDay),
    ])
      .then(([dailyRes, updatedMovieRes]) => {
        if (!active) return;
        if (dailyRes) setDailyDetail(dailyRes);
        if (updatedMovieRes) setMovieData(updatedMovieRes);
      })
      .finally(() => {
        if (active) setDayLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, selectedDay]);

  const handleWatchTrailer = useCallback(async () => {
    if (!trailer) {
      const fetched = await fetchTrailer(slug);
      setTrailer(fetched);
    }
    setTrailerOpen(true);
  }, [slug, trailer]);

  const handleRefreshReviews = useCallback(async () => {
    setRefreshingReviews(true);
    try {
      const fresh = await refreshReviews(slug);
      setReviewsData(fresh);
    } finally {
      setRefreshingReviews(false);
    }
  }, [slug]);

  const activeDayMeta = useMemo(() => {
    if (!movieData) return { label: "Day 1", isLive: false };
    if (selectedDay === "advance") {
      return { label: "Advance Booking", isLive: true };
    }
    const found = movieData.daily_summaries.find((d) => d.day_number === selectedDay);
    return {
      label: found?.day_label || `Day ${selectedDay}`,
      isLive: found?.is_live || false,
    };
  }, [movieData, selectedDay]);

  if (loading) {
    return (
      <main className="min-h-screen bg-obsidian px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-10 w-36 animate-pulse rounded-full bg-zinc-900" />
          <div className="glass-card h-80 animate-pulse" />
          <div className="glass-card h-64 animate-pulse" />
        </div>
      </main>
    );
  }

  if (!movieData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-4 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Movie Not Found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          We couldn&apos;t locate box office telemetry for &ldquo;{slug}&rdquo;.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/15 px-5 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald/25"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-obsidian pb-20 text-white">
      <HeroBento
        movie={movieData.movie}
        kpis={movieData.kpis}
        milestones={movieData.milestones}
        activeDayLabel={activeDayMeta.label}
        isLiveDay={activeDayMeta.isLive}
        onWatchTrailer={handleWatchTrailer}
      />

      <DaySelector
        days={movieData.daily_summaries.map((d) => ({
          day_number: d.day_number,
          day_label: d.day_label,
          is_live: d.is_live,
        }))}
        selectedDay={selectedDay}
        hasAdvanceBookings={movieData.advance_bookings.length > 0}
        onSelectDay={setSelectedDay}
      />

      <div className="mx-auto mt-6 max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <RunShapeChart
          dailySummaries={movieData.daily_summaries}
          selectedDay={selectedDay}
          onSelectDay={(dayNum) => setSelectedDay(dayNum)}
        />

        <BreakdownTables
          breakdowns={dailyDetail?.breakdowns || {}}
          activeDayLabel={activeDayMeta.label}
          isAdvanceView={selectedDay === "advance"}
          advanceBookings={movieData.advance_bookings}
          loading={dayLoading}
        />

        <WhereToWatch movie={movieData.movie} selectedDay={selectedDay} />

        <AudiencePoll slug={movieData.movie.slug} movieTitle={movieData.movie.title} />

        <YoutubeReviewsSection
          reviews={reviewsData.reviews}
          sentimentDistribution={reviewsData.sentiment_distribution}
          onRefreshReviews={handleRefreshReviews}
          isRefreshing={refreshingReviews}
          loading={reviewsLoading}
        />

        {refreshingReviews && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Fetching latest videos across all 10 Hindi & Telugu review channels...
          </div>
        )}
      </div>

      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        video={
          trailer
            ? {
                video_id: trailer.video_id,
                title: trailer.title,
                channel_name: trailer.channel_name,
                duration: trailer.duration,
              }
            : null
        }
      />
    </main>
  );
}
