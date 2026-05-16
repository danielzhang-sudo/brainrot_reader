import os
import shutil
import uuid
import json
import asyncio
from fastapi import HTTPException
import yt_dlp
from config import MUSIC_DIR

def list_music_tracks() -> list[dict]:
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


def save_uploaded_music(file_name: str, file_obj) -> dict:
    if not file_name.lower().endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Only .mp3 files are accepted.")

    track_id = str(uuid.uuid4())
    mp3_path = os.path.join(MUSIC_DIR, f"{track_id}.mp3")
    meta_path = os.path.join(MUSIC_DIR, f"{track_id}.json")

    with open(mp3_path, "wb") as destination:
        shutil.copyfileobj(file_obj, destination)

    meta = {
        "id": track_id,
        "title": file_name,
        "source": "upload",
        "created_at": str(uuid.uuid1()),  # rough timestamp proxy
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    return meta


def delete_music_track(track_id: str) -> bool:
    mp3_path = os.path.join(MUSIC_DIR, f"{track_id}.mp3")
    meta_path = os.path.join(MUSIC_DIR, f"{track_id}.json")
    removed = False
    for p in (mp3_path, meta_path):
        if os.path.exists(p):
            os.remove(p)
            removed = True
    if not removed:
        raise HTTPException(status_code=404, detail="Track not found.")
    return True


def get_music_track_path(track_id: str) -> str:
    mp3_path = os.path.join(MUSIC_DIR, f"{track_id}.mp3")
    if not os.path.exists(mp3_path):
        raise HTTPException(status_code=404, detail="Track not found.")
    return mp3_path


async def download_youtube_music(url: str) -> dict:
    url = url.strip()
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

    return meta
