import os
import shutil
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
from bs4 import BeautifulSoup
import uvicorn

app = FastAPI()

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
STORAGE_DIR = os.environ.get(
    "STORAGE_DIR", os.path.join(os.path.dirname(__file__), "epubs")
)
os.makedirs(STORAGE_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
            # Gather all files ending in text/html extensions
            all_files = container.namelist()
            text_files = [
                f for f in all_files
                if f.lower().endswith((".xhtml", ".html", ".htm", ".xml"))
                and not "toc" in f.lower()
            ]
            # Maintain a consistent alphabetical/structural sort sequence
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
    # Generate cleaner names based on filename segments
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

            # Extract plain text content strings safely
            text = soup.get_text(separator=" ")
            words = [w.strip() for w in text.split() if w.strip()]

            # Stream out word blocks chunks
            # Adjust batch sizing counts to balance latency vs stream consistency
            chunk_size = 50
            for i in range(0, len(words), chunk_size):
                batch = words[i : i + chunk_size]
                yield json.dumps({"words": batch, "done": False}) + "\n"

            yield json.dumps({"words": [], "done": True}) + "\n"

    return StreamingResponse(word_generator(), media_type="application/x-ndjson")


if __name__ == "__main__":
    host = os.environ.get("BACKEND_HOST", "0.0.0.0")
    port = int(os.environ.get("BACKEND_PORT", "8090"))
    uvicorn.run(app, host=host, port=port)
