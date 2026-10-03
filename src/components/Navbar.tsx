import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Layers, 
  Receipt, 
  ShieldCheck, 
  Menu, 
  X, 
  Lock, 
  Plus, 
  User, 
  LogOut,
  Sparkles,
  Smartphone,
  Download,
  ChevronDown,
  Trash2,
  Sun,
  Moon,
  Briefcase
} from 'lucide-react';
import { COMPANY_DETAILS } from '../data/mockData';
import { generateWhatsAppLink } from '../utils/formatters';
import { AppUserProfile } from '../utils/firebase';
import { AndroidInstallModal } from './AndroidInstallModal';
import { useTheme } from '../context/ThemeContext';
import { usePWAInstall } from '../utils/usePWAInstall';

interface NavbarProps {
  activeTab: 'marketplace' | 'map' | 'inventory' | 'charges' | 'admin' | 'contact' | 'seller' | 'hub' | 'calculator';
  setActiveTab: (tab: 'marketplace' | 'map' | 'inventory' | 'charges' | 'admin' | 'contact' | 'seller' | 'hub' | 'calculator') => void;
  onNavigateToMap: () => void;
  currentUser?: AppUserProfile | null;
  onOpenAuthModal?: (mode?: 'login' | 'register' | 'admin') => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNavigateToMap,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const { isLight, toggleTheme } = useTheme();
  const { install } = usePWAInstall();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleInstallAppClick = async () => {
    const outcome = await install();
    if (!outcome) {
      setIsInstallModalOpen(true);
    }
  };

  interface NavItem {
    id: 'marketplace' | 'map' | 'inventory' | 'charges' | 'contact' | 'seller';
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    isSpecial?: boolean;
    badge?: string;
  }

  // Primary public navigation links (Smart, Compact, High-converting)
  const navLinks: NavItem[] = [
    { 
      id: 'marketplace', 
      label: 'Marketplace', 
      description: 'Verified 5, 10 Marla, 1 & 2 Kanal LDA City listings',
      icon: Building2 
    },
    { 
      id: 'map', 
      label: 'Geo-Map', 
      description: 'Master Cadastral GIS map with GPS plot locator',
      icon: Layers, 
      isSpecial: true,
      badge: 'Live GIS'
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      description: 'Agency property inventory software & unique plot registry',
      icon: Briefcase,
      badge: 'Software'
    },
    { 
      id: 'charges', 
      label: 'Charges 2026', 
      description: 'Official LDA City 2026 dev charges schedule & calculator',
      icon: Receipt,
    },
    { 
      id: 'contact', 
      label: 'Contact', 
      description: 'Site office on 180 Ft Boulevard & consultant desk',
      icon: MapPin 
    },
  ];

