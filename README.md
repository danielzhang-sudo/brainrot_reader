# Brainrot Reader

A self-hosted, Dockerized Progressive Web App (PWA) for speed-reading ePub books with synchronized RSVP (Rapid Serial Visual Presentation) and Text-to-Speech (TTS). The word display is fully responsive, making it usable on both desktop and mobile devices.

## Features

- **ePub Library** — Upload and manage your ePub collection.
- **Chapter Streaming** — Backend streams chapter words in chunks for low memory usage.
- **RSVP Speed Reader** — Word-by-word display with an adjustable ORP (Optimal Recognition Point) anchor.
- **TTS Synchronization** — Browser-native speech synthesis synced to the visual word stream.
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
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── main.py                   # FastAPI app with env-aware config
│   ├── router.py                 # Additional API router
│   ├── parsers.py                # ePub parsing utilities
│   ├── pyproject.toml            # uv dependencies
│   └── uv.lock
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── next.config.ts            # Next.js config (standalone output)
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx          # Main reader UI
    │   │   └── layout.tsx        # Root layout with PWA viewport
    │   └── hooks/
    │       └── useSpeechPlayer.ts # Speech & playback logic
    └── public/
        └── manifest.json         # PWA manifest
```

## Notes

- The frontend auto-detects the backend host from the browser's current hostname when `NEXT_PUBLIC_API_URL` is left empty. This works out of the box for both `localhost` and LAN access.
- Uploaded ePubs are persisted in a Docker volume (`epubs-data`) so they survive container restarts.
