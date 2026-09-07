import { SearchResult } from "../types.js";

export abstract class SearchProvider {
  abstract readonly name: string;
  abstract readonly displayName: string;

  /**
   * Returns true if all necessary credentials and configs exist for this provider.
   */
  abstract isConfigured(): boolean;

  /**
   * Executes a real reverse visual search against the external provider.
   * Throws real errors (e.g. auth, rate limit, timeout, provider error).
   */
  abstract search(
    imageBuffer: Buffer,
    mimeType: string,
    options?: {
      timeoutSeconds?: number;
      maxResults?: number;
    }
  ): Promise<SearchResult[]>;

  /**
   * Helper to identify domain and human-friendly platform name from a URL.
   */
  protected parsePlatformAndDomain(urlStr: string): { domain: string; platform: string } {
    try {
      const url = new URL(urlStr);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      
      // Recognized public platforms
      if (hostname.includes("reddit.com")) return { domain: hostname, platform: "Reddit" };
      if (hostname.includes("twitter.com") || hostname.includes("x.com")) return { domain: hostname, platform: "X / Twitter" };
      if (hostname.includes("instagram.com")) return { domain: hostname, platform: "Instagram" };
      if (hostname.includes("facebook.com")) return { domain: hostname, platform: "Facebook" };
      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return { domain: hostname, platform: "YouTube" };
      if (hostname.includes("linkedin.com")) return { domain: hostname, platform: "LinkedIn" };
      if (hostname.includes("pinterest.com")) return { domain: hostname, platform: "Pinterest" };
      if (hostname.includes("tiktok.com")) return { domain: hostname, platform: "TikTok" };
      if (hostname.includes("wikipedia.org") || hostname.includes("wikimedia.org")) return { domain: hostname, platform: "Wikipedia / Wikimedia" };
      if (hostname.includes("github.com")) return { domain: hostname, platform: "GitHub" };
      if (hostname.includes("flickr.com")) return { domain: hostname, platform: "Flickr" };
      if (hostname.includes("medium.com")) return { domain: hostname, platform: "Medium" };
      if (hostname.includes("tumblr.com")) return { domain: hostname, platform: "Tumblr" };
      if (hostname.includes("news.") || hostname.includes("bbc.") || hostname.includes("cnn.") || hostname.includes("reuters.")) return { domain: hostname, platform: "News Publication" };

      // Default platform from domain name
      const parts = hostname.split(".");
      const name = parts.length > 1 ? parts[parts.length - 2] : hostname;
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      return { domain: hostname, platform: capitalized };
    } catch {
      return { domain: "Unknown Domain", platform: "Web Source" };
    }
  }
}
