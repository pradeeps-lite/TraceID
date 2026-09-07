import crypto from "crypto";
import sharp from "sharp";
import { SearchResult } from "../types.js";
import { SearchProvider } from "./base.js";

export class SerpApiLensProvider extends SearchProvider {
  readonly name = "serpapi";
  readonly displayName = "SerpApi / Google Lens";

  private getApiKey(): string | null {
    return process.env.SERPAPI_API_KEY?.trim() || null;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.length > 0);
  }

  async search(
    imageBuffer: Buffer,
    mimeType: string,
    options?: { timeoutSeconds?: number; maxResults?: number }
  ): Promise<SearchResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("PROVIDER_NOT_CONFIGURED: Google Lens SerpApi requires SERPAPI_API_KEY.");
    }

    const timeoutSec = options?.timeoutSeconds || 30;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutSec * 1000);

    try {
      // Step 1: Optimize and validate image format/size for SerpApi's 500 KB limit
      let uploadBuffer = imageBuffer;
      let uploadMime = mimeType;

      if (imageBuffer.length > 450 * 1024 || (mimeType !== "image/jpeg" && mimeType !== "image/png")) {
        try {
          uploadBuffer = await sharp(imageBuffer)
            .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          uploadMime = "image/jpeg";
        } catch (err: any) {
          console.warn("Could not pre-compress image for SerpApi upload:", err.message);
        }
      }

      // If still above 480 KB, compress further
      if (uploadBuffer.length > 480 * 1024) {
        try {
          uploadBuffer = await sharp(uploadBuffer)
            .resize({ width: 800, height: 800, fit: "inside" })
            .jpeg({ quality: 65 })
            .toBuffer();
          uploadMime = "image/jpeg";
        } catch {}
      }

      // Step 2: Upload image to POST https://serpapi.com/image to obtain image_id
      const formData = new FormData();
      formData.append("api_key", apiKey);
      formData.append("image", new Blob([uploadBuffer], { type: uploadMime }), "trace_image.jpg");

      let uploadRes: Response;
      try {
        uploadRes = await fetch("https://serpapi.com/image", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error("PROVIDER_TIMEOUT: SerpApi image upload timed out.");
        }
        throw new Error(`SERPAPI_NETWORK_ERROR: Failed to connect to SerpApi image upload endpoint: ${err.message}`);
      }

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => "");
        if (uploadRes.status === 401 || uploadRes.status === 403) {
          throw new Error("PROVIDER_AUTH_ERROR: SerpApi API key invalid or unauthorized.");
        }
        if (uploadRes.status === 429) {
          throw new Error("PROVIDER_RATE_LIMIT: SerpApi search quota reached.");
        }
        throw new Error(`SERPAPI_IMAGE_UPLOAD_ERROR (HTTP ${uploadRes.status}): ${errText}`);
      }

      const uploadData: any = await uploadRes.json();
      const imageId = uploadData?.image_id;
      if (!imageId) {
        throw new Error(`SERPAPI_ERROR: No image_id returned from SerpApi image upload: ${JSON.stringify(uploadData)}`);
      }

      // Step 3: Send image_id to https://serpapi.com/search?engine=google_lens
      const lensUrl = new URL("https://serpapi.com/search");
      lensUrl.searchParams.set("engine", "google_lens");
      lensUrl.searchParams.set("image_id", imageId);
      lensUrl.searchParams.set("api_key", apiKey);

      let searchRes: Response;
      try {
        searchRes = await fetch(lensUrl.toString(), {
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error("PROVIDER_TIMEOUT: Google Lens search request timed out.");
        }
        throw new Error(`SERPAPI_NETWORK_ERROR: Failed to fetch Google Lens results: ${err.message}`);
      }

      if (!searchRes.ok) {
        const errText = await searchRes.text().catch(() => "");
        if (searchRes.status === 401 || searchRes.status === 403) {
          throw new Error("PROVIDER_AUTH_ERROR: SerpApi API key invalid or unauthorized.");
        }
        if (searchRes.status === 429) {
          throw new Error("PROVIDER_RATE_LIMIT: SerpApi search quota reached.");
        }
        throw new Error(`SERPAPI_SEARCH_ERROR (HTTP ${searchRes.status}): ${errText}`);
      }

      const searchData: any = await searchRes.json();
      if (searchData?.error) {
        throw new Error(`SERPAPI_LENS_ERROR: ${searchData.error}`);
      }

      // Step 4: Collect exact_matches, visual_matches, and related/other available results
      const results: SearchResult[] = [];
      const seenUrls = new Set<string>();

      const addMatch = (
        item: any,
        matchType: "exact" | "near" | "related",
        defaultScore: number
      ) => {
        if (!item) return;
        const link = item.link || item.source_url || item.url;
        if (!link || typeof link !== "string" || !link.startsWith("http")) return;

        const cleanLink = link.trim();
        if (seenUrls.has(cleanLink)) return;
        seenUrls.add(cleanLink);

        const { domain, platform } = this.parsePlatformAndDomain(cleanLink);
        const title = item.title || item.source || null;
        const description = item.snippet || item.about_this_result?.source?.description || null;
        const thumbnail = item.thumbnail || item.thumbnail_url || item.image || null;
        const imageUrl = item.image || item.original || item.thumbnail || null;
        const source = item.source || platform;

        results.push({
          id: crypto.randomUUID(),
          title,
          description,
          sourceUrl: cleanLink,
          domain,
          platform: source,
          imageUrl,
          thumbnailUrl: thumbnail,
          publishedAt: null,
          matchType,
          similarityScore: defaultScore,
          metadata: {
            lensSource: item.source || null,
            lensPosition: item.position ?? null,
            price: item.price ?? null,
            inStock: item.in_stock ?? null,
            rating: item.rating ?? null,
          },
        });
      };

      // 1. exact_matches
      if (Array.isArray(searchData.exact_matches)) {
        for (let i = 0; i < searchData.exact_matches.length; i++) {
          addMatch(searchData.exact_matches[i], "exact", 1.0 - i * 0.005);
        }
      }

      // 2. visual_matches
      if (Array.isArray(searchData.visual_matches)) {
        for (let i = 0; i < searchData.visual_matches.length; i++) {
          const score = Math.max(0.70, 0.95 - i * 0.008);
          addMatch(searchData.visual_matches[i], "near", score);
        }
      }

      // 3. organic_results and related results
      if (Array.isArray(searchData.organic_results)) {
        for (const item of searchData.organic_results) {
          addMatch(item, "related", 0.65);
        }
      }

      if (Array.isArray(searchData.reverse_image_search)) {
        for (const item of searchData.reverse_image_search) {
          addMatch(item, "related", 0.60);
        }
      }

      return results;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

