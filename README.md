# Brainrot Reader

A self-hosted, Dockerized Progressive Web App (PWA) for speed-reading ePub books with synchronized RSVP (Rapid Serial Visual Presentation) and Text-to-Speech (TTS). The word display is fully responsive, making it usable on both desktop and mobile devices.

## Features

- **ePub Library** — Upload and manage your ePub collection.
- **Chapter Streaming** — Backend streams chapter words in chunks for low memory usage.
- **RSVP Speed Reader** — Word-by-word display with an adjustable ORP (Optimal Recognition Point) anchor.
- **TTS Synchronization** — Browser-native speech synthesis synced to the visual word stream.
- **Background Music** — Upload MP3 files or paste YouTube links to play ambient music while reading. Independent volume and loop controls.
- **Mobile Ready** — Responsive font sizes and PWA support for installation on phones.
- **Dockerized** — One-command setup with Docker Compose.

## Tech Stack

- **Backend**: Python 3.13, FastAPI, BeautifulSoup, ebooklib
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Package Managers**: `uv` (Python), `npm` (Node)

## Quick Start (Docker)

The fastest way to run the app is with Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone and navigate to the project

```bash
cd brainrot_reader
```

### 2. Review / edit the environment variables

```bash
# .env is pre-filled with sensible defaults.
cat .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_HOST` | `0.0.0.0` | Host the backend binds to |
| `BACKEND_PORT` | `8090` | Port the backend exposes |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `STORAGE_DIR` | `/app/epubs` | Path where uploaded ePubs are stored |
| `MUSIC_DIR` | `/app/music` | Path where uploaded music tracks are stored |
| `FRONTEND_PORT` | `3000` | Port the frontend exposes |
| `NEXT_PUBLIC_API_URL` | *(empty)* | Optional hardcoded backend URL. If empty, the frontend auto-detects `http://<browser-host>:8090` |

### 3. Build and run

```bash
docker compose up --build -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8090

### 4. Stop

```bash
docker compose down
```

To also remove the uploaded ePubs volume:

```bash
docker compose down -v
```

## Local Development (without Docker)

### Backend

```bash
cd backend
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8090
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on http://localhost:3000.

## Configuration

All tunable values live in the `.env` file at the project root.

- **Change ports**: Edit `BACKEND_PORT` and/or `FRONTEND_PORT` in `.env`, then restart with `docker compose up -d`.
- **Custom backend URL**: If the backend is on a different host, set `NEXT_PUBLIC_API_URL=http://your-host:8090` and rebuild the frontend image.

## 📱 Standalone Serverless PWA (Android / iOS)

There is also available a **100% serverless, zero-setup, offline-first version** of Brainrot Reader inside the [android/](file:///home/xdz/github/brainrot_reader/android) directory!

Once installed to your phone's homescreen, it requires **no Docker setup, no local Python servers, and no background processes**. It consumes **0% battery** when closed and works perfectly in **Airplane Mode**!

### Key Features:
- **Material 3 Design & Dynamic Themes**: Dynamic HSL system with custom seed selectors, a dedicated OLED Black setting, and optional random color rotation per chapter.
- **Symmetric S-Deck Controls**: Symmetrically centers all media buttons. The Chapter and WPM displays act as side-wings on tablet/laptop screens and automatically collapse to a second row on small phone viewports to prevent button overlaps.
- **Stationary Absolute ORP Lock**: The speed-reading words align absolutely, keeping the center of the Optimal Recognition Point (ORP) character locked rigidly under the crosshairs.
- **TTS Watchdog Synchronizer**: Employs sub-millisecond precision native TTS tracking with an automated timer fallback for legacy mobile engines.
- **Offline Storage (IndexedDB)**: Save hundreds of ePub books and looping ambient MP3s directly to your phone's secure storage.

For detailed setup, running, and cloud deployment guides, see the [Android PWA README](file:///home/xdz/github/brainrot_reader/android/README.md).

## Install on Your Phone (PWA)

The frontend is a Progressive Web App with a `manifest.json`. After starting the stack:

1. Make sure your phone is on the same Wi-Fi network as the server.
2. Find your computer's local IP:
   ```bash
   hostname -I
   ```
3. Open `http://<your-ip>:3000` in your phone's browser.
4. Add to Home Screen:
   - **iPhone (Safari)**: Share button → **Add to Home Screen**
   - **Android (Chrome)**: Menu (⋮) → **Add to Home Screen**

The app will open in standalone mode without browser chrome.

## Project Structure

```
brainrot_reader/
├── .env                          # Environment variables for Docker & local dev
├── docker-compose.yml            # Orchestrates backend + frontend
├── android/                      # Standalone, serverless offline M3 PWA version
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── main.py                   # FastAPI app (includes centralized api_router)
│   ├── config.py                 # Centralized configuration (STORAGE_DIR, MUSIC_DIR)
│   ├── pyproject.toml            # uv dependencies
│   ├── uv.lock
│   ├── api/                      # API routing and HTTP endpoints
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py         # Consolidated API router under /api/v1
│   │       └── endpoints/        # Pure API route handlers (no business logic)
│   │           ├── __init__.py
│   │           ├── library.py    # Library & ePub endpoints
│   │           ├── music.py      # Music uploads, downloads & lists
│   │           └── parsers.py    # In-memory ePub parser stream endpoint
│   └── services/                 # Decoupled backend business logic
│       ├── __init__.py
│       ├── library.py            # ePub processing & chunk generator logic
│       ├── music.py              # Track listing, track deletion & yt-dlp downloader
│       └── parsers.py            # In-memory ePub zip parsing operations
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── next.config.ts            # Next.js config (standalone output)
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx          # Main reader UI with music panel
    │   │   └── layout.tsx        # Root layout with PWA viewport
    │   └── hooks/
    │       ├── useSpeechPlayer.ts # Speech & playback logic
    │       └── useMusicPlayer.ts  # Background music logic
    └── public/
        └── manifest.json         # PWA manifest
```

## Notes

- The frontend auto-detects the backend host from the browser's current hostname when `NEXT_PUBLIC_API_URL` is left empty. This works out of the box for both `localhost` and LAN access.
- Uploaded ePubs are persisted in a Docker volume (`epubs-data`) so they survive container restarts.
- Music tracks (MP3 uploads and YouTube downloads) are persisted in a Docker volume (`music-data`).
