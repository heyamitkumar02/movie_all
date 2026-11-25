"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, ChevronDown, ChevronUp, Layers, Ticket } from "lucide-react";
import type { AdvanceBooking, Breakdown } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BreakdownTablesProps {
  breakdowns: Record<string, Breakdown[]>;
  activeDayLabel: string;
  isAdvanceView?: boolean;
  advanceBookings?: AdvanceBooking[];
  loading?: boolean;
}

const TAB_CONFIG = [
  { key: "time_slot", label: "Time Slots" },
  { key: "city", label: "Top Cities" },
  { key: "state", label: "State-wise" },
  { key: "area", label: "AP/TG Area-wise" },
  { key: "language", label: "Language-wise" },
  { key: "format", label: "Format-wise" },
] as const;

type SortField = "gross_inr" | "share_pct" | "tickets_sold" | "atp_inr" | "shows" | "occupancy_pct" | "housefull";

export function BreakdownTables({
  breakdowns,
  activeDayLabel,
  isAdvanceView = false,
  advanceBookings = [],
  loading = false,
}: BreakdownTablesProps) {
  const availableTabs = useMemo(
    () => TAB_CONFIG.filter((t) => (breakdowns[t.key]?.length ?? 0) > 0),
    [breakdowns]
  );

  const [activeTab, setActiveTab] = useState<string>("time_slot");
  const [sortField, setSortField] = useState<SortField>("gross_inr");
  const [sortAsc, setSortAsc] = useState(false);
  const [showAllStates, setShowAllStates] = useState(false);

  const effectiveTab = availableTabs.some((t) => t.key === activeTab)
    ? activeTab
    : availableTabs[0]?.key || "time_slot";

  const rows = useMemo(() => {
    const raw = [...(breakdowns[effectiveTab] || [])];
    raw.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? valA - valB : valB - valA;
    });
    if (effectiveTab === "state" && !showAllStates && raw.length > 20) {
      return raw.slice(0, 20);
    }
    return raw;
  }, [breakdowns, effectiveTab, sortField, sortAsc, showAllStates]);

  const totalStateCount = breakdowns.state?.length || 0;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (isAdvanceView) {
    return (
      <section className="glass-card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Ticket className="h-5 w-5 text-amber-gold" />
          <div>
            <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
              Advance Booking Tracker
            </h2>
            <p className="text-xs text-zinc-400">
              Pre-sales across national chains and regional centres
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-400">
                <th className="py-3 pr-4">Target Date</th>
                <th className="py-3 px-4">Advance Gross</th>
                <th className="py-3 px-4">Tickets Sold</th>
                <th className="py-3 px-4">Shows</th>
                <th className="py-3 px-4">Theatres</th>
                <th className="py-3 px-4">Occupancy</th>
                <th className="py-3 pl-4">FF / HF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] tabular-nums">
              {advanceBookings.map((adv) => (
                <tr key={adv.id} className="transition hover:bg-white/[0.03]">
                  <td className="py-3.5 pr-4 font-semibold text-white">{adv.target_date}</td>
                  <td className="py-3.5 px-4 font-bold text-amber-gold">{adv.gross_formatted}</td>
                  <td className="py-3.5 px-4 text-zinc-200">
                    {adv.tickets_sold.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {adv.shows.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {adv.theatres.toLocaleString("en-IN")} ({adv.cities} cities)
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400">{adv.occupancy_pct}%</td>
                  <td className="py-3.5 pl-4 text-zinc-400">
                    {adv.fast_filling} / {adv.housefull}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald" />
            <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
              Multi-Dimensional Breakdown · {activeDayLabel}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Click column headers to sort · switch across time slots, cities, states, AP/TG, languages & formats
          </p>
        </div>

        {/* Pill Tab Bar */}
        <div className="hide-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/90 p-1">
          {availableTabs.map((tab) => {
            const isActive = effectiveTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="breakdownTab"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-emerald/20 border border-emerald/35"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 py-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-zinc-900/80" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${effectiveTab}-${activeDayLabel}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-400">
                    <th className="py-3 pr-4 font-semibold">Segment</th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("gross_inr")}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        Gross <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("share_pct")}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        Share % <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("tickets_sold")}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        Tickets <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("atp_inr")}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        ATP <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("shows")}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        Shows <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("occupancy_pct")}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        Occupancy <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 pl-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("housefull")}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        FF / HF <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] tabular-nums">
                  {rows.map((row) => (
                    <tr
                      key={`${row.breakdown_type}-${row.dimension_name}`}
                      className="transition-colors hover:bg-white/[0.04]"
                    >
                      <td className="py-3 pr-4 font-medium text-white">
                        {row.dimension_name}
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-400">
                        {row.gross_formatted}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-emerald"
                              style={{ width: `${Math.min(100, row.share_pct)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-300">{row.share_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-zinc-200">
                        {row.tickets_sold.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 text-zinc-300">{row.atp_formatted}</td>
                      <td className="py-3 px-3 text-zinc-300">
                        {row.shows.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-semibold",
                            row.occupancy_pct >= 70
                              ? "bg-emerald/15 text-emerald-400"
                              : row.occupancy_pct >= 40
                              ? "bg-amber-gold/15 text-amber-gold"
                              : "bg-zinc-800 text-zinc-300"
                          )}
                        >
                          {row.occupancy_pct}%
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-xs text-zinc-400">
                        {row.fast_filling.toLocaleString("en-IN")} /{" "}
                        <span className="text-amber-gold">{row.housefull.toLocaleString("en-IN")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {effectiveTab === "state" && totalStateCount > 20 && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllStates((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/90 px-4 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald/40 hover:text-white"
                >
                  {showAllStates ? (
                    <>
                      Show Top 20 States <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Show All {totalStateCount} States & UTs <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
