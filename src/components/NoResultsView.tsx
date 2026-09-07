import React from "react";
import { SearchX, Clock, Server, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { SearchResponse } from "../types";

interface NoResultsViewProps {
  searchResponse: SearchResponse;
  imagePreviewUrl: string;
  onReset: () => void;
}

export const NoResultsView: React.FC<NoResultsViewProps> = ({
  searchResponse,
  imagePreviewUrl,
  onReset,
}) => {
  return (
    <div className="max-w-3xl mx-auto w-full py-12 px-4 font-mono-tech">
      <div className="bg-[#05140f] border border-emerald-800/80 rounded-lg p-6 sm:p-8 shadow-2xl">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-950 border border-emerald-700/80 text-emerald-400 mb-4">
            <SearchX className="w-7 h-7 text-yellow-400" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
            NO PUBLIC MATCHES FOUND
          </h1>
          <p className="text-xs text-emerald-300/80 mt-2 max-w-lg mx-auto leading-relaxed">
            The configured visual-search provider did not return publicly indexed matches for this image.
          </p>
        </div>

        {/* Telemetry and Provider Details */}
        <div className="bg-[#030d0a] border border-emerald-900/80 rounded-md p-4 mb-6 space-y-3 text-xs">
          <div className="text-[10px] uppercase font-bold text-yellow-400 border-b border-emerald-900/60 pb-2">
            REAL PROVIDER EXECUTION TELEMETRY
          </div>

          <div className="flex justify-between py-1 border-b border-emerald-950 text-emerald-400/80">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              SEARCH PROVIDER:
            </span>
            <span className="text-white uppercase font-bold">
              {searchResponse.provider}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-emerald-950 text-emerald-400/80">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              SEARCH TIME:
            </span>
            <span className="text-white">
              {new Date(searchResponse.searchedAt).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-emerald-950 text-emerald-400/80">
            <span>SEARCH STATUS:</span>
            <span className="text-yellow-300 uppercase font-semibold">
              {searchResponse.status}
            </span>
          </div>

          {searchResponse.providersSearched && searchResponse.providersSearched.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] text-emerald-400/90 font-semibold block mb-2">
                Providers Searched:
              </span>
              <div className="space-y-1.5">
                {searchResponse.providersSearched.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-emerald-950/60 border border-emerald-900 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-white font-medium">{p.name}</span>
                    </div>
                    <span className="text-emerald-400/70 text-[11px]">
                      {p.status} ({p.durationMs}ms)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Why might no matches exist? Real technical explanation */}
        <div className="p-4 rounded bg-emerald-950/30 border border-emerald-900/60 text-xs text-emerald-300/70 space-y-1.5 mb-6">
          <div className="text-white font-bold text-[11px] uppercase flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            Provenance Diagnostic:
          </div>
          <p>
            • The image may be original, unpublished, or private.
          </p>
          <p>
            • The image may exist only behind authenticated sessions, paywalls, or unindexed social channels.
          </p>
          <p>
            • Public search crawler bots may not have indexed this specific asset yet.
          </p>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
          >
            <ArrowLeft className="w-4 h-4" />
            TRY ANOTHER IMAGE
          </button>
        </div>
      </div>
    </div>
  );
};
