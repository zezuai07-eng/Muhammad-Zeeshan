import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit, 
  Eye, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Upload, 
  Compass, 
  FileText, 
  DollarSign, 
  UserCheck, 
  Sparkles,
  Layers,
  ArrowRight,
  Mail,
  KeyRound,
  Home,
  FileCheck,
  Video,
  Image as ImageIcon,
  X,
  Camera,
  RotateCcw
} from 'lucide-react';
import { 
  AppUserProfile, 
  InventoryPlotItem, 
  addInventoryPlot, 
  fetchInventoryPlots, 
  deleteInventoryPlot, 
  updateInventoryPlot,
  saveUserProfile,
  submitSellerVerification,
  fetchSellerVerifications,
  sendPasswordReset,
  moveToRecycleBin,
  restoreFromRecycleBin,
  emptyRecycleBin,
  fetchTrashedPlots
} from '../utils/firebase';
import { useTheme } from '../context/ThemeContext';
import { BLOCK_CENTERS } from '../utils/masterDataService';
import { formatPKR } from '../utils/formatters';

interface SellerPortalProps {
  currentUser: AppUserProfile;
  onUpdateUser: (updatedUser: AppUserProfile) => void;
  onPlotAddedOrUpdated?: (plot: InventoryPlotItem) => void;
  onPlotDeleted?: (plotId: string) => void;
  onLocatePlotOnMap?: (lat: number, lng: number, plotNum: string, block: string) => void;
  initialTab?: 'upload' | 'myPlots' | 'verify' | 'profile';
}

