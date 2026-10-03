import os
import time
import hashlib
from typing import Optional, Dict, Tuple
from app.config import settings
from app.schemas.vision_dto import VisionResult

class TempStorageManager:
    def __init__(self):
        self.temp_dir = settings.TEMP_DIR
        os.makedirs(self.temp_dir, exist_ok=True)
        # In-memory cache mapping: (user_id, image_hash) -> (VisionResult, timestamp)
        self._cache: Dict[Tuple[str, str], Tuple[VisionResult, float]] = {}

    def compute_hash(self, content: bytes) -> str:
        """Compute SHA-256 hash of raw image content."""
        return hashlib.sha256(content).hexdigest()

    def get_cached_result(self, user_id: str, image_hash: str) -> Optional[VisionResult]:
        """Retrieve cached result if not expired."""
        key = (user_id, image_hash)
        if key in self._cache:
            result, timestamp = self._cache[key]
            if time.time() - timestamp < settings.CACHE_TTL_SECONDS:
                return result
            else:
                # Expired
                del self._cache[key]
        return None

    def cache_result(self, user_id: str, image_hash: str, result: VisionResult) -> None:
        """Save result in cache with timestamp."""
        self._cache[(user_id, image_hash)] = (result, time.time())
        self.cleanup_expired()

    def save_temp_image(self, file_hash: str, content: bytes, ext: str = ".jpg") -> str:
        """Save image temporarily to disk with timestamp prefix."""
        filename = f"{int(time.time())}_{file_hash[:16]}{ext}"
        filepath = os.path.join(self.temp_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        return filepath

    def cleanup_expired(self) -> int:
        """Clean up expired cache entries and temporary files on disk."""
        now = time.time()
        # Clean cache
        expired_keys = [k for k, (_, ts) in self._cache.items() if now - ts >= settings.CACHE_TTL_SECONDS]
        for k in expired_keys:
            del self._cache[k]

        # Clean temp directory files
        deleted_count = 0
        try:
            if os.path.exists(self.temp_dir):
                for fname in os.listdir(self.temp_dir):
                    fpath = os.path.join(self.temp_dir, fname)
                    if os.path.isfile(fpath):
                        file_age = now - os.path.getmtime(fpath)
                        if file_age >= settings.CACHE_TTL_SECONDS:
                            try:
                                os.remove(fpath)
                                deleted_count += 1
                            except OSError:
                                pass
        except Exception:
            pass
        return deleted_count

storage_manager = TempStorageManager()
