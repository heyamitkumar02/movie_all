import React from "react";
import Link from "next/link";
import { Film } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-obsidian/95 py-8 text-xs text-zinc-400">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Film className="h-4 w-4 text-emerald" />
          <span className="font-display font-semibold text-zinc-200">BoxOffice Hub</span>
          <span className="text-zinc-500">· Indian Cinema Analytics &amp; Reviews</span>
        </div>

        <nav className="flex flex-wrap items-center gap-5">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/compare" className="transition hover:text-white">
            Compare Clash
          </Link>
          <Link href="/about" className="transition hover:text-white">
            About &amp; Methodology
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
