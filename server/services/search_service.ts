import { SearchResult, SearchResponse, ProviderConfigStatus } from "../types.js";
import { SearchProvider } from "../providers/base.js";
import { GoogleVisualSearchProvider } from "../providers/google_provider.js";
import { TinEyeSearchProvider } from "../providers/tineye_provider.js";
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
    const google = new GoogleVisualSearchProvider();
    const tineye = new TinEyeSearchProvider();
    const serpapi = new SerpApiLensProvider();

    this.providers.set("google", google);
    this.providers.set("tineye", tineye);
    this.providers.set("serpapi", serpapi);

    // Aliases to prevent routing mismatches
    this.providers.set("serpapi_lens", serpapi);
    this.providers.set("google_lens", serpapi);
    this.providers.set("google_vision", google);
  }

  resolveProviderMode(): "serpapi" | "google" | "tineye" | "multi" {
    const raw = (process.env.SEARCH_PROVIDER || "").toLowerCase().trim();
    if (raw === "serpapi" || raw === "serpapi_lens" || raw === "google_lens") {
      return "serpapi";
    }
    if (raw === "google" || raw === "google_vision") {
      return "google";
    }
    if (raw === "tineye") {
      return "tineye";
    }
    if (raw === "multi") {
      return "multi";
    }
    // Default to serpapi if SERPAPI_API_KEY is present, or default to serpapi
    if (process.env.SERPAPI_API_KEY) {
      return "serpapi";
    }
    return "serpapi";
  }

  getProviderConfigStatus(): ProviderConfigStatus {
    const mode = this.resolveProviderMode();
    const serpapi = this.providers.get("serpapi");
    const google = this.providers.get("google");
    const tineye = this.providers.get("tineye");

    const serpApiConfigured = serpapi?.isConfigured() || false;
    const googleConfigured = google?.isConfigured() || false;
    const tineyeConfigured = tineye?.isConfigured() || false;
    const gemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

    const searchTimeoutSeconds = parseInt(process.env.SEARCH_TIMEOUT_SECONDS || "30", 10);
    const maxResults = parseInt(process.env.MAX_RESULTS || "50", 10);

    let activeProviderDescription = "SerpApi / Google Lens";
    let serpApiKeyStatus = serpApiConfigured ? "configured" : "missing";
    let googleVisionStatus = "disabled";
    let tineyeStatus = "disabled";

    if (mode === "serpapi") {
      activeProviderDescription = "SerpApi / Google Lens";
      serpApiKeyStatus = serpApiConfigured ? "configured" : "missing";
      googleVisionStatus = "disabled";
      tineyeStatus = "disabled";
    } else if (mode === "google") {
      activeProviderDescription = "Google Cloud Vision";
      googleVisionStatus = googleConfigured ? "configured" : "missing";
      serpApiKeyStatus = "disabled";
      tineyeStatus = "disabled";
    } else if (mode === "tineye") {
      activeProviderDescription = "TinEye Commercial API";
      tineyeStatus = tineyeConfigured ? "configured" : "missing";
      serpApiKeyStatus = "disabled";
      googleVisionStatus = "disabled";
    } else if (mode === "multi") {
      activeProviderDescription = "Multi-Engine (Google + TinEye + SerpApi)";
      serpApiKeyStatus = serpApiConfigured ? "configured" : "disabled";
      googleVisionStatus = googleConfigured ? "configured" : "disabled";
      tineyeStatus = tineyeConfigured ? "configured" : "disabled";
    }

    return {
      configuredProvider: mode,
      activeProviderDescription,
      serpApiKeyStatus,
      googleVisionStatus,
      tineyeStatus,
      googleConfigured: mode === "google" || mode === "multi" ? googleConfigured : false,
      tineyeConfigured: mode === "tineye" || mode === "multi" ? tineyeConfigured : false,
      serpApiConfigured: mode === "serpapi" || mode === "multi" ? serpApiConfigured : false,
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

    const providerMode = this.resolveProviderMode();
    const timeoutSeconds = parseInt(process.env.SEARCH_TIMEOUT_SECONDS || "30", 10);
    const maxResults = parseInt(process.env.MAX_RESULTS || "50", 10);

    // Identify which providers to run
    let providersToRun: SearchProvider[] = [];

    if (providerMode === "multi") {
      providersToRun = Array.from(this.providers.values()).filter((p) => p.isConfigured());
      if (providersToRun.length === 0) {
        const serpapi = this.providers.get("serpapi");
        if (serpapi) providersToRun.push(serpapi);
      }
    } else {
      const selected = this.providers.get(providerMode);
      if (selected) {
        providersToRun.push(selected);
      } else {
        return {
          status: "error",
          provider: providerMode,
          searchedAt: new Date().toISOString(),
          providersSearched: [],
          totalMatches: 0,
          results: [],
          message: `Unknown search provider '${providerMode}'. Configured provider must be 'serpapi'.`,
        };
      }
    }

    // Check configuration of providers to run
    const anyConfigured = providersToRun.some((p) => p.isConfigured());
    if (!anyConfigured) {
      const requiredKey = providerMode === "serpapi" ? "SERPAPI_API_KEY" : providerMode === "google" ? "GOOGLE_CLOUD_API_KEY" : "TINEYE_API_KEY";
      return {
        status: "provider_not_configured",
        provider: providerMode,
        searchedAt: new Date().toISOString(),
        providersSearched: providersToRun.map((p) => ({
          name: p.displayName,
          status: "not_configured",
          resultsCount: 0,
          durationMs: 0,
          error: `${requiredKey} is not configured`,
        })),
        totalMatches: 0,
        results: [],
        message: `SEARCH PROVIDER NOT CONFIGURED: ${requiredKey} is required in the environment for ${providerMode}.`,
      };
    }

    const providersSearchedStatus: SearchResponse["providersSearched"] = [];
    const allResults: SearchResult[] = [];

    // Run providers
    await Promise.all(
      providersToRun.map(async (provider) => {
        const startTime = Date.now();
        if (!provider.isConfigured()) {
          providersSearchedStatus.push({
            name: provider.displayName,
            status: "not_configured",
            resultsCount: 0,
            durationMs: 0,
            error: "Not configured",
          });
          return;
        }

        try {
          const results = await provider.search(imageBuffer, mimeType, {
            timeoutSeconds,
            maxResults,
          });
          const duration = Date.now() - startTime;
          providersSearchedStatus.push({
            name: provider.displayName,
            status: results.length > 0 ? "success" : "no_results",
            resultsCount: results.length,
            durationMs: duration,
          });
          allResults.push(...results);
        } catch (err: any) {
          const duration = Date.now() - startTime;
          providersSearchedStatus.push({
            name: provider.displayName,
            status: "error",
            resultsCount: 0,
            durationMs: duration,
            error: err.message,
          });
        }
      })
    );

    // If all executed providers resulted in errors, return error response with the actual error
    const hasSuccess = providersSearchedStatus.some((p) => p.status === "success" || p.status === "no_results");
    if (!hasSuccess && providersSearchedStatus.length > 0) {
      const firstError = providersSearchedStatus.find((p) => p.error)?.error || "Provider search failed.";
      return {
        status: "error",
        provider: providerMode,
        searchedAt: new Date().toISOString(),
        providersSearched: providersSearchedStatus,
        totalMatches: 0,
        results: [],
        message: firstError,
      };
    }

    // Deduplication by normalized URL
    const seenUrls = new Map<string, SearchResult>();
    for (const res of allResults) {
      const norm = this.normalizeUrl(res.sourceUrl);
      if (!seenUrls.has(norm)) {
        seenUrls.set(norm, res);
      } else {
        // If existing is related but new is exact, upgrade it
        const existing = seenUrls.get(norm)!;
        if (res.matchType === "exact" && existing.matchType !== "exact") {
          seenUrls.set(norm, res);
        }
      }
    }

    const deduplicated = Array.from(seenUrls.values());

    // Relevance Ranking:
    // 1. matchType: 'exact' (weight 3), 'near' (weight 2), 'related' (weight 1)
    // 2. similarityScore if present (higher score first)
    // 3. has title / metadata
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
      const hasErrors = providersSearchedStatus.some((p) => p.status === "error");
      if (hasErrors && providersSearchedStatus.every((p) => p.status === "error" || p.status === "not_configured")) {
        finalStatus = "error";
        message = providersSearchedStatus.find((p) => p.error)?.error || "Provider search failed.";
      } else {
        finalStatus = "no_results";
        message = "The configured visual-search provider did not return publicly indexed matches for this image.";
      }
    }

    const response: SearchResponse = {
      status: finalStatus,
      provider: providerMode,
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
