import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  CreditCard, 
  CheckCircle, 
  PhoneCall, 
  Share2, 
  HelpCircle,
  AlertTriangle,
  FileCheck2,
  Receipt
} from 'lucide-react';
import { formatPKR, formatPKRFull, generateWhatsAppLink } from '../utils/formatters';

export const InstallmentCalculator: React.FC = () => {
  const [plotCategory, setPlotCategory] = useState<'5 Marla' | '10 Marla' | '1 Kanal' | 'Custom'>('10 Marla');
  const [customPrice, setCustomPrice] = useState<number>(7500000);
  const [isFiler, setIsFiler] = useState<boolean>(true);
  const [includeDevCharges, setIncludeDevCharges] = useState<boolean>(true);

  // Real market cash valuations for LDA City Lahore (Lump Sum full payment)
  const propertyBasePrice = useMemo(() => {
    switch (plotCategory) {
      case '5 Marla':
        return 4200000;
      case '10 Marla':
        return 7500000;
      case '1 Kanal':
        return 14500000;
      case 'Custom':
        return customPrice;
    }
  }, [plotCategory, customPrice]);

  // Government LDA Transfer Fee & Stamp Duty calculations
  const ldaTransferFee = useMemo(() => {
    switch (plotCategory) {
      case '5 Marla': return 65000;
      case '10 Marla': return 110000;
      case '1 Kanal': return 195000;
      default: return Math.round(propertyBasePrice * 0.015);
    }
  }, [plotCategory, propertyBasePrice]);

  // FBR Advance Tax 236K (Filer = 3%, Non-Filer = 6% to 10.5%)
  const fbrTax = useMemo(() => {
    const rate = isFiler ? 0.03 : 0.07;
    return Math.round(propertyBasePrice * rate);
  }, [propertyBasePrice, isFiler]);

  // Estimated Dev Charges if applicable
  const devCharges = useMemo(() => {
    if (!includeDevCharges) return 0;
    switch (plotCategory) {
      case '5 Marla': return 500000;
      case '10 Marla': return 950000;
      case '1 Kanal': return 1800000;
      default: return 750000;
    }
  }, [plotCategory, includeDevCharges]);

  const totalNetCashRequired = propertyBasePrice + ldaTransferFee + fbrTax + devCharges;

  const whatsappQuoteMessage = `Hello Kashpal Enterprises, I reviewed the LDA City Cash Purchase Breakdown on your portal:
Plot Category: ${plotCategory}
Plot Base Price: ${formatPKR(propertyBasePrice)} (100% Cash / Lump Sum)
LDA Transfer Fee: ${formatPKR(ldaTransferFee)}
FBR Tax (${isFiler ? 'Filer 3%' : 'Non-Filer 7%'}): ${formatPKR(fbrTax)}
Total Net Cash Outlay: ${formatPKR(totalNetCashRequired)}
Please confirm current inventory availability and transfer dates at LDA One-Window.`;

  return (
    <div id="installment-calculator-section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="bg-gradient-to-br from-[#1C2541] via-[#0B132B] to-[#1C2541] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-10 shadow-2xl">
        
        {/* Market Reality Notice Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-200 leading-relaxed">
            <span className="font-extrabold text-amber-400 uppercase tracking-wide mr-1.5">Official Market Rule:</span>
            LDA City Lahore is <strong className="text-white">100% Lump Sum Cash Deal (Not on Installments)</strong>. 
            All allotted and balloted plots require full spot payment upon allotment letter transfer at the LDA One-Window Directorate.
          </div>
        </div>

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
              <Receipt className="w-4 h-4" />
              <span>LDA City Lahore • Official Cost Estimator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Lump Sum Cash & Transfer Fee Calculator
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Calculate total net cash outlay including LDA transfer charges, FBR tax, and direct allotment cost.
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-black self-start">
            100% Cash / Spot Transfer
          </div>
        </div>

        {/* Calculator Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          
          {/* Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Plot Size Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Select Plot Size / Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['5 Marla', '10 Marla', '1 Kanal', 'Custom'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPlotCategory(cat)}
                    className={`py-3 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      plotCategory === cat
                        ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/25 scale-102'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Price Input if selected */}
            {plotCategory === 'Custom' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Custom Base Cash Price (PKR)
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Math.max(100000, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            )}

            {/* FBR Filer / Non-Filer Toggle */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                FBR Tax Status (Section 236K)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsFiler(true)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    isFiler
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Filer (3% Tax)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFiler(false)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    !isFiler
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>Non-Filer (7% Tax)</span>
                </button>
              </div>
            </div>

            {/* Development Charges Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold text-slate-200">Include Estimated Dev Charges</span>
              </div>
              <input
                type="checkbox"
                checked={includeDevCharges}
                onChange={(e) => setIncludeDevCharges(e.target.checked)}
                className="w-5 h-5 accent-[#D4AF37] cursor-pointer"
              />
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-[#D4AF37]/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Structure</span>
                <span className="text-xs font-black text-emerald-400">100% Cash / Spot</span>
              </div>

              <div className="space-y-3 mt-4 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Plot Lump Sum Price:</span>
                  <span className="font-mono font-bold text-white">{formatPKR(propertyBasePrice)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>LDA Transfer Fee:</span>
                  <span className="font-mono font-bold text-slate-200">{formatPKR(ldaTransferFee)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>FBR Advance Tax ({isFiler ? '3%' : '7%'}):</span>
                  <span className="font-mono font-bold text-amber-300">{formatPKR(fbrTax)}</span>
                </div>
                {includeDevCharges && (
                  <div className="flex justify-between text-slate-300">
                    <span>Est. Development Charges:</span>
                    <span className="font-mono font-bold text-slate-200">{formatPKR(devCharges)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-700/80 mt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-extrabold text-[#D4AF37]">Total Cash Required:</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono">
                      {formatPKR(totalNetCashRequired)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Direct allotment transfer at LDA Directorate. No monthly installment overhead.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Consultant Connect */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <a
                href={generateWhatsAppLink('03001535898', whatsappQuoteMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
              >
                <span>Request Current Available Plot Quote</span>
              </a>
              <a
                href="tel:03001535898"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Call Kashpal LDA Desk (0300 1535898)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
