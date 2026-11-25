"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  splitBy?: "chars" | "words";
}

export function SplitText({
  text,
  className,
  delay = 0.035,
  splitBy = "words",
}: SplitTextProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  const tokens = splitBy === "chars" ? Array.from(text) : text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay,
      },
    },
  };

  const child = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn("inline-flex flex-wrap", className)}
    >
      {tokens.map((token, idx) => (
        <motion.span
          key={`${token}-${idx}`}
          variants={child}
          className="inline-block will-change-transform"
        >
          {token === " " ? "\u00A0" : token}
          {splitBy === "words" && idx < tokens.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}
