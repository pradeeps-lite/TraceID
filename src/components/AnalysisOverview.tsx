import React, { useState } from "react";
import { 
  Copy, 
  Check, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Tag, 
  Eye, 
  Crosshair, 
  CheckCircle2, 
  AlertCircle,
  Cpu,
  Layers,
  Maximize2
} from "lucide-react";
import { AnalyzeResponse, FaceRegion } from "../types";
import { FaceTrackerOverlay } from "./FaceTrackerOverlay";

interface AnalysisOverviewProps {
  analysis: AnalyzeResponse;
  imagePreviewUrl: string;
  onStartSearch: (options?: { searchTarget?: "full" | "face"; faceIndex?: number }) => void;
  onReset: () => void;
  isSearching: boolean;
}

export const AnalysisOverview: React.FC<AnalysisOverviewProps> = ({
  analysis,
  imagePreviewUrl,
  onStartSearch,
  onReset,
  isSearching,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFaceOverlay, setShowFaceOverlay] = useState(true);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number>(1);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(analysis.imageHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const gemini = analysis.analysis;
  const faceDetection = analysis.faceDetection;
  const hasFaces = Boolean(faceDetection && faceDetection.hasFaces && faceDetection.regions.length > 0);
  const regions: FaceRegion[] = faceDetection?.regions || [];
  const activeFace = regions.find((r) => r.index === selectedFaceIndex) || regions[0];

  return (
    <div className="max-w-6xl mx-auto w-full py-6 px-4 font-mono-tech">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-900/60 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
              IMAGE ANALYSIS & FACE TRACE COMPLETE
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            disabled={isSearching}
            className="px-4 py-2 rounded text-xs uppercase border border-emerald-800 text-emerald-300 hover:text-white hover:bg-emerald-950 transition-colors"
          >
            Change Image
          </button>

          {hasFaces ? (
            <button
              onClick={() => onStartSearch({ searchTarget: "face", faceIndex: selectedFaceIndex })}
              disabled={isSearching}
              className="flex items-center gap-2 px-5 py-2.5 rounded bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20 disabled:opacity-50"
              title="Search isolating the traced face (excludes dresses/clothing)"
            >
              <Crosshair className="w-4 h-4" />
              TRACE FACE ONLY (ISOLATED)
            </button>
          ) : (
            <button
              onClick={() => onStartSearch({ searchTarget: "full" })}
              disabled={isSearching}
              className="flex items-center gap-2 px-6 py-2.5 rounded bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              TRACE INTERNET PRESENCE
            </button>
          )}
        </div>
      </div>

      {/* Grid: Image, Face Detection, and Technical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Preview with OpenCV Face Overlay & Technical Specs */}
        <div className="lg:col-span-5 bg-[#05140f] border border-emerald-800/80 rounded-lg p-4 space-y-4">
          <div className="relative rounded bg-black flex items-center justify-center overflow-hidden max-h-[380px] border border-emerald-900/80 group">
            <img
              src={imagePreviewUrl}
              alt="Query asset"
              className="w-full h-auto max-h-[380px] object-contain block"
            />

            {/* OpenCV Face Detection HUD Overlay */}
            <FaceTrackerOverlay
              regions={regions}
              selectedFaceIndex={selectedFaceIndex}
              onSelectFace={(idx) => setSelectedFaceIndex(idx)}
              showOverlay={showFaceOverlay}
            />

            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-emerald-700/60 text-[10px] text-emerald-300 flex items-center gap-1.5">
              <span>QUERY ASSET</span>
              {hasFaces && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Quick Face Presence Badge Bar */}
          <div className={`p-2.5 rounded border flex items-center justify-between text-xs ${
            hasFaces
              ? "bg-yellow-950/40 border-yellow-700/60 text-yellow-200"
              : "bg-emerald-950/40 border-emerald-900/80 text-emerald-300/70"
          }`}>
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider">
                {hasFaces ? `FACE DETECTED (${faceDetection?.faceCount} TRACED)` : "NO FACES DETECTED"}
              </span>
            </div>
          </div>

          {/* Technical Specs Table */}
          <div className="space-y-2 text-xs border-t border-emerald-900/60 pt-3">
            <div className="text-[11px] uppercase tracking-wider text-yellow-400 font-bold mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              TECHNICAL SPECIFICATIONS
            </div>

            <div className="flex justify-between py-1 border-b border-emerald-950 text-emerald-300/80">
              <span>Dimensions:</span>
              <span className="text-white font-semibold">
                {analysis.width} × {analysis.height} px
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-emerald-950 text-emerald-300/80">
              <span>Format:</span>
              <span className="text-white font-semibold">{analysis.format}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-emerald-950 text-emerald-300/80">
              <span>File Size:</span>
              <span className="text-white font-semibold">{formatBytes(analysis.fileSizeBytes)}</span>
            </div>

            <div className="py-1">
              <div className="flex items-center justify-between text-emerald-300/80 mb-1">
                <span>SHA-256 Fingerprint:</span>
                <button
                  onClick={handleCopyHash}
                  className="flex items-center gap-1 text-[10px] text-yellow-400 hover:text-yellow-300"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "COPIED" : "COPY"}
                </button>
              </div>
              <div className="p-2 bg-black/60 rounded border border-emerald-900/60 text-[10px] text-emerald-400 break-all select-all font-mono">
                {analysis.imageHash}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: OpenCV Face Detection & Facial Analysis (Analyze Face, Not Dresses) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Face Tracing & Detection Card */}
          <div className="bg-[#05140f] border border-emerald-800/80 rounded-lg p-5 space-y-4">
            <div className="border-b border-emerald-900/60 pb-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-yellow-400">
                SERVER-SIDE OPENCV FACE TRACE & TELEMETRY
              </h3>
            </div>

            {hasFaces ? (
              <div className="space-y-4">
                {/* Face Switcher Tabs if multiple faces */}
                {regions.length > 1 && (
                  <div className="flex items-center gap-2 border-b border-emerald-900/40 pb-2">
                    <span className="text-[11px] text-emerald-400 uppercase">Select Face:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {regions.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedFaceIndex(r.index)}
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors ${
                            selectedFaceIndex === r.index
                              ? "bg-yellow-400 text-black font-bold"
                              : "bg-black/60 border border-emerald-800 text-emerald-300 hover:text-white"
                          }`}
                        >
                          Face #{r.index} ({r.areaPercentage}%)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Face Inspector: Crop Thumbnail + Region Details */}
                {activeFace && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
                    {/* Face Crop Thumbnail */}
                    <div className="sm:col-span-4 flex flex-col items-center justify-center gap-2">
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-lg bg-black border-2 border-yellow-400/90 overflow-hidden shadow-lg shadow-yellow-400/10 flex items-center justify-center group">
                        {activeFace.cropDataUrl ? (
                          <img
                            src={activeFace.cropDataUrl}
                            alt={`Face #${activeFace.index}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2 text-[10px] text-emerald-400">
                            Face #{activeFace.index}
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-yellow-300 border border-yellow-500/40">
                          FACE #{activeFace.index}
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        Isolated Face Crop
                      </span>
                    </div>

                    {/* Face Region Metrics */}
                    <div className="sm:col-span-8 space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-emerald-900/60">
                        <span className="text-emerald-400/80">Bounding Box Region:</span>
                        <span className="font-mono text-white font-semibold">
                          X:{activeFace.x}, Y:{activeFace.y}, W:{activeFace.width}, H:{activeFace.height}px
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-1 border-b border-emerald-900/60">
                        <span className="text-emerald-400/80">Frame Coverage:</span>
                        <span className="font-mono text-yellow-300 font-semibold">
                          {activeFace.areaPercentage}% of total image
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-1 border-b border-emerald-900/60">
                        <span className="text-emerald-400/80">Facial Sharpness (Laplacian):</span>
                        <span className={`font-mono font-semibold ${activeFace.isSharp ? "text-emerald-300" : "text-amber-300"}`}>
                          {activeFace.sharpnessScore} ({activeFace.isSharp ? "Sharp / In-Focus" : "Standard"})
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-1 border-b border-emerald-900/60">
                        <span className="text-emerald-400/80">Facial Pose / Orientation:</span>
                        <span className="font-mono text-white capitalize">
                          {activeFace.facialPose ? activeFace.facialPose.replace("_", " ") : "Frontal"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-1 border-b border-emerald-900/60">
                        <span className="text-emerald-400/80">Eye Landmarks Traced:</span>
                        <span className="font-mono text-cyan-300 font-semibold">
                          {activeFace.landmarks.length} eye coordinate{activeFace.landmarks.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400/80">Illumination (ROI):</span>
                        <span className="font-mono text-white">
                          Brightness: {activeFace.brightnessScore}/255 | Contrast: {activeFace.contrastScore}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Directive Indicator: Analyze Face, Not Dresses */}
                <div className="p-3 bg-black/60 border border-yellow-500/40 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5" />
                      FACIAL ANALYSIS DIRECTIVE (DRESSES & CLOTHING EXCLUDED)
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-500/30">
                      FACE-CENTRIC
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    Visual analysis is focused strictly on facial structure, eye orientation, lighting on the face, and facial provenance. Dresses, clothing styles, and fashion garments are deliberately isolated to avoid false matches.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/30 border border-emerald-900/60 rounded-lg text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-emerald-500 mx-auto" />
                <div className="text-xs text-emerald-300 font-semibold uppercase">
                  No Human Faces Traced in Query Image
                </div>
                <p className="text-[11px] text-emerald-400/70 max-w-md mx-auto">
                  OpenCV scanned the image across multiple scales and angles. Full image provenance search remains available.
                </p>
              </div>
            )}
          </div>

          {/* Visual Composition & Facial Assessment Card */}
          <div className="bg-[#05140f] border border-emerald-800/80 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs uppercase font-bold tracking-wider text-yellow-400">
                  VISUAL & FACIAL COMPOSITION ASSESSMENT
                </h3>
              </div>
              <span className="text-[10px] text-emerald-500 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                OBJECTIVE PROVENANCE
              </span>
            </div>

            {/* Scene / Face Summary */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block mb-1.5">
                {hasFaces ? "Facial & Scene Assessment" : "Scene Assessment"}
              </span>
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/80 rounded text-xs text-emerald-200 leading-relaxed">
                {gemini.sceneDescription || "Visual composition cataloged."}
              </div>
            </div>

            {/* Structured Face Analysis if available */}
            {gemini.faceAnalysis && hasFaces && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-black/40 border border-emerald-900/80 rounded text-xs space-y-1">
                  <span className="text-[10px] uppercase text-emerald-400 font-bold block">
                    Facial Framing
                  </span>
                  <div className="text-white font-medium">
                    {gemini.faceAnalysis.facialFraming || "Standard portrait framing"}
                  </div>
                </div>

                <div className="p-2.5 bg-black/40 border border-emerald-900/80 rounded text-xs space-y-1">
                  <span className="text-[10px] uppercase text-emerald-400 font-bold block">
                    Gaze & Orientation
                  </span>
                  <div className="text-white font-medium">
                    {gemini.faceAnalysis.gazeOrientation || "Direct camera perspective"}
                  </div>
                </div>

                {gemini.faceAnalysis.lightingQuality && (
                  <div className="p-2.5 bg-black/40 border border-emerald-900/80 rounded text-xs space-y-1">
                    <span className="text-[10px] uppercase text-emerald-400 font-bold block">
                      Facial Illumination
                    </span>
                    <div className="text-emerald-300">
                      {gemini.faceAnalysis.lightingQuality}
                    </div>
                  </div>
                )}

                {gemini.faceAnalysis.facialExpression && (
                  <div className="p-2.5 bg-black/40 border border-emerald-900/80 rounded text-xs space-y-1">
                    <span className="text-[10px] uppercase text-emerald-400 font-bold block">
                      Facial Countenance
                    </span>
                    <div className="text-emerald-300">
                      {gemini.faceAnalysis.facialExpression}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Objects Detected */}
            {gemini.objects && gemini.objects.length > 0 && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block mb-2">
                  Key Visual Entities Detected ({gemini.objects.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {gemini.objects.map((obj, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-950 border border-emerald-800 text-[11px] text-yellow-300"
                    >
                      <Tag className="w-3 h-3 text-emerald-400" />
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Visible Text & Typography */}
            {gemini.textDetected && gemini.textDetected.length > 0 && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block mb-2">
                  Visible Text / Inscriptions
                </span>
                <div className="space-y-1">
                  {gemini.textDetected.map((text, i) => (
                    <div
                      key={i}
                      className="p-2 bg-black/40 border border-emerald-900/60 rounded text-[11px] text-emerald-300 flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-yellow-400/80 shrink-0" />
                      <span>&ldquo;{text}&rdquo;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dual Search Action Buttons */}
            <div className="pt-4 border-t border-emerald-900/60 space-y-2">
              {hasFaces ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => onStartSearch({ searchTarget: "face", faceIndex: selectedFaceIndex })}
                    disabled={isSearching}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20 disabled:opacity-50"
                  >
                    <Crosshair className="w-4 h-4" />
                    TRACE FACE ONLY (ISOLATE)
                  </button>

                  <button
                    onClick={() => onStartSearch({ searchTarget: "full" })}
                    disabled={isSearching}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded border border-emerald-700 bg-emerald-950 text-emerald-200 text-xs font-bold uppercase tracking-wider hover:bg-emerald-900 transition-colors disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    SEARCH FULL IMAGE
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onStartSearch({ searchTarget: "full" })}
                  disabled={isSearching}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded bg-yellow-400 text-black text-sm font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
                >
                  <Search className="w-4 h-4" />
                  COMMENCE PUBLIC INTERNET SEARCH
                </button>
              )}
              <p className="text-[10px] text-center text-emerald-500/70 mt-1">
                Queries real search provider visual index. Non-blocking to search pipeline. Zero mock data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
