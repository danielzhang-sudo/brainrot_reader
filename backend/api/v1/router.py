from fastapi import APIRouter
from api.v1.endpoints.library import router as library_router
from api.v1.endpoints.music import router as music_router
from api.v1.endpoints.parsers import router as parsers_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(library_router)
api_router.include_router(music_router)
api_router.include_router(parsers_router)
