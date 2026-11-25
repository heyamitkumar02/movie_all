# BoxOffice Hub · Indian Box Office Tracker & Review Aggregator

An interactive, motion-rich Indian Box Office analytics platform featuring real-time pan-India box office telemetry, multi-dimensional daily breakdowns, official trailer playback, Top 10 Hindi & Telugu YouTube review aggregation, and CSV/JSON data exports.

---

## Key Features

- **All-India Box Office Catalog (93+ Films & Auto-Sync):**
  - Tracks pan-India releases across **Hindi, Telugu, Tamil, Malayalam, Kannada, Marathi, Punjabi, Bengali, and Gujarati** cinema.
  - Automated periodic catalog sync (`APScheduler`, every 6 hours) + one-click manual sync (`POST /api/movies/sync`).
  - **Universal Indian Movie Discovery:** Search any Indian movie via `/api/movies/discover` (local DB + IMDb Suggest + Wikipedia) and click **Track** to generate its full analytics & review hub on demand.
- **Multi-Dimensional Daily Breakdowns:**
  - Interactive day selector (`Premiere`, `Day 1` … `Day N`, `Advance Booking`) and Recharts run-shape trajectory chart.
  - Sortable tables across **Time Slots**, **Top 20 Cities**, **All 34 States & UTs**, **AP/TG Areas**, **Languages**, and **Formats** (`2D`, `3D`, `IMAX`, `4DX`).
- **Official Trailer & Top 10 YouTube Reviews Hub:**
  - Glassmorphic cinema-mode modal with ESC/backdrop close.
  - Curated aggregator across 10 Hindi & Telugu channels (*Tried & Refused Productions, Filmi Indian, PJ Explained, BNFTV, Yogi Bolta Hai, ComicVerse, Barbell Pitch Meetings, Thyview, Ragadi, Poola Chokka*) with sentiment consensus bar, language filters, and live YouTube refresh (`YouTube Data API v3` or `yt-dlp` fallback).
- **Official Ticketing, Streaming & Analytics Exports:**
  - Direct search links to BookMyShow, District, Netflix, Prime Video, JioHotstar, ZEE5, and SonyLIV.
  - Downloadable `.csv` and `.json` box office reports (`GET /api/movies/{slug}/export`).
- **Motion & 3D UI Layer:**
  - Built with custom React Bits primitives (`Aurora`, `TiltedCard`, `SpotlightCard`, `CountUp`, `SplitText`, `ShinyText`) and Framer Motion with `prefers-reduced-motion` support.

---

## Project Structure

```text
boxoffice-hub/
├── backend/
│   ├── app/
│   │   ├── config/review_channels.py   # Curated Top 10 Hindi/Telugu review channels
│   │   ├── routes/
│   │   │   ├── movies.py               # Catalog, daily breakdowns, discovery, CSV/JSON export
│   │   │   └── media.py                # Official trailer & Top 10 reviews endpoints
│   │   ├── services/
│   │   │   ├── aggregator_service.py   # KPIs, day-over-day delta, milestones
│   │   │   ├── catalog_service.py      # Auto-sync, universal discovery & on-demand tracking
│   │   │   ├── seed_data.py            # Flagship multi-day seed data
│   │   │   └── youtube_service.py      # YouTube Data API v3 + yt-dlp fallback
│   │   ├── utils/currency.py           # Indian numbering (Cr / L / ₹) format & parse
│   │   ├── database.py
│   │   ├── main.py                     # FastAPI app + APScheduler
│   │   ├── models.py
│   │   └── schemas.py
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx                # Live Dashboard Home + Universal Search
    │   │   └── movie/[slug]/page.tsx   # Movie Analytics, Trailer & Reviews Page
    │   ├── components/
    │   │   ├── reactbits/              # Aurora, TiltedCard, SpotlightCard, CountUp, SplitText, ShinyText
    │   │   ├── BreakdownTables.tsx
    │   │   ├── DaySelector.tsx
    │   │   ├── HeroBento.tsx
    │   │   ├── RunShapeChart.tsx
    │   │   ├── TrailerModal.tsx
    │   │   ├── WhereToWatch.tsx
    │   │   └── YoutubeReviewsSection.tsx
    │   └── lib/
    │       ├── api.ts
    │       └── utils.ts
    ├── next.config.mjs
    ├── package.json
    └── tailwind.config.ts
```

---

## Local Setup

### 1. Backend (FastAPI + SQLAlchemy)

```bash
cd boxoffice-hub/backend
python -m venv .venv
.\.venv\Scripts\activate      # Windows PowerShell
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
cp .env.example .env          # Optional: add YOUTUBE_API_KEY
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend (Next.js 15 + TypeScript)

```bash
cd boxoffice-hub/frontend
npm install
npm run dev
```

Open **http://127.0.0.1:3000** in your browser.

---

## Environment Variables (`boxoffice-hub/backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | *(empty)* | Optional YouTube Data API v3 key (uses `yt-dlp` fallback if unset) |
| `DATABASE_URL` | `sqlite:///./boxoffice.db` | SQLAlchemy connection string (PostgreSQL-ready) |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Allowed frontend origins |
