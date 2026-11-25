"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  Clapperboard,
  Flame,
  Globe,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { Aurora } from "@/components/reactbits/Aurora";
import { SplitText } from "@/components/reactbits/SplitText";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { CountUp } from "@/components/reactbits/CountUp";
import { TiltedCard } from "@/components/reactbits/TiltedCard";
import { TrailerModal, type VideoModalData } from "@/components/TrailerModal";
import {
  discoverMovies,
  fetchMovies,
  fetchTrailer,
  syncCatalog,
  trackMovie,
  type DiscoverMovieItem,
  type MovieListItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const LANGUAGE_FILTERS = [
  "All",
  "Hindi",
  "Telugu",
  "Tamil",
  "Malayalam",
  "Kannada",
  "Marathi",
  "Punjabi",
  "Bengali",
  "Gujarati",
] as const;

const PAGE_SIZE = 24;

function MoviePoster({
  title,
  director,
  posterUrl,
}: {
  title: string;
  director: string;
  posterUrl: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!failed && posterUrl) {
    return (
      <img
        src={posterUrl}
        alt={`${title} poster`}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald/20 p-4 text-center">
      <Clapperboard className="mb-2 h-8 w-8 text-zinc-500" />
      <p className="font-display text-sm font-bold text-white line-clamp-2">{title}</p>
      <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1">{director}</p>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RUNNING" | "COMPLETED">("ALL");
  const [langFilter, setLangFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [modalVideo, setModalVideo] = useState<VideoModalData | null>(null);

  const [discoverResults, setDiscoverResults] = useState<DiscoverMovieItem[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [trackingTitle, setTrackingTitle] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);

  const loadMovies = useCallback(async () => {
    const data = await fetchMovies();
    setMovies(data);
  }, []);

  useEffect(() => {
    let active = true;
    fetchMovies()
      .then((data) => {
        if (active) setMovies(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced live discovery across all Indian cinema whenever user searches
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDiscoverResults([]);
      setDiscovering(false);
      return;
    }
    setDiscovering(true);
    const timer = setTimeout(() => {
      discoverMovies(q)
        .then((res) => setDiscoverResults(res))
        .finally(() => setDiscovering(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const langCounts = useMemo(() => {
    const counts: Record<string, number> = { All: movies.length };
    for (const item of movies) {
      for (const l of item.movie.languages) {
        counts[l] = (counts[l] || 0) + 1;
      }
    }
    return counts;
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.movie.status === statusFilter;
      const matchesLang =
        langFilter === "All" ||
        item.movie.languages.some((l) => l.toLowerCase() === langFilter.toLowerCase());
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.movie.title.toLowerCase().includes(q) ||
        item.movie.director.toLowerCase().includes(q) ||
        item.movie.cast.some((c) => c.toLowerCase().includes(q));
      return matchesStatus && matchesLang && matchesQuery;
    });
  }, [movies, statusFilter, langFilter, query]);

  const displayedMovies = useMemo(
    () => filteredMovies.slice(0, visibleCount),
    [filteredMovies, visibleCount]
  );

  const totalTrackedGrossCr = useMemo(
    () => movies.reduce((acc, m) => acc + m.kpis.india_gross, 0) / 10_000_000,
    [movies]
  );

  const liveCount = useMemo(
    () => movies.filter((m) => m.movie.status === "RUNNING").length,
    [movies]
  );

  const handleQuickTrailer = async (e: React.MouseEvent, item: MovieListItem) => {
    e.preventDefault();
    e.stopPropagation();
    const t = await fetchTrailer(item.movie.slug);
    if (t) {
      setModalVideo({
        video_id: t.video_id,
        title: t.title,
        channel_name: t.channel_name,
        duration: t.duration,
      });
    }
  };

  const handleTrackAndOpen = async (item: DiscoverMovieItem) => {
    if (item.tracked_slug) {
      router.push(`/movie/${item.tracked_slug}`);
      return;
    }
    setTrackingTitle(item.title);
    try {
      const created = await trackMovie(item);
      if (created) {
        await loadMovies();
        router.push(`/movie/${created.slug}`);
      }
    } finally {
      setTrackingTitle(null);
    }
  };

  const handleSyncCatalog = async () => {
    setSyncing(true);
    setSyncBanner(null);
    try {
      const stats = await syncCatalog();
      await loadMovies();
      if (stats) {
        setSyncBanner(
          `Synced Indian Box Office: +${stats.added} new, ${stats.updated} updated (${stats.total_in_db} total movies)`
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  const externalDiscoverMatches = useMemo(
    () => discoverResults.filter((d) => !d.tracked_slug),
    [discoverResults]
  );

  return (
    <main className="min-h-screen bg-obsidian text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/[0.08] pb-10 pt-10 sm:pt-14">
        <Aurora
          colorOne="rgba(16, 185, 129, 0.24)"
          colorTwo="rgba(245, 158, 11, 0.16)"
          colorThree="rgba(59, 130, 246, 0.14)"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/15 px-3.5 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald animate-pulse-live" />
              ALL-INDIA BOX OFFICE TELEMETRY · LIVE AUTO-SYNC
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 rounded-full border border-amber-gold/35 bg-amber-gold/10 px-4 py-1.5 text-xs font-semibold text-amber-gold backdrop-blur-md transition hover:border-amber-gold/60 hover:bg-amber-gold/20"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Compare Clash
              </Link>
              <button
                type="button"
                onClick={handleSyncCatalog}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-md transition hover:border-emerald/40 hover:bg-emerald/15 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-emerald", syncing && "animate-spin")} />
                {syncing ? "Syncing India Releases..." : "Sync Latest India Releases"}
              </button>
            </div>
          </div>

          {syncBanner && (
            <div className="mt-3 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-2 text-xs font-medium text-emerald-300">
              {syncBanner}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                <SplitText text="BoxOffice Hub" splitBy="chars" delay={0.025} />
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Pan-India live Box Office tracker across Bollywood, Tollywood, Kollywood,
                Mollywood, Sandalwood & regional cinema — with 34-state breakdowns, official
                trailers, and Top 10 YouTube critic reviews.
              </p>
            </div>

            {/* Summary Metrics Strip */}
            <div className="grid grid-cols-3 gap-3">
              <SpotlightCard className="p-3.5 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400">Tracked Gross</p>
                <div className="mt-1 font-display text-lg font-bold text-emerald-400 sm:text-2xl">
                  <CountUp end={totalTrackedGrossCr} prefix="₹" suffix=" Cr" decimals={0} />
                </div>
              </SpotlightCard>
              <SpotlightCard className="p-3.5 sm:p-4" spotlightColor="rgba(245, 158, 11, 0.16)">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400">Catalog Size</p>
                <div className="mt-1 font-display text-lg font-bold text-white sm:text-2xl">
                  <CountUp end={movies.length} suffix=" Films" />
                </div>
              </SpotlightCard>
              <SpotlightCard className="p-3.5 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400">In Theatres</p>
                <div className="mt-1 font-display text-lg font-bold text-amber-gold sm:text-2xl">
                  <CountUp end={liveCount} suffix=" Live" />
                </div>
              </SpotlightCard>
            </div>
          </div>

          {/* Search + Status Filter Controls */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl border border-white/10 bg-zinc-glass/90 p-1">
              {(
                [
                  { id: "ALL", label: `All Releases (${movies.length})` },
                  { id: "RUNNING", label: `Live Running (${liveCount})` },
                  { id: "COMPLETED", label: "Completed Runs" },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={cn(
                      "relative rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                      isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="homeFilterTab"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 rounded-lg border border-emerald/40 bg-emerald/20"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search ANY Indian movie, actor, or director..."
                className="w-full rounded-xl border border-white/10 bg-zinc-glass/90 py-2.5 pl-9 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald/50"
              />
              {discovering && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald" />
              )}
            </div>
          </div>

          {/* Language / Industry Filter Rail */}
          <div className="hide-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {LANGUAGE_FILTERS.map((lang) => {
              const count = langCounts[lang] || 0;
              if (lang !== "All" && count === 0) return null;
              const isSelected = langFilter === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setLangFilter(lang);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1 text-xs font-semibold transition",
                    isSelected
                      ? "border-emerald/50 bg-emerald/20 text-emerald-300"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  )}
                >
                  {lang} <span className="ml-1 text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Universal Discovery Panel when searching */}
          {query.trim().length >= 2 && externalDiscoverMatches.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-gold/25 bg-zinc-glass/95 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-gold">
                  <Globe className="h-3.5 w-3.5" />
                  More Indian Cinema Matches (Live Discovery — Click to Auto-Track & Open)
                </span>
                <span className="text-zinc-400">Fetches trailer, reviews & breakdown automatically</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {externalDiscoverMatches.slice(0, 6).map((item) => (
                  <div
                    key={`${item.source}-${item.title}-${item.year}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/80 p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                        {item.poster_url ? (
                          <img
                            src={item.poster_url}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Clapperboard className="h-4 w-4 text-zinc-500" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">
                          {item.title} ({item.year})
                        </p>
                        <p className="truncate text-[11px] text-zinc-400">
                          {item.cast.slice(0, 2).join(", ") || item.source.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={trackingTitle === item.title}
                      onClick={() => handleTrackAndOpen(item)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald/40 bg-emerald/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald/25 disabled:opacity-50"
                    >
                      {trackingTitle === item.title ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Track
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Movies Bento Grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-amber-gold" />
            <p className="text-base font-semibold text-zinc-200">
              No local catalog match for &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {discoverResults.length > 0
                ? "Click 'Track' on any discovered movie above to generate its live Box Office & Review hub."
                : "Try searching with the movie's English title or clearing filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {displayedMovies.map((item) => {
                const { movie, kpis, daily_summaries } = item;
                const isLive = movie.status === "RUNNING";
                const indiaCr = kpis.india_gross / 10_000_000;

                return (
                  <Link key={movie.slug} href={`/movie/${movie.slug}`} className="block">
                    <SpotlightCard
                      spotlightColor={
                        isLive ? "rgba(16, 185, 129, 0.22)" : "rgba(245, 158, 11, 0.16)"
                      }
                      className="h-full p-5 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[135px_1fr]">
                        {/* Poster */}
                        <TiltedCard tiltMaxAngle={9} glareEnabled scale={1.03}>
                          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/15 bg-zinc-900">
                            <MoviePoster
                              title={movie.title}
                              director={movie.director}
                              posterUrl={movie.poster_url}
                            />
                          </div>
                        </TiltedCard>

                        {/* Info */}
                        <div className="flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              {isLive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/35 bg-emerald/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse-live" />
                                  LIVE · {kpis.today_day_label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-800/80 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                                  <Activity className="h-3 w-3 text-amber-gold" />
                                  {daily_summaries.length}-Day Run
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-emerald-400">
                                Open Tracker <ArrowUpRight className="h-3.5 w-3.5" />
                              </span>
                            </div>

                            <h2 className="mt-2.5 font-display text-xl font-bold text-white line-clamp-1 sm:text-2xl">
                              {movie.title}
                            </h2>
                            <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                              {movie.director} · {movie.release_date}
                            </p>

                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {movie.genres.map((g) => (
                                <span
                                  key={g}
                                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-zinc-300"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Stats + Quick Trailer */}
                          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] bg-zinc-900/70 p-3 tabular-nums">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                                India Gross
                              </p>
                              <p className="mt-0.5 text-sm font-bold text-emerald-400 sm:text-base">
                                <CountUp end={indiaCr} prefix="₹" suffix=" Cr" decimals={1} />
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                                Peak Day
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-amber-gold sm:text-base">
                                <Flame className="h-3.5 w-3.5 shrink-0" />
                                {kpis.best_day.gross_formatted}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                                {kpis.today_day_label} Occ.
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-white sm:text-base">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald" />
                                {kpis.occupancy_pct}%
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] text-zinc-400">
                              {movie.languages.join(" · ")}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuickTrailer(e, item)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-zinc-200 transition hover:border-emerald/50 hover:bg-emerald/15 hover:text-white"
                            >
                              <Play className="h-3 w-3 fill-current text-emerald" />
                              Trailer
                            </button>
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  </Link>
                );
              })}
            </div>

            {visibleCount < filteredMovies.length && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="rounded-full border border-white/15 bg-zinc-glass px-6 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald/40 hover:bg-emerald/15 hover:text-white"
                >
                  Load More Releases ({filteredMovies.length - visibleCount} remaining)
                </button>
              </div>
            )}

            <AdSlot
              slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME}
              format="horizontal"
              className="mt-8"
            />
          </>
        )}
      </section>

      <TrailerModal
        isOpen={Boolean(modalVideo)}
        onClose={() => setModalVideo(null)}
        video={modalVideo}
      />
    </main>
  );
}
