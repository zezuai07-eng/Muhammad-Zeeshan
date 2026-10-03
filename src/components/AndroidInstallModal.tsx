import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  X, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  Compass, 
  ShieldCheck, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'install' | 'playstore'>('install');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showHelperBanner, setShowHelperBanner] = useState(false);

  if (!isOpen) return null;

  const bubblewrapCommand = `npx @bubblewrap/cli init --manifest=https://kashpalenterprises.com/manifest.webmanifest\nnpx @bubblewrap/cli build`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0B132B] via-slate-900 to-[#0B132B] border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0B132B] border-2 border-[#D4AF37] p-1.5 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center shrink-0">
              <img src="/icon.svg" alt="App Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-cinzel tracking-wide">
                  LDA City Android App
                </h3>
                <span className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-[9px] font-black px-1.5 py-0.5 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official PropTech Map &amp; Portal by Kashpal Enterprises
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'install'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Direct Phone Install</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('playstore')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'playstore'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Play Store / APK Build</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300">
          {activeTab === 'install' ? (
            <>
              {isInstalled ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm">App Already Installed!</h4>
                  <p className="text-xs text-slate-300">
                    This application is already installed on your device in standalone full-screen mode. You can launch it directly from your home screen or app drawer.
                  </p>
                </div>
              ) : (
                <>
                  {/* Primary Direct Install Action */}
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                    <p className="text-xs text-slate-300">
                      Install this app on your Android phone to get instant full-screen navigation, lightning fast cadastral map rendering, and home screen icon access.
                    </p>
                    
                    {isInstallable ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await install();
                          if (res) onClose();
                        }}
                        className="w-full py-3 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-[#D4AF37]/25 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                      >
                        <Download className="w-5 h-5 stroke-[2.5]" />
                        <span>📲 Install Direct to Phone</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await install();
                            if (res) {
                              onClose();
                            } else {
                              setShowHelperBanner(true);
                            }
                          }}
                          className="w-full py-3 px-4 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                        >
                          <Download className="w-5 h-5 stroke-[2.5]" />
                          <span>📲 1-Tap Home Screen Install</span>
                        </button>
                        {showHelperBanner && (
                          <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs rounded-xl p-3 text-left animate-in fade-in duration-200">
                            <p className="font-bold text-amber-300 mb-1">To install on your phone:</p>
                            <p className="text-slate-300">Tap your browser's <strong>3 dots (⋮)</strong> at top right and choose <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manual Instructions for Android Browser */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h5 className="font-bold text-white text-xs flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                      <span>How to Install on Android (Chrome / Samsung Internet):</span>
                    </h5>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400">
                      <li>Open this website in <strong className="text-white">Google Chrome</strong> or <strong className="text-white">Samsung Internet</strong> on your Android phone.</li>
                      <li>Tap the <strong className="text-white">3 dots (⋮)</strong> menu in the top right corner.</li>
                      <li>Select <strong className="text-[#D4AF37]">"Add to Home screen"</strong> or <strong className="text-[#D4AF37]">"Install app"</strong>.</li>
                      <li>Tap <strong className="text-white">Install</strong>. The LDA City icon will appear directly in your phone's App Drawer!</li>
                    </ol>
                  </div>

                  {/* iOS Instructions */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                    <h5 className="font-bold text-slate-300 text-xs flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Using iPhone or iPad?</span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Tap the <strong className="text-white">Share</strong> button in Safari toolbar, scroll down and tap <strong className="text-[#D4AF37]">"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </>
              )}

              {/* App Features List */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="text-[11px] text-slate-300 font-semibold">100% Safe &amp; Light (&lt;1 MB)</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="text-[11px] text-slate-300 font-semibold">Live GPS Field Location</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Google Play Store / APK Launch Guide */}
              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Google Play Store &amp; Signed APK Ready!</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This application is fully compliant with Google Play Store <strong>Trusted Web Activity (TWA)</strong> standards:
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                    <li>Valid Web App Manifest (<code className="text-[#D4AF37]">manifest.webmanifest</code>)</li>
                    <li>Service Worker offline caching (<code className="text-[#D4AF37]">sw.js</code>)</li>
                    <li>Adaptive maskable icons (192px &amp; 512px)</li>
                    <li>Google Digital Asset Links (<code className="text-[#D4AF37]">.well-known/assetlinks.json</code>)</li>
                    <li>Bubblewrap TWA manifest (<code className="text-[#D4AF37]">twa-manifest.json</code>)</li>
                  </ul>
                </div>

                {/* Option 1: PWABuilder (No Coding Required) */}
                <div className="bg-gradient-to-r from-blue-950/40 to-slate-950 border border-blue-500/30 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-xs">Method 1: PWABuilder (1-Click APK / Play Bundle)</h5>
                    <span className="bg-blue-500/20 text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded">Easiest</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Microsoft &amp; Google's official online packager will generate a ready-to-upload Google Play Store <code className="text-blue-300">.aab</code> package and standalone Android <code className="text-blue-300">.apk</code>.
                  </p>
                  <a
                    href="https://www.pwabuilder.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
                  >
                    <span>Open PWABuilder.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Option 2: Google Bubblewrap CLI */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-xs">Method 2: Google Bubblewrap CLI (Terminal)</h5>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bubblewrapCommand)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-300 overflow-x-auto">
                    {bubblewrapCommand}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Running this in any computer with Node.js and Java JDK will build your signed Android package in under 2 minutes.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 border-t border-slate-800 p-3 sm:p-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-cinzel">
            Kashpal Enterprises &amp; Builders
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
