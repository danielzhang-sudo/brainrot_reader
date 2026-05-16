import os

STORAGE_DIR = os.environ.get(
    "STORAGE_DIR", os.path.join(os.path.dirname(__file__), "epubs")
)
MUSIC_DIR = os.environ.get(
    "MUSIC_DIR", os.path.join(os.path.dirname(__file__), "music")
)

os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(MUSIC_DIR, exist_ok=True)
