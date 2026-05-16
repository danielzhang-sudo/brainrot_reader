import os
import shutil
import zipfile
import json
from bs4 import BeautifulSoup
from fastapi import HTTPException
from config import STORAGE_DIR

def save_book(file_name: str, file_obj) -> dict:
    if not file_name.endswith(".epub"):
        raise HTTPException(
            status_code=400, detail="Only standard .epub extensions accepted."
        )

    target_path = os.path.join(STORAGE_DIR, file_name)
    with open(target_path, "wb") as destination:
        shutil.copyfileobj(file_obj, destination)

    return {
        "message": "Successfully archived into backend storage system.",
        "filename": file_name,
    }


def list_books() -> list[str]:
    return [f for f in os.listdir(STORAGE_DIR) if f.endswith(".epub")]


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


def list_book_chapters(book_name: str) -> list[dict]:
    book_path = os.path.join(STORAGE_DIR, book_name)
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
    return chapters_metadata


def word_generator(book_path: str, target_file: str):
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


def get_chapter_words_stream(book_name: str, chapter_index: int):
    book_path = os.path.join(STORAGE_DIR, book_name)
    if not os.path.exists(book_path):
        raise HTTPException(status_code=404, detail="Book target not found in library.")

    sections = get_epub_sections(book_path)
    if chapter_index < 0 or chapter_index >= len(sections):
        raise HTTPException(
            status_code=400, detail="Target chapter index boundary overflow."
        )

    target_file = sections[chapter_index]
    return word_generator(book_path, target_file)
