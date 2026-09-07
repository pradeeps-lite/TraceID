import { SearchResult, SearchResponse, ProviderConfigStatus } from "../types.js";
import { SearchProvider } from "../providers/base.js";
import { SerpApiLensProvider } from "../providers/serpapi_provider.js";

// In-memory cache by image SHA-256 hash with 10-minute TTL
interface CacheEntry {
  response: SearchResponse;
  expiresAt: number;
}
const searchCache = new Map<string, CacheEntry>();

export class SearchService {
  private providers: Map<string, SearchProvider> = new Map();

  constructor() {
    const serpapi = new SerpApiLensProvider();
    // TRACE ID uses SerpApi / Google Lens as the sole production visual-search provider
    this.providers.set("serpapi", serpapi);
    this.providers.set("serpapi_lens", serpapi);
    this.providers.set("google_lens", serpapi);
  }

  resolveProviderMode(): "serpapi" {
    // TRACE ID is permanently locked to SerpApi / Google Lens
    return "serpapi";
  }

  getProviderConfigStatus(): ProviderConfigStatus {
    const serpapi = this.providers.get("serpapi");
    const serpApiConfigured = serpapi?.isConfigured() || false;
    const gemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

    const searchTimeoutSeconds = parseInt(process.env.SEARCH_TIMEOUT_SECONDS || "30", 10);
    const maxResults = parseInt(process.env.MAX_RESULTS || "30", 10);

    return {
      configuredProvider: "serpapi",
      activeProviderDescription: "SERPAPI / GOOGLE LENS",
      serpApiKeyStatus: serpApiConfigured ? "CONFIGURED" : "MISSING",
      googleVisionStatus: "DISABLED",
      tineyeStatus: "DISABLED",
      googleConfigured: false,
      tineyeConfigured: false,
      serpApiConfigured,
      geminiConfigured: gemini,
      searchTimeoutSeconds,
      maxResults,
    };
  }

  private normalizeUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      // Remove common tracking parameters
      const trackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
      for (const k of trackingKeys) {
        u.searchParams.delete(k);
      }
      let norm = `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname}`;
      if (norm.endsWith("/") && norm.length > 8) {
        norm = norm.slice(0, -1);
      }
      if (u.search) {
        norm += u.search;
      }
      return norm;
    } catch {
      return urlStr.trim().toLowerCase();
    }
  }

  async searchImage(
    imageHash: string,
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<SearchResponse> {
    // 1. Check in-memory hash cache
    const cached = searchCache.get(imageHash);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        ...cached.response,
        searchedAt: new Date().toISOString(),
      };
    }

    const timeoutSeconds = parseInt(process.env.SEARCH_TIMEOUT_SECONDS || "30", 10);
    const maxResults = parseInt(process.env.MAX_RESULTS || "30", 10);

    const serpapi = this.providers.get("serpapi")!;
    if (!serpapi.isConfigured()) {
      return {
        status: "provider_not_configured",
        provider: "serpapi",
        searchedAt: new Date().toISOString(),
        providersSearched: [
          {
            name: "SerpApi / Google Lens",
            status: "not_configured",
            resultsCount: 0,
            durationMs: 0,
            error: "SERPAPI_API_KEY is not configured in the server environment.",
          },
        ],
        totalMatches: 0,
        results: [],
        message: "SEARCH PROVIDER NOT CONFIGURED: SERPAPI_API_KEY is required in the server environment.",
      };
    }

    const providersSearchedStatus: SearchResponse["providersSearched"] = [];
    const allResults: SearchResult[] = [];
    const startTime = Date.now();

    try {
      const results = await serpapi.search(imageBuffer, mimeType, {
        timeoutSeconds,
        maxResults,
      });
      const duration = Date.now() - startTime;
      providersSearchedStatus.push({
        name: serpapi.displayName,
        status: results.length > 0 ? "success" : "no_results",
        resultsCount: results.length,
        durationMs: duration,
      });
      allResults.push(...results);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      providersSearchedStatus.push({
        name: serpapi.displayName,
        status: "error",
        resultsCount: 0,
        durationMs: duration,
        error: err.message,
      });

      return {
        status: "error",
        provider: "serpapi",
        searchedAt: new Date().toISOString(),
        providersSearched: providersSearchedStatus,
        totalMatches: 0,
        results: [],
        message: err.message || "SerpApi search request failed.",
      };
    }

    // Deduplication by normalized URL
    const seenUrls = new Map<string, SearchResult>();
    for (const res of allResults) {
      const norm = this.normalizeUrl(res.sourceUrl);
      if (!seenUrls.has(norm)) {
        seenUrls.set(norm, res);
      } else {
        const existing = seenUrls.get(norm)!;
        if (res.matchType === "exact" && existing.matchType !== "exact") {
          seenUrls.set(norm, res);
        }
      }
    }

    const deduplicated = Array.from(seenUrls.values());

    // Priority order:
    // 1. matchType: 'exact' (weight 3), 'near' (weight 2), 'related' (weight 1)
    // 2. similarityScore if present (higher first)
    // 3. title/metadata presence
    deduplicated.sort((a, b) => {
      const rank = (m: string) => (m === "exact" ? 3 : m === "near" ? 2 : 1);
      const rankDiff = rank(b.matchType) - rank(a.matchType);
      if (rankDiff !== 0) return rankDiff;

      const scoreA = a.similarityScore ?? 0;
      const scoreB = b.similarityScore ?? 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      const titleA = a.title ? 1 : 0;
      const titleB = b.title ? 1 : 0;
      return titleB - titleA;
    });

    const finalResults = deduplicated.slice(0, maxResults);

    let finalStatus: SearchResponse["status"] = "success";
    let message: string | undefined;

    if (finalResults.length === 0) {
      finalStatus = "no_results";
      message = "The configured visual-search provider did not return publicly indexed matches for this image.";
    }

    const response: SearchResponse = {
      status: finalStatus,
      provider: "serpapi",
      searchedAt: new Date().toISOString(),
      providersSearched: providersSearchedStatus,
      totalMatches: finalResults.length,
      results: finalResults,
      message,
    };

    // Cache successful or no-result responses for 10 minutes
    if (finalStatus === "success" || finalStatus === "no_results") {
      searchCache.set(imageHash, {
        response,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    }

    return response;
  }
}

