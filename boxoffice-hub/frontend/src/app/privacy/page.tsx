import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy, cookie disclosure, and third-party services for BoxOffice Hub.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-obsidian px-4 py-12 text-zinc-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to BoxOffice Hub
        </Link>

        <div className="glass-card space-y-5 p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald" />
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Privacy Policy
            </h1>
          </div>
          <p className="text-xs text-zinc-400">Last updated: November 25, 2026</p>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="font-display text-base font-semibold text-white">1. Information We Collect</h2>
            <p>
              BoxOffice Hub does not require account registration or collect personal names, emails,
              or payment details. When you submit an anonymous star rating or watch verdict poll
              vote, only aggregate counters are incremented in our database.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="font-display text-base font-semibold text-white">2. Advertising &amp; Google AdSense</h2>
            <p>
              We may display non-intrusive advertisements served by Google AdSense or partner
              networks. Third-party vendors, including Google, use cookies to serve ads based on
              your prior visits to this website or other websites. You can opt out of personalized
              advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 underline hover:text-emerald-300"
              >
                Google Ads Settings
              </a>
              .
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="font-display text-base font-semibold text-white">3. Embedded YouTube Content</h2>
            <p>
              Official movie trailers and critic review videos are embedded using YouTube&apos;s
              official player. Interacting with embedded videos is subject to Google&apos;s Privacy
              Policy and YouTube Terms of Service.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="font-display text-base font-semibold text-white">4. External Ticketing &amp; Streaming Links</h2>
            <p>
              Links to BookMyShow, District, Netflix, Prime Video, JioHotstar, ZEE5, and SonyLIV
              direct you to official external platforms governed by their respective privacy
              policies.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
