import crypto from "crypto";
import { SearchResult } from "../types.js";
import { SearchProvider } from "./base.js";
import { fetchSafeMetadata } from "../services/metadata_service.js";

export class TinEyeSearchProvider extends SearchProvider {
  readonly name = "tineye";
  readonly displayName = "TinEye Commercial Reverse Image Search";

  private getApiKey(): string | null {
    return process.env.TINEYE_API_KEY || null;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  async search(
    imageBuffer: Buffer,
    mimeType: string,
    options?: { timeoutSeconds?: number; maxResults?: number }
  ): Promise<SearchResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("PROVIDER_NOT_CONFIGURED: TinEye requires TINEYE_API_KEY.");
    }

    const timeoutSec = options?.timeoutSeconds || 30;
    const maxResults = options?.maxResults || 50;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutSec * 1000);

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append("image", blob, "query_image");
    formData.append("limit", String(maxResults));

    const endpoint = "https://api.tineye.com/rest/search/";

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "User-Agent": "TRACE-ID-TinEye/1.0",
        },
        body: formData,
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err.name === "AbortError") {
        throw new Error("PROVIDER_TIMEOUT: TinEye request timed out.");
      }
      throw new Error(`SEARCH_SERVICE_ERROR: Failed to connect to TinEye API: ${err.message}`);
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {}

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `PROVIDER_AUTH_ERROR: TinEye API key is unauthorized or inactive. (${response.status}: ${errorBody})`
        );
      }
      if (response.status === 429) {
        throw new Error("PROVIDER_RATE_LIMIT: TinEye API search bundle limit or rate limit reached.");
      }
      throw new Error(`SEARCH_SERVICE_ERROR: TinEye API returned HTTP ${response.status}: ${errorBody}`);
    }

    const data: any = await response.json();
    const matches = data?.results?.matches || [];
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const match of matches) {
      const score = typeof match.score === "number" ? match.score : null;
      let matchType: 'exact' | 'near' | 'related' = 'near';
      if (score !== null) {
        if (score >= 95) matchType = 'exact';
        else if (score >= 70) matchType = 'near';
        else matchType = 'related';
      }

      const imageUrl = match.image_url || null;
      const backlinks = Array.isArray(match.backlinks) ? match.backlinks : [];

      if (backlinks.length > 0) {
        for (const bl of backlinks) {
          const pageUrl = bl.backlink || bl.url;
          if (!pageUrl || seenUrls.has(pageUrl)) continue;
          seenUrls.add(pageUrl);

          const { domain, platform } = this.parsePlatformAndDomain(pageUrl);
          results.push({
            id: crypto.randomUUID(),
            title: bl.title || null,
            description: null,
            sourceUrl: pageUrl,
            domain,
            platform,
            imageUrl,
            thumbnailUrl: imageUrl,
            publishedAt: bl.crawl_date || null,
            matchType,
            similarityScore: score,
            metadata: {
              crawlDate: bl.crawl_date,
              tineyeQueryScore: score,
              filesize: match.filesize,
              dimensions: match.width && match.height ? `${match.width}x${match.height}` : null,
            },
          });
        }
      } else if (match.domain) {
        const sourceUrl = `https://${match.domain}`;
        if (!seenUrls.has(sourceUrl)) {
          seenUrls.add(sourceUrl);
          const { domain, platform } = this.parsePlatformAndDomain(sourceUrl);
          results.push({
            id: crypto.randomUUID(),
            title: null,
            description: null,
            sourceUrl,
            domain,
            platform,
            imageUrl,
            thumbnailUrl: imageUrl,
            publishedAt: null,
            matchType,
            similarityScore: score,
            metadata: {
              tineyeQueryScore: score,
            },
          });
        }
      }
    }

    // Enrich top results safely
    const enrichmentLimit = Math.min(results.length, 10);
    await Promise.all(
      results.slice(0, enrichmentLimit).map(async (res) => {
        const enriched = await fetchSafeMetadata(res.sourceUrl);
        if (enriched) {
          if (!res.title && enriched.title) res.title = enriched.title;
          if (!res.description && enriched.description) res.description = enriched.description;
          if (!res.publishedAt && enriched.publishedAt) res.publishedAt = enriched.publishedAt;
          if (enriched.siteName && res.platform === "Web Source") res.platform = enriched.siteName;
        }
      })
    );

    return results;
  }
}
