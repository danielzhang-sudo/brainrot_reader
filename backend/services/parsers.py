import io
import zipfile
import json
from bs4 import BeautifulSoup
import ebooklib
from ebooklib import epub

def stream_epub_chapters(file_bytes: bytes):
    """
    Reads an ePub file lazily from an in-memory byte stream,
    parsing and yielding words chapter-by-chapter with enhanced file resolution.
    """
    bytes_io = io.BytesIO(file_bytes)
    
    try:
        book = epub.read_epub(bytes_io)
        # Gather all item structural mappings
        spine_items = [item for item in book.get_items()]
    except Exception:
        # Fallback if structural parsing hits minor container validation flags
        spine_items = []

    bytes_io.seek(0)
    with zipfile.ZipFile(bytes_io, 'r') as archive:
        # Get a flat list of all file names inside the zip container
        zip_contents = archive.namelist()
        idx = 0

        for item in spine_items:
            file_name = item.get_name()
            
            # Find the true matching path within the archive, dealing with potential relative path nesting
            matched_path = next((name for name in zip_contents if name.endswith(file_name)), None)
            
            if not matched_path:
                continue
                
            # Filter specifically for document/content files
            if item.get_type() == ebooklib.ITEM_DOCUMENT or any(matched_path.endswith(ext) for ext in ['.xhtml', '.html', '.xml']):
                try:
                    with archive.open(matched_path) as chapter_file:
                        html_content = chapter_file.read()
                    
                    # Clean up HTML and extract strings
                    soup = BeautifulSoup(html_content, "lxml-xml" if "xml" in matched_path else "html.parser")
                    
                    # Strip embedded style and script blocks that muck up raw strings
                    for script_or_style in soup(["script", "style"]):
                        script_or_style.decompose()
                        
                    text = soup.get_text(separator=" ")
                    words = text.split()
                    
                    if words:
                        yield json.dumps({
                            "chapter_index": idx,
                            "words": words,
                            "word_count": len(words),
                            "done": False
                        }) + "\n"
                        idx += 1
                        
                except Exception:
                    # Gracefully skip corrupted individual internal files without breaking the full book stream
                    continue

    # Final termination payload signal to notify the client stream completion
    yield json.dumps({"done": True, "words": []}) + "\n"
