import React from "react";
import { AlertCircle, RefreshCw, Terminal, ArrowLeft } from "lucide-react";
import { ProviderConfigStatus, SearchResponse } from "../types";

interface ProviderStatusBannerProps {
  config: ProviderConfigStatus | null;
  searchResponse?: SearchResponse | null;
  onRetry?: () => void;
  onReset: () => void;
}

export const ProviderStatusBanner: React.FC<ProviderStatusBannerProps> = ({
  searchResponse,
  onRetry,
  onReset,
}) => {
  const errorMessage = searchResponse?.message || searchResponse?.error;
  const isNotConfigured = searchResponse?.status === "provider_not_configured";

  return (
    <div className="max-w-2xl mx-auto w-full py-12 px-4 font-mono-tech">
      <div className="bg-[#05140f] border border-yellow-500/60 rounded-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top accent bar */}
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
              {isNotConfigured ? "SEARCH SERVICE UNAVAILABLE" : "SEARCH EXECUTION ERROR"}
            </h2>
            <p className="text-xs text-emerald-300/80 mt-1">
              TRACE ID uses SerpApi / Google Lens as the visual search provider.
            </p>
          </div>
        </div>

        {/* Detailed diagnostic message */}
        <div className="bg-black/60 border border-emerald-900 rounded p-4 mb-6 text-xs space-y-3">
          <div className="text-[10px] uppercase font-bold text-yellow-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            DIAGNOSTIC TELEMETRY
          </div>

          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded text-rose-200 text-xs font-mono leading-relaxed break-words">
            {errorMessage || (isNotConfigured
              ? "SERPAPI_API_KEY is required in the server deployment environment."
              : "An unexpected error occurred during the visual search query.")}
          </div>

          {searchResponse?.providersSearched && searchResponse.providersSearched.length > 0 && (
            <div className="pt-2 border-t border-emerald-950">
              <span className="text-[11px] text-emerald-400 font-semibold block mb-1">
                Provider Status:
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

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-emerald-800 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:text-white hover:bg-emerald-950 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
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

