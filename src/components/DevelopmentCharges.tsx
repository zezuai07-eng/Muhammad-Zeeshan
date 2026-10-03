import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Calculator, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  Share2, 
  PhoneCall, 
  ShieldCheck, 
  Clock, 
  Landmark, 
  Layers, 
  Info,
  DollarSign,
  ChevronRight,
  Printer
} from 'lucide-react';
import { formatPKR, formatPKRFull, generateWhatsAppLink } from '../utils/formatters';

export type BallotingPhase = '1st' | '2nd' | '3rd' | '4th';

export interface ScheduleRow {
  size: string;
  category: 'Residential' | 'Commercial';
  totalCharges: number;
  quarterlyInstallment: number;
  totalInstallments: number;
  transferFeeFiler: number;
  transferFeeNonFiler: number;
  possessionFee: number;
  remarks: string;
}

// 1st & 2nd Balloting Schedule (Initial Phase Rates)
export const BALLOTING_1_AND_2_SCHEDULE: ScheduleRow[] = [
  {
    size: '5 Marla',
    category: 'Residential',
    totalCharges: 650000, // 6.5 Lakh
    quarterlyInstallment: 81250,
    totalInstallments: 8,
    transferFeeFiler: 65000,
    transferFeeNonFiler: 130000,
    possessionFee: 25000,
    remarks: '1st & 2nd Balloting (Jinnah & Iqbal Sector)',
  },
  {
    size: '10 Marla',
    category: 'Residential',
    totalCharges: 1100000, // 11 Lakh
    quarterlyInstallment: 137500,
    totalInstallments: 8,
    transferFeeFiler: 110000,
    transferFeeNonFiler: 220000,
    possessionFee: 35000,
    remarks: '1st & 2nd Balloting Standard 35x70 Plots',
  },
  {
    size: '1 Kanal',
    category: 'Residential',
    totalCharges: 1800000, // 18 Lakh
    quarterlyInstallment: 225000,
    totalInstallments: 8,
    transferFeeFiler: 195000,
    transferFeeNonFiler: 390000,
    possessionFee: 50000,
    remarks: '1st & 2nd Balloting Prime 50x90 Plots',
  },
  {
    size: '2 Kanal',
    category: 'Residential',
    totalCharges: 3600000, // 36 Lakh
    quarterlyInstallment: 450000,
    totalInstallments: 8,
    transferFeeFiler: 350000,
    transferFeeNonFiler: 700000,
    possessionFee: 75000,
    remarks: '1st & 2nd Balloting Executive 75x120 Plots',
  },
  {
    size: '4 Marla Commercial',
    category: 'Commercial',
    totalCharges: 3500000,
    quarterlyInstallment: 437500,
    totalInstallments: 8,
    transferFeeFiler: 300000,
    transferFeeNonFiler: 600000,
    possessionFee: 80000,
    remarks: '180 Ft & 150 Ft Main Commercial Boulevards',
  },
  {
    size: '8 Marla Commercial',
    category: 'Commercial',
    totalCharges: 6000000,
    quarterlyInstallment: 750000,
    totalInstallments: 8,
    transferFeeFiler: 550000,
    transferFeeNonFiler: 1100000,
    possessionFee: 120000,
    remarks: 'High-Density Commercial & Corporate Plots',
  },
];

