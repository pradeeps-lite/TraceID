import os
import datetime
from typing import Dict
from backend.app.models.schemas import SearchResponse, ProviderExecutionStatus
from backend.app.services.providers.base import SearchProvider
from backend.app.services.providers.google_provider import GoogleVisualSearchProvider
from backend.app.services.providers.tineye_provider import TinEyeSearchProvider

class SearchService:
    def __init__(self):
        self.providers: Dict[str, SearchProvider] = {
            "google": GoogleVisualSearchProvider(),
            "tineye": TinEyeSearchProvider(),
        }

    async def search_image(self, image_hash: str, image_bytes: bytes, mime_type: str) -> SearchResponse:
        provider_mode = os.getenv("SEARCH_PROVIDER", "google").lower()
        timeout_sec = int(os.getenv("SEARCH_TIMEOUT_SECONDS", "30"))
        max_results = int(os.getenv("MAX_RESULTS", "50"))

        providers_to_run = []
        if provider_mode == "multi":
            providers_to_run = [p for p in self.providers.values() if p.is_configured()]
            if not providers_to_run:
                providers_to_run = [self.providers["google"]]
        else:
            p = self.providers.get(provider_mode, self.providers["google"])
            providers_to_run = [p]

        if not any(p.is_configured() for p in providers_to_run):
            return SearchResponse(
                status="provider_not_configured",
                provider=provider_mode,
                searchedAt=datetime.datetime.utcnow().isoformat(),
                providersSearched=[
                    ProviderExecutionStatus(
                        name=p.display_name,
                        status="not_configured",
                        resultsCount=0,
                        durationMs=0,
                        error="API key or credentials not configured"
                    ) for p in providers_to_run
                ],
                totalMatches=0,
                results=[],
                message="SEARCH PROVIDER NOT CONFIGURED: Configure GOOGLE_CLOUD_API_KEY or TINEYE_API_KEY."
            )

        all_results = []
        statuses = []
        for provider in providers_to_run:
            start = datetime.datetime.utcnow()
            try:
                res = await provider.search(image_bytes, mime_type, timeout_seconds=timeout_sec, max_results=max_results)
                dur = int((datetime.datetime.utcnow() - start).total_seconds() * 1000)
                statuses.append(ProviderExecutionStatus(
                    name=provider.display_name,
                    status="success" if res else "no_results",
                    resultsCount=len(res),
                    durationMs=dur
                ))
                all_results.extend(res)
            except Exception as e:
                dur = int((datetime.datetime.utcnow() - start).total_seconds() * 1000)
                statuses.append(ProviderExecutionStatus(
                    name=provider.display_name,
                    status="error",
                    resultsCount=0,
                    durationMs=dur,
                    error=str(e)
                ))

        # Deduplicate
        seen = {}
        for r in all_results:
            if r.sourceUrl not in seen:
                seen[r.sourceUrl] = r

        results = list(seen.values())[:max_results]
        status = "success" if results else "no_results"
        msg = None
        if not results:
            if any(s.status == "error" for s in statuses):
                status = "error"
                msg = next((s.error for s in statuses if s.error), "Visual search failed.")
            else:
                msg = "The configured visual-search provider did not return publicly indexed matches for this image."

        return SearchResponse(
            status=status,
            provider=provider_mode,
            searchedAt=datetime.datetime.utcnow().isoformat(),
            providersSearched=statuses,
            totalMatches=len(results),
            results=results,
            message=msg
        )
