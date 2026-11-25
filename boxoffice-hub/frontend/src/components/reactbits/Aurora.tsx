"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AuroraProps {
  className?: string;
  colorOne?: string;
  colorTwo?: string;
  colorThree?: string;
  intensity?: number;
}

export function Aurora({
  className,
  colorOne = "rgba(16, 185, 129, 0.24)",
  colorTwo = "rgba(245, 158, 11, 0.16)",
  colorThree = "rgba(244, 63, 94, 0.14)",
  intensity = 1,
}: AuroraProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity: intensity }}
    >
      {/* Blob 1 */}
      <div
        className={cn(
          "absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full blur-[110px] will-change-transform",
          !reducedMotion && "animate-aurora-one"
        )}
        style={{
          background: `radial-gradient(circle, ${colorOne} 0%, transparent 70%)`,
        }}
      />
      {/* Blob 2 */}
      <div
        className={cn(
          "absolute -right-24 top-8 h-[460px] w-[460px] rounded-full blur-[120px] will-change-transform",
          !reducedMotion && "animate-aurora-two"
        )}
        style={{
          background: `radial-gradient(circle, ${colorTwo} 0%, transparent 70%)`,
        }}
      />
      {/* Blob 3 */}
      <div
        className={cn(
          "absolute -bottom-32 left-1/3 h-[380px] w-[520px] rounded-full blur-[130px] will-change-transform",
          !reducedMotion && "animate-aurora-three"
        )}
        style={{
          background: `radial-gradient(circle, ${colorThree} 0%, transparent 70%)`,
        }}
      />
      {/* Subtle scrim for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian/20 via-obsidian/45 to-obsidian" />
    </div>
  );
}
