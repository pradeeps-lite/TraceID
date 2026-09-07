import React, { useState } from "react";
import { ExternalLink, Globe, CheckCircle, ShieldCheck, Image as ImageIcon, Layers, Filter } from "lucide-react";
import { SearchResponse, MatchType } from "../types";

interface ResultsViewProps {
  searchResponse: SearchResponse;
  queryImagePreviewUrl: string;
  onReset: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  searchResponse,
  queryImagePreviewUrl,
  onReset,
}) => {
  const [filter, setFilter] = useState<"all" | MatchType>("all");

  const results = searchResponse.results;
  const filtered = filter === "all" ? results : results.filter((r) => r.matchType === filter);

  const exactCount = results.filter((r) => r.matchType === "exact").length;
  const nearCount = results.filter((r) => r.matchType === "near").length;
  const relatedCount = results.filter((r) => r.matchType === "related").length;

  const getMatchBadge = (type: MatchType) => {
    switch (type) {
      case "exact":
        return (
          <span className="px-2.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50 text-[10px] font-mono-tech font-bold uppercase tracking-wider">
            EXACT MATCH
          </span>
        );
      case "near":
        return (
          <span className="px-2.5 py-0.5 rounded bg-yellow-950/80 text-yellow-300 border border-yellow-500/50 text-[10px] font-mono-tech font-bold uppercase tracking-wider">
            NEAR MATCH
          </span>
        );
      case "related":
        return (
          <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono-tech font-bold uppercase tracking-wider">
            RELATED
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full py-6 px-4 font-mono-tech">
      {/* Results Header */}
      <div className="border-b border-emerald-900/80 pb-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/80 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                SEARCH COMPLETE
              </span>
              <span className="text-xs text-emerald-400/60">
                // {new Date(searchResponse.searchedAt).toLocaleTimeString()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white uppercase">
              TRACE RESULTS
            </h1>
            <p className="text-sm text-yellow-400 font-bold mt-1">
              {searchResponse.totalMatches} PUBLIC MATCHES FOUND ACROSS THE OPEN WEB
            </p>
          </div>

          <button
            onClick={onReset}
            className="self-start md:self-auto px-5 py-2.5 bg-yellow-400 text-black font-bold text-xs uppercase tracking-wider rounded hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
          >
            START NEW TRACE
          </button>
        </div>

        {/* Real Provider Execution Audit Banner */}
        <div className="mt-6 p-3.5 bg-[#05140f] border border-emerald-800/80 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300/80">AUTHENTIC PROVIDER EXECUTION:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {searchResponse.providersSearched.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800/70 text-[11px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-white font-semibold">{p.name}</span>
                <span className="text-emerald-400/70">({p.resultsCount} hits, {p.durationMs}ms)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
            <Filter className="w-3.5 h-3.5" />
            <span>FILTER PROVENANCE:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded border transition-colors ${
                filter === "all"
                  ? "bg-yellow-400 text-black border-yellow-400 font-bold"
                  : "bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:text-white"
              }`}
            >
              ALL ({results.length})
            </button>

            <button
              onClick={() => setFilter("exact")}
              disabled={exactCount === 0}
              className={`px-3 py-1.5 rounded border transition-colors ${
                filter === "exact"
                  ? "bg-rose-500 text-white border-rose-500 font-bold"
                  : "bg-emerald-950/60 border-emerald-800 text-rose-300 hover:text-white disabled:opacity-40"
              }`}
            >
              EXACT ({exactCount})
            </button>

            <button
              onClick={() => setFilter("near")}
              disabled={nearCount === 0}
              className={`px-3 py-1.5 rounded border transition-colors ${
                filter === "near"
                  ? "bg-yellow-400 text-black border-yellow-400 font-bold"
                  : "bg-emerald-950/60 border-emerald-800 text-yellow-300 hover:text-white disabled:opacity-40"
              }`}
            >
              NEAR MATCH ({nearCount})
            </button>

            <button
              onClick={() => setFilter("related")}
              disabled={relatedCount === 0}
              className={`px-3 py-1.5 rounded border transition-colors ${
                filter === "related"
                  ? "bg-emerald-500 text-black border-emerald-500 font-bold"
                  : "bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:text-white disabled:opacity-40"
              }`}
            >
              RELATED ({relatedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Results Cards List */}
      <div className="space-y-4">
        {filtered.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-[#05140f] border border-emerald-800/80 rounded-lg p-5 hover:border-emerald-700 transition-colors shadow-lg shadow-black/40"
          >
            <div className="flex flex-col md:flex-row gap-5">
              {/* Optional Result Image Thumbnail */}
              {item.imageUrl ? (
                <div className="w-full md:w-44 h-36 bg-black rounded border border-emerald-900 overflow-hidden shrink-0 flex items-center justify-center relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title || "Visual match"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // fallback if hotlink protected
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-emerald-400">
                    MATCH ASSET
                  </div>
                </div>
              ) : (
                <div className="w-full md:w-44 h-36 bg-emerald-950/40 rounded border border-emerald-900/60 shrink-0 flex flex-col items-center justify-center text-emerald-600 text-[10px] p-2 text-center">
                  <Globe className="w-6 h-6 mb-1 text-emerald-500/60" />
                  <span>Webpage Appearance</span>
                </div>
              )}

              {/* Content Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  {/* Found on & Match Type */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400/80 uppercase">FOUND ON:</span>
                      <span className="text-xs font-bold text-yellow-300 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        {item.domain}
                      </span>
                      {item.platform && item.platform !== item.domain && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                          {item.platform}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getMatchBadge(item.matchType)}
                      {item.similarityScore !== null && (
                        <span className="text-[10px] text-emerald-400 font-mono-tech">
                          Score: {item.similarityScore}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Page Title */}
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 leading-snug">
                    {item.title || "Public Web Appearance"}
                  </h3>

                  {/* Description / snippet if available */}
                  {item.description && (
                    <p className="text-xs text-emerald-200/80 line-clamp-2 mb-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Metadata tags */}
                  {item.metadata?.bestGuessLabels && item.metadata.bestGuessLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.metadata.bestGuessLabels.map((lbl: string, i: number) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-black/50 border border-emerald-900 text-[10px] text-emerald-400"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visible URL and Open Source Action */}
                <div className="pt-3 border-t border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase text-emerald-500 font-bold block">
                      SOURCE URL:
                    </span>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-300 hover:text-yellow-300 hover:underline break-all block"
                    >
                      {item.sourceUrl}
                    </a>
                  </div>

                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-yellow-300 text-xs font-bold uppercase tracking-wider shrink-0 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    OPEN SOURCE
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
