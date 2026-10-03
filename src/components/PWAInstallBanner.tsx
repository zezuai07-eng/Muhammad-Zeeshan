import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';

interface PWAInstallBannerProps {
  activeTab?: string;
}

const STORAGE_KEY = 'kashpal_android_install_prompt_handled';

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ activeTab = 'marketplace' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('kashpal_android_banner_dismissed_session') === 'true';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If dismissed, already handled in this browser, installed, or not on main page: keep hidden
  if (isInstalled || isDismissed || activeTab !== 'marketplace') {
    return null;
  }

  const markHandled = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('kashpal_android_banner_dismissed_session', 'true');
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    // Attempt native install directly
    const outcome = await install();
    if (outcome) {
      markHandled();
    } else {
      // If browser doesn't support native prompt or is on iOS, open clear installation guide
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <aside 
        aria-label="App installation banner"
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-[8000] max-w-md animate-in slide-in-from-bottom duration-300 pointer-events-auto"
      >
        <div className="bg-[#0B132B]/95 backdrop-blur-md border border-[#D4AF37]/50 rounded-2xl p-3.5 shadow-2xl shadow-black/80 flex items-center justify-between gap-3">
          {/* Icon & Description */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-[#0B132B] rounded-[9px] flex items-center justify-center text-[#D4AF37]">
                <Smartphone className="w-5 h-5 text-[#38BDF8]" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white truncate font-sans">
                  LDA City Android App
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[8.5px] font-black px-1.5 py-0.2 rounded shrink-0">
                  Ready
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 truncate">
                Direct phone install • Cadastral GPS &amp; Plot Finder
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="py-1.5 px-3 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black text-[11px] rounded-xl shadow-md cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={markHandled}
              className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <AndroidInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
