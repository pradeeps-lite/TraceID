import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.app.routes.analyze import router as analyze_router
from backend.app.routes.search import router as search_router

load_dotenv()

app = FastAPI(title="TRACE ID Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")
app.include_router(search_router, prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "TRACE ID FastAPI Backend"}

@app.get("/api/config-status")
async def config_status():
    return {
        "configuredProvider": os.getenv("SEARCH_PROVIDER", "google"),
        "googleConfigured": bool(os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("GOOGLE_VISION_API_KEY")),
        "tineyeConfigured": bool(os.getenv("TINEYE_API_KEY")),
        "geminiConfigured": bool(os.getenv("GEMINI_API_KEY")),
        "searchTimeoutSeconds": int(os.getenv("SEARCH_TIMEOUT_SECONDS", "30")),
        "maxResults": int(os.getenv("MAX_RESULTS", "50")),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
