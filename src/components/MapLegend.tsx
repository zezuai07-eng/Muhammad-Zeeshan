import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, MapPin, Navigation, ShieldCheck, Compass } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute bottom-6 left-6 z-[1000] max-w-xs w-full transition-all duration-300 pointer-events-auto">
      <div className="bg-[#0B132B]/95 backdrop-blur-md border border-[#D4AF37]/30 rounded-xl shadow-2xl overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#1C2541]/80 hover:bg-[#1C2541] border-b border-[#D4AF37]/20 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37]">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold tracking-wide text-white flex items-center gap-1.5">
                <span>Geo-Spatial Symbology</span>
                <span className="text-[10px] uppercase font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                  LDA City
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Official Master Plan Legend</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Plot Availability Geometries */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Plot Availability Geometries
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded border border-[#10B981] bg-[#10B981]/40 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-slate-200 font-medium">Available for Booking</span>
                  </div>
                  <span className="text-[10px] text-[#10B981] font-mono">Immediate</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded border border-[#D4AF37] bg-[#D4AF37]/40 shadow-[0_0_8px_rgba(212,175,55,0.4)]"></span>
                    <span className="text-slate-200 font-medium">Reserved / Token Paid</span>
                  </div>
                  <span className="text-[10px] text-[#D4AF37] font-mono">Under Escrow</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded border border-rose-500/80 bg-rose-500/30"></span>
                    <span className="text-slate-400 line-through decoration-rose-500">Sold / Possession Given</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Closed</span>
                </div>
              </div>
            </div>

            {/* Plot Size Categorization */}
            <div className="pt-2 border-t border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Plot Size Color Coding
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border border-[#A7F3D0] bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-slate-200 font-medium">5 Marla</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border border-[#BAE6FD] bg-[#0284C7] shadow-[0_0_6px_rgba(2,132,199,0.5)]"></span>
                  <span className="text-slate-200 font-medium">10 Marla</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border border-[#DDD6FE] bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.5)]"></span>
                  <span className="text-slate-200 font-medium">1 Kanal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border border-[#FDE68A] bg-[#D97706] shadow-[0_0_6px_rgba(217,119,6,0.5)]"></span>
                  <span className="text-slate-200 font-medium">2 Kanal</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <span className="w-3.5 h-3.5 rounded border border-[#FDA4AF] bg-[#F43F5E] shadow-[0_0_6px_rgba(244,63,94,0.5)]"></span>
                  <span className="text-slate-200 font-medium">Commercial Boulevard</span>
                </div>
              </div>
            </div>

            {/* Infrastructure & Overlay */}
            <div className="pt-2 border-t border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Roads & Infrastructure
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 bg-amber-400 rounded-full"></span>
                  <span className="text-slate-300">180 Ft / 150 Ft Main Commercial Boulevards</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-sky-400 rounded-full"></span>
                  <span className="text-slate-300">80 Ft &amp; 50 Ft Residential Avenues</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-b border-dashed border-emerald-400"></span>
                  <span className="text-slate-300">GPS Live Navigation Vector</span>
                </div>
              </div>
            </div>

            {/* Custom Tile Source Notice */}
            <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>Synced with emap.pk LDA City Master Cadastral Tiles</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
