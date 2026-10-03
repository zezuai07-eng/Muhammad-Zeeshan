import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  Download, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Layers, 
  FileText, 
  ExternalLink,
  ChevronDown,
  X,
  Sparkles,
  Share2,
  Lock,
  Tag,
  Eye,
  RefreshCw,
  QrCode,
  Fingerprint,
  Edit3,
  Check,
  Receipt as ReceiptIcon,
  HelpCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  AppUserProfile, 
  InventoryPlotItem, 
  addInventoryPlot, 
  fetchInventoryPlots, 
  deleteInventoryPlot, 
  updateInventoryPlot,
  checkPlotClaimStatus 
} from '../utils/firebase';
import { BLOCK_CENTERS } from '../utils/masterDataService';
import { formatPKR, generateWhatsAppLink } from '../utils/formatters';

interface InventoryPortalProps {
  currentUser?: AppUserProfile | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onLocatePlotOnMap?: (lat: number, lng: number, plotNum: string, block: string, plotItem?: InventoryPlotItem) => void;
  onSelectPlotForDetails?: (plot: InventoryPlotItem) => void;
}

const LDA_BLOCKS = [
  'A', 'A1', 'B', 'B1', 'C', 'D', 'E', 'F', 'G', 'G1', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q',
  'AA', 'BB', 'CC', 'Eastern CBD', 'Main CBD'
];

const LDA_SIZES = [
  '5 Marla',
  '10 Marla',
  '1 Kanal',
  '2 Kanal',
  '4 Marla Commercial',
  '8 Marla Commercial'
];

