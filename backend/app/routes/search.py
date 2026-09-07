from fastapi import APIRouter, HTTPException
from backend.app.models.schemas import SearchRequest, SearchResponse
from backend.app.services.image_analysis import get_stored_image
from backend.app.services.search_service import SearchService

router = APIRouter()
search_service = SearchService()

@router.post("/search", response_model=SearchResponse)
async def search_image(req: SearchRequest):
    stored = get_stored_image(req.imageId)
    if not stored:
        raise HTTPException(
            status_code=404,
            detail="IMAGE_NOT_FOUND: The requested imageId does not exist or has expired."
        )

    try:
        return await search_service.search_image(
            image_hash=stored["hash"],
            image_bytes=stored["bytes"],
            mime_type=stored["mimeType"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SEARCH_SERVICE_ERROR: {str(e)}")
