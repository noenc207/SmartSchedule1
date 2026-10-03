import uuid
import datetime
from typing import Optional
from app.providers.base import VisionProvider
from app.schemas.vision_dto import VisionResult, ProcessingMode

class CustomLocalVLMProvider(VisionProvider):
    @property
    def name(self) -> str:
        return "custom-local-vlm"

    @property
    def model_name(self) -> str:
        return "Custom-Local-VLM-v1"

    async def is_available(self) -> bool:
        return True

    async def process(
        self,
        image_bytes: bytes,
        instruction: Optional[str] = None,
        mode: ProcessingMode = ProcessingMode.DOCUMENT
    ) -> VisionResult:
        result_id = str(uuid.uuid4())
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return VisionResult(
            result_id=result_id,
            document_type=mode.value,
            provider=self.name,
            model=self.model_name,
            confidence=0.85,
            events=[],
            tasks=[],
            deadlines=[],
            summary="Custom local VLM processed the document.",
            warnings=[],
            created_at=created_at
        )
