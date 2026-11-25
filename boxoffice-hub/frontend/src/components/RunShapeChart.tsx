"use client";

import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { DailySummary } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RunShapeChartProps {
  dailySummaries: DailySummary[];
  selectedDay: number | "advance";
  onSelectDay?: (dayNumber: number) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      day_number: number;
      name: string;
      date: string;
      grossCr: number;
      grossFormatted: string;
      ticketsL: number;
      occupancy: number;
    };
  }>;
  metric: "gross" | "tickets";
}

function ChartTooltip({ active, payload, metric }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/15 bg-[#121216]/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
        <span className="text-xs font-semibold text-white">{item.name}</span>
        <span className="text-[11px] text-zinc-400 tabular-nums">{item.date}</span>
      </div>
      <div className="mt-2 space-y-1 text-xs tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">India Gross</span>
          <span className="font-bold text-emerald-400">{item.grossFormatted}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Tickets Sold</span>
          <span className="font-semibold text-zinc-200">
            {metric === "tickets"
              ? `${item.ticketsL.toFixed(2)} L`
              : `${item.ticketsL.toFixed(1)} L`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Occupancy</span>
          <span className="font-semibold text-amber-gold">{item.occupancy}%</span>
        </div>
      </div>
    </div>
  );
}

export function RunShapeChart({
  dailySummaries,
  selectedDay,
  onSelectDay,
}: RunShapeChartProps) {
  const [metric, setMetric] = useState<"gross" | "tickets">("gross");

  const data = useMemo(
    () =>
      dailySummaries.map((d) => ({
        day_number: d.day_number,
        name: d.day_label,
        date: d.date,
        grossCr: Number((d.gross_inr / 10_000_000).toFixed(2)),
        grossFormatted: d.gross_formatted,
        ticketsL: Number((d.tickets_sold / 100_000).toFixed(2)),
        occupancy: d.occupancy_pct,
      })),
    [dailySummaries]
  );

  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald" />
            <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
              Box Office Run Trajectory
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Day-by-day Indian gross curve · click any point to inspect that day
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-white/10 bg-zinc-900/90 p-1">
          <button
            type="button"
            onClick={() => setMetric("gross")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition",
              metric === "gross" ? "bg-emerald/20 text-emerald-400" : "text-zinc-400 hover:text-white"
            )}
          >
            Gross (₹ Cr)
          </button>
          <button
            type="button"
            onClick={() => setMetric("tickets")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition",
              metric === "tickets"
                ? "bg-amber-gold/20 text-amber-gold"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Tickets (Lakhs)
          </button>
        </div>
      </div>

      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            onClick={(state) => {
              const idx = state?.activeTooltipIndex;
              if (typeof idx === "number" && data[idx] && onSelectDay) {
                onSelectDay(data[idx].day_number);
              }
            }}
          >
            <defs>
              <linearGradient id="runEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.38} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="runAmberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.36} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#71717A", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (metric === "gross" ? `₹${v}Cr` : `${v}L`)}
              width={60}
            />
            <Tooltip content={<ChartTooltip metric={metric} />} />
            <Area
              type="monotone"
              dataKey={metric === "gross" ? "grossCr" : "ticketsL"}
              stroke={metric === "gross" ? "#10B981" : "#F59E0B"}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={metric === "gross" ? "url(#runEmeraldGrad)" : "url(#runAmberGrad)"}
              activeDot={{
                r: 5,
                fill: metric === "gross" ? "#10B981" : "#F59E0B",
                stroke: "#09090B",
                strokeWidth: 2,
              }}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (typeof cx !== "number" || typeof cy !== "number") return <g key="empty" />;
                const isSelected = selectedDay === payload.day_number;
                if (!isSelected) return <g key={`dot-${payload.day_number}`} />;
                return (
                  <circle
                    key={`active-${payload.day_number}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
