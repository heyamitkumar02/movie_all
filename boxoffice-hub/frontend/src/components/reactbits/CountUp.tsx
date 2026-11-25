"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  indianGrouping?: boolean;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function CountUp({
  end,
  duration = 950,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  indianGrouping = true,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState<number>(end);
  const prevEndRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplayValue(end);
      prevEndRef.current = end;
      return;
    }

    const startVal = prevEndRef.current;
    const diff = end - startVal;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutExpo(progress);
      setDisplayValue(startVal + diff * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(end);
        prevEndRef.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      prevEndRef.current = end;
    };
  }, [end, duration]);

  const formatted = displayValue.toLocaleString(indianGrouping ? "en-IN" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
