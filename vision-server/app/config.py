import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    HOST: str = "0.0.0.0"
    PORT: int = 8090
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_MIME_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/bmp"]
    ALLOWED_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
    MAX_IMAGE_PIXELS: int = 50_000_000  # Decompression bomb guard
    TEMP_DIR: str = os.path.join(os.path.dirname(__file__), "..", "temp_storage")
    CACHE_TTL_SECONDS: int = 900  # 15 minutes TTL
    PRIMARY_TIMETABLE_PROVIDER: str = "paddleocr-vl-1.5"
    PRIMARY_GENERAL_PROVIDER: str = "qwen3-vl"
    CONFIDENCE_FALLBACK_THRESHOLD: float = 0.65

    # Optional local endpoints or model weights
    PADDLEOCR_SERVICE_URL: str = os.getenv("PADDLEOCR_SERVICE_URL", "")
    QWEN_VL_SERVICE_URL: str = os.getenv("QWEN_VL_SERVICE_URL", "")
    API_SECRET_KEY: str = os.getenv("VISION_SECRET_KEY", "smartschedule-vision-internal-secret-2026")

settings = Settings()
