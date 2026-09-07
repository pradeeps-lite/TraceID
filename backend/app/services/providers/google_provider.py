import base64
import os
import uuid
import httpx
from typing import List
from backend.app.services.providers.base import SearchProvider
from backend.app.models.schemas import SearchResult

class GoogleVisualSearchProvider(SearchProvider):
    @property
    def name(self) -> str:
        return "google"

    @property
    def display_name(self) -> str:
        return "Google Cloud Visual Web Detection"

    def _get_api_key(self) -> str:
        return (
            os.getenv("GOOGLE_CLOUD_API_KEY")
            or os.getenv("GOOGLE_VISION_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or ""
        )

    def is_configured(self) -> bool:
        return bool(self._get_api_key().strip())

    async def search(
        self,
        image_bytes: bytes,
        mime_type: str,
        timeout_seconds: int = 30,
        max_results: int = 50
    ) -> List[SearchResult]:
        api_key = self._get_api_key()
        if not api_key:
            raise RuntimeError("PROVIDER_NOT_CONFIGURED: Google Visual Search requires GOOGLE_CLOUD_API_KEY.")

        base64_img = base64.b64encode(image_bytes).decode("utf-8")
        url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
        payload = {
            "requests": [
                {
                    "image": {"content": base64_img},
                    "features": [{"type": "WEB_DETECTION", "maxResults": max_results}],
                }
            ]
        }

        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(url, json=payload)

        if resp.status_code in (401, 403):
            raise RuntimeError(f"PROVIDER_AUTH_ERROR: Google Cloud Vision API unauthorized ({resp.status_code})")
        if resp.status_code == 429:
            raise RuntimeError("PROVIDER_RATE_LIMIT: Google Cloud Vision API rate limit reached")
        if resp.status_code != 200:
            raise RuntimeError(f"SEARCH_SERVICE_ERROR: Google Vision returned {resp.status_code}")

        data = resp.json()
        item = data.get("responses", [{}])[0]
        if "error" in item:
            raise RuntimeError(f"PROVIDER_ERROR: {item['error'].get('message')}")

        web = item.get("webDetection", {})
        results: List[SearchResult] = []
        seen = set()

        for page in web.get("pagesWithMatchingImages", []):
            page_url = page.get("url")
            if not page_url or page_url in seen:
                continue
            seen.add(page_url)
            domain, platform = self.parse_platform_and_domain(page_url)
            match_type = "exact" if page.get("fullMatchingImages") else "near"
            img_url = (page.get("fullMatchingImages") or page.get("partialMatchingImages") or [{}])[0].get("url")
            results.append(
                SearchResult(
                    id=str(uuid.uuid4()),
                    title=page.get("pageTitle"),
                    description=None,
                    sourceUrl=page_url,
                    domain=domain,
                    platform=platform,
                    imageUrl=img_url,
                    thumbnailUrl=img_url,
                    matchType=match_type,
                    similarityScore=None,
                    metadata={"source": "pagesWithMatchingImages"}
                )
            )

        for img in web.get("fullMatchingImages", []):
            img_url = img.get("url")
            if not img_url or img_url in seen:
                continue
            seen.add(img_url)
            domain, platform = self.parse_platform_and_domain(img_url)
            results.append(
                SearchResult(
                    id=str(uuid.uuid4()),
                    title=None,
                    description=None,
                    sourceUrl=img_url,
                    domain=domain,
                    platform=platform,
                    imageUrl=img_url,
                    thumbnailUrl=img_url,
                    matchType="exact",
                    similarityScore=img.get("score"),
                    metadata={"source": "fullMatchingImages"}
                )
            )

        for img in web.get("visuallySimilarImages", []):
            img_url = img.get("url")
            if not img_url or img_url in seen:
                continue
            seen.add(img_url)
            domain, platform = self.parse_platform_and_domain(img_url)
            results.append(
                SearchResult(
                    id=str(uuid.uuid4()),
                    title=None,
                    description=None,
                    sourceUrl=img_url,
                    domain=domain,
                    platform=platform,
                    imageUrl=img_url,
                    thumbnailUrl=img_url,
                    matchType="related",
                    similarityScore=None,
                    metadata={"source": "visuallySimilarImages"}
                )
            )

        return results