// 3rd & 4th Balloting Schedule (User specified: 5M=8 Lakh, 10M=14 Lakh, 1 Kanal=23 Lakh, 2 Kanal=almost 36 Lakh)
export const BALLOTING_3_AND_4_SCHEDULE: ScheduleRow[] = [
  {
    size: '5 Marla',
    category: 'Residential',
    totalCharges: 800000, // 8 Lakh
    quarterlyInstallment: 100000,
    totalInstallments: 8,
    transferFeeFiler: 80000,
    transferFeeNonFiler: 160000,
    possessionFee: 30000,
    remarks: '3rd & 4th Balloting Rates (LDA Notification)',
  },
  {
    size: '10 Marla',
    category: 'Residential',
    totalCharges: 1400000, // 14 Lakh
    quarterlyInstallment: 175000,
    totalInstallments: 8,
    transferFeeFiler: 140000,
    transferFeeNonFiler: 280000,
    possessionFee: 45000,
    remarks: '3rd & 4th Balloting Standard 35x70 Plots',
  },
  {
    size: '1 Kanal',
    category: 'Residential',
    totalCharges: 2300000, // 23 Lakh
    quarterlyInstallment: 287500,
    totalInstallments: 8,
    transferFeeFiler: 230000,
    transferFeeNonFiler: 460000,
    possessionFee: 65000,
    remarks: '3rd & 4th Balloting Prime 50x90 Plots',
  },
  {
    size: '2 Kanal',
    category: 'Residential',
    totalCharges: 3600000, // almost 36 Lakh
    quarterlyInstallment: 450000,
    totalInstallments: 8,
    transferFeeFiler: 360000,
    transferFeeNonFiler: 720000,
    possessionFee: 85000,
    remarks: '3rd & 4th Balloting Executive 75x120 Plots',
  },
  {
    size: '4 Marla Commercial',
    category: 'Commercial',
    totalCharges: 4200000,
    quarterlyInstallment: 525000,
    totalInstallments: 8,
    transferFeeFiler: 380000,
    transferFeeNonFiler: 760000,
    possessionFee: 95000,
    remarks: '3rd & 4th Balloting Commercial Boulevards',
  },
  {
    size: '8 Marla Commercial',
    category: 'Commercial',
    totalCharges: 7200000,
    quarterlyInstallment: 900000,
    totalInstallments: 8,
    transferFeeFiler: 680000,
    transferFeeNonFiler: 1360000,
    possessionFee: 140000,
    remarks: '3rd & 4th Balloting Corporate & Plaza Plots',
  },
];

export const OFFICIAL_DEVELOPMENT_SCHEDULE = BALLOTING_3_AND_4_SCHEDULE;

