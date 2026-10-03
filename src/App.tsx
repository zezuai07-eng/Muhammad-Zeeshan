/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MapPortal } from './components/MapPortal';
import { PropertyGrid } from './components/PropertyGrid';
import { PlotDetailModal } from './components/PlotDetailModal';
import { DevelopmentCharges } from './components/DevelopmentCharges';
import { AdminPortal } from './components/AdminPortal';
import { SellerPortal } from './components/SellerPortal';
import { InventoryPortal } from './components/InventoryPortal';
import { AuthModal } from './components/AuthModal';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import { INITIAL_PLOTS, MOCK_LEADS, COMPANY_DETAILS } from './data/mockData';
import { PlotRecord, LeadRecord, PlotStatus } from './types';
import { Phone, MessageCircle, Layers, CheckCircle2, ShieldCheck, Building2, User, Receipt } from 'lucide-react';
import { generateWhatsAppLink } from './utils/formatters';
import { 
  auth, 
  fetchUserProfile, 
  fetchInventoryPlots, 
  logoutAppUser, 
  AppUserProfile, 
  InventoryPlotItem 
} from './utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function convertInventoryItemToPlotRecord(item: InventoryPlotItem): PlotRecord {
  const lat = item.lat || 31.348;
  const lng = item.lng || 74.348;
  const offset = 0.00015;
  const numericPrice = 
    item.priceNum || 
    (parseFloat(item.price.replace(/[^0-9.]/g, '')) * (item.price.toLowerCase().includes('crore') ? 10000000 : 100000)) || 
    4500000;

  const resolvedType = item.propertyType || (item.category === 'commercial' ? 'Commercial' : 'Plot');
  const defaultImage = resolvedType === 'House'
    ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    : resolvedType === 'File'
    ? 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80'
    : resolvedType === 'Commercial'
    ? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'
    : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';

  const images = (item.images && item.images.length > 0) ? item.images : [defaultImage];

  return {
    id: item.id,
    society: 'LDA City Lahore',
    sector: item.sector,
    block: item.block,
    plotNumber: item.plotNumber,
    size: (item.area as PlotRecord['size']) || '10 Marla',
    price: numericPrice,
    type: resolvedType,
    status: (item.status === 'sold' ? 'Sold' : item.status === 'under_offer' ? 'Reserved' : 'Available') as PlotStatus,
    center: [lat, lng],
    coordinates: [
      [lat - offset, lng - offset],
      [lat - offset, lng + offset],
      [lat + offset, lng + offset],
      [lat + offset, lng - offset],
    ],
    dimensions: resolvedType === 'House' ? 'Constructed Villa' : '35 x 70',
    facing: 'East',
    roadWidth: '40 Feet',
    paymentPlan: {
      downPayment: numericPrice,
      monthlyInstallments: 0,
      numberOfInstallments: 0,
      developmentChargesIncluded: true,
      possessionPeriodMonths: 0,
    },
    images,
    videoUrl: item.videoUrl,
    documents: item.documents,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    fileStatus: item.fileStatus,
    features: item.features ? [item.features] : ['Direct Transfer', 'Immediate Possession', 'LDA City Verified'],
    description: item.description || `LDA City ${item.sector} ${item.block} ${resolvedType} #${item.plotNumber}. Direct deal for immediate transfer.`,
    balloted: true,
    fileNumber: item.plotNumber,
    sellerUid: item.sellerUid,
    sellerName: item.sellerName,
    sellerPhone: item.sellerPhone,
    sellerWhatsapp: item.sellerWhatsapp,
    agencyName: item.agencyName,
    agencyLogo: item.agencyLogo,
    isVerifiedSeller: item.isVerifiedSeller,
  };
}

