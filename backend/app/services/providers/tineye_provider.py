import os
import uuid
import httpx
from typing import List
from backend.app.services.providers.base import SearchProvider
from backend.app.models.schemas import SearchResult

class TinEyeSearchProvider(SearchProvider):
    @property
    def name(self) -> str:
        return "tineye"

    @property
    def display_name(self) -> str:
        return "TinEye Reverse Image Search"

    def is_configured(self) -> bool:
        return bool(os.getenv("TINEYE_API_KEY", "").strip())

    async def search(
        self,
        image_bytes: bytes,
        mime_type: str,
        timeout_seconds: int = 30,
        max_results: int = 50
    ) -> List[SearchResult]:
        api_key = os.getenv("TINEYE_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("PROVIDER_NOT_CONFIGURED: TinEye requires TINEYE_API_KEY.")

        files = {"image": ("query.jpg", image_bytes, mime_type)}
        headers = {"x-api-key": api_key}
        data = {"limit": str(max_results)}

        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post("https://api.tineye.com/rest/search/", headers=headers, files=files, data=data)

        if resp.status_code in (401, 403):
            raise RuntimeError("PROVIDER_AUTH_ERROR: TinEye API key is unauthorized or inactive")
        if resp.status_code == 429:
            raise RuntimeError("PROVIDER_RATE_LIMIT: TinEye rate limit reached")
        if resp.status_code != 200:
            raise RuntimeError(f"SEARCH_SERVICE_ERROR: TinEye returned HTTP {resp.status_code}")

        res_data = resp.json()
        matches = res_data.get("results", {}).get("matches", [])
        results: List[SearchResult] = []
        seen = set()

        for m in matches:
            score = m.get("score")
            match_type = "exact" if (score and score >= 95) else ("near" if (score and score >= 70) else "related")
            img_url = m.get("image_url")
            backlinks = m.get("backlinks", [])

            for bl in backlinks:
                page_url = bl.get("backlink") or bl.get("url")
                if not page_url or page_url in seen:
                    continue
                seen.add(page_url)
                domain, platform = self.parse_platform_and_domain(page_url)
                results.append(
                    SearchResult(
                        id=str(uuid.uuid4()),
                        title=bl.get("title"),
                        description=None,
                        sourceUrl=page_url,
                        domain=domain,
                        platform=platform,
                        imageUrl=img_url,
                        thumbnailUrl=img_url,
                        publishedAt=bl.get("crawl_date"),
                        matchType=match_type,
                        similarityScore=score,
                        metadata={"crawlDate": bl.get("crawl_date")}
                    )
                )

        return results