  const handleTabClick = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
    if (tabId === 'map') {
      onNavigateToMap();
    } else if (tabId === 'marketplace') {
      // User: "marketpalce per click krne se usko plots or houses ki listing per redirect honac haiey. bcz sale purchse udher hoga. ok."
      setTimeout(() => {
        const listingSection = document.getElementById('marketplace-section') || document.getElementById('inventory-section');
        if (listingSection) {
          listingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 70);
    }
  };

  const handlePostPlotClick = () => {
    if (currentUser) {
      setActiveTab('seller');
    } else if (onOpenAuthModal) {
      onOpenAuthModal('register');
    } else {
      setActiveTab('seller');
    }
  };

  const handleUserButtonClick = () => {
    if (currentUser) {
      setActiveTab('seller');
    } else if (onOpenAuthModal) {
      onOpenAuthModal('login');
    } else {
      setActiveTab('seller');
    }
  };

  const handleAdminAccessClick = () => {
    setIsSidebarOpen(false);
    if (onOpenAuthModal) {
      onOpenAuthModal('admin');
    } else {
      setActiveTab('admin');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0B132B]/95 backdrop-blur-xl border-b border-[#D4AF37]/30 shadow-2xl">
        {/* Top Gold Corporate Micro-Bar (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center justify-between px-4 sm:px-6 lg:px-8 py-1.5 bg-[#111A35]/90 text-[11px] text-slate-300 border-b border-[#D4AF37]/15">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Head Office: {COMPANY_DETAILS.headquarters}</span>
            </span>
            <span className="hidden lg:inline text-slate-600">•</span>
            <span className="hidden lg:flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Govt. Authorized LDA PropTech Desk</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 font-mono">
            <a
              href={generateWhatsAppLink('03001535898', 'Hello Kashpal Enterprises, I am contacting you from your portal.')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[#D4AF37] hover:text-[#E5C158] transition-colors"
            >
              <Phone className="w-3 h-3" />
              <span>0300 1535898</span>
            </a>
            <span className="text-slate-600">|</span>
            <a
              href={generateWhatsAppLink('03264509700', 'Hello Kashpal Enterprises, I would like to inquire about LDA City plots.')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
            >
              <span>0326 4509700</span>
            </a>
          </div>
        </div>

        {/* Primary Navigation Header Bar */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-14 sm:h-20 gap-1.5 sm:gap-4">
            {/* Brand Logo & Name (Protected against text fragmentation on mobile screens) */}
            <div 
              onClick={() => handleTabClick('marketplace')}
              className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group select-none shrink-0"
              title="Kashpal Enterprises & Builders - LDA City Master Consultants"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#B89628] to-[#8C6D1F] p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B132B] rounded-[9px] flex items-center justify-center text-[#D4AF37]">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-105 transition-transform" />
                </div>
              </div>
              <div className="flex flex-col justify-center min-w-0">
                {/* Brand Line 1: KASHPAL (Bold) + Enterprises & Builders (Gold, responsive sizing) */}
                <div className="flex items-center flex-nowrap whitespace-nowrap leading-none gap-1 sm:gap-1.5">
                  <span className="text-xs sm:text-base font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    KASHPAL
                  </span>
                  <span className="text-[8px] sm:text-xs font-bold text-[#D4AF37] tracking-tight font-sans">
                    Enterprises &amp; Builders
                  </span>
                </div>
                {/* Brand Line 2: LDA City Master Consultants */}
                <p className="text-[7px] sm:text-[9.5px] uppercase tracking-wider text-slate-300 font-semibold truncate leading-none mt-0.5 sm:mt-1 max-w-[125px] sm:max-w-none">
                  LDA City Master Consultants
                </p>
              </div>
            </div>

            {/* Desktop Horizontal Navigation Menu (Reference: ibrahimrealestate.net) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`relative px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-[#1C2541] text-[#D4AF37] border border-[#D4AF37]/50 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-[#1C2541]/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]"></span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Header Right Action Buttons - Laser straight alignment, uniform responsive sizing */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Install Android App Button */}
              <button
                type="button"
                onClick={handleInstallAppClick}
                className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl bg-[#111C3A] hover:bg-[#182850] text-[#38BDF8] border border-[#38BDF8]/40 hover:border-[#38BDF8] font-bold text-[10px] sm:text-xs shadow-sm transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center gap-1 box-border"
                title="Install Android App / Launch Google Play Kit"
              >
                <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#38BDF8] shrink-0" />
                <span className="whitespace-nowrap font-sans">App</span>
              </button>

              {/* 1. Post Plot Button (Prominent Gold Action) */}
              <button
                type="button"
                onClick={handlePostPlotClick}
                className="h-8 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-[10px] sm:text-xs border border-[#E5C158] shadow-sm transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center gap-1 box-border"
                title="Post Plot with Geo-Coordinates & Details"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3] shrink-0" />
                <span className="hidden xs:inline whitespace-nowrap">Post Plot</span>
                <span className="xs:hidden whitespace-nowrap">Post</span>
              </button>

              {/* 2. Registered User / Dealer Portal Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser) {
                      setIsUserMenuOpen((prev) => !prev);
                    } else {
                      handleUserButtonClick();
                    }
                  }}
                  className={`h-8 sm:h-9 px-1.5 sm:px-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer border shrink-0 flex items-center justify-center gap-1.5 box-border ${
                    activeTab === 'seller' || isUserMenuOpen
                      ? 'bg-[#1C2541] text-[#D4AF37] border-[#D4AF37] shadow-md'
                      : currentUser
                      ? 'bg-[#1C2541] text-white hover:text-[#D4AF37] border-slate-700 hover:border-[#D4AF37]/60'
                      : 'bg-[#1C2541] text-slate-200 hover:text-white border-[#D4AF37]/40 hover:bg-[#243054]'
                  }`}
                  title={currentUser ? `Account: ${currentUser.agencyName || currentUser.displayName} (Click for Quick Menu)` : 'User / Dealer Login'}
                >
                  {currentUser?.agencyLogo ? (
                    <img
                      src={currentUser.agencyLogo}
                      alt=""
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full object-cover border border-[#D4AF37] shrink-0"
                    />
                  ) : (
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4AF37] shrink-0" />
                  )}
                  <span className="hidden sm:inline truncate max-w-[100px] xl:max-w-[130px] font-extrabold">
                    {currentUser ? (currentUser.agencyName || 'My Portal') : 'User Login'}
                  </span>
                  <span className="sm:hidden whitespace-nowrap font-bold">
                    {currentUser ? 'Menu' : 'Login'}
                  </span>
                  {currentUser?.isVerified && (
                    <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  {currentUser && (
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#D4AF37]' : ''}`} />
                  )}
                </button>

                {/* GORGEOUS REGISTERED USER DROPDOWN MENU */}
                {currentUser && isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[10015] bg-black/20"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#0B132B] border border-[#D4AF37]/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[10020] overflow-hidden animate-fade-in divide-y divide-slate-800">
                      {/* User Header Dossier */}
                      <div className="p-3.5 bg-gradient-to-r from-[#1C2541] to-[#0B132B]">
                        <div className="flex items-center gap-3">
                          <img
                            src={currentUser.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover border-2 border-[#D4AF37] shadow shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-white truncate">
                                {currentUser.agencyName || currentUser.displayName}
                              </h4>
                              {currentUser.isVerified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-300 truncate">{currentUser.email}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                currentUser.role === 'admin'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              }`}>
                                {currentUser.role === 'admin' ? 'Master Admin' : 'Registered Dealer'}
                              </span>
                              {currentUser.phone && (
                                <span className="text-[9px] text-slate-400 truncate">📞 {currentUser.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Actions */}
                      <div className="p-2 space-y-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('seller');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-[#D4AF37] hover:bg-[#1C2541] transition-colors flex items-center justify-between font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>My Inventory &amp; Live Ads</span>
                          </span>
                          <span className="text-[10px] text-[#D4AF37] font-mono">Open →</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('seller');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-emerald-400 hover:bg-[#1C2541] transition-colors flex items-center justify-between font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Post New Property Ad</span>
                          </span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">+New</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('seller');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-rose-400 hover:bg-[#1C2541] transition-colors flex items-center justify-between font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Recycle Bin (Trash)</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Restore/Purge</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('seller');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-[#D4AF37] hover:bg-[#1C2541] transition-colors flex items-center gap-2 font-semibold cursor-pointer"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Agency Profile &amp; Logo Settings</span>
                        </button>

                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('admin');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center justify-between font-bold cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Master Admin Desk</span>
                            </span>
                            <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded">ADMIN</span>
                          </button>
                        )}
                      </div>

                      {/* Theme Toggle & Logout */}
                      <div className="p-2 space-y-1 text-xs bg-slate-950/60">
                        <button
                          type="button"
                          onClick={toggleTheme}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#1C2541] transition-colors flex items-center justify-between font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            {isLight ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                            <span>Switch to {isLight ? 'Night Mode (Dark)' : 'Day Mode (Light)'}</span>
                          </span>
                          <span className="text-[10px] font-black uppercase text-[#D4AF37]">{isLight ? 'Night' : 'Day'}</span>
                        </button>

                        {onLogout && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onLogout();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 transition-colors flex items-center gap-2 font-bold cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out ({currentUser.displayName || 'Account'})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 3. Mobile Navigation Menu Toggle */}
              <button
                type="button"
                id="main-nav-toggle-btn"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-[#1C2541] hover:bg-[#243054] border border-[#D4AF37]/50 text-white hover:text-[#D4AF37] transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 box-border"
                title="Open Mobile Navigation Menu"
                aria-label="Open Mobile Navigation Menu"
              >
                <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37] shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out Sidebar Navigation Drawer (Mobile & Tablet) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10050] flex justify-end animate-fade-in">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Sidebar Drawer Container */}
          <aside 
            id="corporate-navigation-sidebar"
            className="relative w-full max-w-sm sm:max-w-md bg-[#0B132B] border-l border-[#D4AF37]/40 shadow-[-16px_0_50px_rgba(0,0,0,0.9)] flex flex-col h-full z-10 transition-transform duration-300"
          >
            {/* Drawer Top Header */}
            <div className="p-4 sm:p-5 border-b border-[#D4AF37]/25 flex items-center justify-between bg-gradient-to-r from-[#1C2541] to-[#0B132B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B89628] p-0.5 shadow-md">
                  <div className="w-full h-full bg-[#0B132B] rounded-[9px] flex items-center justify-center text-[#D4AF37]">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    KASHPAL ENTERPRISES
                  </h3>
                  <p className="text-[10.5px] text-[#D4AF37] font-medium">
                    LDA City Master Consultants
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl bg-[#1C2541] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
                title="Close Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Session Quick Card in Sidebar */}
            <div className="p-4 bg-[#111A35]/90 border-b border-slate-800">
              {currentUser ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                    <img
                      src={currentUser.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-[#D4AF37]"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white">
                          {currentUser.agencyName || currentUser.displayName}
                        </span>
                        {currentUser.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{currentUser.email}</div>
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => { onLogout(); setIsSidebarOpen(false); }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick Tiles for Registered User */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('seller');
                      setIsSidebarOpen(false);
                    }}
                    className="p-2 rounded-xl bg-[#1C2541] hover:bg-[#253256] text-center border border-slate-700/60"
                  >
                    <Building2 className="w-4 h-4 text-[#D4AF37] mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-200 block">Inventory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('seller');
                      setIsSidebarOpen(false);
                    }}
                    className="p-2 rounded-xl bg-[#1C2541] hover:bg-[#253256] text-center border border-slate-700/60"
                  >
                    <Plus className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-200 block">Post Ad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('seller');
                      setIsSidebarOpen(false);
                    }}
                    className="p-2 rounded-xl bg-[#1C2541] hover:bg-[#253256] text-center border border-slate-700/60"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-200 block">Recycle Bin</span>
                  </button>
                </div>

                {/* Day / Night Mode Button in Mobile Drawer */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] border border-[#D4AF37]/30 text-xs font-bold text-[#D4AF37] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-amber-300" />}
                    <span>Theme: {isLight ? 'Day Mode (Light)' : 'Night Mode (Dark)'}</span>
                  </span>
                  <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-[#1C2541] text-white">Switch</span>
                </button>
              </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-white block">Seller / Dealer Portal</span>
                    <span className="text-[10px] text-slate-400">Sign in to upload your LDA plots</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      if (onOpenAuthModal) onOpenAuthModal('login');
                    }}
                    className="px-3 py-1.5 bg-[#D4AF37] text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Links Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Android App Direct Install Card */}
              <div 
                onClick={async () => {
                  setIsSidebarOpen(false);
                  await handleInstallAppClick();
                }}
                className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/40 hover:border-blue-400 p-3 rounded-2xl cursor-pointer transition-all shadow-md group flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400 flex items-center justify-center text-blue-300">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1.5">
                      <span>Install Android App</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-black">APK</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Play Store &amp; Home Screen ready</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
              </div>

              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 pt-1 pb-1">
                Portals &amp; Tools
              </div>

              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeTab === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => handleTabClick(link.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#1C2541] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                        : 'bg-[#1C2541]/50 hover:bg-[#1C2541] border-slate-800 hover:border-[#D4AF37]/40'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                      isActive 
                        ? 'bg-[#D4AF37] text-[#0B132B]' 
                        : 'bg-[#0B132B] text-[#D4AF37] group-hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs sm:text-sm font-bold truncate ${
                          isActive ? 'text-[#D4AF37]' : 'text-white group-hover:text-[#D4AF37]'
                        }`}>
                          {link.label}
                        </span>
                        {link.badge && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 rounded-full shrink-0">
                            {link.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
                        {link.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sidebar Bottom: Admin Access (Admin Only) & Hotline */}
            <div className="p-4 border-t border-[#D4AF37]/25 bg-[#111A35]/80 space-y-3">
              {/* Only shown after admin is authenticated */}
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={handleAdminAccessClick}
                  className="w-full py-2 px-3 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Master Admin Control Desk</span>
                  </span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">Admin Authorized</span>
                </button>
              )}

              <a
                href={generateWhatsAppLink('03001535898', 'Hello Kashpal Enterprises, I am contacting you via your Corporate Web Portal.')}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Chat with Senior Consultant (WhatsApp)</span>
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* Android PWA / Play Store Install Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </>
  );
};
