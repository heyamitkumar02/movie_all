"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, Clapperboard, Film, Flame, Play, Share2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Aurora } from "./reactbits/Aurora";
import { TiltedCard } from "./reactbits/TiltedCard";
import { SplitText } from "./reactbits/SplitText";
import { SpotlightCard } from "./reactbits/SpotlightCard";
import { CountUp } from "./reactbits/CountUp";
import { ShinyText } from "./reactbits/ShinyText";
import type { KPIs, Milestone, Movie } from "@/lib/api";
import { cn } from "@/lib/utils";

interface HeroBentoProps {
  movie: Movie;
  kpis: KPIs;
  milestones: Milestone[];
  activeDayLabel: string;
  isLiveDay: boolean;
  onWatchTrailer: () => void;
}

function getMoodColors(slug: string): [string, string, string] {
  if (slug.includes("pushpa")) {
    return ["rgba(244, 63, 94, 0.25)", "rgba(245, 158, 11, 0.20)", "rgba(16, 185, 129, 0.14)"];
  }
  if (slug.includes("kalki")) {
    return ["rgba(16, 185, 129, 0.24)", "rgba(59, 130, 246, 0.20)", "rgba(245, 158, 11, 0.14)"];
  }
  if (slug.includes("daaku")) {
    return ["rgba(245, 158, 11, 0.26)", "rgba(244, 63, 94, 0.18)", "rgba(16, 185, 129, 0.15)"];
  }
  return ["rgba(16, 185, 129, 0.24)", "rgba(245, 158, 11, 0.18)", "rgba(99, 102, 241, 0.16)"];
}

