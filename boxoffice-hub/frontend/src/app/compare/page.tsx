"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ArrowLeftRight, Flame, Trophy } from "lucide-react";
import { Aurora } from "@/components/reactbits/Aurora";
import { SplitText } from "@/components/reactbits/SplitText";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { fetchMovies, type MovieListItem } from "@/lib/api";

export default function ComparePage() {
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [slugA, setSlugA] = useState<string>("");
  const [slugB, setSlugB] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies()
      .then((list) => {
        setMovies(list);
        if (list.length >= 2) {
          setSlugA(list[0].movie.slug);
          setSlugB(list[1].movie.slug);
        } else if (list.length === 1) {
          setSlugA(list[0].movie.slug);
          setSlugB(list[0].movie.slug);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const movieA = useMemo(() => movies.find((m) => m.movie.slug === slugA) || null, [movies, slugA]);
  const movieB = useMemo(() => movies.find((m) => m.movie.slug === slugB) || null, [movies, slugB]);

  const chartData = useMemo(() => {
    if (!movieA || !movieB) return [];
    const mapA = new Map(movieA.daily_summaries.map((d) => [d.day_number, d]));
    const mapB = new Map(movieB.daily_summaries.map((d) => [d.day_number, d]));
    const maxDay = Math.max(
      ...movieA.daily_summaries.map((d) => d.day_number),
      ...movieB.daily_summaries.map((d) => d.day_number),
      1
    );
    const rows = [];
    for (let day = 1; day <= Math.min(maxDay, 30); day++) {
      const a = mapA.get(day);
      const b = mapB.get(day);
      if (!a && !b) continue;
      rows.push({
        day: `Day ${day}`,
        grossA: a ? Number((a.gross_inr / 10_000_000).toFixed(2)) : null,
        grossB: b ? Number((b.gross_inr / 10_000_000).toFixed(2)) : null,
      });
    }
    return rows;
  }, [movieA, movieB]);

  return (
    <main className="min-h-screen bg-obsidian pb-20 text-white">
      <section className="relative overflow-hidden border-b border-white/[0.08] pb-10 pt-8">
        <Aurora
          colorOne="rgba(16, 185, 129, 0.22)"
          colorTwo="rgba(245, 158, 11, 0.18)"
          colorThree="rgba(99, 102, 241, 0.14)"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Releases
          </Link>

          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ArrowLeftRight className="h-4 w-4" />
            HEAD-TO-HEAD BOX OFFICE CLASH
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            <SplitText text="Compare Any Two Movies" splitBy="words" />
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Overlay Day 1–30 Indian box office trajectories, opening day power, occupancy, and ATP across {movies.length} tracked Indian films.
          </p>

          {/* Selectors */}
          {!loading && movies.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="glass-card p-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Movie A (Emerald)
                </label>
                <select
                  value={slugA}
                  onChange={(e) => setSlugA(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-medium text-white outline-none focus:border-emerald"
                >
                  {movies.map((m) => (
                    <option key={m.movie.slug} value={m.movie.slug}>
                      {m.movie.title} ({m.kpis.india_gross_formatted})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-xs font-bold text-zinc-300">
                  VS
                </span>
              </div>

              <div className="glass-card p-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-amber-gold">
                  Movie B (Amber)
                </label>
                <select
                  value={slugB}
                  onChange={(e) => setSlugB(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-medium text-white outline-none focus:border-amber-gold"
                >
                  {movies.map((m) => (
                    <option key={m.movie.slug} value={m.movie.slug}>
                      {m.movie.title} ({m.kpis.india_gross_formatted})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {movieA && movieB && (
        <section className="mx-auto mt-8 max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Metric Comparison Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "India Gross",
                valA: movieA.kpis.india_gross_formatted,
                valB: movieB.kpis.india_gross_formatted,
                winA: movieA.kpis.india_gross >= movieB.kpis.india_gross,
              },
              {
                label: "Best Single Day",
                valA: `${movieA.kpis.best_day.gross_formatted} (${movieA.kpis.best_day.day_label})`,
                valB: `${movieB.kpis.best_day.gross_formatted} (${movieB.kpis.best_day.day_label})`,
                winA: movieA.kpis.best_day.gross_inr >= movieB.kpis.best_day.gross_inr,
              },
              {
                label: "Latest Occupancy",
                valA: `${movieA.kpis.occupancy_pct}%`,
                valB: `${movieB.kpis.occupancy_pct}%`,
                winA: movieA.kpis.occupancy_pct >= movieB.kpis.occupancy_pct,
              },
              {
                label: "Avg Ticket Price",
                valA: movieA.kpis.atp_formatted,
                valB: movieB.kpis.atp_formatted,
                winA: movieA.kpis.atp >= movieB.kpis.atp,
              },
            ].map((row) => (
              <SpotlightCard key={row.label} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {row.label}
                </p>
                <div className="mt-3 space-y-2 tabular-nums">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2">
                    <span className="truncate text-xs text-zinc-300">{movieA.movie.title}</span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-400">
                      {row.winA && <Trophy className="h-3.5 w-3.5" />}
                      {row.valA}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-gold/20 bg-amber-gold/10 px-3 py-2">
                    <span className="truncate text-xs text-zinc-300">{movieB.movie.title}</span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-amber-gold">
                      {!row.winA && <Trophy className="h-3.5 w-3.5" />}
                      {row.valB}
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Overlaid Day-by-Day Chart */}
          <div className="glass-card p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-gold" />
              <h2 className="font-display text-lg font-semibold text-white">
                Day-by-Day Gross Comparison (₹ Cr)
              </h2>
            </div>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#71717A", fontSize: 11 }} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#71717A", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}Cr`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#121216",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="grossA"
                    name={movieA.movie.title}
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="grossB"
                    name={movieB.movie.title}
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
