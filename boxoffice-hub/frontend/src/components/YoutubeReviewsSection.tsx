"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Eye, MessageSquareQuote, Play, RefreshCw } from "lucide-react";
import { SpotlightCard } from "./reactbits/SpotlightCard";
import { TrailerModal, type VideoModalData } from "./TrailerModal";
import type { Review, SentimentBucket } from "@/lib/api";
import { cn, formatViewCount, timeAgo } from "@/lib/utils";

interface YoutubeReviewsSectionProps {
  reviews: Review[];
  sentimentDistribution: Record<string, SentimentBucket>;
  onRefreshReviews?: () => Promise<void>;
  isRefreshing?: boolean;
  loading?: boolean;
}

const SENTIMENT_META: Record<string, { color: string; bar: string; badge: string }> = {
  Positive: {
    color: "text-emerald-400",
    bar: "bg-emerald",
    badge: "border-emerald/30 bg-emerald/15 text-emerald-400",
  },
  Mixed: {
    color: "text-amber-gold",
    bar: "bg-amber-gold",
    badge: "border-amber-gold/30 bg-amber-gold/15 text-amber-gold",
  },
  Negative: {
    color: "text-rose-400",
    bar: "bg-rose",
    badge: "border-rose/30 bg-rose/15 text-rose-400",
  },
  Neutral: {
    color: "text-zinc-400",
    bar: "bg-zinc-500",
    badge: "border-white/10 bg-zinc-800 text-zinc-300",
  },
};

export function YoutubeReviewsSection({
  reviews,
  sentimentDistribution,
  onRefreshReviews,
  isRefreshing = false,
  loading = false,
}: YoutubeReviewsSectionProps) {
  const [langFilter, setLangFilter] = useState<"All" | "Hindi" | "Telugu">("All");
  const [activeVideo, setActiveVideo] = useState<VideoModalData | null>(null);

  const filteredReviews = useMemo(() => {
    if (langFilter === "All") return reviews;
    return reviews.filter((r) => r.language.toLowerCase() === langFilter.toLowerCase());
  }, [reviews, langFilter]);

  const sentiments = ["Positive", "Mixed", "Negative", "Neutral"] as const;

  return (
    <section className="glass-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-amber-gold" />
            <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
              Critics & Top 10 YouTube Reviews
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Aggregated Hindi & Telugu critic verdicts · click any review card to watch inside BoxOffice Hub
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Language Filter Pills */}
          <div className="inline-flex rounded-xl border border-white/10 bg-zinc-900/90 p-1">
            {(["All", "Hindi", "Telugu"] as const).map((lang) => {
              const isSelected = langFilter === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLangFilter(lang)}
                  className={cn(
                    "relative rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                    isSelected ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="reviewLangFilter"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-lg border border-emerald/40 bg-emerald/20"
                    />
                  )}
                  <span className="relative z-10">{lang}</span>
                </button>
              );
            })}
          </div>

          {onRefreshReviews && (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={onRefreshReviews}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald/40 hover:bg-emerald/10 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Syncing YouTube..." : "Refresh Live"}
            </button>
          )}
        </div>
      </div>

      {/* Sentiment Consensus Bar */}
      <div className="mt-5 rounded-xl border border-white/[0.07] bg-zinc-900/60 p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-zinc-300">
            Critic Sentiment Consensus ({reviews.length} channels)
          </span>
          <div className="flex flex-wrap gap-3 tabular-nums">
            {sentiments.map((s) => {
              const bucket = sentimentDistribution[s] || { count: 0, pct: 0 };
              if (bucket.count === 0) return null;
              return (
                <span key={s} className={cn("font-semibold", SENTIMENT_META[s].color)}>
                  {s}: {bucket.count} ({bucket.pct}%)
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          {sentiments.map((s) => {
            const pct = sentimentDistribution[s]?.pct || 0;
            if (pct <= 0) return null;
            return (
              <motion.div
                key={s}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className={cn("h-full", SENTIMENT_META[s].bar)}
              />
            );
          })}
        </div>
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="glass-card h-64 animate-pulse p-3.5">
              <div className="aspect-video w-full rounded-xl bg-zinc-800/80" />
              <div className="mt-3 h-3 w-1/2 rounded bg-zinc-800" />
              <div className="mt-2 h-4 w-5/6 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredReviews.map((review) => {
          const sentimentStyle = SENTIMENT_META[review.sentiment_tag] || SENTIMENT_META.Neutral;
          return (
            <SpotlightCard
              key={`${review.channel_name}-${review.video_id}`}
              spotlightColor="rgba(245, 158, 11, 0.14)"
              onClick={() =>
                setActiveVideo({
                  video_id: review.video_id,
                  title: review.title,
                  channel_name: review.channel_name,
                  duration: review.duration,
                })
              }
              className="cursor-pointer p-3.5 transition-transform duration-200 hover:-translate-y-0.5"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900">
                <img
                  src={review.thumbnail_url}
                  alt={review.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/40">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white backdrop-blur-md transition-transform duration-200 group-hover:scale-110 group-hover:border-emerald group-hover:bg-emerald group-hover:text-obsidian">
                    <Play className="h-4 w-4 fill-current pl-0.5" />
                  </div>
                </div>

                <span className="absolute left-2 top-2 rounded-md border border-white/15 bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-zinc-200 backdrop-blur-sm">
                  {review.language}
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                  {review.duration}
                </span>
              </div>

              {/* Meta */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-emerald-400">
                    {review.channel_name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      sentimentStyle.badge
                    )}
                  >
                    {review.sentiment_tag}
                  </span>
                </div>

                <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100">
                  {review.title}
                </h3>

                <div className="flex items-center justify-between pt-1 text-xs text-zinc-400 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {formatViewCount(review.view_count)} views
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(review.published_at)}
                  </span>
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
      )}

      <TrailerModal
        isOpen={Boolean(activeVideo)}
        onClose={() => setActiveVideo(null)}
        video={activeVideo}
      />
    </section>
  );
}
