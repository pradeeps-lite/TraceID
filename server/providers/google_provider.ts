import crypto from "crypto";
import { SearchResult } from "../types.js";
import { SearchProvider } from "./base.js";
import { fetchSafeMetadata } from "../services/metadata_service.js";

export class GoogleVisualSearchProvider extends SearchProvider {
  readonly name = "google";
  readonly displayName = "Google Cloud Visual Web Detection";

  private async getAuthHeader(): Promise<{ header: string; value: string; isKey: boolean } | null> {
    // 1. Explicit API Key
    const apiKey =
      process.env.GOOGLE_CLOUD_API_KEY ||
      process.env.GOOGLE_VISION_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      return { header: "x-goog-api-key", value: apiKey.trim(), isKey: true };
    }

    // 2. Explicit Access Token
    const explicitToken = process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_OAUTH_TOKEN;
    if (explicitToken && explicitToken.trim().length > 0) {
      return { header: "Authorization", value: `Bearer ${explicitToken.trim()}`, isKey: false };
    }

    // 3. Ambient GCP Cloud Run metadata service token
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        {
          headers: { "Metadata-Flavor": "Google" },
          signal: controller.signal,
        }
      );
      clearTimeout(t);
      if (res.ok) {
        const json: any = await res.json();
        if (json.access_token) {
          return { header: "Authorization", value: `Bearer ${json.access_token}`, isKey: false };
        }
      }
    } catch {
      // Not running in GCP or metadata unavailable
    }

    // 4. Fallback: GEMINI_API_KEY if specified
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 0) {
      return { header: "x-goog-api-key", value: geminiKey.trim(), isKey: true };
    }

    return null;
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_CLOUD_API_KEY ||
      process.env.GOOGLE_VISION_API_KEY ||
      process.env.GOOGLE_ACCESS_TOKEN ||
      process.env.GEMINI_API_KEY
    );
  }

  async search(
    imageBuffer: Buffer,
    mimeType: string,
    options?: { timeoutSeconds?: number; maxResults?: number }
  ): Promise<SearchResult[]> {
    const auth = await this.getAuthHeader();
    if (!auth) {
      throw new Error(
        "PROVIDER_NOT_CONFIGURED: Google Visual Search requires GOOGLE_CLOUD_API_KEY or GOOGLE_ACCESS_TOKEN."
      );
    }

    const timeoutSec = options?.timeoutSeconds || 30;
    const maxResults = options?.maxResults || 50;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutSec * 1000);

    const base64Content = imageBuffer.toString("base64");

    const endpoint = auth.isKey
      ? `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(auth.value)}`
      : "https://vision.googleapis.com/v1/images:annotate";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "TRACE-ID-VisualSearch/1.0",
    };
    if (!auth.isKey) {
      headers[auth.header] = auth.value;
    }

    const payload = {
      requests: [
        {
          image: {
            content: base64Content,
          },
          features: [
            {
              type: "WEB_DETECTION",
              maxResults,
            },
          ],
        },
      ],
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err.name === "AbortError") {
        throw new Error("PROVIDER_TIMEOUT: Google Visual Search request timed out.");
      }
      throw new Error(`SEARCH_SERVICE_ERROR: Failed to connect to Google Visual Search: ${err.message}`);
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {}

      if (response.status === 401 || response.status === 403) {
        // Parse GCP error message if possible
        let parsedMessage = errorBody;
        try {
          const jsonErr = JSON.parse(errorBody);
          if (jsonErr?.error?.message) {
            parsedMessage = jsonErr.error.message;
          }
        } catch {}

        throw new Error(
          `PROVIDER_AUTH_ERROR: Google Cloud Vision Web Detection not accessible (${response.status}): ${parsedMessage}`
        );
      }
      if (response.status === 429) {
        throw new Error("PROVIDER_RATE_LIMIT: Google Cloud Vision API quota or rate limit exceeded.");
      }
      throw new Error(`SEARCH_SERVICE_ERROR: Google Visual Search returned HTTP ${response.status}: ${errorBody}`);
    }

    const data: any = await response.json();
    const resultItem = data.responses?.[0];

    if (resultItem?.error) {
      const msg = resultItem.error.message;
      throw new Error(`PROVIDER_AUTH_ERROR: Google Cloud Vision returned error: ${msg}`);
    }

    const webDetection = resultItem?.webDetection;
    if (!webDetection) {
      return [];
    }

    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    const bestGuessLabels = webDetection.bestGuessLabels?.map((b: any) => b.label).filter(Boolean) || [];
    const webEntities =
      webDetection.webEntities
        ?.map((e: any) => ({
          description: e.description,
          score: e.score,
        }))
        .filter((e: any) => Boolean(e.description)) || [];

    // 1. Process Pages with matching images
    if (Array.isArray(webDetection.pagesWithMatchingImages)) {
      for (const page of webDetection.pagesWithMatchingImages) {
        const pageUrl = page.url;
        if (!pageUrl || seenUrls.has(pageUrl)) continue;
        seenUrls.add(pageUrl);

        const { domain, platform } = this.parsePlatformAndDomain(pageUrl);

        let matchType: 'exact' | 'near' | 'related' = 'near';
        let imageUrl: string | null = null;

        if (Array.isArray(page.fullMatchingImages) && page.fullMatchingImages.length > 0) {
          matchType = 'exact';
          imageUrl = page.fullMatchingImages[0].url || null;
        } else if (Array.isArray(page.partialMatchingImages) && page.partialMatchingImages.length > 0) {
          matchType = 'near';
          imageUrl = page.partialMatchingImages[0].url || null;
        }

        results.push({
          id: crypto.randomUUID(),
          title: page.pageTitle || null,
          description: null,
          sourceUrl: pageUrl,
          domain,
          platform,
          imageUrl,
          thumbnailUrl: imageUrl,
          publishedAt: null,
          matchType,
          similarityScore: null,
          metadata: {
            bestGuessLabels,
            webEntities: webEntities.slice(0, 5),
            detectionSource: "pagesWithMatchingImages",
          },
        });
      }
    }

    // 2. Process Full matching standalone images
    if (Array.isArray(webDetection.fullMatchingImages)) {
      for (const img of webDetection.fullMatchingImages) {
        const imgUrl = img.url;
        if (!imgUrl || seenUrls.has(imgUrl)) continue;
        seenUrls.add(imgUrl);

        const { domain, platform } = this.parsePlatformAndDomain(imgUrl);
        results.push({
          id: crypto.randomUUID(),
          title: null,
          description: null,
          sourceUrl: imgUrl,
          domain,
          platform,
          imageUrl: imgUrl,
          thumbnailUrl: imgUrl,
          publishedAt: null,
          matchType: 'exact',
          similarityScore: typeof img.score === "number" ? img.score : null,
          metadata: {
            bestGuessLabels,
            webEntities: webEntities.slice(0, 5),
            detectionSource: "fullMatchingImages",
          },
        });
      }
    }

    // 3. Process Partial matching standalone images
    if (Array.isArray(webDetection.partialMatchingImages)) {
      for (const img of webDetection.partialMatchingImages) {
        const imgUrl = img.url;
        if (!imgUrl || seenUrls.has(imgUrl)) continue;
        seenUrls.add(imgUrl);

        const { domain, platform } = this.parsePlatformAndDomain(imgUrl);
        results.push({
          id: crypto.randomUUID(),
          title: null,
          description: null,
          sourceUrl: imgUrl,
          domain,
          platform,
          imageUrl: imgUrl,
          thumbnailUrl: imgUrl,
          publishedAt: null,
          matchType: 'near',
          similarityScore: typeof img.score === "number" ? img.score : null,
          metadata: {
            bestGuessLabels,
            webEntities: webEntities.slice(0, 5),
            detectionSource: "partialMatchingImages",
          },
        });
      }
    }

    // 4. Process Visually similar images
    if (Array.isArray(webDetection.visuallySimilarImages)) {
      for (const img of webDetection.visuallySimilarImages) {
        const imgUrl = img.url;
        if (!imgUrl || seenUrls.has(imgUrl)) continue;
        seenUrls.add(imgUrl);

        const { domain, platform } = this.parsePlatformAndDomain(imgUrl);
        results.push({
          id: crypto.randomUUID(),
          title: null,
          description: null,
          sourceUrl: imgUrl,
          domain,
          platform,
          imageUrl: imgUrl,
          thumbnailUrl: imgUrl,
          publishedAt: null,
          matchType: 'related',
          similarityScore: null,
          metadata: {
            bestGuessLabels,
            webEntities: webEntities.slice(0, 5),
            detectionSource: "visuallySimilarImages",
          },
        });
      }
    }

    // Enrich top results safely
    const enrichmentLimit = Math.min(results.length, 12);
    await Promise.all(
      results.slice(0, enrichmentLimit).map(async (res) => {
        if (
          !res.sourceUrl.endsWith(".jpg") &&
          !res.sourceUrl.endsWith(".jpeg") &&
          !res.sourceUrl.endsWith(".png") &&
          !res.sourceUrl.endsWith(".webp")
        ) {
          const enriched = await fetchSafeMetadata(res.sourceUrl);
          if (enriched) {
            if (!res.title && enriched.title) res.title = enriched.title;
            if (!res.description && enriched.description) res.description = enriched.description;
            if (enriched.publishedAt) res.publishedAt = enriched.publishedAt;
            if (enriched.siteName && res.platform === "Web Source") res.platform = enriched.siteName;
            if (!res.imageUrl && enriched.ogImage) res.imageUrl = enriched.ogImage;
            res.metadata = {
              ...res.metadata,
              author: enriched.author,
              canonicalUrl: enriched.canonicalUrl,
            };
          }
        }
      })
    );

    return results;
  }
}
