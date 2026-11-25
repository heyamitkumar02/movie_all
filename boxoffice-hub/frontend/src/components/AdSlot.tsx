"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSlotProps {
  slotId?: string;
  format?: "auto" | "horizontal" | "rectangle";
  className?: string;
}

export function AdSlot({ slotId, format = "horizontal", className }: AdSlotProps) {
  const pushedRef = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  const effectiveSlot = slotId?.trim() || process.env.NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT?.trim();

  useEffect(() => {
    if (!clientId || !effectiveSlot || pushedRef.current) return;
    try {
      pushedRef.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore adblocker or script load errors gracefully
    }
  }, [clientId, effectiveSlot]);

  // Do not render empty ad boxes before AdSense is configured
  if (!clientId || !effectiveSlot) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored advertisement"
      className={cn(
        "glass-card overflow-hidden px-4 py-3 text-center",
        format === "horizontal" ? "min-h-[112px]" : "min-h-[260px]",
        className
      )}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Advertisement
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={effectiveSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
