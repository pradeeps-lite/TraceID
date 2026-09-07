import React, { useRef, useState, useEffect } from "react";
import { Camera, X, Check, RotateCcw, AlertCircle } from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedDataUrl(null);
      setError(null);
      return;
    }

    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied by browser. Please allow camera access in browser settings."
          : `Failed to access camera: ${err.message || "Device not available"}`
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedDataUrl(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !capturedDataUrl) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onCapture(file);
          onClose();
        }
      },
      "image/jpeg",
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#071d16] border border-emerald-800/80 rounded-lg max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-emerald-800/60 bg-[#05140f]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-yellow-400" />
            <h3 className="font-mono-tech text-sm uppercase tracking-wider text-yellow-400">
              {capturedDataUrl ? "PREVIEW CAPTURE" : "CAPTURE LIVE IMAGE"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-400/80 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black flex items-center justify-center min-h-[340px] max-h-[500px] overflow-hidden">
          {error ? (
            <div className="p-6 text-center max-w-md">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-sm text-rose-200 font-mono-tech mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-900 border border-emerald-700 text-xs font-mono-tech uppercase text-yellow-300 rounded hover:bg-emerald-800"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedDataUrl ? (
            <img
              src={capturedDataUrl}
              alt="Captured preview"
              className="max-h-[460px] w-auto object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Camera reticle crosshairs */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border border-yellow-400/40 rounded-sm relative">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-400" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-400" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-400" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                  </div>
                </div>
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-emerald-800/60 bg-[#05140f] flex items-center justify-between">
          <p className="text-[11px] font-mono-tech text-emerald-400/70">
            {capturedDataUrl
              ? "Review photo resolution before running trace"
              : "Frame subject & capture"}
          </p>

          <div className="flex items-center gap-3">
            {capturedDataUrl ? (
              <>
                <button
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-emerald-950 border border-emerald-800 text-xs font-mono-tech text-emerald-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  RETAKE
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-yellow-400 text-black text-xs font-mono-tech font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
                >
                  <Check className="w-4 h-4" />
                  USE PHOTO
                </button>
              </>
            ) : (
              <button
                onClick={handleSnap}
                disabled={Boolean(error)}
                className="flex items-center gap-2 px-5 py-2.5 rounded bg-yellow-400 text-black text-xs font-mono-tech font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                CAPTURE
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
