import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatViewCount(count: number): string {
  if (!count) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString("en-IN");
}

export function formatIndianInt(val: number): string {
  return Math.round(val).toLocaleString("en-IN");
}

export function timeAgo(dateStr: string): string {
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return "recently";
  const diff = Math.max(0, Date.now() - ts);
  const days = Math.floor(diff / 86_400_000);
  if (days >= 365) {
    const yrs = Math.floor(days / 365);
    return `${yrs}y ago`;
  }
  if (days >= 30) {
    const mos = Math.floor(days / 30);
    return `${mos}mo ago`;
  }
  if (days >= 1) return `${days}d ago`;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs >= 1) return `${hrs}h ago`;
  return "today";
}
