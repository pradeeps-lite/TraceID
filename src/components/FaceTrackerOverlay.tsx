import React from "react";
import { FaceRegion } from "../types";

interface FaceTrackerOverlayProps {
  regions: FaceRegion[];
  selectedFaceIndex: number | null;
  onSelectFace: (index: number) => void;
  showOverlay: boolean;
}

export const FaceTrackerOverlay: React.FC<FaceTrackerOverlayProps> = ({
  regions,
  selectedFaceIndex,
  onSelectFace,
  showOverlay,
}) => {
  if (!showOverlay || regions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {regions.map((region) => {
        const isSelected = selectedFaceIndex === region.index;

        const leftPct = `${region.xRatio * 100}%`;
        const topPct = `${region.yRatio * 100}%`;
        const widthPct = `${region.widthRatio * 100}%`;
        const heightPct = `${region.heightRatio * 100}%`;

        return (
          <div
            key={region.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectFace(region.index);
            }}
            style={{
              left: leftPct,
              top: topPct,
              width: widthPct,
              height: heightPct,
            }}
            className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 group ${
              isSelected
                ? "border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.45)] bg-yellow-400/10"
                : "border border-emerald-400/80 hover:border-yellow-400/80 bg-emerald-400/5 hover:bg-yellow-400/10"
            }`}
            title={`Face #${region.index} (${region.facialPose || "Detected"}) - Click to focus`}
          >
            {/* High-tech Corner Brackets */}
            <div className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 ${isSelected ? "border-yellow-300" : "border-emerald-300"}`} />
            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 ${isSelected ? "border-yellow-300" : "border-emerald-300"}`} />
            <div className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 ${isSelected ? "border-yellow-300" : "border-emerald-300"}`} />
            <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 ${isSelected ? "border-yellow-300" : "border-emerald-300"}`} />

            {/* Central Target Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-70 transition-opacity">
              <div className="w-2 h-2 rounded-full border border-yellow-400" />
            </div>

            {/* Eye Landmark Reticles */}
            {region.landmarks.map((lm, i) => {
              // Calculate relative position within this face box
              const relLeft = `${((lm.xRatio - region.xRatio) / region.widthRatio) * 100}%`;
              const relTop = `${((lm.yRatio - region.yRatio) / region.heightRatio) * 100}%`;

              return (
                <div
                  key={i}
                  style={{ left: relLeft, top: relTop }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400/90 shadow-[0_0_6px_rgba(34,211,238,0.8)] border border-cyan-200"
                  title="Eye Landmark Traced"
                />
              );
            })}

            {/* Top HUD Badge */}
            <div
              className={`absolute -top-6 left-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase whitespace-nowrap shadow-md ${
                isSelected
                  ? "bg-yellow-400 text-black"
                  : "bg-black/80 text-emerald-300 border border-emerald-700/80"
              }`}
            >
              <span>FACE #{region.index}</span>
              <span className="opacity-75">[{region.sharpnessScore > 75 ? "SHARP" : "TRACE"}]</span>
            </div>

            {/* Bottom HUD Coordinates */}
            <div className="absolute -bottom-5 right-0 hidden sm:block px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-emerald-400 border border-emerald-900/80">
              {region.width}×{region.height}px
            </div>
          </div>
        );
      })}
    </div>
  );
};
