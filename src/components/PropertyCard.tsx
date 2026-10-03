import React from 'react';
import { 
  Building2, 
  MapPin, 
  Compass, 
  Maximize, 
  CheckCircle, 
  PhoneCall, 
  Eye, 
  ShieldCheck, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { PlotRecord } from '../types';
import { formatPKR, generateWhatsAppLink } from '../utils/formatters';

interface PropertyCardProps {
  plot: PlotRecord;
  onOpenDetails: (plot: PlotRecord) => void;
  onLocateOnMap: (plot: PlotRecord) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  plot,
  onOpenDetails,
  onLocateOnMap,
}) => {
  const getStatusColor = (status: PlotRecord['status']) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
      case 'Reserved':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(212,175,55,0.2)]';
      case 'Sold':
        return 'bg-slate-800/80 text-slate-400 border-slate-700';
    }
  };

  const whatsappMessage = `Hello Kashpal Enterprises, I am inquiring about Plot #${plot.plotNumber} in ${plot.sector}, ${plot.block} (${plot.size}) listed for ${formatPKR(plot.price)}. Please share the complete ledger and payment plan.`;

  return (
    <div className="group bg-[#1C2541]/90 backdrop-blur-md border border-slate-700/80 hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300">
      {/* 
        ========================================================================
        MOBILE VIEW (Zameen.com Style Compact Preview)
        Visible ONLY on mobile (< sm screens)
        ========================================================================
      */}
      <div className="flex sm:hidden p-2.5 gap-2.5 items-stretch">
        {/* Compact Left Thumbnail */}
        <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-900">
          <img
            src={plot.images[0]}
            alt={`Plot ${plot.plotNumber} ${plot.sector}`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1 left-1">
            <span
              className={`text-[8.5px] uppercase font-black px-1.5 py-0.5 rounded shadow ${getStatusColor(
                plot.status
              )}`}
            >
              {plot.status}
            </span>
          </div>
          <div className="absolute bottom-1 left-1">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0B132B]/90 text-white font-mono border border-slate-700">
              {plot.size}
            </span>
          </div>
        </div>

        {/* Compact Right Information & Action Strip */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm font-extrabold text-[#D4AF37] font-mono leading-none">
                {formatPKR(plot.price)}
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-300 bg-[#0B132B] px-1.5 py-0.5 rounded border border-slate-700/70">
                {plot.type}
              </span>
            </div>

            <h4 className="text-xs font-bold text-white mt-1 truncate">
              Plot #{plot.plotNumber} • Block {plot.block}
            </h4>

            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#D4AF37] shrink-0" />
              <span className="truncate">{plot.society} ({plot.sector})</span>
            </div>

            <div className="text-[9.5px] text-slate-400 mt-1 truncate">
              {plot.facing} • {plot.roadWidth}
            </div>
          </div>

          {/* Compact Quick Actions */}
          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onLocateOnMap(plot)}
              className="flex-1 py-1 px-1.5 bg-[#0B132B] hover:bg-[#111A35] text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              title="Locate Plot on Geo-Map"
            >
              <Layers className="w-3 h-3" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDetails(plot)}
              className="flex-1 py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              title="View Specs"
            >
              <Eye className="w-3 h-3" />
              <span>Specs</span>
            </button>
            <a
              href={generateWhatsAppLink(plot.sellerWhatsapp || plot.sellerPhone || '03001535898', whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="py-1 px-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow cursor-pointer"
              title="Chat on WhatsApp"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Chat</span>
            </a>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        DESKTOP VIEW (Full Luxury Grid Card)
        Visible on sm screens and larger
        ========================================================================
      */}
      <div className="hidden sm:flex sm:flex-col justify-between h-full">
        <div>
          {/* Card Image Banner */}
          <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
            <img
              src={plot.images[0]}
              alt={`Plot ${plot.plotNumber} ${plot.sector}`}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Floating Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${getStatusColor(
                  plot.status
                )}`}
              >
                {plot.status}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#0B132B]/80 text-[#D4AF37] border border-[#D4AF37]/30 backdrop-blur-sm">
                {plot.type}
              </span>
            </div>

            <div className="absolute top-3 right-3 z-10">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#0B132B]/90 text-white border border-slate-700 backdrop-blur-sm font-mono">
                {plot.size}
              </span>
            </div>

            {/* Quick Geo Tag */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white bg-[#0B132B]/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="truncate">
                  {plot.society} • {plot.sector} ({plot.block})
                </span>
              </div>
              {plot.balloted && (
                <span className="text-[10px] text-emerald-400 font-semibold shrink-0 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Balloted
                </span>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5">
            {/* Header & Price */}
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Plot Identifier
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                  Plot #{plot.plotNumber}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                  Demand Price
                </div>
                <div className="text-lg font-extrabold text-[#D4AF37] font-mono">
                  {formatPKR(plot.price)}
                </div>
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-slate-700/60 bg-[#0B132B]/50 rounded-xl px-3 my-3">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">
                  Dimensions
                </span>
                <span className="text-slate-200 font-semibold">{plot.dimensions}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">
                  Frontage Facing
                </span>
                <span className="text-slate-200 font-semibold truncate block" title={plot.facing}>
                  {plot.facing}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">
                  Road Avenue
                </span>
                <span className="text-slate-200 font-semibold">{plot.roadWidth}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">
                  Down Payment
                </span>
                <span className="text-emerald-400 font-semibold">
                  {formatPKR(plot.paymentPlan.downPayment)}
                </span>
              </div>
            </div>

            {/* Description Excerpt */}
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
              {plot.description}
            </p>

            {/* Seller / Agency Identity Strip */}
            {(plot.agencyName || plot.sellerName) && (
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  {plot.agencyLogo ? (
                    <img
                      src={plot.agencyLogo}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover border border-[#D4AF37]/50 shrink-0"
                    />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  )}
                  <span className="text-slate-300 font-semibold truncate">
                    {plot.agencyName || plot.sellerName}
                  </span>
                </div>

                {plot.isVerifiedSeller && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/50 px-1.5 py-0.5 rounded-full shrink-0"
                    title="LDA City Verified Seller"
                  >
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Action Footer */}
        <div className="p-5 pt-0 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onLocateOnMap(plot)}
            className="col-span-1 flex items-center justify-center gap-1 bg-[#0B132B] hover:bg-[#111A35] text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl py-2.5 text-xs font-semibold transition-all cursor-pointer"
            title="Locate Polygon Boundary on Leaflet Geo-Map"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Geo-Map</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDetails(plot)}
            className="col-span-1 flex items-center justify-center gap-1 bg-[#1C2541] hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-xl py-2.5 text-xs font-semibold transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Specs</span>
          </button>

          <a
            href={generateWhatsAppLink(plot.sellerWhatsapp || plot.sellerPhone || '03001535898', whatsappMessage)}
            target="_blank"
            rel="noreferrer"
            className="col-span-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-xs font-bold shadow-md transition-colors"
            title="Inquire via WhatsApp"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Inquire</span>
          </a>
        </div>
      </div>
    </div>
  );
};
