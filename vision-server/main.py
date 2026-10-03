import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.endpoints import router as vision_router
from app.storage.temp_storage import storage_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Clean up any stale temp files from previous runs
    storage_manager.cleanup_expired()
    yield
    # Shutdown: Final cleanup
    storage_manager.cleanup_expired()

app = FastAPI(
    title="SmartSchedule Vision Server",
    description="Independent Vision Microservice for Timetable, Syllabus, Deadline, and Screenshot Parsing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision_router)

@app.get("/")
def root():
    return {
        "service": "SmartSchedule Vision Server",
        "status": "online",
        "port": settings.PORT,
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=False)
