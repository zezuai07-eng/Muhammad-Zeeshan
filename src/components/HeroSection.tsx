import React, { useState } from 'react';
import { 
  Building, 
  MapPin, 
  Search, 
  ShieldCheck, 
  TrendingUp, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  PhoneCall, 
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { COMPANY_DETAILS } from '../data/mockData';
import { generateWhatsAppLink } from '../utils/formatters';

interface HeroSectionProps {
  onSearch: (params: { sector: string; size: string; type: string }) => void;
  onExploreMap: () => void;
  totalPlotsCount: number;
  availableCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  onExploreMap,
  totalPlotsCount,
  availableCount,
}) => {
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedSize, setSelectedSize] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      sector: selectedSector,
      size: selectedSize,
      type: selectedType,
    });
  };

  const stats = [
    { label: 'Verified Portfolio', value: 'PKR 4.8B+', sub: 'Direct LDA Registered' },
    { label: 'On-Ground Pegged', value: '100%', sub: 'Geo-Intelligence Mapped' },
    { label: 'Allottees Guided', value: '1,250+', sub: 'Local & Overseas Investors' },
    { label: 'LDA City Desk', value: '24/7 Live', sub: 'Site Office: 180 Ft Road' },
  ];

  return (
    <section className="relative bg-gradient-to-b from-[#0B132B] via-[#111A35] to-[#0B132B] pt-12 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Architectural Grid & Subtle Gold Ambience */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-60 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C2541]/90 border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37] shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kashpal PropTech Cadastral Engine</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live Inventory: {availableCount} Available Plots</span>
          </div>
        </div>

        {/* Hero Title & Subtext */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="tracking-tight leading-tight flex flex-col items-center">
            <span className="text-4xl sm:text-6xl lg:text-7xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-md">
              LDA CITY LAHORE
            </span>
            <span className="mt-2 text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent uppercase tracking-wider">
              Master GEO INTelligence
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Authorized corporate real estate consultants. Discover on-ground verified plots, official balloting files, and high-yield commercial boulevards with real-time GPS boundary routing.
          </p>

          {/* Quick Dual Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onExploreMap}
              className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-sm px-6 py-3.5 rounded-xl shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all cursor-pointer group"
            >
              <Layers className="w-4 h-4 text-[#0B132B]" />
              <span>Launch Master Geo-Map Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href={generateWhatsAppLink(
                '03001535898',
                'Hello Kashpal Enterprises, I am interested in acquiring property in LDA City Lahore. Please send me the latest rate list.'
              )}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-[#1C2541]/90 hover:bg-[#1C2541] border border-[#D4AF37]/40 text-slate-200 hover:text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Inquire Direct: 0300 1535898</span>
            </a>
          </div>
        </div>

        {/* Floating High-Converting Smart Filter Bar */}
        <div className="max-w-4xl mx-auto bg-[#1C2541]/95 backdrop-blur-xl border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] mb-12">
          <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            {/* Sector Select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Sector Location
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full bg-[#0B132B] border border-slate-700 hover:border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
              >
                <option value="All">All Sectors (Jinnah & Iqbal)</option>
                <option value="Jinnah Sector">Jinnah Sector (Blocks A–Q, A1, B1, G1)</option>
                <option value="Iqbal Sector">Iqbal Sector (Blocks AA, BB, CC)</option>
              </select>
            </div>

            {/* Plot Size Select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Plot Dimension / Size
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full bg-[#0B132B] border border-slate-700 hover:border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
              >
                <option value="All">All Sizes</option>
                <option value="5 Marla">5 Marla (25 x 45 ft)</option>
                <option value="10 Marla">10 Marla (35 x 65 ft)</option>
                <option value="1 Kanal">1 Kanal (50 x 90 ft)</option>
                <option value="2 Kanal">2 Kanal (75 x 120 ft)</option>
                <option value="4 Marla Commercial">4 Marla Commercial (180ft Rd)</option>
                <option value="8 Marla Commercial">8 Marla Commercial</option>
              </select>
            </div>

            {/* Property Type Select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Holding Category
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-[#0B132B] border border-slate-700 hover:border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
              >
                <option value="All">All Categories</option>
                <option value="Plot">On-Ground Pegged Plot</option>
                <option value="Commercial">Commercial Boulevard Plaza</option>
                <option value="File">LDA Exemption File</option>
              </select>
            </div>

            {/* Filter Submit Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Search Inventory</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Market Statistics Counter */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-[#1C2541]/70 backdrop-blur-md border border-[#D4AF37]/20 rounded-2xl p-4 text-center hover:border-[#D4AF37]/40 transition-all hover:translate-y-[-2px] shadow-lg"
            >
              <div className="text-xl sm:text-2xl font-black text-white font-mono flex items-center justify-center gap-1">
                <span>{stat.value}</span>
              </div>
              <div className="text-xs font-bold text-[#D4AF37] mt-1">{stat.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
