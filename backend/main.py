from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router import parser_router

app = FastAPI(
    title="Word-by-Word RSVP Parsing Engine",
    description="Backend service handling document extraction pipelines for the PWA reader application."
)

# Configure Cross-Origin Resource Sharing (CORS) for your Next.js local & production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific origins in production environments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routers to the application root instance
app.include_router(parser_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}