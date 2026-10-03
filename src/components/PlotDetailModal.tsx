import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  Calendar, 
  Layers, 
  CheckCircle, 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  Compass, 
  Clock, 
  Send,
  Building,
  User,
  Share2
} from 'lucide-react';
import { PlotRecord, LeadRecord } from '../types';
import { formatPKR, formatPKRFull, generateWhatsAppLink } from '../utils/formatters';
import { COMPANY_DETAILS } from '../data/mockData';

interface PlotDetailModalProps {
  plot: PlotRecord | null;
  onClose: () => void;
  onLocateOnMap: (plot: PlotRecord) => void;
  onAddLead: (lead: LeadRecord) => void;
}

export const PlotDetailModal: React.FC<PlotDetailModalProps> = ({
  plot,
  onClose,
  onLocateOnMap,
  onAddLead,
}) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadMessage, setLeadMessage] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'booking'>('overview');

  if (!plot) return null;

  const activePhone = plot.sellerPhone || '03001535898';
  const activeWhatsapp = plot.sellerWhatsapp || plot.sellerPhone || '03001535898';

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadPhone) return;

    const newLead: LeadRecord = {
      id: `LEAD-${Date.now()}`,
      fullName: leadName,
      phone: leadPhone,
      plotId: plot.id,
      plotDetails: `${plot.sector}, ${plot.block}, ${plot.type} #${plot.plotNumber} (${plot.size})`,
      message: leadMessage || 'Inquiring for site visit and payment breakdown.',
      inquiryType: 'Site Visit',
      date: new Date().toISOString().split('T')[0],
      status: 'New',
    };

    onAddLead(newLead);
    setLeadSubmitted(true);
  };

  const whatsappMessage = `Hello ${plot.agencyName || 'Kashpal Enterprises'}, I would like to inquire about ${plot.type} #${plot.plotNumber} (${plot.size}) located in ${plot.sector}, ${plot.block} priced at ${formatPKR(plot.price)}. File Reference: ${plot.fileNumber || 'Direct Deal'}. Please share details.`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-[#0B132B]/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-[#0B132B] border border-[#D4AF37]/40 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1C2541] border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                plot.status === 'Available'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                  : plot.status === 'Reserved'
                  ? 'bg-amber-950 text-amber-400 border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {plot.status}
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Plot #{plot.plotNumber}</span>
                <span className="text-xs font-normal text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                  {plot.size}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {plot.society} • {plot.sector} ({plot.block})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onLocateOnMap(plot);
                onClose();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B132B] border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-semibold cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Locate on Geo-Map</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="flex border-b border-slate-800 bg-[#111A35]/80 px-6 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#D4AF37] text-white'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Overview &amp; Specs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'payment'
                ? 'border-[#D4AF37] text-white'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Payment Schedule Breakdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('booking')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'booking'
                ? 'border-[#D4AF37] text-white'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Schedule Site Visit / Reserve
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Image Gallery */}
              <div className="space-y-3">
                <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-700 relative">
                  <img
                    src={plot.images[selectedImageIdx] || plot.images[0]}
                    alt={plot.plotNumber}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-[#0B132B]/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-[#D4AF37] border border-[#D4AF37]/30">
                    Demand: {formatPKRFull(plot.price)} ({formatPKR(plot.price)})
                  </div>
                </div>

                {plot.images.length > 1 && (
                  <div className="flex gap-2">
                    {plot.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`h-16 w-24 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedImageIdx === idx
                            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30'
                            : 'border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Specifications Matrix */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cadastral Property Specifications</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#1C2541]/70 p-4 rounded-xl border border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Type</span>
                    <span className="text-white font-bold text-sm">{plot.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Size</span>
                    <span className="text-white font-bold text-sm">{plot.size}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Dimensions</span>
                    <span className="text-white font-bold">{plot.dimensions}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Facing</span>
                    <span className="text-white font-semibold">{plot.facing}</span>
                  </div>

                  {plot.bedrooms && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-medium">Bedrooms</span>
                      <span className="text-emerald-400 font-bold">{plot.bedrooms}</span>
                    </div>
                  )}

                  {plot.bathrooms && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-medium">Baths</span>
                      <span className="text-emerald-400 font-bold">{plot.bathrooms}</span>
                    </div>
                  )}

                  {plot.fileStatus && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase font-medium">File Status</span>
                      <span className="text-[#D4AF37] font-semibold">{plot.fileStatus}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Corridor Road</span>
                    <span className="text-white font-semibold">{plot.roadWidth}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Seller / Agency</span>
                    <span className="text-[#D4AF37] font-semibold truncate block">{plot.agencyName || plot.sellerName || 'Kashpal Enterprises'}</span>
                  </div>
                </div>
              </div>

              {/* Video Tour if provided */}
              {plot.videoUrl && (
                <div className="p-4 rounded-xl bg-[#1C2541]/70 border border-[#D4AF37]/30">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="text-rose-500">▶</span>
                    <span>Video Tour Available</span>
                  </h4>
                  <a
                    href={plot.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    <span>Watch Full Property Video Tour →</span>
                  </a>
                </div>
              )}

              {/* Key Features Pill List */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Prime Strategic Highlights</h3>
                <div className="flex flex-wrap gap-2">
                  {plot.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C2541] border border-slate-700 text-xs text-slate-200 font-medium"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-white mb-1.5">Executive Summary</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-[#1C2541]/40 p-4 rounded-xl border border-slate-800">
                  {plot.description}
                </p>
              </div>
            </>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Amortization &amp; Financial Structure</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Structured installment schedules designed for local and overseas Pakistani investors.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#1C2541] p-4 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Demand</span>
                  <div className="text-lg font-bold text-white mt-1 font-mono">{formatPKRFull(plot.price)}</div>
                  <span className="text-xs text-[#D4AF37]">{formatPKR(plot.price)}</span>
                </div>
                <div className="bg-[#1C2541] p-4 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Down Payment (20%)</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                    {formatPKRFull(plot.paymentPlan.downPayment)}
                  </div>
                  <span className="text-xs text-slate-400">At time of booking agreement</span>
                </div>
                <div className="bg-[#1C2541] p-4 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Monthly Installment</span>
                  <div className="text-lg font-bold text-[#D4AF37] mt-1 font-mono">
                    {formatPKRFull(plot.paymentPlan.monthlyInstallments)}
                  </div>
                  <span className="text-xs text-slate-400">For {plot.paymentPlan.numberOfInstallments} months</span>
                </div>
              </div>

              {/* Development Charges Status */}
              <div className="bg-[#111A35] p-4 rounded-xl border border-[#D4AF37]/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">LDA Development Charges</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {plot.paymentPlan.developmentChargesIncluded
                      ? 'Already paid and included in total price quoted.'
                      : 'Payable directly to LDA as per scheduled installments.'}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      plot.paymentPlan.developmentChargesIncluded
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                        : 'bg-amber-950 text-amber-400 border-amber-700'
                    }`}
                  >
                    {plot.paymentPlan.developmentChargesIncluded ? 'Charges Paid' : 'Charges Due to LDA'}
                  </span>
                  {plot.paymentPlan.developmentChargesAmount && (
                    <div className="text-[11px] text-slate-300 mt-1">
                      Amount: {formatPKR(plot.paymentPlan.developmentChargesAmount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Installment Table Preview */}
              <div className="border border-slate-700 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#1C2541] text-slate-300 font-bold border-b border-slate-700">
                    <tr>
                      <th className="p-3">Milestone Stage</th>
                      <th className="p-3">Percentage</th>
                      <th className="p-3">Amount (PKR)</th>
                      <th className="p-3">Due Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr>
                      <td className="p-3 font-medium text-white">Initial Token &amp; Agreement</td>
                      <td className="p-3">20%</td>
                      <td className="p-3 font-mono text-emerald-400">{formatPKRFull(plot.paymentPlan.downPayment)}</td>
                      <td className="p-3">Immediate Escrow</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Monthly Installments (24x)</td>
                      <td className="p-3">70%</td>
                      <td className="p-3 font-mono">{formatPKRFull(plot.price * 0.7)}</td>
                      <td className="p-3">Monthly cycle</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Possession &amp; Peg Handover</td>
                      <td className="p-3">10%</td>
                      <td className="p-3 font-mono text-[#D4AF37]">{formatPKRFull(plot.price * 0.1)}</td>
                      <td className="p-3">At physical demarcation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'booking' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Schedule Site Visit &amp; Token Reservation</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Our senior field consultants will guide you on-ground at 180 Ft LDA Road, Gajjumata, Lahore.
                </p>
              </div>

              {leadSubmitted ? (
                <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white">Inquiry Successfully Dispatched!</h4>
                  <p className="text-xs text-emerald-200 mt-1 mb-4">
                    Our Senior LDA Consultant has received your request for Plot #{plot.plotNumber}. We will contact you at {leadPhone} shortly.
                  </p>
                  <a
                    href={generateWhatsAppLink('03001535898', whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Open WhatsApp Chat Now</span>
                  </a>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4 bg-[#1C2541]/60 p-5 rounded-2xl border border-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Malik Usman"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 0300 1234567"
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Preferred Date &amp; Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. I would like to visit the site this Saturday morning to inspect the road & park facing pegs."
                      value={leadMessage}
                      onChange={(e) => setLeadMessage(e.target.value)}
                      className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Official Booking &amp; Visit Request</span>
                  </button>
                </form>
              )}

              {/* Direct WhatsApp Callout */}
              <div className="bg-[#0B132B] p-4 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-emerald-400">Direct Contact with Listing Agent</h4>
                  <p className="text-[11px] text-slate-400">
                    {plot.agencyName || 'Authorized Consultant'} • Mobile: {activePhone}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={generateWhatsAppLink(activeWhatsapp, whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp ({activeWhatsapp})</span>
                  </a>
                  <a
                    href={`tel:${activePhone}`}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl"
                  >
                    <span>Call ({activePhone})</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1C2541] border-t border-slate-700/80">
          <div className="text-xs text-slate-400">
            {plot.agencyName || 'Kashpal Enterprises'} • {plot.type} #{plot.plotNumber}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onLocateOnMap(plot);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B132B] border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-semibold cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Map Polygon</span>
            </button>
            <a
              href={generateWhatsAppLink(activeWhatsapp, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp Direct</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
