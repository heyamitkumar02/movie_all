# BoxOffice Hub

Interactive Indian Box Office Tracker, Official Trailer Viewer, and Top 10 Hindi & Telugu YouTube Reviews Hub.

## Stack
- **Backend:** FastAPI, SQLAlchemy, Pydantic, APScheduler, `yt-dlp`, `httpx`, `BeautifulSoup4`, `boxoffice-api`
- **Frontend:** Next.js 15 (App Router, TypeScript), Tailwind CSS, Framer Motion, Recharts, Lucide Icons, React Bits components

## Quick Start

### 1. Backend
```bash
cd boxoffice-hub/backend
python -m venv .venv
.\.venv\Scripts\activate  # or source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend
```bash
cd boxoffice-hub/frontend
npm install
npm run dev
```

Open **http://127.0.0.1:3000**.
