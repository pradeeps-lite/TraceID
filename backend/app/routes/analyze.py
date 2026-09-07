from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.app.models.schemas import AnalyzeResponse
from backend.app.services.image_analysis import process_and_analyze_image

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(image: UploadFile = File(...)):
    try:
        content = await image.read()
        return await process_and_analyze_image(content, image.content_type or "image/jpeg")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IMAGE_PROCESSING_ERROR: {str(e)}")
