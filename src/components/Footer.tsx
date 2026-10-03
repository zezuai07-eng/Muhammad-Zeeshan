import React from 'react';
import { Building2, MapPin, Phone, Mail, ShieldCheck, Heart, Sparkles, Layers, Lock, Plus, Briefcase, ChevronRight, LogOut } from 'lucide-react';
import { COMPANY_DETAILS } from '../data/mockData';
import { generateWhatsAppLink } from '../utils/formatters';
import { AppUserProfile } from '../utils/firebase';

interface FooterProps {
  onNavigateTab: (tab: 'marketplace' | 'map' | 'inventory' | 'charges' | 'admin' | 'contact' | 'seller') => void;
  onOpenAuthModal?: (mode?: 'login' | 'register' | 'admin') => void;
  currentUser?: AppUserProfile | null;
  onLogout?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  onNavigateTab, 
  onOpenAuthModal,
  currentUser,
  onLogout 
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const handleAdminClick = () => {
    if (isAdmin) {
      onNavigateTab('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (onOpenAuthModal) {
      onOpenAuthModal('login');
    } else {
      onNavigateTab('admin');
    }
  };

  return (
    <footer className="bg-[#080E21] border-t border-[#D4AF37]/30 text-slate-400 text-xs">
      {/* 
        ========================================================================
        ADMIN CONTROL PANEL DOCK (ONLY SHOWN IN FOOTER AFTER ADMIN LOGIN)
        ========================================================================
      */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-[#1C2541] via-[#111A35] to-[#1C2541] border-b border-amber-500/40 py-4 px-4 sm:px-6 lg:px-8 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Master Admin Control Panel
                  </span>
                  <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded font-mono">
                    AUTHENTICATED
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Signed in as: <strong className="text-amber-300">{currentUser.email}</strong> • Full system and dealer management rights.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onNavigateTab('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>Open Admin Control Desk</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  title="Sign out of Admin session"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1 & 2: Brand Bio */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B89628] p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B132B] rounded-[10px] flex items-center justify-center text-[#D4AF37]">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-base font-black text-white tracking-tight">
                  KASHPAL <span className="text-[#D4AF37] font-sans font-bold">ENTERPRISES &amp; BUILDERS</span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                  LDA City Master Consultants
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Premier PropTech &amp; corporate real estate agency specializing in LDA City Lahore master plan developments, on-ground pegged residential plots, 180ft boulevard commercials, and verified balloting files.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>LDA Authorized License: {COMPANY_DETAILS.licenseNumber}</span>
            </div>
          </div>

          {/* Col 3: Quick Navigation Portals */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              PropTech Engine
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('map')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <span>Master Geo-Map Engine</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('inventory')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-left flex items-center gap-1 text-[#D4AF37]"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Property Inventory Software</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('marketplace')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-left"
                >
                  Verified Plot Marketplace
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('charges')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-left"
                >
                  Development Charges Schedule (2026)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('seller')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-left flex items-center gap-1 text-emerald-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Seller &amp; Dealer Portal</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Sectors in LDA City */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              LDA City Sectors
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li className="text-slate-300 font-medium">Jinnah Sector (Blocks A–Q, A1, B1, G1)</li>
              <li className="text-slate-300 font-medium">Iqbal Sector (Blocks AA, BB, CC)</li>
              <li className="text-amber-400/90 font-medium">180 Ft Commercial Plaza Corridor</li>
              <li className="text-slate-400">Direct Cadastral Ground Boundaries</li>
            </ul>
          </div>

          {/* Col 5: Direct Hotline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Liaison Office
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span className="text-slate-300">{COMPANY_DETAILS.headquarters}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={generateWhatsAppLink('03001535898', 'Hello Kashpal Enterprises, I am contacting you.')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#D4AF37] font-mono font-semibold"
                >
                  0300 1535898
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={generateWhatsAppLink('03264509700', 'Hello Kashpal Enterprises, I am contacting you.')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#D4AF37] font-mono"
                >
                  0326 4509700
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Kashpal Enterprises &amp; Builders. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by Master Geo-Cadastral Engine</span>
            <span>•</span>
            <span className="text-[#D4AF37]">Lahore Development Authority (LDA) Compliant</span>
            <span>•</span>
            {/* Discreet Staff Authorization Link */}
            <button
              type="button"
              onClick={handleAdminClick}
              className="text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Staff / Admin Access"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Staff Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
