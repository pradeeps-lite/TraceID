from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from urllib.parse import urlparse
from backend.app.models.schemas import SearchResult

class SearchProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def search(
        self,
        image_bytes: bytes,
        mime_type: str,
        timeout_seconds: int = 30,
        max_results: int = 50
    ) -> List[SearchResult]:
        pass

    def parse_platform_and_domain(self, url_str: str) -> Tuple[str, str]:
        try:
            parsed = urlparse(url_str)
            hostname = (parsed.netloc or "").lower()
            if hostname.startswith("www."):
                hostname = hostname[4:]
            
            if "reddit.com" in hostname:
                return hostname, "Reddit"
            if "twitter.com" in hostname or "x.com" in hostname:
                return hostname, "X / Twitter"
            if "instagram.com" in hostname:
                return hostname, "Instagram"
            if "facebook.com" in hostname:
                return hostname, "Facebook"
            if "youtube.com" in hostname or "youtu.be" in hostname:
                return hostname, "YouTube"
            if "wikipedia.org" in hostname or "wikimedia.org" in hostname:
                return hostname, "Wikipedia / Wikimedia"
            if "github.com" in hostname:
                return hostname, "GitHub"
            if "pinterest.com" in hostname:
                return hostname, "Pinterest"
            if "flickr.com" in hostname:
                return hostname, "Flickr"

            parts = hostname.split(".")
            name = parts[-2] if len(parts) > 1 else hostname
            return hostname, name.capitalize()
        except Exception:
            return "Unknown Domain", "Web Source"
