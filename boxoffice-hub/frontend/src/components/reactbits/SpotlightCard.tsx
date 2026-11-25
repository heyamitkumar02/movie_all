"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(16, 185, 129, 0.16)",
  spotlightSize = 260,
  onMouseMove,
  onMouseLeave,
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (divRef.current) {
      const rect = divRef.current.getBoundingClientRect();
      setPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setIsHovered(true);
    onMouseMove?.(e);
  };

  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(false);
    onMouseLeave?.(e);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "glass-card group relative overflow-hidden p-5 transition-colors duration-200 hover:border-white/15",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${spotlightSize}px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 75%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
