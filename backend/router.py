from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from parsers import stream_epub_chapters

parser_router = APIRouter(prefix="/api/v1", tags=["parsers"])

@parser_router.post("/parse-epub-stream")
async def parse_epub_stream_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(".epub"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .epub allowed.")
    
    try:
        # Read incoming file bytes asynchronously
        contents = await file.read()
        
        # Return a stream instead of a rigid static JSON object
        return StreamingResponse(
            stream_epub_chapters(contents),
            media_type="application/x-ndjson"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming extraction pipeline error: {str(e)}")