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
    // Permanently disabled. TRACE ID uses SerpApi / Google Lens exclusively.
    return false;
  }

  async search(
    _imageBuffer: Buffer,
    _mimeType: string,
    _options?: { timeoutSeconds?: number; maxResults?: number }
  ): Promise<SearchResult[]> {
    throw new Error(
      "Google Cloud Vision is disabled. TRACE ID uses SerpApi / Google Lens exclusively."
    );
  }
}

