"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
  disabled?: boolean;
}

export function ShinyText({
  children,
  className,
  shimmerColor = "#FDE68A",
  disabled = false,
}: ShinyTextProps) {
  if (disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent animate-shimmer",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(115deg, #F59E0B 30%, ${shimmerColor} 50%, #F59E0B 70%)`,
        backgroundSize: "220% 100%",
      }}
    >
      {children}
    </span>
  );
}
