from typing import Optional, Dict
from app.config import settings
from app.schemas.vision_dto import VisionResult, ProcessingMode
from app.providers.base import VisionProvider
from app.providers.paddleocr_provider import PaddleOCRVLProvider
from app.providers.qwen_vl_provider import Qwen3VLProvider
from app.providers.custom_local_provider import CustomLocalVLMProvider

class VisionRouter:
    def __init__(self):
        self.providers: Dict[str, VisionProvider] = {
            "paddleocr-vl-1.5": PaddleOCRVLProvider(),
            "qwen3-vl": Qwen3VLProvider(),
            "custom-local": CustomLocalVLMProvider(),
        }

    def get_provider(self, name: str) -> VisionProvider:
        return self.providers.get(name, self.providers["paddleocr-vl-1.5"])

    def route_primary_provider(self, mode: ProcessingMode) -> VisionProvider:
        if mode in [ProcessingMode.TIMETABLE, ProcessingMode.DOCUMENT, ProcessingMode.DEADLINE]:
            return self.providers["paddleocr-vl-1.5"]
        elif mode == ProcessingMode.SCREENSHOT:
            return self.providers["paddleocr-vl-1.5"]
        else:
            return self.providers["qwen3-vl"]

    def route_secondary_provider(self, primary: VisionProvider) -> VisionProvider:
        if primary.name == "paddleocr-vl-1.5":
            return self.providers["qwen3-vl"]
        return self.providers["paddleocr-vl-1.5"]

    async def execute(
        self,
        image_bytes: bytes,
        instruction: Optional[str] = None,
        mode: ProcessingMode = ProcessingMode.TIMETABLE,
    ) -> VisionResult:
        primary = self.route_primary_provider(mode)
        try:
            result = await primary.process(image_bytes, instruction, mode)
            # Check confidence fallback gating
            if result.confidence < settings.CONFIDENCE_FALLBACK_THRESHOLD:
                secondary = self.route_secondary_provider(primary)
                try:
                    fallback_result = await secondary.process(image_bytes, instruction, mode)
                    if fallback_result.confidence > result.confidence:
                        fallback_result.warnings.append(
                            f"Primary provider '{primary.name}' had low confidence ({result.confidence:.2f}). Fell back to '{secondary.name}'."
                        )
                        return fallback_result
                except Exception:
                    pass  # Keep primary result if fallback fails
            return result
        except Exception as e:
            # Primary failed, attempt secondary fallback
            secondary = self.route_secondary_provider(primary)
            fallback_result = await secondary.process(image_bytes, instruction, mode)
            fallback_result.warnings.append(
                f"Primary provider '{primary.name}' failed with error: {str(e)}. Fell back to '{secondary.name}'."
            )
            return fallback_result

    async def check_health(self) -> Dict[str, bool]:
        health_status = {}
        for name, provider in self.providers.items():
            health_status[name] = await provider.is_available()
        return health_status

vision_router = VisionRouter()
