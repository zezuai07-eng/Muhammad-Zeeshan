import React, { useState } from 'react';
import { 
  FileCheck, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Building, 
  Clock, 
  Layers, 
  FileText, 
  Award, 
  Sparkles,
  Download,
  PhoneCall
} from 'lucide-react';
import { FILE_VERIFICATION_DATABASE, LDA_SECTOR_STATS, DEVELOPMENT_CHARGES_RATES } from '../data/mockData';
import { FileVerificationRecord } from '../types';
import { formatPKR, generateWhatsAppLink } from '../utils/formatters';

export const LdaCityHub: React.FC = () => {
  const [searchFileNumber, setSearchFileNumber] = useState('');
  const [verificationResult, setVerificationResult] = useState<FileVerificationRecord | null | 'NOT_FOUND'>(null);
  const [selectedSizeForCharges, setSelectedSizeForCharges] = useState<keyof typeof DEVELOPMENT_CHARGES_RATES>('1 Kanal');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchFileNumber.trim()) return;

    const query = searchFileNumber.trim().toUpperCase();
    const found = FILE_VERIFICATION_DATABASE.find(
      (f) => f.fileNumber.toUpperCase().includes(query) || f.barCode.toUpperCase().includes(query)
    );

    if (found) {
      setVerificationResult(found);
    } else {
      setVerificationResult('NOT_FOUND');
    }
  };

  const sampleFiles = ['KP-LDA-2023-9018', 'KP-LDA-2023-7721', 'KP-LDA-COMM-0044'];

  return (
    <div id="lda-city-hub-section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2541] border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37] mb-3">
          <Award className="w-3.5 h-3.5" />
          <span>Official LDA City Regulatory Desk</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          LDA City Lahore Information Hub &amp; Verification
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Verify plot file registration, inspect on-ground sector development progress, and compute official development charges.
        </p>
      </div>

      {/* 1. File Verification Lookup UI */}
      <div className="bg-gradient-to-br from-[#1C2541] to-[#0B132B] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="max-w-2xl mx-auto text-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            <span>Official File &amp; Intimation Verification Portal</span>
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Enter your Kashpal reference file number or LDA barcode to authenticate legal status and allocation ledger.
          </p>

          <form onSubmit={handleVerify} className="mt-5 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="e.g. KP-LDA-2023-9018 or LDA-PK-..."
                value={searchFileNumber}
                onChange={(e) => setSearchFileNumber(e.target.value)}
                className="w-full bg-[#0B132B] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Verify Ledger
            </button>
          </form>

          {/* Sample quick tokens */}
          <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span>Quick Samples:</span>
            {sampleFiles.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setSearchFileNumber(num);
                  const found = FILE_VERIFICATION_DATABASE.find((f) => f.fileNumber === num);
                  if (found) setVerificationResult(found);
                }}
                className="text-[#D4AF37] hover:underline font-mono text-[10px] bg-[#0B132B] px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Certificate Card Display */}
        {verificationResult && verificationResult !== 'NOT_FOUND' && (
          <div className="max-w-2xl mx-auto bg-[#0B132B] border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    Authentic Verified Record
                  </div>
                  <h4 className="text-base font-bold text-white font-mono">
                    {verificationResult.fileNumber}
                  </h4>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-700 font-semibold">
                  {verificationResult.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#1C2541]/50 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Registered Allottee</span>
                <span className="text-white font-bold">{verificationResult.ownerName}</span>
              </div>
              <div className="bg-[#1C2541]/50 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Plot Dimension</span>
                <span className="text-[#D4AF37] font-bold">{verificationResult.plotSize}</span>
              </div>
              <div className="bg-[#1C2541]/50 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Allocated Sector</span>
                <span className="text-white font-semibold">
                  {verificationResult.sector} ({verificationResult.block})
                </span>
              </div>
              <div className="bg-[#1C2541]/50 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Registration Date</span>
                <span className="text-white font-semibold">{verificationResult.registrationDate}</span>
              </div>
              <div className="bg-[#1C2541]/50 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Dues Clearance</span>
                <span className={verificationResult.duesCleared ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {verificationResult.duesCleared ? '100% Cleared' : 'Pending Verification'}
                </span>
              </div>
              <div className="bg-[#1C2541]/50 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Digital Barcode</span>
                <span className="text-slate-300 font-mono text-[10px]">{verificationResult.barCode}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Verified through Kashpal Enterprises One-Window Liaison</span>
              <a
                href={generateWhatsAppLink(
                  '03001535898',
                  `Hello Kashpal Enterprises, I verified File #${verificationResult.fileNumber} on your portal and want to request the transfer paperwork.`
                )}
                target="_blank"
                rel="noreferrer"
                className="text-[#D4AF37] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Request Transfer Papers</span>
              </a>
            </div>
          </div>
        )}

        {verificationResult === 'NOT_FOUND' && (
          <div className="max-w-md mx-auto bg-[#0B132B] border border-rose-500/50 rounded-2xl p-5 text-center text-xs">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Record Not Found in Immediate Cache</h4>
            <p className="text-slate-400 mt-1 mb-3">
              This file number was not found in our live active registry. Contact our LDA desk at 03001535898 for manual verification with LDA records.
            </p>
            <a
              href={generateWhatsAppLink('03001535898', `Hello, please verify file number ${searchFileNumber} directly from LDA records.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-rose-950 text-rose-300 border border-rose-800 px-3 py-1.5 rounded-xl font-semibold"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Contact Senior Verification Officer</span>
            </a>
          </div>
        )}
      </div>

      {/* 2. Balloting Tracker & Sector Development Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Balloting Tracker */}
        <div className="bg-[#1C2541]/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
              <span>Official Balloting Milestones</span>
            </h3>
            <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-1 rounded-full font-bold uppercase">
              Phase 1 &amp; 2 Balloted
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0B132B] border-l-4 border-emerald-500 border border-slate-800">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-white">Phase 1 Grand Balloting</h4>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold">
                  Completed &amp; Possessions Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Covered Jinnah Sector (Blocks A–Q) and Iqbal Sector (Blocks AA, BB, CC). On-ground physical peg markers demarcated. Houses currently under active construction.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0B132B] border-l-4 border-[#D4AF37] border border-slate-800">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-white">Commercial Boulevard 180 Ft Ballot</h4>
                <span className="text-[10px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded font-bold">
                  Completed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                4 Marla &amp; 8 Marla commercial plots along the main avenue opposite Kashpal Enterprises site office allocated with high-rise NOC permissions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0B132B] border-l-4 border-cyan-500 border border-slate-800">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-white">Upcoming 2026 Phase 3 Ballot</h4>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded font-bold">
                  Files Eligible
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sectors D, E, J &amp; Q file holders eligible. Kashpal Enterprises provides guaranteed submission assistance for all our file clients.
              </p>
            </div>
          </div>
        </div>

        {/* Development Charges Breakdown Tool */}
        <div className="bg-[#1C2541]/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              <span>LDA Development Charges Calculator</span>
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Official Schedule
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-4">
            Select your plot category to review the official LDA development charge schedule and installment quota:
          </p>

          {/* Size Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.keys(DEVELOPMENT_CHARGES_RATES).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSizeForCharges(sz as any)}
                className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                  selectedSizeForCharges === sz
                    ? 'bg-[#D4AF37] text-[#0B132B] border-[#D4AF37]'
                    : 'bg-[#0B132B] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Charges Calculated Output */}
          <div className="bg-[#0B132B] p-4 rounded-xl border border-[#D4AF37]/30 text-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400">Total Official Charges:</span>
              <span className="text-base font-extrabold text-[#D4AF37] font-mono">
                {formatPKR(DEVELOPMENT_CHARGES_RATES[selectedSizeForCharges])}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Quarterly Installment (8 Quarters):</span>
              <span className="text-white font-mono font-semibold">
                {formatPKR(DEVELOPMENT_CHARGES_RATES[selectedSizeForCharges] / 8)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Coverage:</span>
              <span className="text-emerald-400 font-medium">Underground Wiring, Sewerage, Roads</span>
            </div>
          </div>

          {/* Sector Progress Bars */}
          <div className="mt-4 pt-3 border-t border-slate-700/60">
            <div className="text-xs font-bold text-slate-300 mb-2">On-Ground Sector Progress:</div>
            <div className="space-y-2">
              {LDA_SECTOR_STATS.slice(0, 3).map((sec, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>{sec.sector}</span>
                    <span className="font-mono text-[#D4AF37]">{sec.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#D4AF37] to-emerald-400 h-1.5 rounded-full"
                      style={{ width: `${sec.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
