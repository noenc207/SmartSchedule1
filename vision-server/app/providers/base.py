from abc import ABC, abstractmethod
from typing import Optional
from app.schemas.vision_dto import VisionResult, ProcessingMode

class VisionProvider(ABC):
    """Abstract Base Class for Vision Providers."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier (e.g., paddleocr-vl-1.5, qwen3-vl)."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Underlying model name or version."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check whether provider dependencies / service endpoints are healthy."""
        pass

    @abstractmethod
    async def process(
        self,
        image_bytes: bytes,
        instruction: Optional[str] = None,
        mode: ProcessingMode = ProcessingMode.TIMETABLE
    ) -> VisionResult:
        """
        Process the image bytes and extract structured schedule / document information.
        Must NOT send raw image outside the local boundary.
        """
        pass
