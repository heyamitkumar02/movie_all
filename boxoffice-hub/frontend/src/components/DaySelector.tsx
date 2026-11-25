"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DayOption {
  day_number: number;
  day_label: string;
  is_live: boolean;
}

interface DaySelectorProps {
  days: DayOption[];
  selectedDay: number | "advance";
  hasAdvanceBookings: boolean;
  onSelectDay: (day: number | "advance") => void;
}

export function DaySelector({
  days,
  selectedDay,
  hasAdvanceBookings,
  onSelectDay,
}: DaySelectorProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedDay]);

  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.08] bg-obsidian/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto">
          {days.map((day) => {
            const isSelected = selectedDay === day.day_number;
            return (
              <button
                key={day.day_number}
                ref={isSelected ? activeRef : undefined}
                type="button"
                onClick={() => onSelectDay(day.day_number)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  isSelected ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="activeDayPill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full border border-emerald/40 bg-emerald/20"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {day.is_live && (
                    <span className="h-2 w-2 rounded-full bg-emerald animate-pulse-live" />
                  )}
                  {day.day_label}
                </span>
              </button>
            );
          })}

          {hasAdvanceBookings && (
            <button
              ref={selectedDay === "advance" ? activeRef : undefined}
              type="button"
              onClick={() => onSelectDay("advance")}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                selectedDay === "advance" ? "text-white" : "text-amber-gold/80 hover:text-amber-gold"
              )}
            >
              {selectedDay === "advance" && (
                <motion.span
                  layoutId="activeDayPill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-full border border-amber-gold/40 bg-amber-gold/20"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" />
                Advance Booking
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