// Utility to compress images to reasonable base64 data URLs
async function compressImageFile(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const SellerPortal: React.FC<SellerPortalProps> = ({
  currentUser,
  onUpdateUser,
  onPlotAddedOrUpdated,
  onPlotDeleted,
  onLocatePlotOnMap,
  initialTab = 'upload',
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'upload' | 'myPlots' | 'verify' | 'profile' | 'trash'>(initialTab);
  const [userPlots, setUserPlots] = useState<InventoryPlotItem[]>([]);
  const [trashedPlots, setTrashedPlots] = useState<InventoryPlotItem[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Plot Modal state
  const [editingPlot, setEditingPlot] = useState<InventoryPlotItem | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStatus, setEditStatus] = useState<'available' | 'under_offer' | 'sold'>('available');
  const [editFeatures, setEditFeatures] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Listing Type: 'Plot' | 'File' | 'House' | 'Commercial'
  const [propertyType, setPropertyType] = useState<'Plot' | 'File' | 'House' | 'Commercial'>('Plot');

  // Common Form Fields
  const [plotNumber, setPlotNumber] = useState('');
  const [block, setBlock] = useState('Block C');
  const [sector, setSector] = useState('Jinnah Sector');
  const [area, setArea] = useState('10 Marla');
  const [price, setPrice] = useState('');
  const [priceNum, setPriceNum] = useState<number>(0);
  const [features, setFeatures] = useState('Direct Transfer');
  const [status, setStatus] = useState<'available' | 'under_offer' | 'sold'>('available');
  const [description, setDescription] = useState('');
  const [plotLat, setPlotLat] = useState<number>(31.365);
  const [plotLng, setPlotLng] = useState<number>(74.348);
  
  // Specific Fields
  // For House:
  const [bedrooms, setBedrooms] = useState('4 Bed');
  const [bathrooms, setBathrooms] = useState('5 Bath');
  const [houseCondition, setHouseCondition] = useState('Brand New (Ready to Move)');
  const [houseStoreys, setHouseStoreys] = useState('Double Storey');

  // For File:
  const [fileType, setFileType] = useState('Allocation Letter');
  const [fileDuesStatus, setFileDuesStatus] = useState('Development Installments Active');

  // Media (Photos & Video)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Contact Info Specific to this Ad
  const [posterAgency, setPosterAgency] = useState(currentUser.agencyName || currentUser.displayName || '');
  const [posterMobile, setPosterMobile] = useState(currentUser.phone || '');
  const [posterWhatsapp, setPosterWhatsapp] = useState(currentUser.whatsapp || currentUser.phone || '');

  const [submittingPlot, setSubmittingPlot] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Verification Form State
  const [applicantName, setApplicantName] = useState(currentUser.displayName || '');
  const [applicantWhatsapp, setApplicantWhatsapp] = useState(currentUser.whatsapp || currentUser.phone || '');
  const [applicantCnic, setApplicantCnic] = useState('');
  const [applicantNotes, setApplicantNotes] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Profile Form State (User details & Logo upload in PNG/JPEG)
  const [profAgencyName, setProfAgencyName] = useState(currentUser.agencyName || '');
  const [profDisplayName, setProfDisplayName] = useState(currentUser.displayName || '');
  const [profLogo, setProfLogo] = useState(currentUser.agencyLogo || '');
  const [profPhone, setProfPhone] = useState(currentUser.phone || '');
  const [profWhatsapp, setProfWhatsapp] = useState(currentUser.whatsapp || '');
  const [profOffice, setProfOffice] = useState(currentUser.officeAddress || '');
  const [profBio, setProfBio] = useState(currentUser.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // Sync block coordinates
  useEffect(() => {
    const cleanBlock = block.replace(/^Block\s*/i, '').trim();
    if (BLOCK_CENTERS[cleanBlock]) {
      setPlotLat(BLOCK_CENTERS[cleanBlock][0]);
      setPlotLng(BLOCK_CENTERS[cleanBlock][1]);
    }
  }, [block]);

  // Load user's uploaded plots
  const loadUserPlots = async () => {
    setLoadingPlots(true);
    try {
      const allPlots = await fetchInventoryPlots();
      const my = allPlots.filter((p) => p.sellerUid === currentUser.uid);
      setUserPlots(my);
    } catch {
      // ignore
    } finally {
      setLoadingPlots(false);
    }
  };

  // Check verification requests
  const checkVerificationStatus = async () => {
    try {
      const verifications = await fetchSellerVerifications();
      const myReq = verifications.find((v) => v.userId === currentUser.uid);
      if (myReq && myReq.status === 'pending') {
        setVerificationPending(true);
      }
    } catch {
      // ignore
    }
  };

  // Load user's trashed plots
  const loadTrashedPlots = async () => {
    setLoadingTrash(true);
    try {
      const trashed = await fetchTrashedPlots(currentUser.uid);
      setTrashedPlots(trashed);
    } catch {
      // ignore
    } finally {
      setLoadingTrash(false);
    }
  };

  useEffect(() => {
    loadUserPlots();
    loadTrashedPlots();
    checkVerificationStatus();
  }, [currentUser.uid]);

  // Handle PNG/JPEG Logo Upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/png') && !file.type.includes('image/jpeg') && !file.type.includes('image/jpg')) {
      showNotification('Please select a valid PNG or JPEG image file for your logo.', 'error');
      return;
    }

    try {
      const compressed = await compressImageFile(file, 400, 400, 0.85);
      setProfLogo(compressed);
      showNotification('Logo loaded successfully! Click "Save Agency Profile" to apply.');
    } catch {
      showNotification('Failed to process logo image. Please try another file.', 'error');
    }
  };

  // Handle Listing Photos Upload (PNG/JPEG multiple)
  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImageFile(file, 1200, 900, 0.75);
          newImages.push(compressed);
        }
      }
      setUploadedPhotos((prev) => [...prev, ...newImages]);
      showNotification(`${newImages.length} photo(s) added successfully!`);
    } catch {
      showNotification('Error reading image files.', 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle Upload Ad
  const handleUploadAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotNumber.trim() || !price.trim()) {
      showNotification(`${propertyType === 'File' ? 'File Number' : 'Plot / House Number'} and Demand Price are required.`, 'error');
      return;
    }

    const finalAgency = posterAgency.trim() || currentUser.agencyName || currentUser.displayName || 'Authorized LDA City Agency';
    const finalPhone = posterMobile.trim() || currentUser.phone || '0300 1535898';
    const finalWhatsapp = posterWhatsapp.trim() || currentUser.whatsapp || finalPhone;

    setSubmittingPlot(true);
    try {
      let calculatedPrice = priceNum;
      if (!calculatedPrice || calculatedPrice <= 0) {
        const cleanStr = price.toLowerCase().trim();
        if (cleanStr.includes('crore') || cleanStr.includes('cr')) {
          const val = parseFloat(cleanStr.replace(/[^0-9.]/g, ''));
          calculatedPrice = (val || 1) * 10000000;
        } else if (cleanStr.includes('lakh') || cleanStr.includes('lac')) {
          const val = parseFloat(cleanStr.replace(/[^0-9.]/g, ''));
          calculatedPrice = (val || 50) * 100000;
        } else {
          const digitsOnly = parseFloat(cleanStr.replace(/[^0-9.]/g, ''));
          calculatedPrice = digitsOnly < 1000 ? digitsOnly * 100000 : (digitsOnly || 5000000);
        }
      }

      // Default fallback images based on property type
      let finalImages = uploadedPhotos;
      if (finalImages.length === 0) {
        if (propertyType === 'House') {
          finalImages = [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
          ];
        } else if (propertyType === 'File') {
          finalImages = [
            'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80'
          ];
        } else if (propertyType === 'Commercial') {
          finalImages = [
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'
          ];
        } else {
          finalImages = [
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
          ];
        }
      }

      const generatedFeatures = propertyType === 'House'
        ? `${bedrooms}, ${bathrooms}, ${houseStoreys}, ${houseCondition}`
        : propertyType === 'File'
        ? `${fileType}, ${fileDuesStatus}`
        : (features.trim() || 'Direct LDA Deal');

      const newPlotData: Omit<InventoryPlotItem, 'id' | 'createdAt'> = {
        plotNumber: plotNumber.trim(),
        block: block.trim(),
        sector: sector.trim(),
        area: area.trim(),
        price: price.trim(),
        priceNum: calculatedPrice,
        category: propertyType === 'Commercial' ? 'commercial' : 'residential',
        propertyType,
        images: finalImages,
        videoUrl: videoUrl.trim() || undefined,
        bedrooms: propertyType === 'House' ? bedrooms : undefined,
        bathrooms: propertyType === 'House' ? bathrooms : undefined,
        fileStatus: propertyType === 'File' ? fileType : undefined,
        features: generatedFeatures,
        status,
        paymentPlan: 'Full Cash / Lump Sum (Non-Installment)',
        description: description.trim() || `Prime ${area} ${propertyType} in ${sector}, ${block}, LDA City Lahore. Direct deal available with verified ownership.`,
        lat: Number(plotLat) || 31.365,
        lng: Number(plotLng) || 74.348,
        sellerUid: currentUser.uid,
        sellerName: currentUser.displayName || finalAgency,
        sellerPhone: finalPhone,
        sellerWhatsapp: finalWhatsapp,
        agencyName: finalAgency,
        agencyLogo: currentUser.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
        isVerifiedSeller: !!currentUser.isVerified,
      };

      const plotId = await addInventoryPlot(newPlotData);
      const createdItem: InventoryPlotItem = {
        ...newPlotData,
        id: plotId,
        createdAt: new Date().toISOString(),
      };

      // Persist contact details to user profile if missing
      if (!currentUser.agencyName || !currentUser.phone) {
        saveUserProfile(currentUser.uid, {
          agencyName: finalAgency,
          phone: finalPhone,
          whatsapp: finalWhatsapp
        }).then(() => {
          onUpdateUser({
            ...currentUser,
            agencyName: finalAgency,
            phone: finalPhone,
            whatsapp: finalWhatsapp
          });
        }).catch(() => {});
      }

      setUserPlots((prev) => [createdItem, ...prev]);
      if (onPlotAddedOrUpdated) {
        onPlotAddedOrUpdated(createdItem);
      }

      showNotification(`🎉 ${propertyType} #${plotNumber} in ${block} published successfully!`);
      // Reset form
      setPlotNumber('');
      setPrice('');
      setPriceNum(0);
      setDescription('');
      setUploadedPhotos([]);
      setVideoUrl('');
      setActiveTab('myPlots');
    } catch (err: unknown) {
      const error = err as { message?: string };
      showNotification(error.message || 'Failed to publish ad. Please check data.', 'error');
    } finally {
      setSubmittingPlot(false);
    }
  };

  // Password reset email
  const handleSendResetEmail = async () => {
    if (!currentUser.email) {
      showNotification('No registered email found for this account.', 'error');
      return;
    }
    setSendingReset(true);
    try {
      const msg = await sendPasswordReset(currentUser.email);
      showNotification(msg, 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      showNotification(e.message || 'Could not send reset email. Please retry.', 'error');
    } finally {
      setSendingReset(false);
    }
  };

  // Move Plot to Recycle Bin (Soft Delete)
  const handleMovePlotToRecycleBin = async (id: string, num: string) => {
    try {
      await moveToRecycleBin(id);
      const moved = userPlots.find((p) => p.id === id);
      setUserPlots((prev) => prev.filter((p) => p.id !== id));
      if (moved) {
        setTrashedPlots((prev) => [{ ...moved, isTrashed: true, trashedAt: new Date().toISOString() }, ...prev]);
      }
      if (onPlotDeleted) {
        onPlotDeleted(id);
      }
      showNotification(`Listing #${num} has been moved to Recycle Bin (Trash). You can restore it anytime!`);
    } catch {
      showNotification('Failed to move listing to Recycle Bin.', 'error');
    }
  };

  // Restore Plot from Recycle Bin
  const handleRestorePlot = async (id: string, num: string) => {
    try {
      await restoreFromRecycleBin(id);
      const restored = trashedPlots.find((p) => p.id === id);
      setTrashedPlots((prev) => prev.filter((p) => p.id !== id));
      if (restored) {
        const unTrashed = { ...restored, isTrashed: false };
        setUserPlots((prev) => [unTrashed, ...prev]);
        if (onPlotAddedOrUpdated) {
          onPlotAddedOrUpdated(unTrashed);
        }
      }
      showNotification(`Listing #${num} restored to live website and map!`);
    } catch {
      showNotification('Failed to restore listing.', 'error');
    }
  };

  // Empty Recycle Bin
  const handleEmptyTrash = async () => {
    if (!window.confirm('Are you sure you want to permanently delete ALL listings in your Recycle Bin? This action cannot be undone.')) {
      return;
    }
    try {
      await emptyRecycleBin(currentUser.uid);
      setTrashedPlots([]);
      showNotification('Recycle Bin emptied successfully.');
    } catch {
      showNotification('Failed to empty Recycle Bin.', 'error');
    }
  };

  // Open Edit Plot Modal
  const handleOpenEditPlot = (plot: InventoryPlotItem) => {
    setEditingPlot(plot);
    setEditPrice(plot.price || '');
    setEditStatus(plot.status || 'available');
    setEditFeatures(plot.features || '');
    setEditDescription(plot.description || '');
  };

  // Save Plot Updates
  const handleSavePlotEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;
    setSavingEdit(true);
    try {
      const updates: Partial<InventoryPlotItem> = {
        price: editPrice.trim(),
        status: editStatus,
        features: editFeatures.trim(),
        description: editDescription.trim(),
      };
      await updateInventoryPlot(editingPlot.id, updates);
      const updatedItem = { ...editingPlot, ...updates };
      setUserPlots((prev) => prev.map((p) => (p.id === editingPlot.id ? updatedItem : p)));
      if (onPlotAddedOrUpdated) {
        onPlotAddedOrUpdated(updatedItem);
      }
      setEditingPlot(null);
      showNotification(`Listing #${editingPlot.plotNumber} updated successfully!`);
    } catch {
      showNotification('Failed to save plot updates.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Plot / Ad Permanently
  const handleDeletePlot = async (id: string, num: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY remove listing #${num}?`)) {
      return;
    }
    try {
      await deleteInventoryPlot(id);
      setUserPlots((prev) => prev.filter((p) => p.id !== id));
      setTrashedPlots((prev) => prev.filter((p) => p.id !== id));
      if (onPlotDeleted) {
        onPlotDeleted(id);
      }
      showNotification(`Listing #${num} permanently removed.`);
    } catch {
      showNotification('Failed to delete listing.', 'error');
    }
  };

  // Toggle Plot Status
  const handleToggleStatus = async (plot: InventoryPlotItem, newStatus: 'available' | 'under_offer' | 'sold') => {
    try {
      await updateInventoryPlot(plot.id, { status: newStatus });
      setUserPlots((prev) => prev.map((p) => (p.id === plot.id ? { ...p, status: newStatus } : p)));
      if (onPlotAddedOrUpdated) {
        onPlotAddedOrUpdated({ ...plot, status: newStatus });
      }
      showNotification(`Listing #${plot.plotNumber} status updated to ${newStatus}.`);
    } catch {
      showNotification('Failed to update status.', 'error');
    }
  };

  // Submit Seller Verification
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantCnic.trim() || !applicantWhatsapp.trim()) {
      showNotification('CNIC Number and WhatsApp Number are required for verification.', 'error');
      return;
    }

    setSubmittingVerification(true);
    try {
      await submitSellerVerification({
        userId: currentUser.uid,
        applicantName: applicantName.trim(),
        whatsapp: applicantWhatsapp.trim(),
        cnic: applicantCnic.trim(),
        agencyName: profAgencyName.trim() || currentUser.agencyName || '',
        officeAddress: profOffice.trim() || currentUser.officeAddress || '',
        notes: applicantNotes.trim(),
      });
      setVerificationPending(true);
      showNotification('Verification submitted! Admin will verify your documents and badge.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      showNotification(e.message || 'Failed to submit verification request.', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Handle Save Profile & Logo
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profPhone.trim()) {
      showNotification('Phone Number is mandatory.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const updatedData: Partial<AppUserProfile> = {
        displayName: profDisplayName.trim() || currentUser.displayName,
        agencyName: profAgencyName.trim(),
        agencyLogo: profLogo.trim() || currentUser.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
        phone: profPhone.trim(),
        whatsapp: profWhatsapp.trim() || profPhone.trim(),
        officeAddress: profOffice.trim(),
        bio: profBio.trim(),
      };

      await saveUserProfile(currentUser.uid, updatedData);
      const updatedUser: AppUserProfile = {
        ...currentUser,
        ...updatedData,
      };
      onUpdateUser(updatedUser);
      showNotification('✓ Profile details and agency logo updated successfully!');
    } catch {
      showNotification('Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Notification Toast */}
      {feedbackMsg && (
        <div className="fixed top-20 right-6 z-[10010] animate-bounce">
          <div className={`px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border ${
            feedbackMsg.type === 'success' 
              ? 'bg-[#1C2541] border-emerald-500 text-emerald-300' 
              : 'bg-rose-950 border-rose-500 text-rose-300'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Hero Profile Banner */}
      <div className="bg-gradient-to-r from-[#1C2541] via-[#111A35] to-[#0B132B] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Agency Logo with click to edit */}
            <div className="relative group cursor-pointer" onClick={() => setActiveTab('profile')}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-0.5 shadow-xl shrink-0 overflow-hidden">
                <img
                  src={currentUser.agencyLogo || profLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                  alt={currentUser.agencyName || 'Agency Logo'}
                  className="w-full h-full object-cover rounded-[14px] bg-[#0B132B]"
                />
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-white">
                <Camera className="w-4 h-4 text-[#D4AF37]" />
              </div>
              {currentUser.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full shadow-md" title="Verified Seller">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {currentUser.agencyName || currentUser.displayName || 'Authorized Agency Desk'}
                </h2>
                {currentUser.isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/60 text-[10px] font-extrabold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>Verified Dealer</span>
                  </span>
                ) : verificationPending ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    <span>Verification Under Review</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('verify')}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-semibold cursor-pointer transition-colors"
                  >
                    <span>Unverified • Apply for Badge →</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                <span className="text-[#D4AF37] font-semibold">{currentUser.displayName}</span>
                {currentUser.phone && <span>📞 {currentUser.phone}</span>}
                {currentUser.whatsapp && <span>💬 WhatsApp: {currentUser.whatsapp}</span>}
              </p>
              {currentUser.officeAddress && (
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#D4AF37]" />
                  <span>{currentUser.officeAddress}</span>
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons & Counters */}
          <div className="flex items-center gap-3 sm:gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 flex-wrap sm:flex-nowrap">
            <div className={`px-4 py-3 rounded-2xl border text-center ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B132B]/80 border-slate-800'
            }`}>
              <span className="text-xl sm:text-2xl font-black text-[#D4AF37] block font-mono">
                {userPlots.length}
              </span>
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Active Ads
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-3 rounded-2xl border text-center cursor-pointer transition-all hover:scale-105 ${
                isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/40 border-rose-800/40'
              }`}
              title="View Recycle Bin"
            >
              <span className="text-xl sm:text-2xl font-black text-rose-400 block font-mono">
                {trashedPlots.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-rose-400">
                Recycle Bin
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-xs shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Ad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-3.5 rounded-2xl border font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                  : 'bg-[#0B132B] hover:bg-[#111A35] text-slate-200 border-slate-700 hover:border-[#D4AF37]/50'
              }`}
              title="Update Profile & Agency Logo"
            >
              <Edit className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Edit Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className={`flex flex-wrap items-center gap-2 mb-6 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <button
          type="button"
          onClick={() => { setActiveTab('myPlots'); loadUserPlots(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'myPlots'
              ? 'bg-[#D4AF37] text-[#0B132B] shadow-[0_0_15px_rgba(212,175,55,0.3)] font-black'
              : isLight
              ? 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-amber-400'
              : 'bg-[#1C2541] text-slate-300 hover:text-white border border-slate-700 hover:border-[#D4AF37]/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>My Live Ads ({userPlots.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-[#D4AF37] text-[#0B132B] shadow-[0_0_15px_rgba(212,175,55,0.3)] font-black'
              : isLight
              ? 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-amber-400'
              : 'bg-[#1C2541] text-slate-300 hover:text-white border border-slate-700 hover:border-[#D4AF37]/40'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Post New Ad</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('trash'); loadTrashedPlots(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeTab === 'trash'
              ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] font-black'
              : isLight
              ? 'bg-white text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-400'
              : 'bg-[#1C2541] text-slate-300 hover:text-white border border-slate-700 hover:border-rose-400/40'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Recycle Bin ({trashedPlots.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#D4AF37] text-[#0B132B] shadow-[0_0_15px_rgba(212,175,55,0.3)] font-black'
              : isLight
              ? 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-amber-400'
              : 'bg-[#1C2541] text-slate-300 hover:text-white border border-slate-700 hover:border-[#D4AF37]/40'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Profile &amp; Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verify')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'verify'
              ? 'bg-[#D4AF37] text-[#0B132B] shadow-[0_0_15px_rgba(212,175,55,0.3)] font-black'
              : isLight
              ? 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-amber-400'
              : 'bg-[#1C2541] text-slate-300 hover:text-white border border-slate-700 hover:border-[#D4AF37]/40'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verification Badge</span>
          {currentUser.isVerified && <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded-full">Active</span>}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UPLOAD AD (PLOTS, FILES, GHAR/HOUSES, WITH PHOTOS & VIDEOS)        */}
      {/* ========================================================================= */}
      {activeTab === 'upload' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="max-w-3xl mb-6">
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">
              Multi-Category Property Desk
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Publish New Ad (Plot, File, House / Ghar, Commercial)
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Add your plot, file, or house details with photos, video link, and your direct contact numbers.
            </p>
          </div>

          <form onSubmit={handleUploadAd} className="space-y-6">
            {/* Property Category Switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Listing Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setPropertyType('Plot')}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    propertyType === 'Plot'
                      ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-black shadow-lg'
                      : 'bg-[#0B132B] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="text-xs">Plot (Residential)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPropertyType('File')}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    propertyType === 'File'
                      ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-black shadow-lg'
                      : 'bg-[#0B132B] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <FileCheck className="w-5 h-5" />
                  <span className="text-xs">LDA City File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPropertyType('House')}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    propertyType === 'House'
                      ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-black shadow-lg'
                      : 'bg-[#0B132B] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span className="text-xs">House / Ghar (Villa)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPropertyType('Commercial')}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    propertyType === 'Commercial'
                      ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-black shadow-lg'
                      : 'bg-[#0B132B] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-xs">Commercial Unit</span>
                </button>
              </div>
            </div>

            {/* Basic Coordinates & Block */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sector *
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0B132B] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Jinnah Sector">Jinnah Sector (Phase 1)</option>
                  <option value="Iqbal Sector">Iqbal Sector</option>
                  <option value="Sector 1">Sector 1</option>
                  <option value="Sector 2">Sector 2</option>
                  <option value="Sector 3">Sector 3</option>
                  <option value="Sector 4">Sector 4</option>
                  <option value="Sector 5">Sector 5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Block *
                </label>
                <select
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0B132B] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-[#D4AF37] font-semibold focus:outline-none"
                >
                  <option value="Block A">Block A</option>
                  <option value="Block B">Block B</option>
                  <option value="Block C">Block C</option>
                  <option value="Block D">Block D</option>
                  <option value="Block E">Block E</option>
                  <option value="Block F">Block F</option>
                  <option value="Block G">Block G</option>
                  <option value="Block H">Block H</option>
                  <option value="Block J">Block J</option>
                  <option value="Block K">Block K</option>
                  <option value="Block L">Block L</option>
                  <option value="Block M">Block M</option>
                  <option value="Block N">Block N</option>
                  <option value="Block P">Block P</option>
                  <option value="Block Q">Block Q</option>
                  <option value="Eastern CBD">Eastern CBD</option>
                  <option value="Main CBD">Main CBD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {propertyType === 'File' ? 'File / Registration #' : propertyType === 'House' ? 'House # / Unit' : 'Plot #'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={propertyType === 'File' ? 'e.g. KP-LDA-7721' : 'e.g. 1042 or House #14'}
                  value={plotNumber}
                  onChange={(e) => setPlotNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0B132B] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            {/* Size & Demand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Size / Area *
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0B132B] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white focus:outline-none font-semibold"
                >
                  <option value="5 Marla">5 Marla</option>
                  <option value="10 Marla">10 Marla</option>
                  <option value="1 Kanal">1 Kanal</option>
                  <option value="2 Kanal">2 Kanal</option>
                  <option value="4 Marla Commercial">4 Marla Commercial</option>
                  <option value="8 Marla Commercial">8 Marla Commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Demand Price (PKR / Lakh / Crore) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 52 Lakh or 1.35 Crore"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0B132B] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-[#D4AF37] placeholder-slate-500 focus:outline-none font-bold font-mono"
                />
              </div>
            </div>

            {/* If HOUSE / GHAR: Show House Specific Inputs */}
            {propertyType === 'House' && (
              <div className="p-4 rounded-2xl bg-[#0B132B] border border-[#D4AF37]/30 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                  <Home className="w-4 h-4" />
                  <span>House / Ghar Specifications</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bedrooms</label>
                    <select
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="3 Bed">3 Bedrooms</option>
                      <option value="4 Bed">4 Bedrooms</option>
                      <option value="5 Bed">5 Bedrooms</option>
                      <option value="6+ Bed">6+ Bedrooms</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bathrooms</label>
                    <select
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="3 Bath">3 Baths</option>
                      <option value="4 Bath">4 Baths</option>
                      <option value="5 Bath">5 Baths</option>
                      <option value="6+ Bath">6+ Baths</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Storeys / Structure</label>
                    <select
                      value={houseStoreys}
                      onChange={(e) => setHouseStoreys(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="Double Storey">Double Storey</option>
                      <option value="Single Storey">Single Storey</option>
                      <option value="Triple Storey">Triple Storey</option>
                      <option value="Basement + Ground + 1">Basement + Ground + 1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Condition</label>
                    <select
                      value={houseCondition}
                      onChange={(e) => setHouseCondition(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="Brand New (Ready to Move)">Brand New (Ready to Move)</option>
                      <option value="Grey Structure">Grey Structure</option>
                      <option value="Furnished Designer Villa">Furnished Designer Villa</option>
                      <option value="Under Construction">Under Construction</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* If FILE: Show File Specific Inputs */}
            {propertyType === 'File' && (
              <div className="p-4 rounded-2xl bg-[#0B132B] border border-[#D4AF37]/30 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                  <FileCheck className="w-4 h-4" />
                  <span>LDA City File Category &amp; Dues Status</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">File Type</label>
                    <select
                      value={fileType}
                      onChange={(e) => setFileType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="Allocation Letter (Plot Allotted)">Allocation Letter (Plot Allotted)</option>
                      <option value="Exemption File">Exemption File</option>
                      <option value="Affidavit File">Affidavit File</option>
                      <option value="Balloting-Eligible File">Balloting-Eligible File</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Development Charges Status</label>
                    <select
                      value={fileDuesStatus}
                      onChange={(e) => setFileDuesStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="Development Charges Fully Paid (100%)">Development Charges Fully Paid (100%)</option>
                      <option value="Development Installments Active (Partially Paid)">Development Installments Active (Partially Paid)</option>
                      <option value="Development Charges Unpaid / Exemption">Development Charges Unpaid / Exemption</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Photos & Media Upload (PNG, JPEG) */}
            <div className="p-4 rounded-2xl bg-[#0B132B] border border-[#D4AF37]/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                  <ImageIcon className="w-4 h-4" />
                  <span>Upload Photos (PNG / JPEG) &amp; Video</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {uploadedPhotos.length} photo(s) selected
                </span>
              </div>

              {/* Photo Upload Trigger */}
              <div>
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotosChange}
                  multiple
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
                <div 
                  onClick={() => photoInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-[#D4AF37] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#111A35]/50 hover:bg-[#111A35]"
                >
                  <Upload className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">
                    Click to Upload Photos (PNG or JPEG)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload photos of the front elevation, street view, master plan, or file document.
                  </p>
                </div>
              </div>

              {/* Uploaded Thumbnails */}
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                  {uploadedPhotos.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={src} alt="Uploaded preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Video URL or Upload */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Property Video Tour Link (YouTube, Vimeo, TikTok, or Direct MP4)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or TikTok video link"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white"
                />
              </div>
            </div>

            {/* Poster Contact Details For This Ad */}
            <div className="p-4 rounded-2xl bg-[#0B132B] border border-[#D4AF37]/30 space-y-3">
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <Phone className="w-4 h-4" />
                <span>Poster WhatsApp &amp; Calling Numbers for Buyer Inquiries</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Agency / Seller Name
                  </label>
                  <input
                    type="text"
                    value={posterAgency}
                    onChange={(e) => setPosterAgency(e.target.value)}
                    placeholder="e.g. Kashpal Enterprises"
                    className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Calling Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={posterMobile}
                    onChange={(e) => setPosterMobile(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Direct WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={posterWhatsapp}
                    onChange={(e) => setPosterWhatsapp(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-[#25D366] font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Description &amp; Key Highlights
              </label>
              <textarea
                rows={3}
                placeholder="Direct owner, cleared LDA dues, immediate possession, near park..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submittingPlot || uploadingMedia}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-black text-sm shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submittingPlot ? (
                <span>Publishing Ad...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish {propertyType} Ad to Live Website &amp; Map</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY UPLOADED ADS                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'myPlots' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                My Uploaded Ads ({userPlots.length})
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage, edit, mark sold, or remove your listings from the live portal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className="py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0B132B] font-bold text-xs shadow-md hover:bg-[#E5C158] transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Post Another Ad</span>
            </button>
          </div>

          {loadingPlots ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading your uploaded ads...
            </div>
          ) : userPlots.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-slate-700 rounded-2xl bg-[#0B132B]/50">
              <Layers className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-1">
                No ads uploaded yet
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                You haven&apos;t posted any plots, files, or houses yet. Click below to add your first listing!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] text-[#0B132B] font-extrabold text-xs shadow-lg cursor-pointer"
              >
                Post New Ad
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPlots.map((plot) => (
                <div
                  key={plot.id}
                  className="bg-[#0B132B] border border-slate-700 hover:border-[#D4AF37]/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {plot.sector} • {plot.block}
                        </span>
                        <h4 className="text-lg font-bold text-white">
                          #{plot.plotNumber}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          plot.status === 'available'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                            : plot.status === 'under_offer'
                            ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {plot.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-2 border-y border-slate-800 my-2">
                      <span className="text-slate-400">Size: <strong className="text-white">{plot.area}</strong></span>
                      <span className="text-[#D4AF37] font-bold font-mono text-sm">{plot.price}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-1 mb-2">
                      {plot.features || plot.description}
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>WhatsApp: <strong className="text-emerald-400">{plot.sellerWhatsapp || plot.sellerPhone}</strong></span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold">{plot.propertyType || 'Plot'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between mt-3 flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(plot, plot.status === 'available' ? 'sold' : 'available')}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-bold cursor-pointer ${
                          plot.status === 'available'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                        }`}
                      >
                        {plot.status === 'available' ? 'Mark Sold' : 'Available'}
                      </button>

                      {plot.lat && plot.lng && onLocatePlotOnMap && (
                        <button
                          type="button"
                          onClick={() => onLocatePlotOnMap(plot.lat!, plot.lng!, plot.plotNumber, plot.block)}
                          className="text-[10px] px-2 py-1 rounded-lg border border-[#D4AF37]/40 bg-[#1C2541] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-slate-950 font-bold cursor-pointer transition-colors flex items-center gap-1"
                          title="Locate on Master Cadastral Map"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Map</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlot(plot)}
                        className="p-1.5 text-amber-400 hover:text-slate-950 hover:bg-amber-400 rounded-lg cursor-pointer transition-colors border border-amber-400/30"
                        title="Edit Listing details, price and status"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Move to Recycle Bin (Trash) Button */}
                      <button
                        type="button"
                        onClick={() => handleMovePlotToRecycleBin(plot.id, plot.plotNumber)}
                        className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg cursor-pointer transition-colors border border-rose-500/30"
                        title="Move to Recycle Bin (Trash)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RECYCLE BIN (TRASH)                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'trash' && (
        <div className={`border rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#1C2541]/90 border-slate-700/80'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Recycle Bin (Deleted Listings) ({trashedPlots.length})
                </h3>
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Listings moved to Recycle Bin are hidden from the live website and map. You can restore them anytime or permanently delete them.
              </p>
            </div>

            {trashedPlots.length > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Recycle Bin</span>
              </button>
            )}
          </div>

          {loadingTrash ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading Recycle Bin...
            </div>
          ) : trashedPlots.length === 0 ? (
            <div className={`text-center py-16 px-4 border border-dashed rounded-2xl ${
              isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-[#0B132B]/50'
            }`}>
              <Trash2 className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h4 className={`text-base font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                Recycle Bin is empty
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No deleted listings in your trash. Any ad you send to Recycle Bin will be stored here safely where you can restore it anytime.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trashedPlots.map((plot) => (
                <div
                  key={plot.id}
                  className={`border rounded-2xl p-4 shadow-lg flex flex-col justify-between ${
                    isLight ? 'bg-rose-50/60 border-rose-200' : 'bg-[#0B132B] border-rose-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                          Trashed • {plot.sector} • {plot.block}
                        </span>
                        <h4 className={`text-lg font-bold line-through opacity-80 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                          #{plot.plotNumber}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
                        In Trash
                      </span>
                    </div>

                    <div className={`flex items-center justify-between text-xs py-2 border-y my-2 ${
                      isLight ? 'border-slate-200' : 'border-slate-800'
                    }`}>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                        Size: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{plot.area}</strong>
                      </span>
                      <span className="text-[#D4AF37] font-bold font-mono text-sm">{plot.price}</span>
                    </div>

                    <p className={`text-[11px] line-clamp-1 mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {plot.features || plot.description}
                    </p>

                    {plot.trashedAt && (
                      <span className="text-[10px] text-slate-500 block">
                        Deleted: {new Date(plot.trashedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className={`pt-3 border-t flex items-center justify-between mt-3 gap-2 ${
                    isLight ? 'border-slate-200' : 'border-slate-800'
                  }`}>
                    <button
                      type="button"
                      onClick={() => handleRestorePlot(plot.id, plot.plotNumber)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore to Live</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePlot(plot.id, plot.plotNumber)}
                      className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg cursor-pointer transition-colors border border-rose-300 dark:border-rose-800"
                      title="Permanently Delete Forever"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROFILE DETAILS & PNG/JPEG LOGO UPLOAD                              */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md max-w-3xl">
          <div className="mb-6">
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">
              User Profile &amp; Corporate Identity
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Account Details &amp; Agency Logo Upload
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Update your agency name, logo (PNG or JPEG), contact numbers, and office address anytime. Your logo and WhatsApp number will display on every ad you post.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Logo Upload Section (PNG/JPEG file or URL) */}
            <div className="p-4 rounded-2xl bg-[#0B132B] border border-[#D4AF37]/30 space-y-3">
              <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                Agency Logo (PNG or JPEG File)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview */}
                <div className="w-20 h-20 rounded-2xl bg-[#1C2541] border-2 border-[#D4AF37]/50 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
                  {profLogo ? (
                    <img src={profLogo} alt="Agency Logo" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-500" />
                  )}
                </div>

                {/* File Upload Controls */}
                <div className="flex-1 w-full">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose PNG / JPEG Logo</span>
                    </button>
                    {profLogo && (
                      <button
                        type="button"
                        onClick={() => setProfLogo('')}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Reset Logo
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Accepts PNG or JPEG. Optimal size: square ratio (e.g. 500x500 px).
                  </p>
                </div>
              </div>
            </div>

            {/* Agency Name & Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company / Agency Name
                </label>
                <input
                  type="text"
                  value={profAgencyName}
                  onChange={(e) => setProfAgencyName(e.target.value)}
                  placeholder="e.g. Skyline Real Estate"
                  className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contact Person / Full Name
                </label>
                <input
                  type="text"
                  value={profDisplayName}
                  onChange={(e) => setProfDisplayName(e.target.value)}
                  placeholder="e.g. Malik Usman"
                  className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Calling Phone & WhatsApp Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official Calling Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="0300 1234567"
                  className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={profWhatsapp}
                  onChange={(e) => setProfWhatsapp(e.target.value)}
                  placeholder="0300 1234567"
                  className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-[#25D366] font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Office Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Site Office / Head Office Address
              </label>
              <input
                type="text"
                value={profOffice}
                onChange={(e) => setProfOffice(e.target.value)}
                placeholder="e.g. Office #12, 180 Ft Main Boulevard, LDA City Lahore"
                className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Agency Bio / Introduction
              </label>
              <textarea
                rows={3}
                value={profBio}
                onChange={(e) => setProfBio(e.target.value)}
                placeholder="Specialist in LDA City plots, files, and residential villas..."
                className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? 'Saving Details...' : 'Save Profile & Update Logo'}
            </button>
          </form>

          {/* Password Reset Section */}
          <div className="mt-8 pt-6 border-t border-slate-700/80">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-[#D4AF37]" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Account Security &amp; Password Reset
              </h4>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Agar aap apna portal password tabdeel krna chahte hain, toh neeche diye gaye button per click karein. Aapki registered email (<strong className="text-[#D4AF37]">{currentUser.email}</strong>) per direct password reset link rawana kr diya jaye ga.
            </p>
            <button
              type="button"
              disabled={sendingReset}
              onClick={handleSendResetEmail}
              className="py-2.5 px-4 rounded-xl bg-[#0B132B] hover:bg-[#111A35] text-[#D4AF37] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-xs font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-md"
            >
              <Mail className="w-4 h-4 text-[#D4AF37]" />
              <span>{sendingReset ? 'Sending Reset Link...' : `Send Password Reset Link to ${currentUser.email}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VERIFIED SELLER ACCREDITATION                                      */}
      {/* ========================================================================= */}
      {activeTab === 'verify' && (
        <div className="bg-[#1C2541]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Verified Dealer Accreditation</h3>
              <p className="text-xs text-slate-300">Earn the official gold verified shield for your agency.</p>
            </div>
          </div>

          {currentUser.isVerified ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-white">Your Agency is Fully Verified!</h4>
              <p className="text-xs text-slate-300 mt-1">
                Your listings now proudly display the official LDA City Verified Seller badge on the Geo-Map and Property Marketplace.
              </p>
            </div>
          ) : verificationPending ? (
            <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-center">
              <Clock className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-white">Application Under Review</h4>
              <p className="text-xs text-slate-300 mt-1">
                Your verification documents have been submitted to Master Admin for clearance. You will receive badge activation shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitVerification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Applicant Name *</label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CNIC Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="35202-xxxxxxx-x"
                    value={applicantCnic}
                    onChange={(e) => setApplicantCnic(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0300 1234567"
                    value={applicantWhatsapp}
                    onChange={(e) => setApplicantWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Reference / Office Notes</label>
                <textarea
                  rows={3}
                  value={applicantNotes}
                  onChange={(e) => setApplicantNotes(e.target.value)}
                  placeholder="e.g. Office located on 180 Ft Main Boulevard, active member of Lahore Realtors Association..."
                  className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingVerification}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingVerification ? 'Submitting Application...' : 'Submit for Manual Admin Verification'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PLOT MODAL                                                           */}
      {/* ========================================================================= */}
      {editingPlot && (
        <div className="fixed inset-0 z-[10070] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div 
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white border-amber-400 text-slate-800' : 'bg-[#0B132B] border-[#D4AF37]/50 text-white'
            }`}
          >
            <div className={`p-5 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#1C2541] border-slate-800'
            }`}>
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-base font-bold">
                  Edit Listing #{editingPlot.plotNumber} ({editingPlot.block})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlot(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlotEdit} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Demand / Price (e.g. 52 Lakh or 1.35 Crore) *
                </label>
                <input
                  type="text"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#D4AF37] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1C2541] border-slate-700 text-white font-mono font-bold'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Listing Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#D4AF37] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1C2541] border-slate-700 text-white'
                  }`}
                >
                  <option value="available">Available (For Sale)</option>
                  <option value="under_offer">Under Offer / Reserved</option>
                  <option value="sold">Sold Out</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Key Features / Location Highlights</label>
                <input
                  type="text"
                  value={editFeatures}
                  onChange={(e) => setEditFeatures(e.target.value)}
                  placeholder="e.g. Direct transfer, Facing Park, Corner, 60ft Road"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#D4AF37] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1C2541] border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#D4AF37] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1C2541] border-slate-700 text-white'
                  }`}
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlot(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save & Update Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
