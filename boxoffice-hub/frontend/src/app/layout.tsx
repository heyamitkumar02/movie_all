import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "BoxOffice Hub · Live Indian Box Office Analytics & Reviews",
  description:
    "Cinematic live Indian Box Office Tracker with multi-dimensional daily breakdowns, official trailer viewer, and Top 10 Hindi & Telugu YouTube review aggregation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-obsidian font-sans text-zinc-100 antialiased selection:bg-emerald/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
