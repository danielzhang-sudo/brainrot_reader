from fastapi import APIRouter, UploadFile, File, Request
from fastapi.responses import FileResponse
from services.music import (
    list_music_tracks,
    save_uploaded_music,
    delete_music_track,
    get_music_track_path,
    download_youtube_music,
)

router = APIRouter(prefix="/music", tags=["music"])

@router.post("/upload")
async def upload_music(file: UploadFile = File(...)):
    track = save_uploaded_music(file.filename, file.file)
    return {"message": "Track uploaded.", "track": track}


@router.get("/list")
async def list_music():
    return {"tracks": list_music_tracks()}


@router.delete("/{track_id}")
async def delete_music(track_id: str):
    delete_music_track(track_id)
    return {"message": "Track deleted."}


@router.get("/stream/{track_id}")
async def stream_music(track_id: str):
    mp3_path = get_music_track_path(track_id)
    return FileResponse(
        mp3_path,
        media_type="audio/mpeg",
        filename=f"{track_id}.mp3",
    )


@router.post("/youtube")
async def add_youtube_music(request: Request):
    body = await request.json()
    url = body.get("url", "").strip()
    track = await download_youtube_music(url)
    return {"message": "YouTube track downloaded.", "track": track}
