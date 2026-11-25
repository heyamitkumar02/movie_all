"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Popcorn, Star, ThumbsDown, Tv, Users } from "lucide-react";
import { SpotlightCard } from "./reactbits/SpotlightCard";
import { fetchPoll, votePoll, type PollData } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AudiencePollProps {
  slug: string;
  movieTitle: string;
}

export function AudiencePoll({ slug, movieTitle }: AudiencePollProps) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [hoverStar, setHoverStar] = useState(0);
  const [votedRating, setVotedRating] = useState<number | null>(null);
  const [votedVerdict, setVotedVerdict] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPoll(slug).then((data) => {
      if (active && data) setPoll(data);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const handleRate = async (stars: number) => {
    if (votedRating !== null || submitting) return;
    setSubmitting(true);
    setVotedRating(stars);
    try {
      const updated = await votePoll(slug, { rating: stars });
      if (updated) setPoll(updated);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerdict = async (verdict: "theatre" | "ott" | "skip") => {
    if (votedVerdict !== null || submitting) return;
    setSubmitting(true);
    setVotedVerdict(verdict);
    try {
      const updated = await votePoll(slug, { verdict });
      if (updated) setPoll(updated);
    } finally {
      setSubmitting(false);
    }
  };

  if (!poll) return null;

  const totalV = Math.max(1, poll.total_verdict_votes);
  const theatrePct = Math.round((poll.theatre_votes / totalV) * 100);
  const ottPct = Math.round((poll.ott_votes / totalV) * 100);
  const skipPct = Math.max(0, 100 - theatrePct - ottPct);

  const options = [
    {
      id: "theatre" as const,
      label: "Must Watch in Theatre",
      pct: theatrePct,
      votes: poll.theatre_votes,
      icon: Popcorn,
      barColor: "bg-emerald",
      activeBorder: "border-emerald/60 bg-emerald/15 text-emerald-300",
    },
    {
      id: "ott" as const,
      label: "Wait for OTT",
      pct: ottPct,
      votes: poll.ott_votes,
      icon: Tv,
      barColor: "bg-amber-gold",
      activeBorder: "border-amber-gold/60 bg-amber-gold/15 text-amber-gold",
    },
    {
      id: "skip" as const,
      label: "Skip It",
      pct: skipPct,
      votes: poll.skip_votes,
      icon: ThumbsDown,
      barColor: "bg-rose",
      activeBorder: "border-rose/60 bg-rose/15 text-rose-300",
    },
  ];

  return (
    <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.16)" className="p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Star Rating */}
        <div className="space-y-3 lg:w-5/12">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-gold" />
            <h2 className="font-display text-lg font-semibold text-white">
              Audience Pulse · {movieTitle}
            </h2>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl font-extrabold text-amber-gold tabular-nums">
              {poll.avg_rating.toFixed(1)}
            </span>
            <span className="text-sm text-zinc-400">
              / 5.0 ·{" "}
              <span className="font-semibold text-zinc-200 tabular-nums">
                {poll.rating_count.toLocaleString("en-IN")}
              </span>{" "}
              ratings
            </span>
          </div>

          <div>
            <p className="mb-2 text-xs text-zinc-400">
              {votedRating !== null
                ? `You rated ${votedRating} ★ — thanks for voting!`
                : "Rate this movie (1 click):"}
            </p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled =
                  votedRating !== null
                    ? star <= votedRating
                    : hoverStar > 0
                    ? star <= hoverStar
                    : star <= Math.round(poll.avg_rating);
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={votedRating !== null}
                    onMouseEnter={() => setHoverStar(star)}
                    onMouseLeave={() => setHoverStar(0)}
                    onClick={() => handleRate(star)}
                    aria-label={`Rate ${star} stars`}
                    className="rounded-lg p-1 transition hover:scale-110 disabled:cursor-default"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-colors",
                        filled ? "fill-amber-gold text-amber-gold" : "text-zinc-600"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Theatre vs OTT Poll */}
        <div className="space-y-2.5 lg:w-7/12">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-zinc-300">
              Watch Verdict Poll
            </span>
            <span className="text-zinc-400 tabular-nums">
              {poll.total_verdict_votes.toLocaleString("en-IN")} total votes
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = votedVerdict === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={votedVerdict !== null}
                  onClick={() => handleVerdict(opt.id)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-3 text-left transition",
                    isSelected
                      ? opt.activeBorder
                      : "border-white/10 bg-zinc-900/75 hover:border-white/25 disabled:hover:border-white/10"
                  )}
                >
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-bold tabular-nums">{opt.pct}%</span>
                  </div>
                  <p className="relative z-10 mt-1.5 text-xs font-semibold text-white">
                    {opt.label}
                  </p>
                  <p className="relative z-10 text-[10px] text-zinc-400 tabular-nums">
                    {opt.votes.toLocaleString("en-IN")} votes
                  </p>

                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${opt.pct}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className={cn("h-full rounded-full", opt.barColor)}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