export const InventoryPortal: React.FC<InventoryPortalProps> = ({
  currentUser,
  onOpenAuthModal,
  onLocatePlotOnMap,
  onSelectPlotForDetails,
}) => {
  // State
  const [plots, setPlots] = useState<InventoryPlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedSize, setSelectedSize] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'available' | 'under_offer' | 'sold'>('All');
  const [viewScope, setViewScope] = useState<'all' | 'my'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'plot_asc'>('newest');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSlipPlot, setSelectedSlipPlot] = useState<InventoryPlotItem | null>(null);

  // ========================================================================
  // RECEIPT & AGREEMENT SUITE STATES (Simple, Token Money, Bayana Deed)
  // ========================================================================
  const [receiptType, setReceiptType] = useState<'simple' | 'token' | 'bayana'>('simple');
  const [receiptSubView, setReceiptSubView] = useState<'preview' | 'edit'>('preview');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Agreement & Voucher Dynamic Editable Fields
  const [slipPlotNum, setSlipPlotNum] = useState('');
  const [slipBlock, setSlipBlock] = useState('');
  const [slipSector, setSlipSector] = useState('Jinnah Sector');
  const [slipSize, setSlipSize] = useState('10 Marla');
  const [slipAmountDecided, setSlipAmountDecided] = useState<number | ''>('');
  const [slipAmountReceived, setSlipAmountReceived] = useState<number | ''>('');
  const [slipPaymentMode, setSlipPaymentMode] = useState('Cash');
  const [slipPaymentRef, setSlipPaymentRef] = useState('');
  const [slipReceivedBy, setSlipReceivedBy] = useState('');
  
  // Parties & Witness details (as requested by user)
  const [buyerName, setBuyerName] = useState('');
  const [buyerCnic, setBuyerCnic] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerCnic, setSellerCnic] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  
  // Witness (Gawah) details
  const [witnessName, setWitnessName] = useState('');
  const [witnessCnic, setWitnessCnic] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  
  // Deadline & Custom Clauses
  const [transferDeadlineDate, setTransferDeadlineDate] = useState('');
  const [customRemarks, setCustomRemarks] = useState('');

  // Add Form State
  const [formBlock, setFormBlock] = useState('A');
  const [formSector, setFormSector] = useState('Jinnah Sector');
  const [formPlotNumber, setFormPlotNumber] = useState('');
  const [formSize, setFormSize] = useState('10 Marla');
  const [formCategory, setFormCategory] = useState<'residential' | 'commercial'>('residential');
  const [formPropertyType, setFormPropertyType] = useState<'Plot' | 'File' | 'House' | 'Commercial'>('Plot');
  const [formFeatures, setFormFeatures] = useState('Standard');
  const [formPriceNumber, setFormPriceNumber] = useState<number | ''>('');
  const [formPaymentPlan, setFormPaymentPlan] = useState('Full Cash / Lump Sum');
  const [formDescription, setFormDescription] = useState('');
  const [formAgencyName, setFormAgencyName] = useState('');
  const [formSellerName, setFormSellerName] = useState('');
  const [formSellerPhone, setFormSellerPhone] = useState('0300 1535898');
  const [formSellerWhatsapp, setFormSellerWhatsapp] = useState('0300 1535898');

  // Form claim check state
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{
    checked: boolean;
    isClaimed: boolean;
    isOwnedByCurrentUser: boolean;
    claimedByAgency?: string;
  }>({ checked: false, isClaimed: false, isOwnedByCurrentUser: false });

  // Form submission state
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Load Inventory Data
  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchInventoryPlots();
      setPlots(data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Pre-fill user profile info when opening form
  useEffect(() => {
    if (currentUser) {
      setFormAgencyName(currentUser.agencyName || currentUser.displayName || 'Authorized Agency');
      setFormSellerName(currentUser.displayName || 'Property Consultant');
      if (currentUser.phone) setFormSellerPhone(currentUser.phone);
      if (currentUser.whatsapp) setFormSellerWhatsapp(currentUser.whatsapp);
    } else {
      setFormAgencyName('Kashpal Authorized Agency');
      setFormSellerName('Property Consultant');
    }
  }, [currentUser, isAddModalOpen]);

  // Live Claim Check Debounce
  useEffect(() => {
    const cleanPlot = formPlotNumber.trim().toUpperCase();
    const cleanBlock = formBlock.trim().toUpperCase();

    if (!cleanPlot) {
      setClaimStatus({ checked: false, isClaimed: false, isOwnedByCurrentUser: false });
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingClaim(true);
      try {
        const res = await checkPlotClaimStatus(cleanBlock, cleanPlot, currentUser?.uid);
        setClaimStatus({
          checked: true,
          isClaimed: res.isClaimed,
          isOwnedByCurrentUser: res.isOwnedByCurrentUser,
          claimedByAgency: res.claimedByAgency,
        });
      } catch (err) {
        console.warn(err);
      } finally {
        setIsCheckingClaim(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formBlock, formPlotNumber, currentUser]);

  // Filtered and Sorted Plots
  const filteredPlots = useMemo(() => {
    return plots.filter((plot) => {
      // Exclude trashed
      if (plot.isTrashed) return false;

      // My listings scope
      if (viewScope === 'my') {
        if (!currentUser) return false;
        if (plot.sellerUid !== currentUser.uid && currentUser.role !== 'admin') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesPlot = plot.plotNumber.toLowerCase().includes(q);
        const matchesBlock = plot.block.toLowerCase().includes(q);
        const matchesAgency = (plot.agencyName || '').toLowerCase().includes(q);
        const matchesSector = (plot.sector || '').toLowerCase().includes(q);
        const matchesFeatures = (plot.features || '').toLowerCase().includes(q);
        if (!matchesPlot && !matchesBlock && !matchesAgency && !matchesSector && !matchesFeatures) {
          return false;
        }
      }

      // Block filter
      if (selectedBlock !== 'All' && plot.block.toUpperCase() !== selectedBlock.toUpperCase()) {
        return false;
      }

      // Sector filter
      if (selectedSector !== 'All' && plot.sector !== selectedSector) {
        return false;
      }

      // Size filter
      if (selectedSize !== 'All' && !plot.area.toLowerCase().includes(selectedSize.toLowerCase().replace(' commercial', ''))) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'All' && plot.status !== selectedStatus) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'price_asc') {
        return (a.priceNum || 0) - (b.priceNum || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.priceNum || 0) - (a.priceNum || 0);
      }
      if (sortBy === 'plot_asc') {
        return a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true });
      }
      return 0;
    });
  }, [plots, searchTerm, selectedBlock, selectedSector, selectedSize, selectedStatus, viewScope, sortBy, currentUser]);

  // KPI Statistics
  const stats = useMemo(() => {
    const activePlots = plots.filter((p) => !p.isTrashed);
    const available = activePlots.filter((p) => p.status === 'available');
    const underOffer = activePlots.filter((p) => p.status === 'under_offer');
    const sold = activePlots.filter((p) => p.status === 'sold');
    const totalVal = activePlots.reduce((sum, p) => sum + (p.priceNum || 0), 0);
    const agencies = new Set(activePlots.map((p) => p.agencyName).filter(Boolean));

    return {
      total: activePlots.length,
      available: available.length,
      underOffer: underOffer.length,
      sold: sold.length,
      totalVal,
      agenciesCount: agencies.size,
    };
  }, [plots]);

  // Handle Form Submit
  const handleAddPlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formPlotNumber.trim()) {
      setFormError('Please enter a valid plot number.');
      return;
    }

    if (!formPriceNumber || Number(formPriceNumber) <= 0) {
      setFormError('Please enter a valid price/demand amount.');
      return;
    }

    if (claimStatus.isClaimed && !claimStatus.isOwnedByCurrentUser) {
      setFormError(`Conflict: Plot #${formPlotNumber} in Block ${formBlock} is already registered by "${claimStatus.claimedByAgency}". You cannot upload a duplicate plot number.`);
      return;
    }

    setFormSubmitting(true);
    try {
      const cleanBlock = formBlock.trim().toUpperCase();
      const cleanPlot = formPlotNumber.trim().toUpperCase();

      // Estimate lat/lng based on block center
      const center = BLOCK_CENTERS[cleanBlock] || [31.352, 74.348];
      const lat = center[0];
      const lng = center[1];

      const numVal = Number(formPriceNumber);
      const priceFormatted = formatPKR(numVal);

      await addInventoryPlot({
        plotNumber: cleanPlot,
        block: cleanBlock,
        sector: formSector,
        area: formSize,
        price: priceFormatted,
        priceNum: numVal,
        category: formCategory,
        propertyType: formPropertyType,
        features: formFeatures,
        status: 'available',
        paymentPlan: formPaymentPlan,
        description: formDescription.trim() || `LDA City ${formSector} Block ${cleanBlock} Plot #${cleanPlot}. Prime location registered by ${formAgencyName}.`,
        lat,
        lng,
        sellerUid: currentUser?.uid || 'guest-dealer',
        sellerName: formSellerName || currentUser?.displayName || 'Registered Dealer',
        sellerPhone: formSellerPhone || '0300 1535898',
        sellerWhatsapp: formSellerWhatsapp || '0300 1535898',
        agencyName: formAgencyName || currentUser?.agencyName || 'Authorized Real Estate Agency',
        agencyLogo: currentUser?.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
        isVerifiedSeller: !!currentUser?.isVerified,
      });

      setFormSuccess(`✓ Plot #${cleanPlot} in Block ${cleanBlock} added successfully to LDA City inventory!`);
      await loadInventory();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormPlotNumber('');
        setFormPriceNumber('');
        setFormDescription('');
        setFormSuccess(null);
      }, 1200);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e.message || 'Failed to upload inventory plot.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Plot
  const handleDeletePlot = async (plotId: string, plotNum: string, block: string) => {
    if (!window.confirm(`Are you sure you want to delete Plot #${plotNum} (Block ${block}) from inventory?\n\nOnce deleted, this plot number will be freed and other agencies can upload it.`)) {
      return;
    }

    try {
      await deleteInventoryPlot(plotId);
      await loadInventory();
    } catch (err) {
      console.error('Delete plot error:', err);
      alert('Failed to delete plot from inventory.');
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (plotId: string, newStatus: 'available' | 'under_offer' | 'sold') => {
    try {
      await updateInventoryPlot(plotId, { status: newStatus });
      await loadInventory();
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // Open Slip / Agreement Generator Modal with specific type
  const handleOpenSlipModal = (plot: InventoryPlotItem, type: 'simple' | 'token' | 'bayana' = 'simple') => {
    setSelectedSlipPlot(plot);
    setReceiptType(type);
    setSlipPlotNum(plot.plotNumber);
    setSlipBlock(plot.block);
    setSlipSector(plot.sector || 'Jinnah Sector');
    setSlipSize(plot.area || '10 Marla');
    
    const decided = plot.priceNum || (parseFloat(plot.price.replace(/[^0-9.]/g, '')) * (plot.price.toLowerCase().includes('crore') ? 10000000 : 100000)) || 5000000;
    setSlipAmountDecided(decided);
    setSlipAmountReceived(type === 'token' ? 500000 : type === 'bayana' ? Math.round(decided * 0.15) : 0);
    setSlipReceivedBy(plot.sellerName || plot.agencyName || 'Authorized Consultant');
    setSellerName(plot.sellerName || plot.agencyName || 'Authorized Consultant');
    setSellerPhone(plot.sellerPhone || '0300 1535898');
    setSellerCnic('');
    setBuyerName('');
    setBuyerCnic('');
    setBuyerPhone('');
    setWitnessName('');
    setWitnessCnic('');
    setWitnessPhone('');
    setSlipPaymentMode('Cash');
    setSlipPaymentRef('');
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (type === 'bayana' ? 30 : 15));
    setTransferDeadlineDate(targetDate.toISOString().slice(0, 10));
    setCustomRemarks('');
    setReceiptSubView('preview');
  };

  // Safe Native Print with Fallback
  const handleSafePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Native window.print failed, triggering high-res PDF generation:', err);
      handleDownloadPdfVoucher();
    }
  };

  // 1-Click High Resolution PDF Downloader using html2canvas & jsPDF
  const handleDownloadPdfVoucher = async () => {
    const el = document.getElementById('printable-slip-modal') || document.getElementById('printable-slip-voucher');
    if (!el) {
      window.print();
      return;
    }
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`LDA_City_${receiptType.toUpperCase()}_Receipt_Plot_${slipPlotNum}_Block_${slipBlock}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      // Fallback
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Share Receipt Summary on WhatsApp
  const handleShareWhatsApp = () => {
    if (!selectedSlipPlot) return;
    const balance = typeof slipAmountDecided === 'number' && typeof slipAmountReceived === 'number'
      ? slipAmountDecided - slipAmountReceived
      : 0;

    const text = `*LDA CITY LAHORE - OFFICIAL ${receiptType.toUpperCase()} RECEIPT*\n` +
      `--------------------------------\n` +
      `*Plot Details:* Plot #${slipPlotNum}, Block ${slipBlock} (${slipSize}, ${slipSector})\n` +
      `*Total Decided Price:* PKR ${typeof slipAmountDecided === 'number' ? formatPKR(slipAmountDecided) : slipAmountDecided}\n` +
      (receiptType !== 'simple' ? `*Token/Bayana Received:* PKR ${typeof slipAmountReceived === 'number' ? formatPKR(slipAmountReceived) : slipAmountReceived}\n` : '') +
      (receiptType !== 'simple' ? `*Remaining Balance:* PKR ${formatPKR(balance)}\n` : '') +
      `*Payment Mode:* ${slipPaymentMode} ${slipPaymentRef ? `(Ref: ${slipPaymentRef})` : ''}\n` +
      (buyerName ? `*Purchaser / Buyer:* ${buyerName} ${buyerCnic ? `(CNIC: ${buyerCnic})` : ''}\n` : '') +
      (sellerName ? `*Seller / Agency:* ${sellerName} (${selectedSlipPlot.agencyName})\n` : '') +
      (transferDeadlineDate ? `*Target Transfer Date:* ${transferDeadlineDate}\n` : '') +
      `--------------------------------\n` +
      `_Issued through Kashpal Enterprises & Builders PropTech Cadastral Engine_\n` +
      `Site Office: 180 Ft Main Boulevard, LDA City Lahore`;

    window.open(generateWhatsAppLink(buyerPhone || selectedSlipPlot.sellerWhatsapp || '03001535898', text), '_blank');
  };

  // Print Full Inventory Sheet
  const handlePrintInventory = () => {
    try {
      window.print();
    } catch {
      handleExportCSV();
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Sr', 'Block', 'Plot #', 'Sector', 'Size', 'Category', 'Demand (PKR)', 'Status', 'Features', 'Agency', 'Phone', 'Date Added'];
    const rows = filteredPlots.map((p, idx) => [
      idx + 1,
      p.block,
      p.plotNumber,
      p.sector,
      p.area,
      p.category,
      p.priceNum || p.price,
      p.status,
      `"${p.features || 'Standard'}"`,
      `"${p.agencyName || ''}"`,
      p.sellerPhone || '',
      new Date(p.createdAt).toLocaleDateString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LDA_City_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#080E21] text-slate-100 pb-20 selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      {/* 
        ========================================================================
        PRINT STYLESHEET (Applies only when window.print() is executed)
        ========================================================================
      */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          ${selectedSlipPlot ? `
            #printable-inventory-section {
              display: none !important;
            }
            #printable-slip-modal, #printable-slip-modal * {
              visibility: visible !important;
            }
            #printable-slip-modal {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 15px !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: 2px solid #D4AF37 !important;
            }
          ` : `
            #printable-inventory-section, #printable-inventory-section * {
              visibility: visible !important;
            }
            #printable-inventory-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
              padding: 20px !important;
            }
          `}
        }
      `}</style>

      {/* Top Banner / Corporate Headline */}
      <section className="bg-gradient-to-b from-[#111A35] via-[#0B132B] to-[#080E21] border-b border-[#D4AF37]/20 pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1">
                <Building2 className="w-4 h-4 text-[#D4AF37]" />
                <span>PropTech Real Estate ERP Software</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400">Exclusive Plot Claim Protection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                LDA City Property Inventory Ledger
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Centralized real estate inventory software for LDA City Lahore. Upload plots, files, and houses with verified agency branding, instant Cadastral GIS map sync, and duplicate plot protection.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handlePrintInventory}
                className="px-3.5 py-2 rounded-xl bg-[#1C2541] hover:bg-[#253256] text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Print complete filtered inventory ledger (A4 Sheet)"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                <span>Print Ledger</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-[#1C2541] hover:bg-[#253256] text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Download CSV spreadsheet for Excel"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentUser) {
                    setIsAddModalOpen(true);
                  } else if (onOpenAuthModal) {
                    onOpenAuthModal('login');
                  } else {
                    setIsAddModalOpen(true);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Add Plot to Inventory</span>
              </button>
            </div>
          </div>

          {/* KPI Statistics Dock */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-[#111A35]/80 border border-slate-800 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Listings</span>
              <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block">{stats.total}</span>
            </div>

            <div className="bg-[#111A35]/80 border border-emerald-500/30 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Available Plots</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5 block">{stats.available}</span>
            </div>

            <div className="bg-[#111A35]/80 border border-amber-500/30 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Under Offer</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5 block">{stats.underOffer}</span>
            </div>

            <div className="bg-[#111A35]/80 border border-rose-500/30 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">Sold Records</span>
              <span className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5 block">{stats.sold}</span>
            </div>

            <div className="bg-[#111A35]/80 border border-slate-800 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Active Agencies</span>
              <span className="text-xl sm:text-2xl font-black text-[#D4AF37] mt-0.5 block">{stats.agenciesCount}</span>
            </div>

            <div className="bg-[#111A35]/80 border border-[#D4AF37]/30 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] uppercase font-bold text-[#D4AF37] block tracking-wider">Portfolio Value</span>
              <span className="text-base sm:text-lg font-black text-white mt-1 block truncate" title={`PKR ${stats.totalVal.toLocaleString()}`}>
                {formatPKR(stats.totalVal)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-4">
        {/* Filter and Control Bar */}
        <div className="bg-[#111A35] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Plot Number, Block, Agency Name, or Features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B132B] border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Scope Toggle: All Market vs My Agency */}
            <div className="flex items-center gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Market Inventory ({plots.filter(p => !p.isTrashed).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser && onOpenAuthModal) {
                    onOpenAuthModal('login');
                  } else {
                    setViewScope('my');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewScope === 'my'
                    ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>My Listings</span>
                {currentUser && (
                  <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.2 rounded-full">
                    {plots.filter(p => !p.isTrashed && p.sellerUid === currentUser.uid).length}
                  </span>
                )}
              </button>
            </div>

            {/* View Mode Toggle: Table vs Cards */}
            <div className="flex items-center gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#1C2541] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Table Ledger
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-[#1C2541] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cards View
              </button>
            </div>
          </div>

          {/* Quick Filter Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-300">
            {/* Block Select */}
            <div className="flex items-center gap-1.5 shrink-0 bg-[#0B132B] px-3 py-1.5 rounded-xl border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Block:</span>
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#0B132B]">All Blocks</option>
                {LDA_BLOCKS.map((b) => (
                  <option key={b} value={b} className="bg-[#0B132B]">Block {b}</option>
                ))}
              </select>
            </div>

            {/* Sector Select */}
            <div className="flex items-center gap-1.5 shrink-0 bg-[#0B132B] px-3 py-1.5 rounded-xl border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Sector:</span>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#0B132B]">All Sectors</option>
                <option value="Jinnah Sector" className="bg-[#0B132B]">Jinnah Sector</option>
                <option value="Iqbal Sector" className="bg-[#0B132B]">Iqbal Sector</option>
              </select>
            </div>

            {/* Size Select */}
            <div className="flex items-center gap-1.5 shrink-0 bg-[#0B132B] px-3 py-1.5 rounded-xl border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Size:</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#0B132B]">All Sizes</option>
                {LDA_SIZES.map((s) => (
                  <option key={s} value={s} className="bg-[#0B132B]">{s}</option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div className="flex items-center gap-1.5 shrink-0 bg-[#0B132B] px-3 py-1.5 rounded-xl border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#0B132B]">All Statuses</option>
                <option value="available" className="bg-[#0B132B] text-emerald-400">Available</option>
                <option value="under_offer" className="bg-[#0B132B] text-amber-400">Under Offer</option>
                <option value="sold" className="bg-[#0B132B] text-rose-400">Sold</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 shrink-0 bg-[#0B132B] px-3 py-1.5 rounded-xl border border-slate-700/80 ml-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-[#0B132B]">Recently Added</option>
                <option value="price_asc" className="bg-[#0B132B]">Price: Low to High</option>
                <option value="price_desc" className="bg-[#0B132B]">Price: High to Low</option>
                <option value="plot_asc" className="bg-[#0B132B]">Plot Number (1, 2, 3..)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadInventory}
              className="p-2 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] border border-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
              title="Refresh Inventory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 
          ========================================================================
          PRINTABLE INVENTORY LEDGER (Shown on Screen and Cleanly Formatted for Print)
          ========================================================================
        */}
        <div id="printable-inventory-section" className="space-y-4">
          {/* Printable Header (Visible during print) */}
          <div className="hidden print:block mb-4 pb-4 border-b-2 border-black">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-black">KASHPAL ENTERPRISES &amp; BUILDERS</h2>
                <p className="text-xs text-gray-700 font-bold uppercase tracking-wider">
                  Official LDA City Lahore Property Inventory Ledger
                </p>
                <p className="text-[10px] text-gray-600">
                  Head Office: 180 Ft Main Boulevard, LDA City Lahore • Tel: 0300 1535898 / 0326 4509700
                </p>
              </div>
              <div className="text-right text-[10px] text-gray-600">
                <p>Printed on: {new Date().toLocaleString()}</p>
                <p>Total Records: {filteredPlots.length}</p>
                <p>LDA Cadastral Verified</p>
              </div>
            </div>
          </div>

          {/* TABLE LEDGER VIEW */}
          {viewMode === 'table' ? (
            <div className="bg-[#0E1738] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200 border-collapse">
                  <thead className="bg-[#111A35] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800 select-none">
                    <tr>
                      <th className="py-3.5 px-3">Sr</th>
                      <th className="py-3.5 px-3">Plot # &amp; Block</th>
                      <th className="py-3.5 px-3">Sector &amp; Size</th>
                      <th className="py-3.5 px-3">Category</th>
                      <th className="py-3.5 px-3">Demand (PKR)</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-3">Listing Agency</th>
                      <th className="py-3.5 px-3">Contact</th>
                      <th className="py-3.5 px-3 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]" />
                          <span>Loading LDA City inventory ledger...</span>
                        </td>
                      </tr>
                    ) : filteredPlots.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-slate-400">
                          <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-60" />
                          <h4 className="text-base font-bold text-white">No Inventory Plots Found</h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            No listings match your selected filters. Try changing block or search criteria, or add a new plot to the inventory.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-4 px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Add First Plot</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredPlots.map((plot, index) => {
                        const isOwner = currentUser && (plot.sellerUid === currentUser.uid || currentUser.role === 'admin');
                        return (
                          <tr 
                            key={plot.id} 
                            className="hover:bg-[#162145] transition-colors group"
                          >
                            {/* Sr */}
                            <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                              {index + 1}
                            </td>

                            {/* Plot # & Block */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#1C2541] border border-[#D4AF37]/40 flex items-center justify-center font-black text-xs text-[#D4AF37] shrink-0 font-mono shadow-sm">
                                  {plot.block}
                                </div>
                                <div>
                                  <div className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5">
                                    <span>Plot #{plot.plotNumber}</span>
                                    {plot.features && plot.features !== 'Standard' && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold font-sans">
                                        {plot.features}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block font-medium">
                                    Block {plot.block}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Sector & Size */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-200 text-xs">
                                {plot.area}
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                {plot.sector}
                              </span>
                            </td>

                            {/* Category & Type */}
                            <td className="py-3 px-3">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                plot.category === 'commercial'
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                                  : 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                              }`}>
                                {plot.propertyType || (plot.category === 'commercial' ? 'Commercial' : 'Residential')}
                              </span>
                            </td>

                            {/* Demand (PKR) */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-black text-white text-xs sm:text-sm">
                                {plot.priceNum ? formatPKR(plot.priceNum) : plot.price}
                              </div>
                              <span className="text-[9.5px] text-slate-400 block font-mono">
                                {plot.paymentPlan || 'Cash / Lump Sum'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              {isOwner ? (
                                <select
                                  value={plot.status}
                                  onChange={(e) => handleUpdateStatus(plot.id, e.target.value as any)}
                                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                                    plot.status === 'available'
                                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                                      : plot.status === 'under_offer'
                                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                                      : 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                                  }`}
                                >
                                  <option value="available" className="bg-[#0B132B] text-emerald-400">Available</option>
                                  <option value="under_offer" className="bg-[#0B132B] text-amber-400">Under Offer</option>
                                  <option value="sold" className="bg-[#0B132B] text-rose-400">Sold</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                  plot.status === 'available'
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                                    : plot.status === 'under_offer'
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                                    : 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    plot.status === 'available' ? 'bg-emerald-400' : plot.status === 'under_offer' ? 'bg-amber-400' : 'bg-rose-400'
                                  }`} />
                                  <span>{plot.status.replace('_', ' ')}</span>
                                </span>
                              )}
                            </td>

                            {/* Listing Agency */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={plot.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                                  alt=""
                                  className="w-6 h-6 rounded-md object-cover border border-[#D4AF37]/50 shrink-0"
                                />
                                <div className="min-w-0 max-w-[130px]">
                                  <div className="font-bold text-white text-[11px] truncate flex items-center gap-1">
                                    <span>{plot.agencyName || 'Authorized Agency'}</span>
                                    {plot.isVerifiedSeller && (
                                      <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[9px] text-slate-400 block truncate">
                                    {plot.sellerName || 'Dealer'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Contact Hotline */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${plot.sellerPhone || '03001535898'}`}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                                  title={`Call: ${plot.sellerPhone || '0300 1535898'}`}
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                </a>
                                <a
                                  href={generateWhatsAppLink(
                                    plot.sellerWhatsapp || plot.sellerPhone || '03001535898',
                                    `Salam, I am inquiring about LDA City Plot #${plot.plotNumber} in Block ${plot.block} (${plot.area}) listed in your inventory.`
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 transition-colors"
                                  title="WhatsApp Chat"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                </a>
                              </div>
                            </td>

                            {/* Actions Dock */}
                            <td className="py-3 px-3 text-right no-print">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Print Slip Button */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedSlipPlot(plot)}
                                  className="p-1.5 rounded-lg bg-[#1C2541] hover:bg-[#27355c] text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
                                  title="Print Official Plot Token Slip / Booking Voucher"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Locate on Map Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onLocatePlotOnMap) {
                                      onLocatePlotOnMap(plot.lat || 31.352, plot.lng || 74.348, plot.plotNumber, plot.block, plot);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-[#1C2541] hover:bg-[#27355c] text-[#D4AF37] hover:text-[#E5C158] border border-[#D4AF37]/30 transition-colors cursor-pointer"
                                  title="Locate on Cadastral Map"
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button (Only for Owner or Admin) */}
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePlot(plot.id, plot.plotNumber, plot.block)}
                                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-500/40 transition-colors cursor-pointer"
                                    title="Delete from inventory (Frees plot number for other agencies)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARDS GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlots.map((plot) => {
                const isOwner = currentUser && (plot.sellerUid === currentUser.uid || currentUser.role === 'admin');
                return (
                  <div
                    key={plot.id}
                    className="bg-[#111A35] border border-slate-800 hover:border-[#D4AF37]/60 rounded-2xl p-4 transition-all shadow-xl flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#1C2541] text-[#D4AF37] border border-[#D4AF37]/40 font-mono">
                            {plot.block} - #{plot.plotNumber}
                          </span>
                          {plot.features && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold truncate max-w-[90px]">
                              {plot.features}
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          plot.status === 'available'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            : plot.status === 'under_offer'
                            ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                            : 'bg-rose-950 text-rose-300 border-rose-500/40'
                        }`}>
                          {plot.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Demand & Sector */}
                      <div className="mb-3">
                        <div className="text-lg font-black text-white font-mono">
                          {plot.priceNum ? formatPKR(plot.priceNum) : plot.price}
                        </div>
                        <div className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                          <span>{plot.area}</span>
                          <span>•</span>
                          <span>{plot.sector}</span>
                        </div>
                      </div>

                      {/* Agency Dossier */}
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0B132B] border border-slate-800/80 mb-3">
                        <img
                          src={plot.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                          alt=""
                          className="w-7 h-7 rounded-lg object-cover border border-[#D4AF37]/40 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                            <span>{plot.agencyName || 'Authorized Agency'}</span>
                            {plot.isVerifiedSeller && (
                              <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {plot.sellerName || 'Agent'} • {plot.sellerPhone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5 no-print">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSlipPlot(plot)}
                          className="p-2 rounded-xl bg-[#1C2541] hover:bg-[#253256] text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Print Plot Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Slip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (onLocatePlotOnMap) {
                              onLocatePlotOnMap(plot.lat || 31.352, plot.lng || 74.348, plot.plotNumber, plot.block, plot);
                            }
                          }}
                          className="p-2 rounded-xl bg-[#1C2541] hover:bg-[#253256] text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Locate on Map"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Map</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={generateWhatsAppLink(
                            plot.sellerWhatsapp || plot.sellerPhone || '03001535898',
                            `Salam, I am inquiring about LDA City Plot #${plot.plotNumber} in Block ${plot.block} listed in your inventory.`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlot(plot.id, plot.plotNumber, plot.block)}
                            className="p-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 cursor-pointer"
                            title="Delete plot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        MODAL 1: ADD NEW PLOT TO INVENTORY (With Unique Plot Claim Protection)
        ========================================================================
      */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[10080] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print">
          <div className="relative w-full max-w-2xl bg-[#0B132B] border border-[#D4AF37]/50 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-[#1C2541] to-[#111A35] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37]">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Add Plot to LDA City Inventory
                  </h3>
                  <p className="text-xs text-[#D4AF37]">
                    Unique Claim System: Once registered, only your agency can hold this plot number.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-[#0B132B] text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleAddPlotSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Notifications */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2 shadow-md">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-start gap-2 shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formSuccess}</span>
                </div>
              )}

              {/* SECTION 1: Block & Plot Identification (Core Unique Key) */}
              <div className="bg-[#111A35] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Cadastral Identification &amp; Exclusive Claim</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Sector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Sector <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formSector}
                      onChange={(e) => setFormSector(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="Jinnah Sector">Jinnah Sector</option>
                      <option value="Iqbal Sector">Iqbal Sector</option>
                    </select>
                  </div>

                  {/* Block */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Block <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formBlock}
                      onChange={(e) => setFormBlock(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-black font-mono focus:outline-none focus:border-[#D4AF37]"
                    >
                      {LDA_BLOCKS.map((b) => (
                        <option key={b} value={b}>Block {b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Plot Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Plot Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 145"
                        value={formPlotNumber}
                        onChange={(e) => setFormPlotNumber(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-black font-mono focus:outline-none focus:border-[#D4AF37]"
                      />
                      {isCheckingClaim && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time Unique Claim Status Banner */}
                {claimStatus.checked && formPlotNumber.trim() && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    claimStatus.isClaimed && !claimStatus.isOwnedByCurrentUser
                      ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                      : claimStatus.isClaimed && claimStatus.isOwnedByCurrentUser
                      ? 'bg-blue-950/70 border-blue-500/50 text-blue-300'
                      : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  }`}>
                    {claimStatus.isClaimed && !claimStatus.isOwnedByCurrentUser ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <div>
                          <strong className="block text-white">⚠️ Plot #{formPlotNumber} is already registered!</strong>
                          <span>Claimed by &ldquo;{claimStatus.claimedByAgency}&rdquo;. Another agency cannot upload this plot until the first owner deletes it from inventory.</span>
                        </div>
                      </>
                    ) : claimStatus.isClaimed && claimStatus.isOwnedByCurrentUser ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <strong className="block text-white">ℹ️ You currently own this listing</strong>
                          <span>Updating will modify your existing plot record in Block {formBlock}.</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <strong className="block text-white">✓ Available to Register</strong>
                          <span>Plot #{formPlotNumber} in Block {formBlock} is free. Your agency will receive exclusive listing protection.</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 2: Plot Specifications */}
              <div className="bg-[#111A35] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider">
                  Plot Specifications &amp; Pricing
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Size */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Plot Size <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                    >
                      {LDA_SIZES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Property Type
                    </label>
                    <select
                      value={formPropertyType}
                      onChange={(e) => setFormPropertyType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="Plot">On-Ground Plot</option>
                      <option value="File">Balloted File</option>
                      <option value="House">Built Villa / House</option>
                      <option value="Commercial">Commercial Corridor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Demand / Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Demand / Total Price (PKR) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 7500000 (75 Lakhs)"
                      value={formPriceNumber}
                      onChange={(e) => setFormPriceNumber(e.target.value ? Number(e.target.value) : '')}
                      required
                      min={100000}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-black font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                    {formPriceNumber && Number(formPriceNumber) > 0 && (
                      <span className="text-[10px] text-[#D4AF37] font-bold mt-1 block">
                        Preview: {formatPKR(Number(formPriceNumber))}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Location Features
                    </label>
                    <select
                      value={formFeatures}
                      onChange={(e) => setFormFeatures(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="Standard">Standard (General Plot)</option>
                      <option value="Corner">Corner (+10% value)</option>
                      <option value="Facing Park">Facing Park (+10% value)</option>
                      <option value="150ft Main Boulevard">150ft Main Boulevard (+15% value)</option>
                      <option value="80ft Road">80ft Sector Road</option>
                      <option value="Pair Plot">Pair Plot (2 Adjacent Plots)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Agency & Agent Credentials */}
              <div className="bg-[#111A35] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider">
                  Agency &amp; Contact Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Agency Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kashpal Enterprises & Builders"
                      value={formAgencyName}
                      onChange={(e) => setFormAgencyName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Agent / Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Muhammad Kashif"
                      value={formSellerName}
                      onChange={(e) => setFormSellerName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Contact Phone <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="0300 1535898"
                      value={formSellerPhone}
                      onChange={(e) => setFormSellerPhone(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      WhatsApp Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="0300 1535898"
                      value={formSellerWhatsapp}
                      onChange={(e) => setFormSellerWhatsapp(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Plot Description &amp; Private Agent Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter details: pegged lot, direct owner token, immediate transfer, clear title..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formSubmitting || (claimStatus.isClaimed && !claimStatus.isOwnedByCurrentUser)}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                    claimStatus.isClaimed && !claimStatus.isOwnedByCurrentUser
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 active:scale-95'
                  }`}
                >
                  {formSubmitting ? 'Registering Claim...' : '+ Save Plot to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        MODAL 2: PRINTABLE OFFICIAL PLOT TOKEN SLIP / BOOKING VOUCHER
        ========================================================================
      */}
      {selectedSlipPlot && (
        <div className="fixed inset-0 z-[10090] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div 
            id="printable-slip-modal"
            className="relative w-full max-w-xl bg-white text-slate-900 border-4 border-[#D4AF37] rounded-3xl shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[92vh]"
          >
            {/* Top Close / Print bar (hidden in print) */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 no-print">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Official Booking Voucher &amp; Plot Slip
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-[#D4AF37] text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlipPlot(null)}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slip Header */}
            <div className="text-center pb-4 border-b-2 border-gray-900">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building2 className="w-6 h-6 text-[#D4AF37]" />
                <h2 className="text-2xl font-black tracking-tight text-gray-950">
                  {selectedSlipPlot.agencyName || 'KASHPAL ENTERPRISES & BUILDERS'}
                </h2>
              </div>
              <p className="text-xs font-bold text-[#B89628] uppercase tracking-widest">
                LDA City Lahore Master Consultants &amp; PropTech Engine
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Site Office: 180 Ft Main Boulevard, LDA City, Lahore • Hotline: 0300 1535898 / 0326 4509700
              </p>
            </div>

            {/* Voucher Ref & Date */}
            <div className="flex items-center justify-between text-xs py-3 border-b border-gray-200 font-mono">
              <span><strong>Slip Ref:</strong> LDA-{selectedSlipPlot.block}-{selectedSlipPlot.plotNumber}-{Date.now().toString().slice(-4)}</span>
              <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
            </div>

            {/* Primary Plot Dossier */}
            <div className="my-5 bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">Property Identification</span>
                  <h3 className="text-2xl font-black text-gray-950">
                    Plot #{selectedSlipPlot.plotNumber}, Block {selectedSlipPlot.block}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">Sector</span>
                  <span className="text-sm font-bold text-gray-900">{selectedSlipPlot.sector}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block">Size:</span>
                  <strong className="text-gray-900">{selectedSlipPlot.area}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Category:</span>
                  <strong className="text-gray-900 capitalize">{selectedSlipPlot.category}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Features:</span>
                  <strong className="text-gray-900">{selectedSlipPlot.features || 'Standard'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Status:</span>
                  <strong className="text-emerald-700 capitalize">{selectedSlipPlot.status.replace('_', ' ')}</strong>
                </div>
              </div>
            </div>

            {/* Financial Demand */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 block tracking-wider">Demanded Total Price</span>
                <span className="text-2xl font-black text-gray-950 font-mono">
                  {selectedSlipPlot.priceNum ? formatPKR(selectedSlipPlot.priceNum) : selectedSlipPlot.price}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Payment Mode</span>
                <span className="text-xs font-bold text-gray-800">{selectedSlipPlot.paymentPlan || 'Cash / Lump Sum'}</span>
              </div>
            </div>

            {/* Agency Consultant & Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 text-xs">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Authorized Agency</p>
                <p className="font-bold text-gray-900">{selectedSlipPlot.agencyName}</p>
                <p className="text-gray-700">{selectedSlipPlot.sellerName}</p>
                <p className="font-mono text-gray-700">Phone: {selectedSlipPlot.sellerPhone}</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Exclusive Claim ID</p>
                <p className="font-mono text-xs font-bold text-gray-900">LDA-{selectedSlipPlot.block}-{selectedSlipPlot.plotNumber}</p>
                <p className="text-[10px] text-emerald-700 font-bold mt-1">✓ Cadastral Protected</p>
              </div>
            </div>

            {/* Signature Lines */}
            <div className="grid grid-cols-2 gap-8 pt-10 mt-6 border-t border-gray-300 text-center text-xs">
              <div>
                <div className="border-t border-gray-400 pt-1 font-bold text-gray-800">
                  Client / Buyer Signature
                </div>
              </div>
              <div>
                <div className="border-t border-gray-400 pt-1 font-bold text-gray-800">
                  Authorized Consultant / Stamp
                </div>
              </div>
            </div>

            {/* Fine print */}
            <p className="text-[9px] text-gray-400 text-center mt-6">
              This inventory voucher is generated through Kashpal Enterprises LDA City PropTech software. Rates and availability subject to confirmation with site registry.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
