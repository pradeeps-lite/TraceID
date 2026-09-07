import React, { useState } from "react";
import { AlertCircle, Key, RefreshCw, Terminal, Copy, Check, Settings, Sparkles } from "lucide-react";
import { ProviderConfigStatus, SearchResponse } from "../types";

interface ProviderStatusBannerProps {
  config: ProviderConfigStatus | null;
  searchResponse?: SearchResponse | null;
  onRetry?: () => void;
  onReset: () => void;
}

export const ProviderStatusBanner: React.FC<ProviderStatusBannerProps> = ({
  config,
  searchResponse,
  onRetry,
  onReset,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const errorMessage = searchResponse?.message || searchResponse?.error;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto w-full py-12 px-4 font-mono-tech">
      <div className="bg-[#05140f] border border-yellow-500/60 rounded-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Accent border bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-rose-500" />

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-yellow-400/10 border border-yellow-400/40 text-yellow-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div>
            <div className="inline-block px-2 py-0.5 rounded bg-yellow-950 text-yellow-400 border border-yellow-800 text-[10px] font-bold uppercase tracking-wider mb-1">
              SEARCH PROVIDER NOTICE
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
              {searchResponse?.status === "provider_not_configured"
                ? "SEARCH UNAVAILABLE"
                : "PROVIDER AUTHENTICATION / ACCESS NOTICE"}
            </h2>
            <p className="text-xs text-emerald-300/80 mt-1">
              TRACE ID strictly utilizes real external visual search indexes and refuses to emit simulated results.
            </p>
          </div>
        </div>

        {/* Detailed diagnostic box */}
        <div className="bg-black/60 border border-emerald-900 rounded p-4 mb-6 text-xs space-y-3">
          <div className="text-[10px] uppercase font-bold text-yellow-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            ACTUAL PROVIDER DIAGNOSTIC
          </div>

          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded text-rose-200 text-xs font-mono leading-relaxed break-words">
            {errorMessage ||
              "Configure at least one supported visual-search provider (Google Cloud Vision or TinEye) in the application environment."}
          </div>

          {searchResponse?.providersSearched && searchResponse.providersSearched.length > 0 && (
            <div className="pt-2 border-t border-emerald-950">
              <span className="text-[11px] text-emerald-400 font-semibold block mb-1">
                Provider Responses:
              </span>
              {searchResponse.providersSearched.map((p, i) => (
                <div key={i} className="text-[11px] text-emerald-300/70 py-0.5">
                  • <strong className="text-white">{p.name}</strong>: {p.status}{" "}
                  {p.error ? `— ${p.error}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actionable Setup Checklist */}
        <div className="bg-[#03130d] border border-emerald-700/70 rounded-lg p-5 mb-6 text-xs space-y-4 shadow-xl">
          {/* Header with Settings hint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-900/80">
            <div className="text-xs uppercase font-bold text-yellow-400 flex items-center gap-2 tracking-wider">
              <Key className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>WHERE TO PASTE IN AI STUDIO</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-[11px] text-emerald-300">
              <Settings className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>AI Studio Menu &gt; Settings &gt; Secrets / Env Vars</span>
            </div>
          </div>

          <p className="text-emerald-300/80 text-xs leading-relaxed">
            Configure any of the following keys in your AI Studio project settings. You can click the copy icon beside any key name:
          </p>

          <div className="space-y-3">
            {/* Option 1: Google Cloud Vision API */}
            <div className="p-3.5 bg-black/60 rounded-md border border-emerald-800/80 hover:border-yellow-400/50 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <strong className="text-white text-xs uppercase tracking-wide">
                    Option 1: Google Cloud Vision API (Recommended)
                  </strong>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    config?.googleConfigured
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                      : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                  }`}
                >
                  {config?.googleConfigured ? "ACTIVE" : "MISSING"}
                </span>
              </div>

              <p className="text-[11px] text-emerald-300/70 mb-2 leading-relaxed">
                Uses official Google Cloud Vision Web Detection for public image crawl appearances. Enable Cloud Vision API in Google Cloud Console.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-emerald-500 font-semibold">Key:</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07241a] border border-emerald-700 text-yellow-300 font-mono text-[11px]">
                  <span>GOOGLE_CLOUD_API_KEY</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("GOOGLE_CLOUD_API_KEY", "GOOGLE_CLOUD_API_KEY")}
                    className="p-0.5 hover:text-white transition-colors text-emerald-400"
                    title="Copy Key Name"
                  >
                    {copiedKey === "GOOGLE_CLOUD_API_KEY" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {copiedKey === "GOOGLE_CLOUD_API_KEY" && (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                    Copied to clipboard!
                  </span>
                )}
              </div>
            </div>

            {/* Option 2: TinEye Commercial API */}
            <div className="p-3.5 bg-black/60 rounded-md border border-emerald-800/80 hover:border-yellow-400/50 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <strong className="text-white text-xs uppercase tracking-wide">
                    Option 2: TinEye Commercial Reverse Image API
                  </strong>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    config?.tineyeConfigured
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                      : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                  }`}
                >
                  {config?.tineyeConfigured ? "ACTIVE" : "MISSING"}
                </span>
              </div>

              <p className="text-[11px] text-emerald-300/70 mb-2 leading-relaxed">
                Queries TinEye's commercial crawl index of over 60+ billion images for exact duplicates and modified versions.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-emerald-500 font-semibold">Key:</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07241a] border border-emerald-700 text-yellow-300 font-mono text-[11px]">
                  <span>TINEYE_API_KEY</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("TINEYE_API_KEY", "TINEYE_API_KEY")}
                    className="p-0.5 hover:text-white transition-colors text-emerald-400"
                    title="Copy Key Name"
                  >
                    {copiedKey === "TINEYE_API_KEY" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {copiedKey === "TINEYE_API_KEY" && (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                    Copied to clipboard!
                  </span>
                )}
              </div>
            </div>

            {/* Option 3: SerpApi Google Lens */}
            <div className="p-3.5 bg-black/60 rounded-md border border-emerald-800/80 hover:border-yellow-400/50 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <strong className="text-white text-xs uppercase tracking-wide">
                    Option 3: Google Lens via SerpApi
                  </strong>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    config?.serpApiConfigured
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                      : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                  }`}
                >
                  {config?.serpApiConfigured ? "ACTIVE" : "MISSING"}
                </span>
              </div>

              <p className="text-[11px] text-emerald-300/70 mb-2 leading-relaxed">
                Connects to Google Lens visual search engine through a standard SerpApi account key.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-emerald-500 font-semibold">Key:</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07241a] border border-emerald-700 text-yellow-300 font-mono text-[11px]">
                  <span>SERPAPI_API_KEY</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("SERPAPI_API_KEY", "SERPAPI_API_KEY")}
                    className="p-0.5 hover:text-white transition-colors text-emerald-400"
                    title="Copy Key Name"
                  >
                    {copiedKey === "SERPAPI_API_KEY" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {copiedKey === "SERPAPI_API_KEY" && (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                    Copied to clipboard!
                  </span>
                )}
              </div>
            </div>

            {/* Provider selector key */}
            <div className="p-3 bg-[#02100a] rounded border border-emerald-900 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-emerald-400/90">
                <span className="text-yellow-400 font-semibold">Optional Mode:</span> Set{" "}
                <code className="text-yellow-300">SEARCH_PROVIDER</code> to{" "}
                <code className="text-white bg-black/60 px-1 py-0.5 rounded">"google"</code>,{" "}
                <code className="text-white bg-black/60 px-1 py-0.5 rounded">"tineye"</code>, or{" "}
                <code className="text-white bg-black/60 px-1 py-0.5 rounded">"multi"</code>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("SEARCH_PROVIDER=google", "SEARCH_PROVIDER")}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 hover:text-white"
              >
                {copiedKey === "SEARCH_PROVIDER" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy Key</span>
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded border border-emerald-800 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:text-white hover:bg-emerald-950 transition-colors"
          >
            RETURN TO IMAGE UPLOAD
          </button>

          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-5 py-2 rounded bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              RE-ATTEMPT SEARCH
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
