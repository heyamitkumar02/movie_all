import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, Film, MessageSquareQuote } from "lucide-react";

export const metadata: Metadata = {
  title: "About & Methodology",
  description: "How BoxOffice Hub tracks Indian cinema box office collections, breakdowns, and YouTube critic consensus.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-obsidian px-4 py-12 text-zinc-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to BoxOffice Hub
        </Link>

        <div className="glass-card space-y-6 p-6 sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              About BoxOffice Hub
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              BoxOffice Hub is an independent Indian cinema analytics platform built for film
              enthusiasts, trade watchers, and moviegoers across Hindi, Telugu, Tamil, Malayalam,
              Kannada, and regional film industries.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <BarChart3 className="h-5 w-5 text-emerald" />
              <h2 className="mt-2 text-sm font-semibold text-white">Multi-Dimensional Data</h2>
              <p className="mt-1 text-xs text-zinc-400">
                Daily India Gross trajectories, occupancy %, ATP, and 34-state / city / format
                breakdowns.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <Film className="h-5 w-5 text-amber-gold" />
              <h2 className="mt-2 text-sm font-semibold text-white">Official Trailers</h2>
              <p className="mt-1 text-xs text-zinc-400">
                Cinema-mode official trailers sourced cleanly via YouTube Data API v3.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <MessageSquareQuote className="h-5 w-5 text-rose-400" />
              <h2 className="mt-2 text-sm font-semibold text-white">Top 10 Critics Hub</h2>
              <p className="mt-1 text-xs text-zinc-400">
                Aggregated reviews and sentiment consensus from top Hindi &amp; Telugu YouTube
                channels.
              </p>
            </div>
          </div>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="font-display text-base font-semibold text-white">Data Disclaimer</h2>
            <p>
              Box office estimates, occupancy percentages, and regional shares combine reported
              industry figures with modeled territory distributions for analytical visualization. All
              movie posters, trailers, and review videos belong to their respective studios and
              creators.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
