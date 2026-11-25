import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://movieall-vert.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BoxOffice Hub · Live Indian Box Office Collection, Trailers & Reviews",
    template: "%s · BoxOffice Hub",
  },
  description:
    "Live Indian Box Office tracker across Bollywood, Tollywood, Kollywood, Mollywood & regional cinema with 34-state breakdowns, official trailers, and Top 10 Hindi & Telugu YouTube reviews.",
  keywords: [
    "Indian Box Office",
    "Box Office Collection",
    "Bollywood Box Office",
    "Tollywood Box Office",
    "Movie Reviews YouTube",
    "Official Movie Trailers",
  ],
  openGraph: {
    type: "website",
    siteName: "BoxOffice Hub",
    title: "BoxOffice Hub · Live Indian Box Office Analytics & Reviews",
    description:
      "Track live Indian box office collections, daily theatre occupancy, state-wise breakdowns, official trailers, and Top 10 critic reviews.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BoxOffice Hub · Live Indian Box Office Tracker",
    description:
      "Pan-India box office telemetry, movie clash comparisons, official trailers, and Top 10 YouTube critic reviews.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jakarta.variable}`}>
      <body className="flex min-h-screen flex-col bg-obsidian font-sans text-zinc-100 antialiased selection:bg-emerald/30 selection:text-white">
        {adsenseClient && (
          <Script
            id="adsense-script"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        )}
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
