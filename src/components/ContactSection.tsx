import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  Building2, 
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { COMPANY_DETAILS } from '../data/mockData';
import { generateWhatsAppLink } from '../utils/formatters';
import { LeadRecord } from '../types';

interface ContactSectionProps {
  onAddLead: (lead: LeadRecord) => void;
  onPanToOffice: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  onAddLead,
  onPanToOffice,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const lead: LeadRecord = {
      id: `LEAD-${Date.now()}`,
      fullName: name,
      phone,
      email,
      message: message || 'General consultation request from Contact Form.',
      inquiryType: 'General Inquiry',
      date: new Date().toISOString().split('T')[0],
      status: 'New',
    };

    onAddLead(lead);
    setSubmitted(true);
  };

  return (
    <section id="contact-office-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2541] border border-[#D4AF37]/30 text-xs font-semibold text-[#D4AF37] mb-2">
          <Building2 className="w-3.5 h-3.5" />
          <span>Head Office &amp; Consultation Desk</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Visit Our Site Office or Connect with an Agent
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2">
          Located prominently along 180 Ft LDA Road, Gajjumata, Lahore. Direct on-ground liaison for all plot transfers, balloting inquiries, and property evaluations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Business Info Card & Interactive Marker (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1C2541] to-[#0B132B] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
              <span>Corporate Identity</span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
              {COMPANY_DETAILS.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{COMPANY_DETAILS.tagline}</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-[#0B132B]/60 p-3.5 rounded-2xl border border-slate-800">
              <MapPin className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Headquarters &amp; Site Desk</strong>
                <span className="text-slate-300">{COMPANY_DETAILS.headquarters}</span>
                <span className="text-[11px] text-[#D4AF37] font-mono block mt-0.5">
                  GPS: Lat 31.38150, Lng 74.35199
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onPanToOffice}
                    className="text-[#D4AF37] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View on Master Geo-Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#0B132B]/60 p-3.5 rounded-2xl border border-slate-800">
              <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Direct Telephone / WhatsApp Lines</strong>
                <div className="mt-1 space-y-1">
                  <div>
                    <a
                      href={generateWhatsAppLink('03001535898', 'Hello Kashpal Enterprises, I would like to consult with an agent.')}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white font-mono hover:text-[#D4AF37] font-semibold"
                    >
                      {COMPANY_DETAILS.formattedPrimaryPhone} (Primary Line)
                    </a>
                  </div>
                  <div>
                    <a
                      href={generateWhatsAppLink('03264509700', 'Hello Kashpal Enterprises, I would like to consult with an agent.')}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-300 font-mono hover:text-[#D4AF37]"
                    >
                      {COMPANY_DETAILS.formattedSecondaryPhone} (Secondary Desk)
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#0B132B]/60 p-3.5 rounded-2xl border border-slate-800">
              <Clock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Office Operating Hours</strong>
                <span className="text-slate-300">Monday - Sunday: 10:00 AM - 8:00 PM PST</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Site visits conducted 7 days a week with prior appointment.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>LDA Registration Ref: <strong className="text-white">{COMPANY_DETAILS.licenseNumber}</strong></span>
            <span className="text-emerald-400 font-semibold">Govt. Verified</span>
          </div>
        </div>

        {/* Lead Capture Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#1C2541]/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
              <span>Direct Client Inquiry Engine</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Send us your investment requirements. An authorized Kashpal executive will respond within 30 minutes.
            </p>
          </div>

          {submitted ? (
            <div className="bg-emerald-950/80 border border-emerald-500 rounded-2xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">Thank You, {name}!</h4>
              <p className="text-xs text-emerald-200 mt-1 mb-5">
                Your message has been logged in our seller system. An agent will call or WhatsApp you at {phone}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setName('');
                  setPhone('');
                  setEmail('');
                  setMessage('');
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mian Ahmad Raza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    WhatsApp / Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. ahmad.raza@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Message / Property Requirements
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us what size, sector, or budget you are aiming for in LDA City Lahore..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Consultation Request</span>
                </button>

                <a
                  href={generateWhatsAppLink('03001535898', 'Hello Kashpal Enterprises, I am contacting you from your official website.')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-md transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Instant WhatsApp</span>
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
