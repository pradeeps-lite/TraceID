import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Camera, 
  Search, 
  AlertCircle, 
  FileCheck, 
  Globe, 
  Info,
  ArrowRight,
  Crosshair,
  Lock
} from "lucide-react";
import { Header } from "./components/Header";
import { CameraCaptureModal } from "./components/CameraCaptureModal";
import { AnalysisOverview } from "./components/AnalysisOverview";
import { ProcessingState, ProcessingStepNumber } from "./components/ProcessingState";
import { ResultsView } from "./components/ResultsView";
import { NoResultsView } from "./components/NoResultsView";
import { ProviderStatusBanner } from "./components/ProviderStatusBanner";
import { AnalyzeResponse, SearchResponse, ProviderConfigStatus } from "./types";

type ViewState = "home" | "analyzed" | "processing" | "results" | "no_results" | "provider_error";

export default function App() {
  const [viewState, setViewState] = useState<ViewState>("home");
  const [config, setConfig] = useState<ProviderConfigStatus | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [searchTargetMode, setSearchTargetMode] = useState<"face" | "full">("full");

  // Active query data
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStepNumber>(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch provider configuration status on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config-status");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.warn("Failed to fetch provider status:", err);
    }
  };

  const handleFileSelect = (file: File) => {
    setErrorToast(null);
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorToast("Unsupported format. Please select a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorToast("File exceeds 15MB limit. Please choose a smaller image.");
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);

    // Trigger image analysis
    executeAnalyze(file);
  };

  const readFileAsDataUrl = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  const executeAnalyze = async (file: File) => {
    setErrorToast(null);
    setViewState("processing");
    setProcessingStep(1); // 01 IMAGE RECEIVED

    try {
      setProcessingStep(2); // 02 ANALYZING IMAGE

      // Safe upload with dual-transport (FormData with base64 fallback) & retry
      const uploadWithRetry = async (attemptsLeft = 3, delayMs = 1200): Promise<AnalyzeResponse> => {
        let res: Response;

        // 1. Try standard multipart FormData first
        try {
          const formData = new FormData();
          formData.append("image", file);
          res = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
          });
        } catch (multipartErr: any) {
          console.warn("Multipart upload failed, attempting base64 fallback:", multipartErr);
          // 2. Base64 fallback in case stream/proxy interrupted
          try {
            const dataUrl = await readFileAsDataUrl(file);
            res = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageBase64: dataUrl }),
            });
          } catch (b64Err: any) {
            if (attemptsLeft > 0) {
              console.warn(`Upload attempt failed. Retrying in ${delayMs}ms... (${attemptsLeft} retries left)`);
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              return uploadWithRetry(attemptsLeft - 1, Math.min(delayMs * 1.5, 3000));
            }
            throw new Error(
              "Unable to connect to the image processing service. The server may be warming up. Please click Retry."
            );
          }
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          if (attemptsLeft > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return uploadWithRetry(attemptsLeft - 1, Math.min(delayMs * 1.5, 3000));
          }
          throw new Error("Server is initializing. Please click Retry in a moment.");
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || errData?.error || `Upload failed with status ${res.status}`);
        }

        const data: AnalyzeResponse = await res.json();
        return data;
      };

      const data = await uploadWithRetry();
      setAnalysis(data);
      setViewState("analyzed");
    } catch (err: any) {
      console.error("Analysis error:", err);
      const friendlyMsg =
        err.message?.includes("Failed to fetch") || err.message?.includes("network")
          ? "Unable to connect to the image processing service. Please click Retry to test again."
          : err.message || "Failed to process image.";
      setErrorToast(friendlyMsg);
      setViewState("home");
    }
  };

  const executeSearch = async (options?: { searchTarget?: "full" | "face"; faceIndex?: number }) => {
    if (!analysis) return;

    const targetMode = options?.searchTarget || "full";
    setSearchTargetMode(targetMode);
    setViewState("processing");
    setProcessingStep(3); // 03 CONNECTING TO VISUAL SEARCH

    try {
      // Transition to searching web
      setTimeout(() => {
        setProcessingStep(4); // 04 SEARCHING PUBLIC WEB
      }, 600);

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: analysis.imageId,
          searchTarget: targetMode,
          faceIndex: options?.faceIndex || 1,
        }),
      });

      setProcessingStep(5); // 05 NORMALIZING RESULTS

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Visual search service returned an unexpected response format. Please try again.");
      }

      const data: SearchResponse = await res.json();
      setSearchResponse(data);
      setProcessingStep(6); // 06 TRACE COMPLETE

      setTimeout(() => {
        if (data.status === "success" && data.results.length > 0) {
          setViewState("results");
        } else if (data.status === "no_results" || (data.status === "success" && data.results.length === 0)) {
          setViewState("no_results");
        } else if (data.status === "provider_not_configured" || data.status === "error") {
          setViewState("provider_error");
        } else {
          setViewState("no_results");
        }
      }, 400);
    } catch (err: any) {
      console.error("Search error:", err);
      setSearchResponse({
        status: "error",
        provider: config?.configuredProvider || "google",
        searchedAt: new Date().toISOString(),
        providersSearched: [],
        totalMatches: 0,
        results: [],
        error: err.message || "Failed to reach search service.",
      });
      setViewState("provider_error");
    }
  };

  const handleReset = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setAnalysis(null);
    setSearchResponse(null);
    setErrorToast(null);
    setViewState("home");
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#071913] text-[#ededeb] flex flex-col bg-grid-tech selection:bg-yellow-400 selection:text-black">
      {/* Top Header */}
      <Header
        config={config}
        onReset={handleReset}
        isSearching={viewState === "processing"}
      />

      {/* Error Toast Notification */}
      {errorToast && (
        <div className="max-w-2xl mx-auto px-4 mt-4 w-full">
          <div className="p-3 bg-rose-950/90 border border-rose-700/80 rounded flex items-center justify-between gap-3 text-rose-200 text-xs font-mono-tech shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorToast}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => executeAnalyze(selectedFile)}
                  className="px-2.5 py-1 rounded bg-rose-900 hover:bg-rose-800 text-rose-100 font-bold text-[11px] uppercase tracking-wider transition-colors border border-rose-600/50"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => setErrorToast(null)}
                className="text-rose-400 hover:text-white font-bold text-xs px-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 flex flex-col justify-center">
        {/* VIEW: HOME (UPLOAD / CAPTURE) */}
        {viewState === "home" && (
          <div className="max-w-4xl mx-auto w-full px-4 py-8 sm:py-16 text-center">
            {/* Top Coordinate and Status badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-[11px] font-mono-tech text-emerald-400 mb-6 tracking-wider uppercase">
              <Crosshair className="w-3.5 h-3.5 text-yellow-400" />
              <span>IMAGE INTERNET PROVENANCE ENGINE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>

            {/* Dramatic Editorial Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter uppercase font-mono-tech text-white leading-none mb-4">
              TRACE ID
            </h1>
            <p className="text-lg sm:text-xl font-mono-tech text-yellow-400 font-semibold tracking-wide uppercase max-w-2xl mx-auto mb-3">
              TRACE THE IMAGE. FIND THE SOURCE.
            </p>
            <p className="text-xs sm:text-sm text-emerald-300/70 max-w-xl mx-auto mb-10 leading-relaxed font-mono-tech">
              Upload or capture any image to detect genuine public appearances, exact duplicates, and related online media across the open web.
            </p>

            {/* Upload / Capture Stage */}
            <div className="max-w-2xl mx-auto">
              {/* Dropzone Card */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-8 sm:p-12 transition-all cursor-pointer group bg-[#05140f]/80 ${
                  isDragging
                    ? "border-yellow-400 bg-yellow-400/5 scale-[1.01]"
                    : "border-emerald-800/80 hover:border-yellow-400/70 hover:bg-[#061812]"
                }`}
              >
                {/* Visual Scanner line effect */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent animate-scanline pointer-events-none" />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 text-yellow-400 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:border-yellow-400 transition-all shadow-lg">
                  <Upload className="w-7 h-7" />
                </div>

                <h2 className="text-lg font-bold font-mono-tech text-white uppercase tracking-wider mb-2">
                  SELECT OR DROP IMAGE FILE
                </h2>
                <p className="text-xs font-mono-tech text-emerald-300/70 mb-4">
                  Drag and drop JPEG, PNG, or WebP (max 15MB)
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-yellow-400 text-black text-xs font-mono-tech font-bold uppercase tracking-wider group-hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/10">
                  <Upload className="w-3.5 h-3.5" />
                  BROWSE FILES
                </div>
              </div>

              {/* Or live camera button */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <div className="h-px bg-emerald-900/80 flex-1" />
                <span className="text-[11px] font-mono-tech text-emerald-500 uppercase tracking-widest">
                  OR CAPTURE LIVE
                </span>
                <div className="h-px bg-emerald-900/80 flex-1" />
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded bg-emerald-950 hover:bg-emerald-900/80 border border-emerald-800 text-xs font-mono-tech font-semibold text-emerald-200 hover:text-yellow-400 uppercase tracking-wider transition-colors"
                >
                  <Camera className="w-4 h-4 text-yellow-400" />
                  CAPTURE VIA DEVICE CAMERA
                </button>
              </div>

              {/* Privacy and Verification Assurance */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-[11px] font-mono-tech text-emerald-400/60">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-yellow-400/80" />
                  <span>Image-Only Trace (No Facial Profiling)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real Public Web Crawlers</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PROCESSING STATES */}
        {viewState === "processing" && (
          <ProcessingState
            currentStep={processingStep}
            providerName={config?.configuredProvider || "Google Cloud Visual Web Detection"}
            imageHash={analysis?.imageHash}
            searchMode={searchTargetMode}
          />
        )}

        {/* VIEW: IMAGE ANALYZED (SPEC OVERVIEW) */}
        {viewState === "analyzed" && analysis && imagePreviewUrl && (
          <AnalysisOverview
            analysis={analysis}
            imagePreviewUrl={imagePreviewUrl}
            onStartSearch={executeSearch}
            onReset={handleReset}
            isSearching={false}
          />
        )}

        {/* VIEW: RESULTS VIEW */}
        {viewState === "results" && searchResponse && imagePreviewUrl && (
          <ResultsView
            searchResponse={searchResponse}
            queryImagePreviewUrl={imagePreviewUrl}
            onReset={handleReset}
          />
        )}

        {/* VIEW: NO RESULTS FOUND */}
        {viewState === "no_results" && searchResponse && imagePreviewUrl && (
          <NoResultsView
            searchResponse={searchResponse}
            imagePreviewUrl={imagePreviewUrl}
            onReset={handleReset}
          />
        )}

        {/* VIEW: PROVIDER NOTICE / AUTH ERROR */}
        {viewState === "provider_error" && (
          <ProviderStatusBanner
            config={config}
            searchResponse={searchResponse}
            onRetry={executeSearch}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleFileSelect}
      />
    </div>
  );
}
