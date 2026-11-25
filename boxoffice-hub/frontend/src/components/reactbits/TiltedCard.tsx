"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  tiltMaxAngle?: number;
  glareEnabled?: boolean;
  scale?: number;
}

export function TiltedCard({
  children,
  className,
  tiltMaxAngle = 12,
  glareEnabled = true,
  scale = 1.03,
}: TiltedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)");
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 2 * tiltMaxAngle;
    const rotateX = (0.5 - py) * 2 * tiltMaxAngle;

    setTransform(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
        2
      )}deg) scale3d(${scale}, ${scale}, ${scale})`
    );
    setGlare({ x: px * 100, y: py * 100, opacity: 0.24 });
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)");
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative will-change-transform", className)}
      style={{
        transform,
        transformStyle: "preserve-3d",
        transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
      {glareEnabled && !reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(circle 220px at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.45), transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}