export const DevelopmentCharges: React.FC = () => {
  // Balloting Phase Selection State (1st, 2nd, 3rd, 4th)
  const [selectedBalloting, setSelectedBalloting] = useState<BallotingPhase>('3rd');

  // Calculator State
  const [selectedSize, setSelectedSize] = useState<string>('10 Marla');
  const [paidInstallments, setPaidInstallments] = useState<number>(4);
  const [isFiler, setIsFiler] = useState<boolean>(true);
  const [hasSurcharge, setHasSurcharge] = useState<boolean>(false);
  const [surchargeMonths, setSurchargeMonths] = useState<number>(3);
  const [activeSubTab, setActiveSubTab] = useState<'calculator' | 'schedule' | 'comparison' | 'procedure' | 'faq'>('calculator');
  const [isCopiedSummary, setIsCopiedSummary] = useState(false);

  // Active Schedule based on Balloting Phase
  const activeSchedule = useMemo(() => {
    if (selectedBalloting === '1st' || selectedBalloting === '2nd') {
      return BALLOTING_1_AND_2_SCHEDULE;
    }
    return BALLOTING_3_AND_4_SCHEDULE;
  }, [selectedBalloting]);

  const selectedRow = useMemo(() => {
    return activeSchedule.find((s) => s.size === selectedSize) || activeSchedule[1];
  }, [activeSchedule, selectedSize]);

  // Calculations
  const totalDev = selectedRow.totalCharges;
  const singleInstallment = selectedRow.quarterlyInstallment;
  const amountPaid = Math.min(paidInstallments * singleInstallment, totalDev);
  const remainingDev = Math.max(totalDev - amountPaid, 0);
  
  // LDA Late payment surcharge is typically 1.5% per month on overdue installments
  const overdueInstallments = Math.max(selectedRow.totalInstallments - paidInstallments, 0);
  const calculatedSurcharge = hasSurcharge && remainingDev > 0
    ? Math.round(remainingDev * 0.015 * surchargeMonths)
    : 0;

  const transferFee = isFiler ? selectedRow.transferFeeFiler : selectedRow.transferFeeNonFiler;
  const netPayableToClear = remainingDev + calculatedSurcharge;
  const totalAllInCost = netPayableToClear + transferFee + selectedRow.possessionFee;

  const whatsappInquiryText = `Hello Kashpal Enterprises, I am checking the official LDA City Development Charges breakdown on your portal:
• Balloting Phase: ${selectedBalloting} Balloting
• Plot Size: ${selectedRow.size} (${selectedRow.category})
• Total Approved Dev Charges: ${formatPKR(totalDev)}
• Paid Installments: ${paidInstallments} of ${selectedRow.totalInstallments} (${formatPKR(amountPaid)})
• Remaining Dues: ${formatPKR(remainingDev)}
• Estimated Surcharge: ${formatPKR(calculatedSurcharge)}
• Total Payable for NOC / Clearance: ${formatPKR(netPayableToClear)}
Please guide me on the e-Challan generation and official LDA One-Window transfer process.`;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in text-slate-100">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#1C2541] via-[#0B132B] to-[#1C2541] border border-[#D4AF37]/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-black uppercase tracking-widest mb-2">
              <Landmark className="w-4 h-4" />
              <span>LDA City Lahore • Official Directorate Portal</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              LDA City Development Charges &amp; Schedule
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Complete official development charges breakdown, quarterly installment schedules, LDA transfer fee structure, and dues calculator for Jinnah Sector, Iqbal Sector, and Commercial corridors.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={generateWhatsAppLink('03001535898', whatsappInquiryText)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-xs shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Challan Verification Help</span>
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-3 rounded-xl bg-[#0B132B] hover:bg-[#111A35] text-slate-300 border border-slate-700 hover:border-[#D4AF37]/40 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>Print Schedule</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveSubTab('calculator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'calculator'
                ? 'bg-[#D4AF37] text-[#0B132B] shadow-lg font-black'
                : 'bg-[#0B132B] text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Dues &amp; Surcharge Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'schedule'
                ? 'bg-[#D4AF37] text-[#0B132B] shadow-lg font-black'
                : 'bg-[#0B132B] text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Official LDA Charges Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('comparison')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'comparison'
                ? 'bg-[#D4AF37] text-[#0B132B] shadow-lg font-black'
                : 'bg-[#0B132B] text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1st, 2nd, 3rd &amp; 4th Balloting Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('procedure')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'procedure'
                ? 'bg-[#D4AF37] text-[#0B132B] shadow-lg font-black'
                : 'bg-[#0B132B] text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>e-Challan &amp; Bank Payment Guide</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('faq')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'faq'
                ? 'bg-[#D4AF37] text-[#0B132B] shadow-lg font-black'
                : 'bg-[#0B132B] text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>LDA Rules &amp; Surcharge Waivers</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: INTERACTIVE DUES & SURCHARGE CALCULATOR                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-6 bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
            {/* Step 0: Balloting Phase Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block">
                  Step 1: Select Balloting Phase
                </span>
                <span className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-mono">
                  {selectedBalloting === '1st' || selectedBalloting === '2nd' ? 'Phase 1 Initial Rates' : 'Official Revised Rates'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['1st', '2nd', '3rd', '4th'] as BallotingPhase[]).map((phase) => (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => setSelectedBalloting(phase)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      selectedBalloting === phase
                        ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-md font-black'
                        : 'bg-[#0B132B] text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div>{phase} Balloting</div>
                    <div className={`text-[9px] mt-0.5 ${selectedBalloting === phase ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                      {phase === '1st' || phase === '2nd' ? '5M: 6.5 Lakh' : '5M: 8.0 Lakh'}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-300 mt-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                {selectedBalloting === '1st' || selectedBalloting === '2nd' ? (
                  <span>🔹 <strong>1st &amp; 2nd Balloting:</strong> Original Phase-1 baseline charges (5M: Rs. 650,000, 10M: Rs. 1,100,000, 1 Kanal: Rs. 1,800,000, 2 Kanal: Rs. 3,600,000).</span>
                ) : (
                  <span>🔹 <strong>3rd &amp; 4th Balloting:</strong> Revised LDA development rates (5M: Rs. 800,000, 10M: Rs. 1,400,000, 1 Kanal: Rs. 2,300,000, 2 Kanal: Rs. 3,600,000).</span>
                )}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block mb-1">
                Step 2: Select Plot Category &amp; Size
              </span>
              <h3 className="text-lg font-bold text-white">
                Plot Category &amp; Approved Tariff
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {activeSchedule.map((item) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => setSelectedSize(item.size)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedSize === item.size
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                      : 'bg-[#0B132B] border-slate-700/80 hover:border-slate-500 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-black">{item.size}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{item.category}</span>
                  <span className="text-[11px] font-mono font-bold text-[#D4AF37] mt-2 block">
                    {formatPKR(item.totalCharges)}
                  </span>
                </button>
              ))}
            </div>

            {/* Installments Paid Slider / Selector */}
            <div className="pt-4 border-t border-slate-700/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">
                  Quarterly Installments Paid:
                </span>
                <span className="text-sm font-black font-mono text-[#D4AF37] bg-[#0B132B] px-3 py-1 rounded-xl border border-[#D4AF37]/30">
                  {paidInstallments} / {selectedRow.totalInstallments} Quarters
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={selectedRow.totalInstallments}
                step={1}
                value={paidInstallments}
                onChange={(e) => setPaidInstallments(parseInt(e.target.value))}
                className="w-full h-2 bg-[#0B132B] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />

              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                <span>0 (Unpaid / Full Due)</span>
                <span>4 (Half Paid)</span>
                <span>8 (100% Cleared)</span>
              </div>
            </div>

            {/* Filer Status & Surcharge Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-700/80">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tax Filer Status (for LDA Transfer)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFiler(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                      isFiler
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-[#0B132B] border-slate-700 text-slate-400'
                    }`}
                  >
                    Active Filer (3%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFiler(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                      !isFiler
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : 'bg-[#0B132B] border-slate-700 text-slate-400'
                    }`}
                  >
                    Non-Filer (7%-10%)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Overdue Late Surcharge?
                </label>
                <button
                  type="button"
                  onClick={() => setHasSurcharge(!hasSurcharge)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                    hasSurcharge
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                      : 'bg-[#0B132B] border-slate-700 text-slate-400'
                  }`}
                >
                  {hasSurcharge ? '⚠️ Apply Late Surcharge' : '✓ No Surcharge (On Time / Amnesty)'}
                </button>
              </div>
            </div>

            {hasSurcharge && (
              <div className="p-3 bg-[#0B132B] rounded-xl border border-rose-500/30 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300">Months Overdue:</span>
                  <span className="font-bold text-rose-400">{surchargeMonths} Months</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={surchargeMonths}
                  onChange={(e) => setSurchargeMonths(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  LDA computes late surcharge at 1.5% per month on overdue installments.
                </p>
              </div>
            )}
          </div>

          {/* Ledger Calculation Breakdown Card */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#1C2541] via-[#111A35] to-[#0B132B] border border-[#D4AF37]/60 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/80">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Official Financial Computation
                  </span>
                  <h3 className="text-2xl font-black text-white mt-0.5">
                    {selectedRow.size} Ledger Statement
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-xl border border-[#D4AF37]/40">
                  {selectedRow.category}
                </span>
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-3 py-5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Total Approved Development Charges:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatPKRFull(totalDev)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Quarterly Installment Amount (8 Installments):</span>
                  <span className="font-mono text-slate-200">
                    {formatPKRFull(singleInstallment)} / Qtr
                  </span>
                </div>

                <div className="flex items-center justify-between text-emerald-400">
                  <span>Amount Paid ({paidInstallments} Quarters):</span>
                  <span className="font-mono font-bold">
                    - {formatPKRFull(amountPaid)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-amber-400 pt-2 border-t border-slate-800">
                  <span className="font-semibold">Remaining Development Dues:</span>
                  <span className="font-mono font-bold text-base">
                    {formatPKRFull(remainingDev)}
                  </span>
                </div>

                {calculatedSurcharge > 0 && (
                  <div className="flex items-center justify-between text-rose-400">
                    <span>Estimated Late Surcharge ({surchargeMonths} mos @ 1.5%):</span>
                    <span className="font-mono font-bold">
                      + {formatPKRFull(calculatedSurcharge)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-800">
                  <span>LDA Official Transfer Fee ({isFiler ? 'Filer' : 'Non-Filer'}):</span>
                  <span className="font-mono">
                    {formatPKRFull(transferFee)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Possession &amp; Demarcation Certificate Fee:</span>
                  <span className="font-mono">
                    {formatPKRFull(selectedRow.possessionFee)}
                  </span>
                </div>
              </div>

              {/* Highlight Net Payable Box */}
              <div className="bg-[#0B132B]/90 border border-[#D4AF37] rounded-2xl p-5 my-2 shadow-inner">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs uppercase font-extrabold text-[#D4AF37] tracking-wider">
                    Total Required for LDA NOC / Clearance:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-[#D4AF37]">
                    {formatPKRFull(netPayableToClear)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {remainingDev === 0 ? (
                    <span className="text-emerald-400 font-semibold">
                      ✓ All development dues are 100% paid. This plot is fully eligible for Immediate Possession &amp; LDA Registry Transfer.
                    </span>
                  ) : (
                    <span>
                      Payable via e-Challan at National Bank of Pakistan (NBP) or Bank of Punjab (BOP) prior to transfer appointment.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-700/80 flex flex-col sm:flex-row gap-3">
              <a
                href={generateWhatsAppLink('03001535898', whatsappInquiryText)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Verify Dues on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsappInquiryText);
                  setIsCopiedSummary(true);
                  setTimeout(() => setIsCopiedSummary(false), 2000);
                }}
                className="py-3 px-4 rounded-xl bg-[#0B132B] hover:bg-[#111A35] text-slate-200 border border-slate-700 hover:border-[#D4AF37] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4 text-[#D4AF37]" />
                <span>{isCopiedSummary ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: OFFICIAL LDA CHARGES SCHEDULE TABLE                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedule' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">
                Approved Regulatory Tariff
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                LDA City Lahore Master Development Schedule
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Official rates published by Lahore Development Authority for Phase-1 (Jinnah Sector &amp; Iqbal Sector).
              </p>
            </div>

            {/* Balloting Phase Filter Switcher for Table */}
            <div className="flex items-center gap-1.5 bg-[#0B132B] p-1.5 rounded-2xl border border-slate-700">
              {(['1st', '2nd', '3rd', '4th'] as BallotingPhase[]).map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setSelectedBalloting(phase)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedBalloting === phase
                      ? 'bg-[#D4AF37] text-slate-950 font-black shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {phase} Balloting
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D4AF37]/40 bg-[#0B132B]/80 text-[#D4AF37] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Plot Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 font-mono">Total Dev Charges</th>
                  <th className="py-3 px-4 font-mono">Quarterly (8 Inst.)</th>
                  <th className="py-3 px-4 font-mono">Transfer Fee (Filer)</th>
                  <th className="py-3 px-4 font-mono">Possession Fee</th>
                  <th className="py-3 px-4">Balloting Phase &amp; Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {activeSchedule.map((row, idx) => (
                  <tr
                    key={row.size}
                    className={`hover:bg-[#111A35] transition-colors ${
                      idx % 2 === 0 ? 'bg-[#0B132B]/30' : 'bg-[#1C2541]/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                      <span>{row.size}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.category === 'Commercial'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-[#D4AF37]">
                      {formatPKR(row.totalCharges)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {formatPKR(row.quarterlyInstallment)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {formatPKR(row.transferFeeFiler)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {formatPKR(row.possessionFee)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {selectedBalloting} Balloting • {row.remarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B132B] border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-amber-400">Notice for 3rd &amp; 4th Balloting Plot Holders:</strong> LDA City announced revised development charges for 3rd and 4th balloting (5 Marla: Rs. 8 Lakh, 10 Marla: Rs. 14 Lakh, 1 Kanal: Rs. 23 Lakh, 2 Kanal: Rs. 36 Lakh). Early 1st &amp; 2nd balloting files continue on the initial schedule (5 Marla: Rs. 6.5 Lakh, 10 Marla: Rs. 11 Lakh, 1 Kanal: Rs. 18 Lakh).
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2B: 1ST, 2ND, 3RD & 4TH BALLOTING COMPARISON MATRIX               */}
      {/* ========================================================================= */}
      {activeSubTab === 'comparison' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">
              Comparative Analysis
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              1st &amp; 2nd Balloting vs 3rd &amp; 4th Balloting Charges Comparison
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Direct side-by-side comparison of development charges and quarterly installments between LDA City balloting phases.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D4AF37]/40 bg-[#0B132B]/80 text-[#D4AF37] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Plot Size</th>
                  <th className="py-3.5 px-4">1st &amp; 2nd Balloting Total</th>
                  <th className="py-3.5 px-4">1st &amp; 2nd Quarterly (8 Inst.)</th>
                  <th className="py-3.5 px-4 text-emerald-400">3rd &amp; 4th Balloting Total</th>
                  <th className="py-3.5 px-4 text-emerald-400">3rd &amp; 4th Quarterly (8 Inst.)</th>
                  <th className="py-3.5 px-4 text-amber-300">Net Difference</th>
                  <th className="py-3.5 px-4 text-right">Calculate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {[
                  {
                    size: '5 Marla',
                    cat: 'Residential',
                    b12Total: 650000,
                    b12Qtr: 81250,
                    b34Total: 800000,
                    b34Qtr: 100000,
                    diff: '+ Rs. 150,000 (+1.5 Lakh)',
                  },
                  {
                    size: '10 Marla',
                    cat: 'Residential',
                    b12Total: 1100000,
                    b12Qtr: 137500,
                    b34Total: 1400000,
                    b34Qtr: 175000,
                    diff: '+ Rs. 300,000 (+3.0 Lakh)',
                  },
                  {
                    size: '1 Kanal',
                    cat: 'Residential',
                    b12Total: 1800000,
                    b12Qtr: 225000,
                    b34Total: 2300000,
                    b34Qtr: 287500,
                    diff: '+ Rs. 500,000 (+5.0 Lakh)',
                  },
                  {
                    size: '2 Kanal',
                    cat: 'Residential',
                    b12Total: 3600000,
                    b12Qtr: 450000,
                    b34Total: 3600000,
                    b34Qtr: 450000,
                    diff: 'Same (Uniform Rs. 36 Lakh)',
                  },
                  {
                    size: '4 Marla Commercial',
                    cat: 'Commercial',
                    b12Total: 3500000,
                    b12Qtr: 437500,
                    b34Total: 4200000,
                    b34Qtr: 525000,
                    diff: '+ Rs. 700,000 (+7.0 Lakh)',
                  },
                  {
                    size: '8 Marla Commercial',
                    cat: 'Commercial',
                    b12Total: 6000000,
                    b12Qtr: 750000,
                    b34Total: 7200000,
                    b34Qtr: 900000,
                    diff: '+ Rs. 1,200,000 (+12.0 Lakh)',
                  },
                ].map((row, idx) => (
                  <tr
                    key={row.size}
                    className={`hover:bg-[#111A35] transition-colors ${
                      idx % 2 === 0 ? 'bg-[#0B132B]/30' : 'bg-[#1C2541]/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div>{row.size}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{row.cat}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                      {formatPKR(row.b12Total)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {formatPKR(row.b12Qtr)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-emerald-400">
                      {formatPKR(row.b34Total)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-300">
                      {formatPKR(row.b34Qtr)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-amber-300 text-[11px]">
                      {row.diff}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBalloting('1st');
                            setSelectedSize(row.size);
                            setActiveSubTab('calculator');
                          }}
                          className="px-2 py-1 rounded bg-[#0B132B] hover:bg-[#132b4f] text-[#D4AF37] border border-[#D4AF37]/40 text-[10px] font-bold cursor-pointer"
                          title="Calculate using 1st & 2nd Balloting rates"
                        >
                          1st/2nd
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBalloting('3rd');
                            setSelectedSize(row.size);
                            setActiveSubTab('calculator');
                          }}
                          className="px-2 py-1 rounded bg-[#D4AF37] hover:bg-[#c49d2b] text-slate-950 text-[10px] font-black cursor-pointer"
                          title="Calculate using 3rd & 4th Balloting rates"
                        >
                          3rd/4th
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: E-CHALLAN & BANK PAYMENT PROCEDURE                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'procedure' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="max-w-3xl">
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">
              Official Payment Channels
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              How to Deposit LDA City Development Charges
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Follow these simple steps to generate an official LDA e-Challan and deposit dues through authorized commercial banks or digital banking apps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B132B] border border-slate-700 rounded-2xl p-5 relative">
              <span className="w-7 h-7 rounded-full bg-[#D4AF37] text-slate-950 font-black text-xs flex items-center justify-center mb-3">
                1
              </span>
              <h4 className="text-sm font-bold text-white mb-1.5">
                Generate Official e-Challan
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Visit the LDA official web portal (<a href="https://lda.gop.pk" target="_blank" rel="noreferrer" className="text-[#D4AF37] underline">lda.gop.pk</a>) or visit the LDA One Window Cell (Johar Town / LDA City site office). Enter your File Number or Plot Allocation Number to generate the 3-part bank challan with 1Bill Consumer Number.
              </p>
            </div>

            <div className="bg-[#0B132B] border border-slate-700 rounded-2xl p-5 relative">
              <span className="w-7 h-7 rounded-full bg-[#D4AF37] text-slate-950 font-black text-xs flex items-center justify-center mb-3">
                2
              </span>
              <h4 className="text-sm font-bold text-white mb-1.5">
                Deposit at Authorized Banks
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pay across counter at any designated branch of:
                <span className="block mt-1 font-semibold text-slate-200">• National Bank of Pakistan (NBP)</span>
                <span className="block font-semibold text-slate-200">• The Bank of Punjab (BOP)</span>
                <span className="block font-semibold text-slate-200">• Allied Bank (ABL)</span>
                <span className="block font-semibold text-slate-200">• 1Link / 1Bill Mobile Banking Apps</span>
              </p>
            </div>

            <div className="bg-[#0B132B] border border-slate-700 rounded-2xl p-5 relative">
              <span className="w-7 h-7 rounded-full bg-[#D4AF37] text-slate-950 font-black text-xs flex items-center justify-center mb-3">
                3
              </span>
              <h4 className="text-sm font-bold text-white mb-1.5">
                Collect Clearance Receipt (NOC)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Keep the stamped bank challan copy safe. Within 48 hours of payment, the credit reflects in the LDA Central Database, allowing you to download your official Dues Clearance Certificate required for transfer.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#111A35] to-[#0B132B] border border-[#D4AF37]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Need Assistance Generating Your LDA e-Challan?</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Our site office consultants on 180 Ft Main Boulevard can generate your official challan and verify pending dues.
              </p>
            </div>
            <a
              href={generateWhatsAppLink('03001535898', 'Hello Kashpal Enterprises, please help me generate and verify my LDA City Development Charges e-Challan.')}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors whitespace-nowrap"
            >
              Contact Consultant Desk
            </a>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: LDA RULES & SURCHARGE WAIVERS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'faq' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          <div className="max-w-3xl mb-4">
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">
              Frequently Asked Questions
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Official LDA City Development Policies &amp; FAQs
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                <span>Can an LDA City plot be transferred if development charges are unpaid?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed pl-6">
                In LDA City, transfer rules require clearing dues according to the installment schedule active at the time of transfer. Buyers and sellers can mutually agree for the buyer to assume remaining upcoming quarterly installments, provided no overdue surcharge exists.
              </p>
            </div>

            <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                <span>Does the Government of Punjab or LDA offer late surcharge waivers?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed pl-6">
                Yes, LDA periodically announces surcharge amnesty schemes (usually granting a 50% to 100% waiver on accumulated late payment markups) to encourage allottees to clear remaining development installments. Contact our office to check if an active waiver window is currently running.
              </p>
            </div>

            <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                <span>When can I apply for physical plot possession and building demarcation?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed pl-6">
                Physical possession is granted in sectors where on-ground infrastructure (water supply, underground electricity, carpeted roads, sewerage) is 100% completed (e.g. Jinnah Sector Blocks A, B, C, D, G, J, etc.). Full clearance of 100% development charges is a prerequisite for receiving possession letter and construction approval.
              </p>
            </div>

            <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                <span>What are the LDA transfer fees for Filers vs Non-Filers?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed pl-6">
                For 5 Marla, transfer charges are Rs. 65,000 for Filers (Rs. 130,000 for Non-Filers). For 10 Marla, Rs. 110,000 (Filer) / Rs. 220,000 (Non-Filer). For 1 Kanal, Rs. 195,000 (Filer) / Rs. 390,000 (Non-Filer). Additionally, FBR Section 236K advance tax applies (3% for active tax filers vs 7% to 10.5% for non-filers).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