export function HeroBento({
  movie,
  kpis,
  milestones,
  activeDayLabel,
  isLiveDay,
  onWatchTrailer,
}: HeroBentoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [c1, c2, c3] = getMoodColors(movie.slug);

  const indiaGrossCr = kpis.india_gross / 10_000_000;
  const todayGrossCr = kpis.today_gross / 10_000_000;
  const isTodayInLakhs = todayGrossCr < 1 && kpis.today_gross > 0;
  const nextTargetIdx = milestones.findIndex((m) => !m.achieved);

  const verdictLabel =
    indiaGrossCr >= 500
      ? "All-Time Blockbuster"
      : indiaGrossCr >= 250
      ? "Blockbuster"
      : indiaGrossCr >= 100
      ? "Super Hit"
      : indiaGrossCr >= 50
      ? "Hit"
      : movie.status === "RUNNING"
      ? "In Theatres"
      : "Theatrical Run";

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${movie.title} · BoxOffice Hub`,
          text: `${movie.title} India Gross: ${kpis.india_gross_formatted}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore clipboard denial
      }
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-white/[0.08] pb-10 pt-6">
      <Aurora colorOne={c1} colorTwo={c2} colorThree={c3} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Releases
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-amber-gold/35 bg-amber-gold/15 px-3 py-1 text-xs font-semibold text-amber-gold">
              {verdictLabel}
            </span>
            {isLiveDay || movie.status === "RUNNING" ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/15 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald animate-pulse-live" />
                LIVE · {activeDayLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-3.5 py-1 text-xs font-medium text-zinc-300">
                <Film className="h-3.5 w-3.5 text-amber-gold" />
                THEATRICAL RUN · {activeDayLabel}
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-200 transition hover:border-emerald/40 hover:bg-emerald/15"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>

        {/* Hero Bento Grid */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[290px_1fr]">
          {/* Left: 3D Interactive Poster */}
          <div className="mx-auto w-full max-w-[290px] lg:mx-0">
            <TiltedCard tiltMaxAngle={11} glareEnabled scale={1.03}>
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/15 bg-zinc-900 shadow-2xl">
                {!imgFailed && movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={`${movie.title} poster`}
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald/20 p-6 pb-14 text-center">
                    <div className="mb-4 rounded-full border border-amber-gold/30 bg-amber-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-gold">
                      BoxOffice Hub
                    </div>
                    <Clapperboard className="mx-auto mb-3 h-12 w-12 text-zinc-500" />
                    <p className="font-display text-xl font-bold text-white">{movie.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">Dir. {movie.director}</p>
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald" />
                      {movie.release_date}
                    </span>
                    <span className="rounded bg-white/10 px-2 py-0.5 font-medium backdrop-blur-sm">
                      {movie.languages.length} Langs
                    </span>
                  </div>
                </div>
              </div>
            </TiltedCard>

            {/* Watch Trailer Magnetic CTA */}
            <button
              type="button"
              onClick={onWatchTrailer}
              className="group relative mt-4 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-emerald/40 bg-emerald/15 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_30px_-8px_rgba(16,185,129,0.5)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald hover:bg-emerald/25 active:translate-y-0"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald text-obsidian transition-transform duration-200 group-hover:scale-110">
                <Play className="h-3.5 w-3.5 fill-current pl-0.5" />
              </span>
              <span>Watch Official Trailer</span>
            </button>
          </div>

          {/* Right: Title, Meta & 6 KPI Bento Cards */}
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                <SplitText text={movie.title} splitBy="words" delay={0.04} />
              </h1>

              <p className="mt-2.5 text-sm text-zinc-400 sm:text-base">
                Directed by <span className="font-medium text-zinc-200">{movie.director}</span>
                {movie.cast.length > 0 && (
                  <>
                    {" · "}
                    Starring{" "}
                    <span className="text-zinc-200">{movie.cast.slice(0, 3).join(", ")}</span>
                  </>
                )}
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-zinc-200"
                  >
                    {genre}
                  </span>
                ))}
                {movie.languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full border border-emerald/20 bg-emerald/10 px-3 py-1 text-xs font-medium text-emerald-400"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* 6 KPI Bento Strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {/* 1. India Gross */}
              <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.22)">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  India Gross
                </p>
                <div className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                  <CountUp end={indiaGrossCr} prefix="₹" suffix=" Cr" decimals={2} />
                </div>
                <p className="mt-1 text-xs text-emerald-400 tabular-nums">
                  {kpis.india_gross_formatted} cumulative
                </p>
              </SpotlightCard>

              {/* 2. Today's / Selected Day Gross */}
              <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.18)">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {activeDayLabel} Gross
                  </p>
                  {kpis.dod_change_pct !== null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                        kpis.dod_change_pct >= 0
                          ? "bg-emerald/15 text-emerald-400"
                          : "bg-rose/15 text-rose-400"
                      )}
                    >
                      {kpis.dod_change_pct >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {kpis.dod_change_pct >= 0 ? "+" : ""}
                      {kpis.dod_change_pct}%
                    </span>
                  )}
                </div>
                <div className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                  {isTodayInLakhs ? (
                    <CountUp
                      end={kpis.today_gross / 100_000}
                      prefix="₹"
                      suffix=" L"
                      decimals={2}
                    />
                  ) : (
                    <CountUp end={todayGrossCr} prefix="₹" suffix=" Cr" decimals={2} />
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-400 tabular-nums">
                  {kpis.tickets_sold.toLocaleString("en-IN")} tickets sold
                </p>
              </SpotlightCard>

              {/* 3. Occupancy % */}
              <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.18)">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Occupancy
                </p>
                <div className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                  <CountUp end={kpis.occupancy_pct} suffix="%" decimals={1} />
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald to-amber-gold transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.occupancy_pct)}%` }}
                  />
                </div>
              </SpotlightCard>

              {/* 4. Shows */}
              <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.18)">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Tracked Shows
                </p>
                <div className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                  <CountUp end={kpis.shows} decimals={0} />
                </div>
                <p className="mt-1 text-xs text-zinc-400 tabular-nums">
                  {kpis.theatres.toLocaleString("en-IN")} theatres · {kpis.cities} cities
                </p>
              </SpotlightCard>

              {/* 5. ATP */}
              <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.18)">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Avg Ticket Price
                </p>
                <div className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                  <CountUp end={kpis.atp} prefix="₹" decimals={0} />
                </div>
                <p className="mt-1 text-xs text-zinc-400 tabular-nums">
                  PIC chains: {kpis.pic_gross_formatted}
                </p>
              </SpotlightCard>

              {/* 6. Best Day */}
              <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.22)">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Best Single Day
                  </p>
                  <Flame className="h-3.5 w-3.5 text-amber-gold" />
                </div>
                <div className="mt-1.5 font-display text-2xl font-bold text-amber-gold-400 sm:text-3xl">
                  <CountUp
                    end={kpis.best_day.gross_inr / 10_000_000}
                    prefix="₹"
                    suffix=" Cr"
                    decimals={2}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Peak on {kpis.best_day.day_label}
                </p>
              </SpotlightCard>
            </div>
          </div>
        </div>

        {/* Milestone Progress Strip */}
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-zinc-glass/80 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-zinc-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-gold" />
              Box Office Milestones
            </span>
            {nextTargetIdx !== -1 ? (
              <span className="text-zinc-400 tabular-nums">
                Next Target:{" "}
                <span className="font-semibold text-amber-gold">
                  {milestones[nextTargetIdx].label}
                </span>{" "}
                ({milestones[nextTargetIdx].progress_pct}%)
              </span>
            ) : (
              <span className="font-semibold text-emerald-400">All Club Milestones Cleared</span>
            )}
          </div>

          <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-1">
            {milestones.map((m, idx) => {
              const isNextTarget = idx === nextTargetIdx;
              return (
                <div
                  key={m.label}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold tabular-nums transition",
                    m.achieved
                      ? "border-amber-gold/40 bg-amber-gold/15 text-amber-gold"
                      : isNextTarget
                      ? "border-amber-gold/50 bg-zinc-900 text-zinc-200 ring-1 ring-amber-gold/30"
                      : "border-white/10 bg-zinc-900/60 text-zinc-500"
                  )}
                >
                  {m.achieved ? (
                    <>
                      <ShinyText>{m.label}</ShinyText>
                      {m.achieved_on_day !== null && (
                        <span className="rounded bg-amber-gold/20 px-1.5 py-0.5 text-[10px] text-amber-gold-400">
                          D{m.achieved_on_day}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>{m.label}</span>
                      {isNextTarget && (
                        <span className="text-[10px] text-amber-gold">{m.progress_pct}%</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
