import React from "react";
import { RefreshCw } from "lucide-react";
import { ProviderConfigStatus } from "../types";

interface HeaderProps {
  config: ProviderConfigStatus | null;
  onReset: () => void;
  isSearching: boolean;
}

export const Header: React.FC<HeaderProps> = ({ config, onReset, isSearching }) => {
  return (
    <header className="border-b border-emerald-900/60 bg-[#05140f]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div 
          onClick={onReset}
          className="flex items-center gap-3 cursor-pointer group select-none"
          title="Return to TRACE ID home"
        >
          <div className="w-8 h-8 rounded-sm bg-yellow-400 text-black flex items-center justify-center font-bold text-sm tracking-tighter transition-transform group-hover:scale-105">
            T|ID
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-tech tracking-[0.2em] text-base sm:text-lg font-bold text-yellow-400">
                TRACE ID
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            disabled={isSearching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tech uppercase tracking-wider text-emerald-300 hover:text-yellow-400 hover:bg-emerald-900/40 border border-emerald-800/50 transition-colors disabled:opacity-40"
            title="Reset to New Image"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NEW TRACE</span>
          </button>
        </div>
      </div>
    </header>
  );
};
