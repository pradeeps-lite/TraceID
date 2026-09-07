import hashlib
import io
import os
import uuid
import datetime
from PIL import Image
from backend.app.models.schemas import AnalyzeResponse, ImageAnalysis

# In-memory storage for uploaded images
_IMAGE_STORE = {}

def get_stored_image(image_id: str):
    return _IMAGE_STORE.get(image_id)

async def process_and_analyze_image(file_bytes: bytes, declared_mime: str) -> AnalyzeResponse:
    if len(file_bytes) > 15 * 1024 * 1024:
        raise ValueError("INVALID_IMAGE: File size exceeds the 15MB limit.")
    if len(file_bytes) < 32:
        raise ValueError("INVALID_IMAGE: File size is too small or empty.")

    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
        # Re-open after verify()
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        img_format = (img.format or "JPEG").upper()
    except Exception as e:
        raise ValueError(f"INVALID_IMAGE: Corrupt or unreadable image ({str(e)})")

    if img_format not in ("JPEG", "JPG", "PNG", "WEBP"):
        raise ValueError(f"INVALID_IMAGE: Unsupported format {img_format}. Allowed: JPG, PNG, WEBP.")

    image_hash = hashlib.sha256(file_bytes).hexdigest()
    image_id = str(uuid.uuid4())

    _IMAGE_STORE[image_id] = {
        "bytes": file_bytes,
        "mimeType": declared_mime or f"image/{img_format.lower()}",
        "hash": image_hash,
        "width": width,
        "height": height,
        "format": img_format,
        "createdAt": datetime.datetime.utcnow().timestamp()
    }

    # Factual image analysis structure
    analysis = ImageAnalysis(
        imageType=img_format,
        objects=[],
        textDetected=[],
        sceneDescription=f"Analyzed {img_format} visual asset ({width}x{height}px)."
    )

    return AnalyzeResponse(
        imageId=image_id,
        imageHash=image_hash,
        width=width,
        height=height,
        format=img_format,
        fileSizeBytes=len(file_bytes),
        uploadedAt=datetime.datetime.utcnow().isoformat(),
        analysis=analysis
    )
