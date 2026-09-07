import ipaddress
import socket
from urllib.parse import urlparse
from typing import Optional, Dict
import httpx
from bs4 import BeautifulSoup

def is_private_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
    except ValueError:
        return True

async def fetch_safe_metadata(target_url: str) -> Optional[Dict[str, Optional[str]]]:
    try:
        parsed = urlparse(target_url)
        if parsed.scheme not in ("http", "https"):
            return None

        hostname = parsed.hostname or ""
        # DNS lookup to protect against SSRF
        ip = socket.gethostbyname(hostname)
        if is_private_ip(ip):
            return None

        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            resp = await client.get(
                target_url,
                headers={"User-Agent": "TRACE-ID-Provenance/1.0", "Accept": "text/html"}
            )
            if resp.status_code != 200:
                return None
            
            # Read first 256KB
            html = resp.text[:256 * 1024]
            soup = BeautifulSoup(html, "html.parser")

            title = soup.title.string.strip() if soup.title and soup.title.string else None
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                title = og_title["content"].strip()

            desc = None
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and meta_desc.get("content"):
                desc = meta_desc["content"].strip()
            og_desc = soup.find("meta", property="og:description")
            if og_desc and og_desc.get("content"):
                desc = og_desc["content"].strip()

            og_image = soup.find("meta", property="og:image")
            image_url = og_image["content"].strip() if og_image and og_image.get("content") else None

            site_name = soup.find("meta", property="og:site_name")
            platform = site_name["content"].strip() if site_name and site_name.get("content") else None

            return {
                "title": title,
                "description": desc,
                "imageUrl": image_url,
                "platform": platform
            }
    except Exception:
        return None
