import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface SlugItem {
  slug: string;
  last_updated_at?: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const detectedUrl = host ? `${proto}://${host}` : "https://movieall-vert.vercel.app";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || detectedUrl).replace(/\/+$/, "");

  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const candidates: string[] = [];
  if (process.env.BACKEND_URL) {
    candidates.push(`${process.env.BACKEND_URL.replace(/\/+$/, "")}/api/movies/slugs`);
  }
  if (host) {
    candidates.push(`${siteUrl}/api/movies/slugs`);
  }
  candidates.push("http://127.0.0.1:8000/api/movies/slugs");

  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;
      const items = (await res.json()) as SlugItem[];
      if (!Array.isArray(items) || items.length === 0) continue;

      const movieEntries: MetadataRoute.Sitemap = items.map((item) => ({
        url: `${siteUrl}/movie/${item.slug}`,
        lastModified: item.last_updated_at ? new Date(item.last_updated_at) : new Date(),
        changeFrequency: "hourly",
        priority: 0.9,
      }));
      return [...baseEntries, ...movieEntries];
    } catch {
      continue;
    }
  }

  return baseEntries;
}
