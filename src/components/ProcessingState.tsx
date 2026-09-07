import React from "react";
import { Loader2, CheckCircle2, Radio, Server } from "lucide-react";

export type ProcessingStepNumber = 1 | 2 | 3 | 4 | 5 | 6;

interface ProcessingStateProps {
  currentStep: ProcessingStepNumber;
  providerName?: string;
  imageHash?: string;
  searchMode?: "face" | "full";
}

const STEPS = [
  { step: 1, label: "01 IMAGE RECEIVED", desc: "Binary validated & SHA-256 fingerprint generated" },
  { step: 2, label: "02 ANALYZING & TRACING FACE", desc: "OpenCV face detection & facial composition extraction" },
  { step: 3, label: "03 CONNECTING TO VISUAL SEARCH", desc: "Establishing authenticated provider session" },
  { step: 4, label: "04 SEARCHING PUBLIC WEB", desc: "Querying reverse web detection index" },
  { step: 5, label: "05 NORMALIZING RESULTS", desc: "Deduplicating URLs & enriching webpage metadata" },
  { step: 6, label: "06 TRACE COMPLETE", desc: "Rendering verified provenance records" },
];

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  currentStep,
  providerName = "SerpApi / Google Lens",
  imageHash,
  searchMode,
}) => {
  return (
    <div className="max-w-2xl mx-auto w-full py-12 px-4">
      <div className="bg-[#05140f] border border-emerald-800/80 rounded-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative corner coordinate accents */}
        <div className="absolute top-2 left-2 text-[9px] font-mono-tech text-emerald-600/50">
          SYS::RUNNING // REAL_TIME_TRACE
        </div>
        <div className="absolute top-2 right-2 text-[9px] font-mono-tech text-emerald-600/50">
          INDEX: {providerName}
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-950 border border-yellow-400/40 text-yellow-400 mb-4 shadow-lg shadow-yellow-400/10 relative">
            <Loader2 className="w-7 h-7 animate-spin text-yellow-400" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase font-mono-tech">
            TRACE IN PROGRESS
          </h2>
          <p className="text-xs font-mono-tech text-emerald-300/70 mt-1 max-w-md mx-auto">
            Executing real external queries across publicly indexed web sources.
          </p>

          {imageHash && (
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <div className="px-3 py-1 bg-black/40 rounded border border-emerald-800/60 text-[10px] font-mono-tech text-yellow-400/80 break-all">
                SHA256: {imageHash.slice(0, 16)}...{imageHash.slice(-8)}
              </div>
              {searchMode && (
                <div className={`px-2.5 py-1 rounded border text-[10px] font-mono-tech font-bold uppercase ${
                  searchMode === "face"
                    ? "bg-yellow-400/10 border-yellow-400 text-yellow-300"
                    : "bg-emerald-950 border-emerald-700 text-emerald-300"
                }`}>
                  {searchMode === "face" ? "TARGET: FACE ONLY (DRESSES EXCLUDED)" : "TARGET: FULL ASSET"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step Progression List */}
        <div className="space-y-3 font-mono-tech">
          {STEPS.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;
            const isPending = s.step > currentStep;

            return (
              <div
                key={s.step}
                className={`flex items-start gap-3.5 p-3 rounded transition-colors ${
                  isCurrent
                    ? "bg-emerald-950/90 border border-yellow-400/40 text-yellow-400 shadow-sm"
                    : isCompleted
                    ? "bg-emerald-950/40 border border-emerald-900/60 text-emerald-300/80"
                    : "bg-transparent border border-emerald-950/40 text-emerald-700/50"
                }`}
              >
                <div className="pt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-emerald-800/40 flex items-center justify-center text-[9px]">
                      {s.step}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      isCurrent ? "text-yellow-400" : isCompleted ? "text-emerald-200" : "text-emerald-700"
                    }`}>
                      {s.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 leading-snug ${
                    isCurrent ? "text-emerald-300" : isCompleted ? "text-emerald-400/70" : "text-emerald-800"
                  }`}>
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
