import os
import shutil
import zipfile
import uuid
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.requests import Request
from bs4 import BeautifulSoup
import uvicorn
import yt_dlp

app = FastAPI()

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
STORAGE_DIR = os.environ.get(
    "STORAGE_DIR", os.path.join(os.path.dirname(__file__), "epubs")
)
MUSIC_DIR = os.environ.get(
    "MUSIC_DIR", os.path.join(os.path.dirname(__file__), "music")
)
os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(MUSIC_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────────────────────────
# ePub Library Endpoints
# ────────────────────────────────────────────────────────────────


@app.post("/api/v1/library/upload")
async def upload_to_library(file: UploadFile = File(...)):
    if not file.filename.endswith(".epub"):
        raise HTTPException(
            status_code=400, detail="Only standard .epub extensions accepted."
        )

    target_path = os.path.join(STORAGE_DIR, file.filename)
    with open(target_path, "wb") as destination:
        shutil.copyfileobj(file.file, destination)

    return {
        "message": "Successfully archived into backend storage system.",
        "filename": file.filename,
    }


@app.get("/api/v1/library/books")
async def list_library_books():
    files = [f for f in os.listdir(STORAGE_DIR) if f.endswith(".epub")]
    return {"books": files}


def get_epub_sections(book_path: str):
    """Unzips and extracts valid text files (chapters) from an ePub archive."""
    try:
        with zipfile.ZipFile(book_path, "r") as container:
            all_files = container.namelist()
            text_files = [
                f
                for f in all_files
                if f.lower().endswith((".xhtml", ".html", ".htm", ".xml"))
                and not "toc" in f.lower()
            ]
            text_files.sort()
            return text_files
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed parsing ePub archive structure: {str(e)}"
        )


@app.get("/api/v1/library/chapters")
async def list_book_chapters(book: str = Query(...)):
    book_path = os.path.join(STORAGE_DIR, book)
    if not os.path.exists(book_path):
        raise HTTPException(status_code=404, detail="Book target not found in library.")

    sections = get_epub_sections(book_path)
    chapters_metadata = [
        {
            "index": idx,
            "id": filepath,
            "title": os.path.basename(filepath)
            .replace(".xhtml", "")
            .replace(".html", "")
            .replace("_", " "),
        }
        for idx, filepath in enumerate(sections)
    ]
    return {"chapters": chapters_metadata}


@app.get("/api/v1/library/stream-chapter")
async def stream_chapter(book: str = Query(...), chapter_index: int = Query(...)):
    book_path = os.path.join(STORAGE_DIR, book)
    if not os.path.exists(book_path):
        raise HTTPException(status_code=404, detail="Book target not found in library.")

    sections = get_epub_sections(book_path)
    if chapter_index < 0 or chapter_index >= len(sections):
        raise HTTPException(
            status_code=400, detail="Target chapter index boundary overflow."
        )

    target_file = sections[chapter_index]

    def word_generator():
        with zipfile.ZipFile(book_path, "r") as container:
            content = container.read(target_file)
            soup = BeautifulSoup(content, "html.parser")

            text = soup.get_text(separator=" ")
            words = [w.strip() for w in text.split() if w.strip()]

            chunk_size = 50
            for i in range(0, len(words), chunk_size):
                batch = words[i : i + chunk_size]
                yield json.dumps({"words": batch, "done": False}) + "\n"

            yield json.dumps({"words": [], "done": True}) + "\n"

    return StreamingResponse(word_generator(), media_type="application/x-ndjson")


# ────────────────────────────────────────────────────────────────
# Background Music Endpoints
# ────────────────────────────────────────────────────────────────


def _list_music_tracks():
    tracks = []
    for filename in os.listdir(MUSIC_DIR):
        if filename.endswith(".json"):
            meta_path = os.path.join(MUSIC_DIR, filename)
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                mp3_path = os.path.join(MUSIC_DIR, f"{meta['id']}.mp3")
                if os.path.exists(mp3_path):
                    tracks.append(meta)
            except Exception:
                continue
    tracks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return tracks


@app.post("/api/v1/music/upload")
async def upload_music(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Only .mp3 files are accepted.")

    track_id = str(uuid.uuid4())
    mp3_path = os.path.join(MUSIC_DIR, f"{track_id}.mp3")
    meta_path = os.path.join(MUSIC_DIR, f"{track_id}.json")

    with open(mp3_path, "wb") as destination:
        shutil.copyfileobj(file.file, destination)

    meta = {
        "id": track_id,
        "title": file.filename,
        "source": "upload",
        "created_at": str(uuid.uuid1()),  # rough timestamp proxy
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    return {"message": "Track uploaded.", "track": meta}


@app.get("/api/v1/music/list")
async def list_music():
    return {"tracks": _list_music_tracks()}


@app.delete("/api/v1/music/{track_id}")
async def delete_music(track_id: str):
    mp3_path = os.path.join(MUSIC_DIR, f"{track_id}.mp3")
    meta_path = os.path.join(MUSIC_DIR, f"{track_id}.json")
    removed = False
    for p in (mp3_path, meta_path):
        if os.path.exists(p):
            os.remove(p)
            removed = True
    if not removed:
        raise HTTPException(status_code=404, detail="Track not found.")
    return {"message": "Track deleted."}


@app.get("/api/v1/music/stream/{track_id}")
async def stream_music(track_id: str):
    mp3_path = os.path.join(MUSIC_DIR, f"{track_id}.mp3")
    if not os.path.exists(mp3_path):
        raise HTTPException(status_code=404, detail="Track not found.")
    return FileResponse(
        mp3_path,
        media_type="audio/mpeg",
        filename=f"{track_id}.mp3",
    )


@app.post("/api/v1/music/youtube")
async def add_youtube_music(request: Request):
    body = await request.json()
    url = body.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="YouTube URL is required.")

    track_id = str(uuid.uuid4())
    output_template = os.path.join(MUSIC_DIR, f"{track_id}.%(ext)s")

    ydl_opts = {
        "format": "bestaudio/best",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "outtmpl": output_template,
        "quiet": True,
        "socket_timeout": 30,
        "retries": 2,
        "noplaylist": True,
    }

    def _download():
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return info.get("title", "Unknown")

    try:
        title = await asyncio.wait_for(asyncio.to_thread(_download), timeout=120)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504, detail="YouTube download timed out after 120s."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"YouTube download failed: {str(e)}"
        )

    mp3_path = os.path.join(MUSIC_DIR, f"{track_id}.mp3")
    if not os.path.exists(mp3_path):
        # yt-dlp may have cleaned the filename; scan for it
        for fname in os.listdir(MUSIC_DIR):
            if fname.startswith(track_id) and fname.endswith(".mp3"):
                os.rename(os.path.join(MUSIC_DIR, fname), mp3_path)
                break
        else:
            raise HTTPException(
                status_code=500, detail="Download completed but MP3 not found."
            )

    meta = {
        "id": track_id,
        "title": title,
        "source": "youtube",
        "created_at": str(uuid.uuid1()),
    }
    meta_path = os.path.join(MUSIC_DIR, f"{track_id}.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    return {"message": "YouTube track downloaded.", "track": meta}


if __name__ == "__main__":
    host = os.environ.get("BACKEND_HOST", "0.0.0.0")
    port = int(os.environ.get("BACKEND_PORT", "8090"))
    uvicorn.run(app, host=host, port=port)
