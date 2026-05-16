from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from services.library import save_book, list_books, list_book_chapters, get_chapter_words_stream

router = APIRouter(prefix="/library", tags=["library"])

@router.post("/upload")
async def upload_to_library(file: UploadFile = File(...)):
    return save_book(file.filename, file.file)


@router.get("/books")
async def list_library_books():
    return {"books": list_books()}


@router.get("/chapters")
async def list_book_chapters_endpoint(book: str = Query(...)):
    return {"chapters": list_book_chapters(book)}


@router.get("/stream-chapter")
async def stream_chapter_endpoint(book: str = Query(...), chapter_index: int = Query(...)):
    stream_generator = get_chapter_words_stream(book, chapter_index)
    return StreamingResponse(stream_generator, media_type="application/x-ndjson")
