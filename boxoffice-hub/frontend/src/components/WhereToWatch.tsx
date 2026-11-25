"use client";

import React from "react";
import { Download, ExternalLink, FileJson, FileSpreadsheet, Ticket, Tv } from "lucide-react";
import { SpotlightCard } from "./reactbits/SpotlightCard";
import type { Movie } from "@/lib/api";

interface WhereToWatchProps {
  movie: Movie;
  selectedDay: number | "advance";
}

export function WhereToWatch({ movie, selectedDay }: WhereToWatchProps) {
  const encodedTitle = encodeURIComponent(movie.title);
  const isRunning = movie.status === "RUNNING";

  const ticketPlatforms = [
    {
      name: "BookMyShow",
      subtitle: "Theatre showtimes & seat maps",
      url: `https://in.bookmyshow.com/explore/movies?q=${encodedTitle}`,
      accent: "border-rose/30 bg-rose/10 text-rose-300 hover:border-rose/60",
    },
    {
      name: "District by Zomato",
      subtitle: "Cinema tickets & IMAX/4DX",
      url: `https://www.district.in/movies/?search=${encodedTitle}`,
      accent: "border-amber-gold/30 bg-amber-gold/10 text-amber-gold hover:border-amber-gold/60",
    },
  ];

  const ottPlatforms = [
    {
      name: "Netflix",
      url: `https://www.netflix.com/search?q=${encodedTitle}`,
      badge: "border-rose/25 text-rose-300 hover:border-rose/50",
    },
    {
      name: "Prime Video",
      url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedTitle}`,
      badge: "border-sky-400/25 text-sky-300 hover:border-sky-400/50",
    },
    {
      name: "JioHotstar",
      url: `https://www.hotstar.com/in/explore?search_query=${encodedTitle}`,
      badge: "border-blue-400/25 text-blue-300 hover:border-blue-400/50",
    },
    {
      name: "ZEE5",
      url: `https://www.zee5.com/search?q=${encodedTitle}`,
      badge: "border-purple-400/25 text-purple-300 hover:border-purple-400/50",
    },
    {
      name: "SonyLIV",
      url: `https://www.sonyliv.com/search?q=${encodedTitle}`,
      badge: "border-emerald/25 text-emerald-300 hover:border-emerald/50",
    },
  ];

  const dayQuery = selectedDay !== "advance" ? `&day=${selectedDay}` : "";

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Official Tickets & Streaming */}
      <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.16)" className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-emerald" />
            <h2 className="font-display text-lg font-semibold text-white">
              Official Tickets & Streaming
            </h2>
          </div>
          {isRunning && (
            <span className="rounded-full border border-emerald/35 bg-emerald/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
              IN THEATRES
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Book cinema tickets or check official OTT streaming availability for {movie.title}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ticketPlatforms.map((plat) => (
            <a
              key={plat.name}
              href={plat.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between rounded-xl border p-3.5 transition ${plat.accent}`}
            >
              <div>
                <p className="text-sm font-semibold text-white">{plat.name}</p>
                <p className="text-[11px] text-zinc-400">{plat.subtitle}</p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          ))}
        </div>

        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Tv className="h-3.5 w-3.5 text-zinc-400" />
            Official OTT Platforms
          </p>
          <div className="flex flex-wrap gap-2">
            {ottPlatforms.map((ott) => (
              <a
                key={ott.name}
                href={ott.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-full border bg-zinc-900/80 px-3.5 py-1.5 text-xs font-semibold transition hover:bg-zinc-800 ${ott.badge}`}
              >
                {ott.name}
                <ExternalLink className="h-3 w-3 opacity-75" />
              </a>
            ))}
          </div>
        </div>
      </SpotlightCard>

      {/* Downloadable Box Office Reports */}
      <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.16)" className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-amber-gold" />
          <h2 className="font-display text-lg font-semibold text-white">
            Export Box Office Data
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Download structured daily collections, 34-state breakdowns, and KPI telemetry for offline analysis
        </p>

        <div className="mt-4 space-y-2.5">
          <a
            href={`/api/movies/${encodeURIComponent(movie.slug)}/export?format=csv`}
            download
            className="flex items-center justify-between rounded-xl border border-emerald/30 bg-emerald/10 p-3.5 transition hover:border-emerald/60 hover:bg-emerald/20"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">Full Theatrical Run (.CSV)</p>
                <p className="text-[11px] text-zinc-400">
                  Day-by-day India Gross, ATP, Occupancy, Shows &amp; Tickets
                </p>
              </div>
            </div>
            <Download className="h-4 w-4 text-emerald-400" />
          </a>

          {selectedDay !== "advance" && (
            <a
              href={`/api/movies/${encodeURIComponent(movie.slug)}/export?format=csv${dayQuery}`}
              download
              className="flex items-center justify-between rounded-xl border border-amber-gold/30 bg-amber-gold/10 p-3.5 transition hover:border-amber-gold/60 hover:bg-amber-gold/20"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-amber-gold" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Day {selectedDay} Multi-Dimensional Breakdown (.CSV)
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    All 34 States, Top 20 Cities, Time Slots, AP/TG, Languages &amp; Formats
                  </p>
                </div>
              </div>
              <Download className="h-4 w-4 text-amber-gold" />
            </a>
          )}

          <a
            href={`/api/movies/${encodeURIComponent(movie.slug)}/export?format=json${dayQuery}`}
            download
            className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 transition hover:border-white/25 hover:bg-zinc-800/80"
          >
            <div className="flex items-center gap-3">
              <FileJson className="h-5 w-5 text-zinc-300" />
              <div>
                <p className="text-sm font-semibold text-white">Complete Analytics Bundle (.JSON)</p>
                <p className="text-[11px] text-zinc-400">
                  Structured JSON payload with KPIs, daily run &amp; breakdowns
                </p>
              </div>
            </div>
            <Download className="h-4 w-4 text-zinc-300" />
          </a>
        </div>
      </SpotlightCard>
    </section>
  );
}
