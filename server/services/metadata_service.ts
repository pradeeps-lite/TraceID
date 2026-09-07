import dns from "dns";
import { promisify } from "util";

const lookupAsync = promisify(dns.lookup);

/**
 * Checks if an IP address falls into a private or reserved range to prevent SSRF.
 */
function isPrivateIp(ip: string): boolean {
  // IPv4 checks
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true; // Link-local / Cloud metadata service
  if (ip.startsWith("100.64.")) return true; // Carrier-grade NAT

  const parts = ip.split(".").map(Number);
  if (parts.length === 4) {
    // 172.16.0.0 – 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }

  // IPv6 checks
  if (ip === "::1" || ip === "::" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }

  return false;
}

export interface EnrichedMetadata {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  publishedAt: string | null;
  author: string | null;
  ogImage: string | null;
  siteName: string | null;
}

/**
 * Safely fetches public metadata from a target URL with strict SSRF controls.
 */
export async function fetchSafeMetadata(targetUrl: string): Promise<EnrichedMetadata | null> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // SSRF DNS resolution validation
    const { address } = await lookupAsync(parsed.hostname);
    if (isPrivateIp(address)) {
      console.warn(`SSRF protection: blocked private IP ${address} for host ${parsed.hostname}`);
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4 second max timeout

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TRACE-ID/1.0",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
      return null;
    }

    // Limit read size to 256KB to avoid memory exhaustion
    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = "";
    let bytesRead = 0;
    const maxBytes = 256 * 1024;
    const decoder = new TextDecoder();

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>")) {
        break; // We only need <head> metadata
      }
    }

    reader.cancel();

    // Extract basic HTML & Open Graph tags via safe regex
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    const siteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);

    const authorMatch = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i);

    const pubDateMatch = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i);

    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);

    const title = ogTitleMatch?.[1]?.trim() || titleMatch?.[1]?.trim() || null;
    const description = ogDescMatch?.[1]?.trim() || descMatch?.[1]?.trim() || null;
    const ogImage = ogImageMatch?.[1]?.trim() || null;
    const siteName = siteNameMatch?.[1]?.trim() || null;
    const author = authorMatch?.[1]?.trim() || null;
    const publishedAt = pubDateMatch?.[1]?.trim() || null;
    const canonicalUrl = canonicalMatch?.[1]?.trim() || null;

    return {
      title,
      description,
      canonicalUrl,
      publishedAt,
      author,
      ogImage,
      siteName,
    };
  } catch (err) {
    // If enrichment fails or times out, return null cleanly - never throw or fake
    return null;
  }
}
