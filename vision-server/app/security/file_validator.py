import io
import os
from fastapi import HTTPException, UploadFile, status
from PIL import Image
from app.config import settings

# Configure PIL decompression bomb limit
Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS

MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",  # WebP begins with RIFF...WEBP
    b"BM": "image/bmp",
}

def detect_mime_type(content: bytes) -> str:
    """Detect MIME type from header magic bytes."""
    for magic, mime in MAGIC_BYTES.items():
        if content.startswith(magic):
            if magic == b"RIFF" and len(content) >= 12 and content[8:12] != b"WEBP":
                continue
            return mime
    return ""

async def validate_uploaded_image(file: UploadFile) -> bytes:
    """
    Strict validation of uploaded image:
    1. Extension check
    2. File size limit (<10MB)
    3. Magic byte check
    4. Decompression bomb guard
    5. Image integrity check
    """
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"INVALID_FILE_TYPE: Định dạng file '{ext}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, BMP."
        )

    # Read content
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="EMPTY_FILE: File tải lên không có dữ liệu."
        )

    if file_size > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"FILE_TOO_LARGE: Dung lượng file ({file_size / (1024*1024):.2f}MB) vượt quá giới hạn cho phép (10MB)."
        )

    # Magic byte verification
    detected_mime = detect_mime_type(content)
    if not detected_mime or detected_mime not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_IMAGE_HEADER: Dữ liệu file không phải là định dạng hình ảnh hợp lệ (magic bytes check failed)."
        )

    # Decompression bomb & image integrity check via Pillow
    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()
    except Image.DecompressionBombError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DECOMPRESSION_BOMB: Kích thước pixel của ảnh vượt quá giới hạn an toàn phòng chống tấn công từ chối dịch vụ."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"IMAGE_CORRUPTED: Không thể giải mã tệp ảnh: {str(e)}"
        )

    # Re-open to check dimensions (verify() closes or invalidates some fields)
    try:
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size
            if width > 10000 or height > 10000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"IMAGE_TOO_LARGE: Kích thước ảnh ({width}x{height}) vượt quá giới hạn 10000x10000 pixel."
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"IMAGE_PARSE_ERROR: Lỗi đọc kích thước ảnh: {str(e)}"
        )

    return content
