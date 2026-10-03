import React, { useState, useMemo } from 'react';
import { 
  Building, 
  Filter, 
  SlidersHorizontal, 
  RotateCcw, 
  Search, 
  Layers, 
  ArrowUpDown, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { PlotRecord } from '../types';
import { PropertyCard } from './PropertyCard';
import { formatPKR } from '../utils/formatters';

interface PropertyGridProps {
  plots: PlotRecord[];
  onOpenDetails: (plot: PlotRecord) => void;
  onLocateOnMap: (plot: PlotRecord) => void;
  initialFilters?: { sector: string; size: string; type: string };
}

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  plots,
  onOpenDetails,
  onLocateOnMap,
  initialFilters,
}) => {
  // Filter States
  const [selectedSize, setSelectedSize] = useState<string>(initialFilters?.size || 'All');
  const [selectedSector, setSelectedSector] = useState<string>(initialFilters?.sector || 'All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>(initialFilters?.type || 'All');
  const [maxBudget, setMaxBudget] = useState<number>(70000000); // 7 Crore ceiling
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'featured'>('featured');

  // Available unique sectors
  const sectors = useMemo(() => {
    return ['All', ...Array.from(new Set(plots.map((p) => p.sector))).sort()];
  }, [plots]);

  const sizes = ['All', '5 Marla', '10 Marla', '1 Kanal', '2 Kanal', '4 Marla Commercial', '8 Marla Commercial'];
  const statuses = ['All', 'Available', 'Reserved', 'Sold'];
  const types = ['All', 'Plot', 'House', 'File', 'Commercial'];

  // Filter & Sort Logic
  const filteredPlots = useMemo(() => {
    return plots
      .filter((plot) => {
        if (selectedSize !== 'All' && plot.size !== selectedSize) return false;
        if (selectedSector !== 'All' && plot.sector !== selectedSector) return false;
        if (selectedStatus !== 'All' && plot.status !== selectedStatus) return false;
        if (selectedType !== 'All' && plot.type !== selectedType) return false;
        if (plot.price > maxBudget) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNumber = plot.plotNumber.toLowerCase().includes(q);
          const matchSector = plot.sector.toLowerCase().includes(q);
          const matchBlock = plot.block.toLowerCase().includes(q);
          const matchFacing = plot.facing.toLowerCase().includes(q);
          const matchDesc = plot.description.toLowerCase().includes(q);
          if (!matchNumber && !matchSector && !matchBlock && !matchFacing && !matchDesc) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        // Default featured: available first, then reserved, then sold
        const order = { Available: 1, Reserved: 2, Sold: 3 };
        return order[a.status] - order[b.status];
      });
  }, [plots, selectedSize, selectedSector, selectedStatus, selectedType, maxBudget, searchQuery, sortBy]);

  const handleReset = () => {
    setSelectedSize('All');
    setSelectedSector('All');
    setSelectedStatus('All');
    setSelectedType('All');
    setMaxBudget(70000000);
    setSearchQuery('');
    setSortBy('featured');
  };

  return (
    <section id="marketplace-section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Inventory Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verified LDA City Plots &amp; Commercial Units
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Live availability synced with on-ground LDA cadastral registries. Clear legal titles and instant token escrow.
          </p>
        </div>

        {/* Count & Sort Selector */}
        <div className="flex items-center gap-3">
          <div className="bg-[#1C2541] border border-slate-700 px-3.5 py-2 rounded-xl text-xs text-slate-300">
            Showing <strong className="text-white">{filteredPlots.length}</strong> of{' '}
            <strong className="text-slate-400">{plots.length}</strong> listings
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#1C2541] border border-[#D4AF37]/30 text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="featured">Featured Status</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-[#1C2541]/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-5 mb-8 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Keyword Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              Quick Keyword Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Plot #, Block, Facing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Size Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              Plot Size
            </label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            >
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              Sector Zone
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              Availability Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            >
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Range Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Max Budget
              </label>
              <span className="text-xs font-bold text-[#D4AF37] font-mono">
                {formatPKR(maxBudget)}
              </span>
            </div>
            <input
              type="range"
              min="3000000"
              max="70000000"
              step="500000"
              value={maxBudget}
              onChange={(e) => setMaxBudget(parseInt(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer"
            />
          </div>
        </div>

        {/* Filter Quick Pills & Reset */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] mr-1">Quick Select:</span>
            {['5 Marla', '10 Marla', '1 Kanal', 'Commercial'].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => {
                  if (quick === 'Commercial') {
                    setSelectedType('Commercial');
                    setSelectedSize('All');
                  } else {
                    setSelectedSize(quick);
                    setSelectedType('All');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  (selectedSize === quick || (quick === 'Commercial' && selectedType === 'Commercial'))
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                    : 'bg-[#0B132B] border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {quick}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs cursor-pointer py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </div>

      {/* Property Cards Grid */}
      {filteredPlots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlots.map((plot) => (
            <PropertyCard
              key={plot.id}
              plot={plot}
              onOpenDetails={onOpenDetails}
              onLocateOnMap={onLocateOnMap}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#1C2541]/50 border border-dashed border-slate-700 rounded-2xl p-12 text-center max-w-md mx-auto">
          <Building className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Matching Properties Found</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Try adjusting your budget slider, sector zone, or size parameters to view other verified plots.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-[#D4AF37] text-[#0B132B] font-bold text-xs rounded-xl cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
};
