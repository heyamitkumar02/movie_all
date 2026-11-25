export interface Movie {
  id: number;
  slug: string;
  title: string;
  poster_url: string;
  status: string;
  release_date: string;
  director: string;
  cast: string[];
  genres: string[];
  languages: string[];
  trailer_video_id: string | null;
  last_updated_at?: string | null;
}

export interface BestDay {
  day_number: number;
  day_label: string;
  gross_inr: number;
  gross_formatted: string;
}

export interface KPIs {
  india_gross: number;
  india_gross_formatted: string;
  today_gross: number;
  today_gross_formatted: string;
  today_day_label: string;
  occupancy_pct: number;
  shows: number;
  theatres: number;
  cities: number;
  tickets_sold: number;
  atp: number;
  atp_formatted: string;
  pic_gross: number;
  pic_gross_formatted: string;
  dod_change_pct: number | null;
  best_day: BestDay;
}

export interface Milestone {
  label: string;
  target_inr: number;
  target_formatted: string;
  achieved: boolean;
  achieved_on_day: number | null;
  progress_pct: number;
}

export interface DailySummary {
  id: number;
  day_number: number;
  day_label: string;
  date: string;
  gross_inr: number;
  gross_formatted: string;
  tickets_sold: number;
  atp_inr: number;
  atp_formatted: string;
  shows: number;
  theatres: number;
  cities: number;
  occupancy_pct: number;
  fast_filling: number;
  housefull: number;
  pic_gross_inr: number;
  pic_gross_formatted: string;
  is_live: boolean;
}

export interface Breakdown {
  id: number;
  day_number: number;
  breakdown_type: string;
  dimension_name: string;
  gross_inr: number;
  gross_formatted: string;
  share_pct: number;
  tickets_sold: number;
  atp_inr: number;
  atp_formatted: string;
  shows: number;
  occupancy_pct: number;
  fast_filling: number;
  housefull: number;
}

export interface AdvanceBooking {
  id: number;
  target_date: string;
  gross_inr: number;
  gross_formatted: string;
  tickets_sold: number;
  shows: number;
  theatres: number;
  cities: number;
  occupancy_pct: number;
  fast_filling: number;
  housefull: number;
  updated_at?: string | null;
}

export interface Trailer {
  video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
  duration: string;
  embed_url: string;
  source?: string;
}

export interface Review {
  id: number;
  channel_name: string;
  language: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  view_count: number;
  published_at: string;
  duration: string;
  sentiment_tag: string;
  fetched_at: string;
}

export interface SentimentBucket {
  count: number;
  pct: number;
}

export interface MovieListItem {
  movie: Movie;
  kpis: KPIs;
  milestones: Milestone[];
  daily_summaries: DailySummary[];
}

export interface MovieDetail {
  movie: Movie;
  kpis: KPIs;
  milestones: Milestone[];
  daily_summaries: DailySummary[];
  advance_bookings: AdvanceBooking[];
}

export interface DailyDetail {
  summary: DailySummary;
  breakdowns: Record<string, Breakdown[]>;
}

export interface ReviewsResponse {
  reviews: Review[];
  sentiment_distribution: Record<string, SentimentBucket>;
  total_count: number;
  source: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMovies(): Promise<MovieListItem[]> {
  try {
    return await fetchJson<MovieListItem[]>("/api/movies");
  } catch (err) {
    console.error("Failed to fetch movies:", err);
    return [];
  }
}

export async function fetchMovieDetail(slug: string, day?: number): Promise<MovieDetail | null> {
  try {
    const query = day !== undefined ? `?day=${day}` : "";
    return await fetchJson<MovieDetail>(`/api/movies/${encodeURIComponent(slug)}${query}`);
  } catch (err) {
    console.error("Failed to fetch movie detail:", err);
    return null;
  }
}

export async function fetchDailyDetail(slug: string, dayNumber: number): Promise<DailyDetail | null> {
  try {
    return await fetchJson<DailyDetail>(
      `/api/movies/${encodeURIComponent(slug)}/daily/${dayNumber}`
    );
  } catch (err) {
    console.error("Failed to fetch daily detail:", err);
    return null;
  }
}

export async function fetchTrailer(slug: string, refresh = false): Promise<Trailer | null> {
  try {
    const q = refresh ? "?refresh=true" : "";
    return await fetchJson<Trailer>(`/api/movies/${encodeURIComponent(slug)}/trailer${q}`);
  } catch (err) {
    console.error("Failed to fetch trailer:", err);
    return null;
  }
}

export async function fetchReviews(slug: string, refresh = false): Promise<ReviewsResponse> {
  try {
    const q = refresh ? "?refresh=true" : "";
    return await fetchJson<ReviewsResponse>(`/api/movies/${encodeURIComponent(slug)}/reviews${q}`);
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    return { reviews: [], sentiment_distribution: {}, total_count: 0, source: "error" };
  }
}

export async function refreshReviews(slug: string): Promise<ReviewsResponse> {
  try {
    return await fetchJson<ReviewsResponse>(
      `/api/movies/${encodeURIComponent(slug)}/reviews/refresh`,
      { method: "POST" }
    );
  } catch (err) {
    console.error("Failed to refresh reviews:", err);
    return { reviews: [], sentiment_distribution: {}, total_count: 0, source: "error" };
  }
}

export interface DiscoverMovieItem {
  title: string;
  year: number;
  release_date: string;
  poster_url: string;
  cast: string[];
  languages: string[];
  genres: string[];
  director: string;
  tracked_slug: string | null;
  source: string;
}

export interface SyncCatalogResponse {
  added: number;
  updated: number;
  total_in_db: number;
}

export async function discoverMovies(q: string): Promise<DiscoverMovieItem[]> {
  if (q.trim().length < 2) return [];
  try {
    return await fetchJson<DiscoverMovieItem[]>(
      `/api/movies/discover?q=${encodeURIComponent(q.trim())}`
    );
  } catch (err) {
    console.error("Failed to discover movies:", err);
    return [];
  }
}

export async function trackMovie(item: DiscoverMovieItem): Promise<Movie | null> {
  try {
    return await fetchJson<Movie>("/api/movies/track", {
      method: "POST",
      body: JSON.stringify({
        title: item.title,
        year: item.year,
        release_date: item.release_date,
        poster_url: item.poster_url,
        cast: item.cast,
        languages: item.languages,
        genres: item.genres,
        director: item.director,
      }),
    });
  } catch (err) {
    console.error("Failed to track movie:", err);
    return null;
  }
}

export async function syncCatalog(): Promise<SyncCatalogResponse | null> {
  try {
    return await fetchJson<SyncCatalogResponse>("/api/movies/sync", {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to sync catalog:", err);
    return null;
  }
}