export default function App() {
  const { isLight } = useTheme();
  // Primary State
  const [plots, setPlots] = useState<PlotRecord[]>(INITIAL_PLOTS);
  const [leads, setLeads] = useState<LeadRecord[]>(MOCK_LEADS);
  const [selectedPlot, setSelectedPlot] = useState<PlotRecord | null>(INITIAL_PLOTS[0]);
  const [modalPlot, setModalPlot] = useState<PlotRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'map' | 'inventory' | 'charges' | 'admin' | 'contact' | 'seller' | 'hub' | 'calculator'>('marketplace');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot' | 'admin' | 'confirm_reset'>('login');
  const [authResetCode, setAuthResetCode] = useState<string | undefined>(undefined);

  // Quick filters passed from Hero search to Marketplace
  const [heroSearchFilters, setHeroSearchFilters] = useState<{ sector: string; size: string; type: string } | undefined>(undefined);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Inspect URL for password reset callbacks and actions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const authAction = urlParams.get('auth_action') || urlParams.get('auth');
    const modeParam = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');

    // Case 1: Redirected back to hosted app URL after successful Firebase password reset action
    if (authAction === 'reset_success' || authAction === 'reset-success') {
      showToast('🎉 Password reset confirmed! Please log in with your new password.');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } 
    // Case 2: Opened reset link with Firebase oobCode action link directly in app
    else if (modeParam === 'resetPassword' && oobCode) {
      setAuthResetCode(oobCode);
      setAuthModalMode('confirm_reset');
      setIsAuthModalOpen(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Listen to Firebase Auth state & persistent session
  useEffect(() => {
    // Check if session exists in localStorage
    const savedSession = localStorage.getItem('kashpal_user_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.uid) {
          setCurrentUser(parsed);
        }
      } catch (e) {
        console.error('Session parse error:', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          setCurrentUser(profile);
          localStorage.setItem('kashpal_user_session', JSON.stringify(profile));
        }
      } else {
        // If not in Firebase Auth, only clear if no local session exists
        const local = localStorage.getItem('kashpal_user_session');
        if (!local) {
          setCurrentUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Load Cloud Inventory and merge into plots
  useEffect(() => {
    async function loadCloud() {
      try {
        const cloudPlots = await fetchInventoryPlots();
        if (cloudPlots.length > 0) {
          const converted = cloudPlots.map(convertInventoryItemToPlotRecord);
          setPlots((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = converted.filter((c) => !existingIds.has(c.id));
            return [...fresh, ...prev];
          });
        }
      } catch {
        // use local
      }
    }
    loadCloud();
  }, []);

  // Switch to Map and focus on selected plot with smooth animated flyTo transition
  const handleLocateOnMap = useCallback((plot: PlotRecord) => {
    setSelectedPlot({ ...plot });
    setActiveTab('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Focused on Plot #${plot.plotNumber} in ${plot.sector} on Master Geo-Map.`);
  }, []);

  // Open Details Modal
  const handleOpenDetails = useCallback((plot: PlotRecord) => {
    setModalPlot(plot);
  }, []);

  // Update Plot Status from Admin
  const handleUpdatePlotStatus = (plotId: string, status: PlotStatus) => {
    setPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, status } : p))
    );
    showToast(`Plot status updated to "${status}".`);
  };

  // Update Lead Status from Admin
  const handleUpdateLeadStatus = (leadId: string, status: 'New' | 'Contacted' | 'Closed') => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status } : l))
    );
    showToast(`Lead marked as "${status}".`);
  };

  // Add new Plot from Admin
  const handleAddNewPlot = (newPlot: PlotRecord) => {
    setPlots((prev) => [newPlot, ...prev]);
    showToast(`Plot #${newPlot.plotNumber} (${newPlot.size}) successfully published.`);
  };

  // When seller publishes a plot
  const handleSellerPlotPublished = (item: InventoryPlotItem) => {
    const rec = convertInventoryItemToPlotRecord(item);
    setPlots((prev) => [rec, ...prev]);
    setSelectedPlot(rec);
    showToast(`🎉 Plot #${item.plotNumber} (${item.block}) published to Live Map and Marketplace!`);
  };

  // Add new Lead from Modal or Contact Form
  const handleAddLead = (newLead: LeadRecord) => {
    setLeads((prev) => [newLead, ...prev]);
    showToast(`Inquiry recorded! Our agent will call ${newLead.phone} shortly.`);
  };

  // Handle Search from Hero
  const handleHeroSearch = (filters: { sector: string; size: string; type: string }) => {
    setHeroSearchFilters(filters);
    setActiveTab('marketplace');
    const el = document.getElementById('marketplace-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Pan map to office
  const handlePanToOffice = () => {
    setActiveTab('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Navigating to Kashpal Enterprises Head Office (180 Ft LDA Road).');
  };

  const handleOpenAuthModal = (mode: 'login' | 'register' | 'forgot' | 'admin' | 'confirm_reset' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logoutAppUser();
    setCurrentUser(null);
    showToast('Logged out successfully.');
    if (activeTab === 'seller') {
      setActiveTab('marketplace');
    }
  };

  const availablePlotsCount = plots.filter((p) => p.status === 'Available').length;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 selection:bg-[#D4AF37]/30 selection:text-[#D4AF37] ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0B132B] text-slate-100'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-[10001] animate-bounce">
          <div className="bg-[#1C2541] border border-[#D4AF37] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Quick Contact on Website (Strictly on the RIGHT side; on Map it is on the LEFT corner) */}
      {activeTab !== 'map' && (
        <aside aria-label="WhatsApp quick chat" className="fixed bottom-6 right-6 z-[9990] flex items-center group">
          <a
            href={generateWhatsAppLink(
              '03001535898',
              'Hello Kashpal Enterprises, I am inquiring from your website regarding verified LDA City plots, files, and deals.'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-3 rounded-2xl shadow-[0_10px_25px_rgba(37,211,102,0.45)] transition-all hover:scale-105 active:scale-95 border-2 border-white/40 cursor-pointer"
            title="Chat with us on WhatsApp: 0300 1535898 / 0326 4509700"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping pointer-events-none" />
            </div>
            <span className="text-xs font-black tracking-wide hidden sm:inline">WhatsApp</span>
          </a>
        </aside>
      )}

      {/* Corporate Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigateToMap={() => {
          setActiveTab('map');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
      />

      {/* Main App Content Views */}
      <main className="flex-grow">
        {activeTab === 'marketplace' && (
          <div>
            {/* Hero Section */}
            <HeroSection
              onSearch={handleHeroSearch}
              onExploreMap={() => {
                setActiveTab('map');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              totalPlotsCount={plots.length}
              availableCount={availablePlotsCount}
            />

            {/* Embedded Geo-Map Spotlight Banner */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Cadastral Geo-Intelligence</span>
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Interactive LDA City Master Map Engine
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('map');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-semibold text-[#D4AF37] hover:text-[#E5C158] flex items-center gap-1 cursor-pointer bg-[#1C2541] px-3.5 py-1.5 rounded-xl border border-[#D4AF37]/30 hover:border-[#D4AF37]"
                >
                  <span>Expand Fullscreen Map Portal</span>
                  <span>→</span>
                </button>
              </div>

              {/* Live Map Portal Instance */}
              <MapPortal
                plots={plots}
                selectedPlot={selectedPlot}
                onSelectPlot={setSelectedPlot}
                onOpenDetails={handleOpenDetails}
                isDedicatedView={false}
                onBackToInventory={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </section>

            {/* Property Inventory Grid */}
            <PropertyGrid
              plots={plots}
              onOpenDetails={handleOpenDetails}
              onLocateOnMap={handleLocateOnMap}
              initialFilters={heroSearchFilters}
            />

            {/* Quick Teaser to Development Charges & Transfer Calculator */}
            <section className="bg-[#111A35]/60 border-y border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <div 
                  onClick={() => setActiveTab('charges')}
                  className="bg-gradient-to-r from-[#1C2541] via-[#111A35] to-[#1C2541] hover:border-[#D4AF37] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 transition-all cursor-pointer shadow-2xl group flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div>
                    <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4" />
                      <span>Official Regulatory Portal</span>
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#D4AF37] transition-colors">
                      LDA City Official 2026 Development Charges &amp; Schedule →
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-2xl">
                      Compute exact quarterly installment schedules, late payment surcharge waivers, and complete bank e-Challan deposit guidelines for 5 Marla, 10 Marla, 1 &amp; 2 Kanal plots and commercial corridors.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="py-3 px-5 rounded-xl bg-[#D4AF37] text-slate-950 font-black text-xs uppercase tracking-wider group-hover:bg-[#E5C158] transition-colors whitespace-nowrap self-start md:self-center"
                  >
                    View Schedule &amp; Calculator
                  </button>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <ContactSection
              onAddLead={handleAddLead}
              onPanToOffice={handlePanToOffice}
            />
          </div>
        )}

        {/* Tab 2: Full Map Portal Dedicated View */}
        {activeTab === 'map' && (
          <div className="w-full h-[calc(100vh-64px)] sm:h-[calc(100vh-76px)] flex flex-col items-center justify-center relative overflow-hidden bg-[#0B132B]">
            <MapPortal
              plots={plots}
              selectedPlot={selectedPlot}
              onSelectPlot={setSelectedPlot}
              onOpenDetails={handleOpenDetails}
              isDedicatedView={true}
              onBackToInventory={() => setActiveTab('marketplace')}
            />
          </div>
        )}

        {/* Tab 2.5: Real Estate Agency Inventory Software Ledger */}
        {activeTab === 'inventory' && (
          <InventoryPortal
            currentUser={currentUser}
            onOpenAuthModal={(mode) => handleOpenAuthModal(mode || 'login')}
            onLocatePlotOnMap={(lat, lng, plotNum, blk, invPlot) => {
              const rec = invPlot ? convertInventoryItemToPlotRecord(invPlot) : ({
                id: `inv-${blk}-${plotNum}`,
                society: 'LDA City Lahore',
                sector: 'Jinnah Sector',
                block: blk,
                plotNumber: plotNum,
                size: '10 Marla',
                price: 5000000,
                type: 'Plot',
                status: 'Available',
                center: [lat, lng],
                coordinates: [],
                dimensions: '35 x 70',
                facing: 'East',
                roadWidth: '40 Feet',
                paymentPlan: { downPayment: 5000000, monthlyInstallments: 0, numberOfInstallments: 0, developmentChargesIncluded: true, possessionPeriodMonths: 0 },
                images: [],
                features: ['LDA City Verified'],
                description: `Block ${blk} Plot #${plotNum}`,
                balloted: true,
                fileNumber: plotNum,
              } as PlotRecord);
              handleLocateOnMap(rec);
            }}
            onSelectPlotForDetails={(invPlot) => {
              const rec = convertInventoryItemToPlotRecord(invPlot);
              handleOpenDetails(rec);
            }}
          />
        )}

        {/* Tab 3: Official LDA City Development Charges & Calculator */}
        {(activeTab === 'charges' || activeTab === 'hub' || activeTab === 'calculator') && (
          <DevelopmentCharges />
        )}

        {/* Tab 4: Seller / Dealer Portal */}
        {activeTab === 'seller' && (
          currentUser ? (
            <SellerPortal
              currentUser={currentUser}
              onUpdateUser={(updated: AppUserProfile) => {
                setCurrentUser(updated);
                showToast('Agency profile updated successfully.');
              }}
              onPlotAddedOrUpdated={handleSellerPlotPublished}
              onLocatePlotOnMap={(lat, lng, plotNum, blk) => {
                setActiveTab('map');
                showToast(`Navigated to ${blk} Plot #${plotNum} on Master Geo-Map.`);
              }}
            />
          ) : (
            <div className="max-w-xl mx-auto my-16 px-4">
              <div className="bg-[#1C2541] border border-[#D4AF37]/40 rounded-3xl p-8 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center mx-auto mb-5 text-[#D4AF37]">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white">LDA City Seller &amp; Agency Portal</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Join LDA City&apos;s digital proptech network. Sign in or register your agency to upload your plots directly onto the cadastral geo-map with coordinates, pricing, and company branding.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenAuthModal('login')}
                    className="w-full sm:w-auto px-6 py-3 bg-[#D4AF37] hover:bg-[#c29d2b] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-transform active:scale-95"
                  >
                    User / Agent Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuthModal('register')}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 cursor-pointer transition-colors"
                  >
                    Register New Agency
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* Tab 6: Admin Management Portal */}
        {activeTab === 'admin' && (
          <AdminPortal
            plots={plots}
            leads={leads}
            onUpdatePlotStatus={handleUpdatePlotStatus}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onAddNewPlot={handleAddNewPlot}
            onSelectPlotForMap={(plot) => handleLocateOnMap(plot)}
            onNavigateToMapPlot={(plotNum, blk) => {
              setActiveTab('map');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              showToast(`Navigated to ${blk} Plot #${plotNum} on Master Geo-Map.`);
            }}
          />
        )}

        {/* Tab 7: Office & Contact */}
        {activeTab === 'contact' && (
          <ContactSection
            onAddLead={handleAddLead}
            onPanToOffice={handlePanToOffice}
          />
        )}
      </main>

      {/* Plot Details Drawer / Modal */}
      <PlotDetailModal
        plot={modalPlot}
        onClose={() => setModalPlot(null)}
        onLocateOnMap={handleLocateOnMap}
        onAddLead={handleAddLead}
      />

      {/* Auth Modal (User Login, Register, Forgot Password, Admin Authorization) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        resetCode={authResetCode}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthResetCode(undefined);
        }}
        onLoginSuccess={(user: AppUserProfile) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          setAuthResetCode(undefined);
          if (user.role === 'admin') {
            setActiveTab('admin');
            showToast(`Master Admin Authorization Granted.`);
          } else {
            setActiveTab('seller');
            showToast(`Welcome back, ${user.displayName}! Seller portal ready.`);
          }
        }}
      />

      {/* PWA / Android Direct Installation Banner (Shows strictly once on main page and hides permanently) */}
      <PWAInstallBanner activeTab={activeTab} />

      {/* Luxury Corporate Footer (Admin Panel only visible post-login) */}
      <Footer 
        onNavigateTab={setActiveTab} 
        onOpenAuthModal={handleOpenAuthModal}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    </div>
  );
}
