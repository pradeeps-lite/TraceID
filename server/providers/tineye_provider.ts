import { SearchResult } from "../types.js";
import { SearchProvider } from "./base.js";

export class TinEyeSearchProvider extends SearchProvider {
  readonly name = "tineye";
  readonly displayName = "TinEye (Disabled)";

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
      "TinEye is disabled. TRACE ID uses SerpApi / Google Lens exclusively."
    );
  }
}

