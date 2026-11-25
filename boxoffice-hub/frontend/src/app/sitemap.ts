import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

interface SitemapMovieItem {
  movie: {
    slug: string;
    last_updated_at?: string | null;
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://boxoffice-hub.vercel.app").replace(/\/+$/, "");
  const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

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
  ];

  try {
    const res = await fetch(`${backendUrl}/api/movies`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return baseEntries;
    const movies = (await res.json()) as SitemapMovieItem[];
    const movieEntries: MetadataRoute.Sitemap = movies.map((item) => ({
      url: `${siteUrl}/movie/${item.movie.slug}`,
      lastModified: item.movie.last_updated_at ? new Date(item.movie.last_updated_at) : new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    }));
    return [...baseEntries, ...movieEntries];
  } catch {
    return baseEntries;
  }
}
