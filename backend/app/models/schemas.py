from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel

MatchType = Literal["exact", "near", "related"]

class ImageAnalysis(BaseModel):
    imageType: str
    objects: List[str] = []
    textDetected: List[str] = []
    sceneDescription: str
    landmarks: Optional[List[str]] = []
    logos: Optional[List[str]] = []
    visualCharacteristics: Optional[Dict[str, Any]] = None

class AnalyzeResponse(BaseModel):
    imageId: str
    imageHash: str
    width: int
    height: int
    format: str
    fileSizeBytes: int
    uploadedAt: str
    analysis: ImageAnalysis

class SearchRequest(BaseModel):
    imageId: str

class SearchResult(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    sourceUrl: str
    domain: str
    platform: str
    imageUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    publishedAt: Optional[str] = None
    matchType: MatchType
    similarityScore: Optional[float] = None
    metadata: Dict[str, Any] = {}

class ProviderExecutionStatus(BaseModel):
    name: str
    status: Literal["success", "no_results", "error", "not_configured"]
    resultsCount: int
    durationMs: int
    error: Optional[str] = None

class SearchResponse(BaseModel):
    status: Literal["success", "no_results", "provider_not_configured", "error"]
    provider: str
    searchedAt: str
    providersSearched: List[ProviderExecutionStatus]
    totalMatches: int
    results: List[SearchResult]
    message: Optional[str] = None
