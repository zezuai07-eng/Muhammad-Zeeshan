import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Phone, 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2,
  Eye, 
  Sparkles,
  ShieldCheck,
  Search,
  ExternalLink,
  Lock,
  Mail,
  User,
  LogOut,
  KeyRound,
  MapPin,
  Check,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldAlert,
  Send,
  Building,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  Copy,
  RotateCcw
} from 'lucide-react';
import { PlotRecord, LeadRecord, PlotStatus } from '../types';
import { formatPKR, formatPKRFull, generateWhatsAppLink } from '../utils/formatters';
import {
  auth,
  loginAppUser,
  logoutAppUser,
  sendPasswordReset,
  fetchAllUsers,
  saveUserProfile,
  deleteUserDoc,
  fetchInventoryPlots,
  addInventoryPlot,
  updateInventoryPlot,
  deleteInventoryPlot,
  moveToRecycleBin,
  restoreFromRecycleBin,
  fetchTrashedPlots,
  emptyRecycleBin,
  fetchSellerVerifications,
  updateSellerVerificationStatus,
  createAdminManagedUser,
  AppUserProfile,
  UserRole,
  InventoryPlotItem,
  SellerVerificationItem,
  MASTER_ADMIN_PASSWORD
} from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AdminPortalProps {
  plots: PlotRecord[];
  leads: LeadRecord[];
  onUpdatePlotStatus: (plotId: string, status: PlotStatus) => void;
  onUpdateLeadStatus: (leadId: string, status: 'New' | 'Contacted' | 'Closed') => void;
  onAddNewPlot: (newPlot: PlotRecord) => void;
  onSelectPlotForMap: (plot: PlotRecord) => void;
  onNavigateToMapPlot?: (plotNumber: string, block: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  plots,
  leads,
  onUpdatePlotStatus,
  onUpdateLeadStatus,
  onAddNewPlot,
  onSelectPlotForMap,
  onNavigateToMapPlot,
}) => {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login form states (Strictly blank - zero password exposure)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState<boolean>(false);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // Registration states for new Dealer / Agency
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAgency, setRegAgency] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOffice, setRegOffice] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Dashboard Tab state - default to 'users' so all registered users data is shown immediately upon login!
  const [activeTab, setActiveTab] = useState<'users' | 'inventory' | 'agency' | 'verifications' | 'addPlot' | 'trash'>('users');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fine-grained RBAC state & Role Simulation
  // Allows testing & demonstration of Admin vs Moderator vs Registered User access
  const [simulatedRole, setSimulatedRole] = useState<'real' | 'admin' | 'moderator' | 'user'>('real');
  const effectiveRole: UserRole = simulatedRole === 'real' ? (currentUser?.role || 'admin') : (simulatedRole as UserRole);
  const [showRbacModal, setShowRbacModal] = useState<boolean>(false);

  // Recycle Bin / Trashed Plots States
  const [trashedPlots, setTrashedPlots] = useState<InventoryPlotItem[]>([]);
  const [loadingTrash, setLoadingTrash] = useState<boolean>(false);

  // Edit Plot Listing States (Admin full capability)
  const [editingPlot, setEditingPlot] = useState<InventoryPlotItem | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStatus, setEditStatus] = useState<'available' | 'under_offer' | 'sold'>('available');
  const [editFeatures, setEditFeatures] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editBlock, setEditBlock] = useState('');
  const [editSector, setEditSector] = useState('');
  const [savingPlotEdit, setSavingPlotEdit] = useState<boolean>(false);

  // Seller Verifications
  const [verifications, setVerifications] = useState<SellerVerificationItem[]>([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);

  // Cloud Inventory States
  const [cloudInventory, setCloudInventory] = useState<InventoryPlotItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add Inventory Plot Form
  const [plotNumber, setPlotNumber] = useState('');
  const [plotBlock, setPlotBlock] = useState('Block J');
  const [plotSector, setPlotSector] = useState('Jinnah Sector');
  const [plotArea, setPlotArea] = useState('5 Marla');
  const [plotPrice, setPlotPrice] = useState('48 Lakh');
  const [plotCategory, setPlotCategory] = useState<'residential' | 'commercial'>('residential');
  const [plotFeatures, setPlotFeatures] = useState('Main 150ft Boulevard, Direct Allotment');
  const [plotStatus, setPlotStatus] = useState<'available' | 'under_offer' | 'sold'>('available');
  const [plotDescription, setPlotDescription] = useState('Prime location plot ready for immediate full cash transfer at LDA One-Window Directorate.');
  const [addPlotLoading, setAddPlotLoading] = useState<boolean>(false);

  // Agency Profile Form (Zameen.com style)
  const [agencyName, setAgencyName] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyWhatsapp, setAgencyWhatsapp] = useState('');
  const [agencyLogo, setAgencyLogo] = useState('');
  const [agencyOffice, setAgencyOffice] = useState('');
  const [agencyBio, setAgencyBio] = useState('');
  const [savingAgency, setSavingAgency] = useState<boolean>(false);

  // Users List & Full Management (Admin access)
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'All' | 'admin' | 'moderator' | 'user' | 'dealer' | 'seller'>('All');
  const [userVerifiedFilter, setUserVerifiedFilter] = useState<'All' | 'verified' | 'unverified'>('All');
  const [userSortColumn, setUserSortColumn] = useState<'name' | 'email' | 'role' | 'verified'>('name');
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('asc');
  const [userViewMode, setUserViewMode] = useState<'table' | 'cards'>('table');
  const [editingUser, setEditingUser] = useState<AppUserProfile | null>(null);
  const [viewingUserDetails, setViewingUserDetails] = useState<AppUserProfile | null>(null);
  const [savingUserEdit, setSavingUserEdit] = useState<boolean>(false);

  // Add New User Modal State (Admin can add any user: Admin, Moderator, Registered User)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserWhatsapp, setNewUserWhatsapp] = useState('');
  const [newUserAgency, setNewUserAgency] = useState('');
  const [newUserOffice, setNewUserOffice] = useState('');
  const [newUserVerified, setNewUserVerified] = useState<boolean>(false);
  const [addingUserLoading, setAddingUserLoading] = useState<boolean>(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Edit user form fields
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAgencyName, setEditAgencyName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editOfficeAddress, setEditOfficeAddress] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAgencyLogo, setEditAgencyLogo] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('dealer');
  const [editIsVerified, setEditIsVerified] = useState<boolean>(false);

  // Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // If logged in, fetch profile
          const profile = await loginAppUser(user.email || '', '');
          setCurrentUser(profile);
          populateAgencyForm(profile);
        } catch (e) {
          console.warn('Silent auth check note:', e);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const populateAgencyForm = (user: AppUserProfile) => {
    setAgencyName(user.agencyName || 'Kashpal Enterprises & Builders');
    setAgencyPhone(user.phone || '0300 1535898');
    setAgencyWhatsapp(user.whatsapp || '0300 1535898');
    setAgencyLogo(user.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80');
    setAgencyOffice(user.officeAddress || '180 Ft LDA Road, Gajjumata, Lahore');
    setAgencyBio(user.bio || 'LDA City Official Real Estate Consultant & Master Inventory Dealer');
  };

  // Load Inventory from Cloud
  const loadCloudInventory = async () => {
    setInventoryLoading(true);
    try {
      const items = await fetchInventoryPlots();
      if (items.length > 0) {
        setCloudInventory(items);
      } else {
        // Seed default initial verified cash plots
        const initialSeed: Omit<InventoryPlotItem, 'id' | 'createdAt'>[] = [
          {
            plotNumber: '78',
            block: 'Block J',
            sector: 'Jinnah Sector',
            area: '5 Marla',
            price: '48 Lakh',
            category: 'residential',
            features: '150ft Highway Front, Near Commercial',
            status: 'available',
            paymentPlan: '100% Cash / Lump Sum (Non-Installment)',
            description: 'Direct allotment transfer plot in Block J. Complete cleared file.',
            sellerUid: 'seed_admin',
            sellerName: 'Zeeshan Kashpal',
            sellerPhone: '0300 1535898',
            sellerWhatsapp: '0300 1535898',
            agencyName: 'Kashpal Enterprises & Builders',
            agencyLogo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
          },
          {
            plotNumber: '714',
            block: 'Block C',
            sector: 'Jinnah Sector',
            area: '10 Marla',
            price: '88 Lakh',
            category: 'residential',
            features: 'Park Facing, Corner, 60ft Road',
            status: 'available',
            paymentPlan: '100% Cash / Lump Sum (Non-Installment)',
            description: 'Prime 10 Marla park facing plot in Sector C.',
            sellerUid: 'seed_admin',
            sellerName: 'Ibrahim Real Estate',
            sellerPhone: '0326 4509700',
            sellerWhatsapp: '0326 4509700',
            agencyName: 'Ibrahim Real Estate LDA Desk',
            agencyLogo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=160&q=80',
          },
          {
            plotNumber: '24',
            block: 'Block A',
            sector: 'Jinnah Sector',
            area: '1 Kanal',
            price: '1.65 Crore',
            category: 'residential',
            features: '100ft Boulevard, Ready Possession',
            status: 'under_offer',
            paymentPlan: '100% Cash / Lump Sum (Non-Installment)',
            description: 'Exclusive 1 Kanal plot in fully developed Block A near LDA Avenue 1.',
            sellerUid: 'seed_admin',
            sellerName: 'Zeeshan Kashpal',
            sellerPhone: '0300 1535898',
            sellerWhatsapp: '0300 1535898',
            agencyName: 'Kashpal Enterprises & Builders',
            agencyLogo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
          },
        ];

        for (const item of initialSeed) {
          await addInventoryPlot(item);
        }
        const refreshed = await fetchInventoryPlots();
        setCloudInventory(refreshed);
      }
    } catch (e) {
      console.error('Error fetching inventory:', e);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Load Users from Cloud
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await fetchAllUsers();
      setAllUsers(users);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadTrashed = async () => {
    setLoadingTrash(true);
    try {
      const items = await fetchTrashedPlots();
      setTrashedPlots(items);
    } catch (e) {
      console.error('Error loading trashed plots:', e);
    } finally {
      setLoadingTrash(false);
    }
  };

  useEffect(() => {
    loadCloudInventory();
    loadTrashed();
    loadUsers(); // Load all registered users immediately so data is ready upon login
  }, []);

  const loadVerifications = async () => {
    setLoadingVerifications(true);
    try {
      const list = await fetchSellerVerifications();
      setVerifications(list);
    } catch {
      // ignore
    } finally {
      setLoadingVerifications(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin' || effectiveRole === 'admin') {
      if (activeTab === 'users') {
        loadUsers();
      } else if (activeTab === 'verifications') {
        loadVerifications();
      } else if (activeTab === 'trash') {
        loadTrashed();
      }
    }
  }, [currentUser, activeTab, effectiveRole]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const emailToUse = loginEmail.trim() || 'zikysniper@gmail.com';
      if (loginPassword.trim() === MASTER_ADMIN_PASSWORD) {
        // Master Admin direct password authentication
        const user = await loginAppUser('zikysniper@gmail.com', MASTER_ADMIN_PASSWORD);
        setCurrentUser(user);
        populateAgencyForm(user);
        setActiveTab('users');
        loadUsers();
        setStatusMessage(`Welcome Master Administrator! All registered users loaded.`);
      } else {
        const user = await loginAppUser(emailToUse, loginPassword);
        setCurrentUser(user);
        populateAgencyForm(user);
        if (user.role === 'admin' || user.role === 'moderator') {
          setActiveTab('users');
          loadUsers();
        }
        setStatusMessage(`Welcome back, ${user.displayName}! Access granted as ${user.role.toUpperCase()}.`);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setLoginError(error.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Handle Approve Seller Verification
  const handleApproveVerification = async (item: SellerVerificationItem) => {
    try {
      await updateSellerVerificationStatus(item.id, 'approved', item.userId);
      setVerifications((prev) =>
        prev.map((v) => (v.id === item.id ? { ...v, status: 'approved' } : v))
      );
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === item.userId ? { ...u, isVerified: true } : u))
      );
      setStatusMessage(`Verified Seller status granted to ${item.applicantName} (${item.agencyName || 'Agency'})!`);
    } catch {
      setStatusMessage('Failed to approve verification.');
    }
  };

  // Handle Reject Seller Verification
  const handleRejectVerification = async (item: SellerVerificationItem) => {
    try {
      await updateSellerVerificationStatus(item.id, 'rejected', item.userId);
      setVerifications((prev) =>
        prev.map((v) => (v.id === item.id ? { ...v, status: 'rejected' } : v))
      );
      setStatusMessage(`Verification request for ${item.applicantName} marked as rejected.`);
    } catch {
      setStatusMessage('Failed to update verification request.');
    }
  };

  // Handle Toggle User Verified Status
  const handleToggleUserVerified = async (userId: string, currentStatus: boolean) => {
    try {
      await saveUserProfile(userId, { isVerified: !currentStatus });
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, isVerified: !currentStatus } : u))
      );
      setStatusMessage(`User verification status updated.`);
    } catch {
      setStatusMessage('Failed to update user status.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutAppUser();
    setCurrentUser(null);
    setStatusMessage('Logged out successfully.');
  };

  // Handle Send Password Reset Link (Cloud Automated Email)
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetStatus(null);
    try {
      const msg = await sendPasswordReset(resetEmail);
      setResetStatus(msg);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setResetStatus(`Error: ${error.message || 'Could not send reset email. Ensure email is registered.'}`);
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Add New Inventory Plot
  const handleAddPlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotNumber.trim()) return;
    setAddPlotLoading(true);
    try {
      await addInventoryPlot({
        plotNumber: plotNumber.trim(),
        block: plotBlock,
        sector: plotSector,
        area: plotArea,
        price: plotPrice,
        category: plotCategory,
        features: plotFeatures,
        status: plotStatus,
        paymentPlan: '100% Cash / Lump Sum (Non-Installment)',
        description: plotDescription,
        sellerUid: currentUser?.uid || 'admin',
        sellerName: currentUser?.displayName || 'Authorized Dealer',
        sellerPhone: agencyPhone || currentUser?.phone || '0300 1535898',
        sellerWhatsapp: agencyWhatsapp || currentUser?.whatsapp || '0300 1535898',
        agencyName: agencyName || currentUser?.agencyName || 'Kashpal Enterprises & Builders',
        agencyLogo: agencyLogo || currentUser?.agencyLogo,
      });

      setStatusMessage(`Plot #${plotNumber} in ${plotBlock} successfully published to Cloud Inventory!`);
      setPlotNumber('');
      setActiveTab('inventory');
      loadCloudInventory();
    } catch (e) {
      console.error(e);
      setStatusMessage('Error adding plot to cloud inventory.');
    } finally {
      setAddPlotLoading(false);
    }
  };

  // Handle Save Agency Profile
  const handleSaveAgencyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingAgency(true);
    try {
      await saveUserProfile(currentUser.uid, {
        agencyName,
        phone: agencyPhone,
        whatsapp: agencyWhatsapp,
        agencyLogo,
        officeAddress: agencyOffice,
        bio: agencyBio,
        isVerified: true,
      });
      setCurrentUser((prev) => prev ? {
        ...prev,
        agencyName,
        phone: agencyPhone,
        whatsapp: agencyWhatsapp,
        agencyLogo,
        officeAddress: agencyOffice,
        bio: agencyBio,
      } : null);
      setStatusMessage('Agency profile and contact coordinates successfully updated in Cloud!');
    } catch (e) {
      console.error(e);
      setStatusMessage('Error updating agency profile.');
    } finally {
      setSavingAgency(false);
    }
  };

  // Handle Trigger Password Reset for a user (from Admin User list)
  const handleAdminTriggerReset = async (email: string) => {
    try {
      await sendPasswordReset(email);
      setStatusMessage(`Automated password reset link sent to ${email} directly from Firebase Cloud.`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setStatusMessage(`Could not send reset link: ${error.message}`);
    }
  };

  // Open Edit User Modal with populated data
  const handleOpenEditUser = (u: AppUserProfile) => {
    setEditingUser(u);
    setEditDisplayName(u.displayName || '');
    setEditEmail(u.email || '');
    setEditAgencyName(u.agencyName || '');
    setEditPhone(u.phone || '');
    setEditWhatsapp(u.whatsapp || '');
    setEditOfficeAddress(u.officeAddress || '');
    setEditBio(u.bio || '');
    setEditAgencyLogo(u.agencyLogo || '');
    setEditRole(u.role || 'dealer');
    setEditIsVerified(!!u.isVerified);
  };

  // Save edited user details to Firestore
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUserEdit(true);
    try {
      const updatedFields: Partial<AppUserProfile> = {
        displayName: editDisplayName.trim(),
        email: editEmail.trim().toLowerCase(),
        agencyName: editAgencyName.trim(),
        phone: editPhone.trim(),
        whatsapp: editWhatsapp.trim(),
        officeAddress: editOfficeAddress.trim(),
        bio: editBio.trim(),
        agencyLogo: editAgencyLogo.trim() || undefined,
        role: editRole,
        isVerified: editIsVerified,
      };

      await saveUserProfile(editingUser.uid, updatedFields);

      // Update in state
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === editingUser.uid ? { ...u, ...updatedFields } : u))
      );

      // If viewing full details of this user, update that as well
      if (viewingUserDetails?.uid === editingUser.uid) {
        setViewingUserDetails((prev) => (prev ? { ...prev, ...updatedFields } : null));
      }

      // If current logged-in user is this user
      if (currentUser?.uid === editingUser.uid) {
        setCurrentUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
      }

      setStatusMessage(`User "${editDisplayName || editEmail}" details successfully updated in Cloud!`);
      setEditingUser(null);
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage('Error updating user details in Cloud Firestore.');
    } finally {
      setSavingUserEdit(false);
    }
  };

  // Add new registered user directly by Admin (Admin has full add authority)
  const handleAddNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserName.trim()) {
      setAddUserError('Please provide both full name and email address.');
      return;
    }
    setAddingUserLoading(true);
    setAddUserError(null);
    try {
      const created = await createAdminManagedUser({
        displayName: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        phone: newUserPhone.trim(),
        whatsapp: newUserWhatsapp.trim() || newUserPhone.trim(),
        agencyName: newUserAgency.trim() || 'LDA City Member',
        officeAddress: newUserOffice.trim() || 'LDA City, Lahore',
        isVerified: newUserVerified,
      });

      setAllUsers((prev) => [created, ...prev]);
      setStatusMessage(`User "${created.displayName}" (${created.role.toUpperCase()}) successfully registered in database!`);
      setIsAddUserModalOpen(false);
      // Reset form fields
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('user');
      setNewUserPhone('');
      setNewUserWhatsapp('');
      setNewUserAgency('');
      setNewUserOffice('');
      setNewUserVerified(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setAddUserError(error.message || 'Failed to create user account.');
    } finally {
      setAddingUserLoading(false);
    }
  };

  // Remove / delete user by Admin (Admin has full remove authority)
  const handleRemoveUser = async (u: AppUserProfile) => {
    if (u.email === 'zikysniper@gmail.com' || u.uid === currentUser?.uid) {
      alert("Notice: Master Administrator account cannot be removed.");
      return;
    }
    const confirmRemove = window.confirm(
      `Are you sure you want to remove user "${u.displayName || u.email}"? All access permissions for this user will be revoked immediately.`
    );
    if (!confirmRemove) return;

    try {
      await deleteUserDoc(u.uid);
      setAllUsers((prev) => prev.filter((item) => item.uid !== u.uid));
      setStatusMessage(`User "${u.displayName || u.email}" removed from database successfully.`);
      if (viewingUserDetails?.uid === u.uid) setViewingUserDetails(null);
      if (editingUser?.uid === u.uid) setEditingUser(null);
    } catch (err) {
      console.error(err);
      setStatusMessage('Error removing user account from Firestore.');
    }
  };

  // Fine-Grained Role-Based Access Control (RBAC) Permitted Actions on Plots
  const isPlotOwner = (plot: InventoryPlotItem) => Boolean(currentUser?.uid && plot.sellerUid === currentUser.uid);

  const canUpdatePlot = (plot: InventoryPlotItem) => {
    if (effectiveRole === 'admin') return true;
    if (effectiveRole === 'moderator') return true; // Moderator CAN update plot listings
    if (isPlotOwner(plot)) return true; // Registered users can update their own listings
    return false;
  };

  const canDeletePlot = (plot: InventoryPlotItem) => {
    if (effectiveRole === 'admin') return true;
    if (effectiveRole === 'moderator') return false; // Moderator CANNOT delete plots (strictly restricted)
    if (isPlotOwner(plot)) return true; // Registered users can delete their own listings
    return false;
  };

  const canManageUsers = effectiveRole === 'admin';

  // Filtered and sorted users for admin management data-grid
  const filteredUsers = useMemo(() => {
    return allUsers
      .filter((u) => {
        if (userRoleFilter !== 'All' && u.role !== userRoleFilter) return false;
        if (userVerifiedFilter === 'verified' && !u.isVerified) return false;
        if (userVerifiedFilter === 'unverified' && u.isVerified) return false;
        if (userSearchQuery.trim()) {
          const q = userSearchQuery.toLowerCase();
          const matchName = (u.displayName || '').toLowerCase().includes(q);
          const matchEmail = (u.email || '').toLowerCase().includes(q);
          const matchAgency = (u.agencyName || '').toLowerCase().includes(q);
          const matchPhone = (u.phone || '').toLowerCase().includes(q);
          const matchWhatsapp = (u.whatsapp || '').toLowerCase().includes(q);
          const matchOffice = (u.officeAddress || '').toLowerCase().includes(q);
          const matchRole = (u.role || '').toLowerCase().includes(q);
          return matchName || matchEmail || matchAgency || matchPhone || matchWhatsapp || matchOffice || matchRole;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = '';
        let valB = '';
        if (userSortColumn === 'name') {
          valA = (a.displayName || a.agencyName || a.email || '').toLowerCase();
          valB = (b.displayName || b.agencyName || b.email || '').toLowerCase();
        } else if (userSortColumn === 'email') {
          valA = (a.email || '').toLowerCase();
          valB = (b.email || '').toLowerCase();
        } else if (userSortColumn === 'role') {
          valA = (a.role || '').toLowerCase();
          valB = (b.role || '').toLowerCase();
        } else if (userSortColumn === 'verified') {
          const numA = a.isVerified ? 1 : 0;
          const numB = b.isVerified ? 1 : 0;
          return userSortDirection === 'asc' ? numA - numB : numB - numA;
        }
        if (userSortDirection === 'asc') {
          return valA.localeCompare(valB);
        } else {
          return valB.localeCompare(valA);
        }
      });
  }, [allUsers, userRoleFilter, userVerifiedFilter, userSearchQuery, userSortColumn, userSortDirection]);

  // Move Plot to Recycle Bin (Soft Delete) - Enforces RBAC permissions
  const handleMovePlotToTrash = async (id: string, num: string) => {
    const target = cloudInventory.find((p) => p.id === id);
    if (target && !canDeletePlot(target)) {
      alert(`RBAC Permission Denied: You do not have permission to delete plot #${num}. Deleting plots is restricted to Administrators (or the plot creator). Moderators have Update privileges only.`);
      return;
    }
    try {
      await moveToRecycleBin(id);
      const moved = cloudInventory.find((p) => p.id === id);
      setCloudInventory((prev) => prev.filter((p) => p.id !== id));
      if (moved) {
        setTrashedPlots((prev) => [{ ...moved, isTrashed: true, trashedAt: new Date().toISOString() }, ...prev]);
      }
      setStatusMessage(`Plot #${num} moved to Recycle Bin (Trash). It is now hidden from the public marketplace.`);
    } catch (e) {
      console.error(e);
      setStatusMessage('Error moving plot to Recycle Bin.');
    }
  };

  // Restore Plot from Recycle Bin
  const handleRestorePlot = async (id: string, num: string) => {
    if (effectiveRole !== 'admin') {
      alert("RBAC Permission Denied: Restoring plots from Recycle Bin requires Administrator privileges.");
      return;
    }
    try {
      await restoreFromRecycleBin(id);
      const restored = trashedPlots.find((p) => p.id === id);
      setTrashedPlots((prev) => prev.filter((p) => p.id !== id));
      if (restored) {
        setCloudInventory((prev) => [{ ...restored, isTrashed: false, trashedAt: undefined }, ...prev]);
      }
      setStatusMessage(`Plot #${num} successfully restored to active Cloud Inventory!`);
    } catch (e) {
      console.error(e);
      setStatusMessage('Error restoring plot.');
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (id: string, num: string) => {
    if (effectiveRole !== 'admin') {
      alert("RBAC Permission Denied: Permanent plot deletion is strictly restricted to Master Administrators.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently erase Plot #${num} from the database? This cannot be undone.`)) return;
    try {
      await deleteInventoryPlot(id);
      setTrashedPlots((prev) => prev.filter((p) => p.id !== id));
      setCloudInventory((prev) => prev.filter((p) => p.id !== id));
      setStatusMessage(`Plot #${num} permanently removed from cloud database.`);
    } catch (e) {
      console.error(e);
      setStatusMessage('Error deleting plot permanently.');
    }
  };

  // Empty all trash
  const handleEmptyAllTrash = async () => {
    if (effectiveRole !== 'admin') {
      alert("RBAC Permission Denied: Emptying Recycle Bin requires Master Administrator authority.");
      return;
    }
    if (!confirm('Are you sure you want to permanently erase ALL items in the Recycle Bin?')) return;
    setLoadingTrash(true);
    try {
      const count = await emptyRecycleBin();
      setTrashedPlots([]);
      setStatusMessage(`Recycle Bin emptied (${count} plots permanently deleted).`);
    } catch (e) {
      console.error(e);
      setStatusMessage('Error emptying recycle bin.');
    } finally {
      setLoadingTrash(false);
    }
  };

  // Open Edit Plot Modal
  const handleOpenEditPlot = (plot: InventoryPlotItem) => {
    if (!canUpdatePlot(plot)) {
      alert(`RBAC Permission Denied: You do not have permission to update plot #${plot.plotNumber}.`);
      return;
    }
    setEditingPlot(plot);
    setEditPrice(plot.price || '');
    setEditStatus(plot.status || 'available');
    setEditFeatures(plot.features || '');
    setEditDescription(plot.description || '');
    setEditArea(plot.area || '');
    setEditBlock(plot.block || '');
    setEditSector(plot.sector || '');
  };

  // Save Plot Edit
  const handleSavePlotEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;
    if (!canUpdatePlot(editingPlot)) {
      alert("RBAC Permission Denied: You do not have permission to update this plot listing.");
      return;
    }
    setSavingPlotEdit(true);
    try {
      const updates: Partial<InventoryPlotItem> = {
        price: editPrice.trim(),
        status: editStatus,
        features: editFeatures.trim(),
        description: editDescription.trim(),
        area: editArea.trim(),
        block: editBlock.trim(),
        sector: editSector.trim(),
      };
      await updateInventoryPlot(editingPlot.id, updates);
      setCloudInventory((prev) =>
        prev.map((p) => (p.id === editingPlot.id ? { ...p, ...updates } : p))
      );
      setStatusMessage(`Listing for Plot #${editingPlot.plotNumber} in ${editBlock} updated successfully!`);
      setEditingPlot(null);
    } catch (e) {
      console.error(e);
      setStatusMessage('Error saving plot changes to cloud.');
    } finally {
      setSavingPlotEdit(false);
    }
  };

  // Handle Delete Inventory Plot
  const handleDeletePlot = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to move Plot #${num} to Recycle Bin?`)) return;
    await handleMovePlotToTrash(id, num);
  };

  // Filtered inventory
  const filteredInventory = cloudInventory.filter((item) => {
    if (blockFilter !== 'All' && item.block.toUpperCase() !== blockFilter.toUpperCase()) return false;
    if (statusFilter !== 'All' && item.status !== statusFilter) return false;
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase();
      return (
        item.plotNumber.toLowerCase().includes(q) ||
        item.block.toLowerCase().includes(q) ||
        item.agencyName.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // If not logged in, render the login & password reset portal
  if (!currentUser) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-[#1C2541] via-[#0B132B] to-[#1C2541] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-10 shadow-2xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-black uppercase tracking-widest mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>LDA City Master Admin & Dealer Cloud</span>
            </div>
            <h2 className="text-3xl font-black text-white">Authorized Access Desk</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg mx-auto">
              Secure Cloud authentication for Kashpal Enterprises, Ibrahim Real Estate, authorized LDA dealers, and inventory managers.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-700 max-w-md mx-auto mb-8">
            <button
              onClick={() => { setAuthMode('login'); setLoginError(null); }}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${
                authMode === 'login'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('forgot'); setResetStatus(null); }}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${
                authMode === 'forgot'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Reset Password (Free Cloud)
            </button>
          </div>

          {/* LOGIN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4">
              {loginError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. zikysniper@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setResetEmail(loginEmail); }}
                    className="text-[11px] text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                <span className="font-extrabold text-[#D4AF37]">Secure Portal:</span> Authorized Administrators &amp; Registered Agents only. Enter your credentials to access the master desk.
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c29d2b] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {loginSubmitting ? (
                  <span>Authenticating via Cloud...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In to Master Desk</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM (Free Cloud Automated Mail) */}
          {authMode === 'forgot' && (
            <form onSubmit={handleSendResetEmail} className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-slate-200 leading-relaxed">
                <span className="font-bold text-emerald-400 uppercase tracking-wide">Automated Cloud Mailer:</span>{' '}
                Hamare Google Firebase Cloud Database se automatic password reset link aapke business ya personal email par foran bhej diya jayega. 
                Is ke liye kisi manual approval ki zaroorat nahi.
              </div>

              {resetStatus && (
                <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                  resetStatus.includes('Error') 
                    ? 'bg-red-500/10 border border-red-500/40 text-red-300'
                    : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Enter Your Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="e.g. zikysniper@gmail.com or dealer@domain.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <span>Generating & Dispatching Cloud Email...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Password Reset Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Session Bar */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={currentUser.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
              alt={currentUser.agencyName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-md"
            />
            {currentUser.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full shadow">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white">{currentUser.agencyName || currentUser.displayName}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                effectiveRole === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : effectiveRole === 'moderator'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
              }`}>
                {effectiveRole.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-3 mt-1">
              <span>{currentUser.email}</span>
              {currentUser.phone && <span>• {currentUser.phone}</span>}
              {currentUser.officeAddress && <span className="hidden sm:inline">• {currentUser.officeAddress}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setActiveTab('addPlot')}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c29d2b] text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cash Plot</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Fine-Grained Role-Based Access Control (RBAC) System Header & Live Simulator */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Portal Access Control &amp; RBAC Directorate:
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                effectiveRole === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                  : effectiveRole === 'moderator'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
              }`}>
                {effectiveRole === 'admin' && '👑 Admin (Master Authority)'}
                {effectiveRole === 'moderator' && '🛡️ Moderator (Content Editor)'}
                {(effectiveRole === 'user' || effectiveRole === 'dealer' || effectiveRole === 'seller') && '👤 Registered User (Owner-Restricted)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Update: {effectiveRole === 'admin' || effectiveRole === 'moderator' ? 'All Plots' : 'Own Plots Only'}</span>
              </span>
              <span className="flex items-center gap-1">
                {effectiveRole === 'admin' ? (
                  <span className="text-emerald-400 font-bold">✓ Delete: Allowed</span>
                ) : effectiveRole === 'moderator' ? (
                  <span className="text-rose-400 font-bold">✕ Delete: Restricted (Admin Only)</span>
                ) : (
                  <span className="text-amber-400 font-bold">🔒 Delete: Own Plots Only</span>
                )}
              </span>
              <span className="flex items-center gap-1">
                {effectiveRole === 'admin' ? (
                  <span className="text-emerald-400 font-bold">✓ Users: Add/Remove Allowed</span>
                ) : (
                  <span className="text-slate-500 font-bold">✕ Users: Restricted</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Live RBAC Role Simulator / Switcher (for immediate testing and verification) */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-400 pl-1 hidden sm:inline">Simulate Role:</span>
          <select
            value={simulatedRole}
            onChange={(e) => {
              const val = e.target.value as any;
              setSimulatedRole(val);
              setStatusMessage(`RBAC Role switched to "${val.toUpperCase()}". Plot action visibility updated.`);
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
          >
            <option value="real">Real Session ({currentUser.role})</option>
            <option value="admin">👑 Admin (Full Delete &amp; Update)</option>
            <option value="moderator">🛡️ Moderator (Update Only, Delete Hidden)</option>
            <option value="user">👤 Registered User (Owner-Restricted)</option>
          </select>
          <button
            type="button"
            onClick={() => setShowRbacModal(true)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            title="View Full RBAC Permissions Matrix"
          >
            Matrix
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* Navigation Tabs - Registered Users Directorate placed FIRST as requested */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {(currentUser.role === 'admin' || effectiveRole === 'admin' || effectiveRole === 'moderator') && (
          <button
            onClick={() => { setActiveTab('users'); loadUsers(); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'users'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Registered Users Directorate ({allUsers.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'inventory'
              ? 'bg-[#D4AF37] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>LDA City Cash Inventory ({cloudInventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('agency')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'agency'
              ? 'bg-[#D4AF37] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Agency Profile &amp; Logo</span>
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`hidden px-4 py-2.5 rounded-xl text-xs font-extrabold items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'users'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>All Users ({allUsers.length})</span>
          </button>
        )}

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'verifications'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-amber-300 hover:text-white hover:bg-slate-900 border border-amber-500/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Verified Seller Queue ({verifications.filter((v) => v.status === 'pending').length})</span>
          </button>
        )}

        {currentUser.role === 'admin' && (
          <button
            onClick={() => { setActiveTab('trash'); loadTrashed(); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'trash'
                ? 'bg-rose-600 text-white shadow-md font-black'
                : 'text-rose-300 hover:text-white hover:bg-slate-900 border border-rose-500/30'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Recycle Bin ({trashedPlots.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('addPlot')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'addPlot'
              ? 'bg-[#D4AF37] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Plot</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          
          {/* Filters & Search */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search plot #, block, agency..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="All">All Blocks</option>
                {['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block J', 'Block K', 'Block L', 'Block M', 'Block N', 'Block P', 'Block Q', 'Eastern CBD', 'Main CBD'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="All">All Statuses</option>
                <option value="available">Available (Cash Spot)</option>
                <option value="under_offer">Under Offer</option>
                <option value="sold">Sold Out</option>
              </select>

              <button
                onClick={loadCloudInventory}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer"
                title="Refresh Cloud Inventory"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Plots Grid */}
          {inventoryLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse">
              Fetching Cloud Inventory from Firestore...
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No inventory plots match your filter. Click &ldquo;Publish New Plot&rdquo; to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-[#D4AF37]/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Plot Badge & Status */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sector}</div>
                        <div className="text-base font-black text-white flex items-center gap-2">
                          <span>{item.block}</span>
                          <span className="text-[#D4AF37]">•</span>
                          <span className="text-[#fde047]">Plot #{item.plotNumber}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status === 'available'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : item.status === 'under_offer'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-red-500/20 text-red-300 border border-red-400/40'
                      }`}>
                        {item.status === 'available' ? 'Available Cash' : item.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Pricing & Area */}
                    <div className="grid grid-cols-2 gap-2 my-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Size / Area</div>
                        <div className="text-xs font-black text-white">{item.area}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Lump Sum Price</div>
                        <div className="text-xs font-black text-[#D4AF37]">{item.price}</div>
                      </div>
                    </div>

                    {/* Features & Description */}
                    {item.features && (
                      <div className="text-[11px] text-slate-300 mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                        <span>{item.features}</span>
                      </div>
                    )}
                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-4">
                        {item.description}
                      </p>
                    )}

                    {/* Agency Card (Zameen Style) */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center gap-3">
                      <img
                        src={item.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                        alt={item.agencyName}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{item.agencyName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.sellerName} • {item.sellerPhone}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={generateWhatsAppLink(item.sellerWhatsapp || item.sellerPhone, `Hello, I am interested in LDA City ${item.block} Plot #${item.plotNumber} (${item.area} - ${item.price}) listed on your portal.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`tel:${item.sellerPhone}`}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        title="Call Seller"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      {onNavigateToMapPlot && (
                        <button
                          onClick={() => onNavigateToMapPlot(item.plotNumber, item.block)}
                          className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[11px] font-bold border border-blue-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Layers className="w-3 h-3" />
                          <span>View on eMap</span>
                        </button>
                      )}

                      {/* Fine-Grained Role-Based Access Control (RBAC) Actions */}
                      <div className="flex items-center gap-1.5">
                        {/* 1. UPDATE ACTION: Visible for Admin, Moderator, or Plot Creator */}
                        {canUpdatePlot(item) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditPlot(item)}
                            className="px-2.5 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-[11px] font-bold"
                            title={`Update Plot #${item.plotNumber} details (Allowed for ${effectiveRole})`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Update</span>
                          </button>
                        ) : (
                          <div
                            className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-500 flex items-center gap-1 cursor-not-allowed"
                            title="Update Restricted: Only Administrators, Moderators, or the plot owner can edit this listing."
                          >
                            <Lock className="w-3 h-3 text-slate-600" />
                            <span>Read-Only</span>
                          </div>
                        )}

                        {/* 2. DELETE ACTION: Visible for Admin or Plot Creator. STRICTLY HIDDEN for Moderator! */}
                        {canDeletePlot(item) ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMovePlotToTrash(item.id, item.plotNumber)}
                              className="p-1.5 text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg cursor-pointer transition-colors"
                              title="Move to Recycle Bin (Trash)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {effectiveRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => handlePermanentDelete(item.id, item.plotNumber)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                                title="Permanently Delete Listing (Master Admin Only)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          effectiveRole === 'moderator' ? (
                            <span
                              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 text-slate-500 border border-slate-800"
                              title="RBAC Security: Delete action is restricted to Administrators. Moderators have Update privileges only."
                            >
                              Delete: Admin Only
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AGENCY PROFILE (Zameen.com style) */}
      {activeTab === 'agency' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <Building className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h3 className="text-xl font-black text-white">Agency & Dealer Profile</h3>
              <p className="text-xs text-slate-400">
                Setup your official agency branding, verified badge, and direct call/whatsapp coordinates (similar to Zameen.com agency pages).
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAgencyProfile} className="space-y-4 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Agency / Company Name
                </label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Kashpal Enterprises & Builders"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={agencyPhone}
                  onChange={(e) => setAgencyPhone(e.target.value)}
                  placeholder="e.g. 0300 1535898"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  WhatsApp Direct Number
                </label>
                <input
                  type="text"
                  value={agencyWhatsapp}
                  onChange={(e) => setAgencyWhatsapp(e.target.value)}
                  placeholder="e.g. 0300 1535898"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Agency Logo / Photo URL
                </label>
                <input
                  type="url"
                  value={agencyLogo}
                  onChange={(e) => setAgencyLogo(e.target.value)}
                  placeholder="https://... logo image link"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Office Location / Physical Address
              </label>
              <input
                type="text"
                value={agencyOffice}
                onChange={(e) => setAgencyOffice(e.target.value)}
                placeholder="e.g. 180 Ft LDA Road, Gajjumata, Lahore"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Agency Bio & Overview
              </label>
              <textarea
                rows={3}
                value={agencyBio}
                onChange={(e) => setAgencyBio(e.target.value)}
                placeholder="Describe your expertise in LDA City Lahore..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Live Agency Card Preview */}
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2">
                Live Agency Card Preview (As shown to plot buyers):
              </label>
              <div className="bg-slate-950 p-4 rounded-2xl border border-[#D4AF37]/30 flex items-center gap-4">
                <img
                  src={agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                  alt="Agency"
                  className="w-14 h-14 rounded-2xl object-cover border border-[#D4AF37]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{agencyName || 'Your Agency Name'}</span>
                    <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" /> VERIFIED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{agencyOffice || 'Office Address in Lahore'}</div>
                  <div className="text-[11px] text-[#D4AF37] font-semibold mt-1">
                    Direct Contact: {agencyPhone || '0300 1535898'}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingAgency}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c29d2b] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer mt-4"
            >
              {savingAgency ? 'Saving Agency Details to Cloud...' : 'Save Agency Profile'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT & FULL PROFILES (Admin Only) */}
      {activeTab === 'users' && currentUser.role === 'admin' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-7 shadow-xl">
            {/* Header & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span>Registered Users &amp; Dealers Directorate</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      {allUsers.length} Registered
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    View complete user coordinates, edit agency profiles to fix errors, manage roles, and issue password reset links.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                {canManageUsers && (
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                    title="Register a new User, Moderator, or Admin"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add New User</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={loadUsers}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>Refresh Users</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-xl sm:text-2xl font-black text-white block font-mono">{allUsers.length}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Users</span>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3 text-center">
                <span className="text-xl sm:text-2xl font-black text-amber-400 block font-mono">
                  {allUsers.filter((u) => u.isVerified).length}
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-300">Verified Sellers</span>
              </div>
              <div className="bg-slate-950/80 border border-blue-500/30 rounded-2xl p-3 text-center">
                <span className="text-xl sm:text-2xl font-black text-blue-400 block font-mono">
                  {allUsers.filter((u) => u.role === 'admin').length}
                </span>
                <span className="text-[10px] uppercase font-bold text-blue-300">Administrators</span>
              </div>
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3 text-center">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 block font-mono">
                  {allUsers.filter((u) => u.role === 'dealer').length}
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-300">Dealers / Sellers</span>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 sm:p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* Search Bar */}
                <div className="sm:col-span-5 relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, email, agency, phone, office..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Role Filter */}
                <div className="sm:col-span-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="All">All Roles ({allUsers.length})</option>
                    <option value="admin">Administrators ({allUsers.filter((u) => u.role === 'admin').length})</option>
                    <option value="moderator">Moderators ({allUsers.filter((u) => u.role === 'moderator').length})</option>
                    <option value="user">Registered Users ({allUsers.filter((u) => u.role === 'user').length})</option>
                    <option value="dealer">Dealers ({allUsers.filter((u) => u.role === 'dealer').length})</option>
                    <option value="seller">Sellers ({allUsers.filter((u) => u.role === 'seller').length})</option>
                  </select>
                </div>

                {/* Verification Status Filter */}
                <div className="sm:col-span-2">
                  <select
                    value={userVerifiedFilter}
                    onChange={(e) => setUserVerifiedFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="verified">Verified Sellers</option>
                    <option value="unverified">Unverified Users</option>
                  </select>
                </div>

                {/* View Switcher: Table vs Cards (Mobile & Desktop) */}
                <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setUserViewMode('table')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        userViewMode === 'table'
                          ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Tabular Data-Grid View"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Table Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserViewMode('cards')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        userViewMode === 'cards'
                          ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Compact Cards View"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Grid Status & Active Sorting indicator */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 gap-2">
                <div>
                  Showing <strong className="text-white">{filteredUsers.length}</strong> of{' '}
                  <strong className="text-[#D4AF37]">{allUsers.length}</strong> registered users
                </div>
                <div className="flex items-center gap-2">
                  <span>Sorted by:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUserSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                    }}
                    className="text-[#D4AF37] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="capitalize">{userSortColumn}</span>
                    <span>({userSortDirection === 'asc' ? 'A→Z / Low' : 'Z→A / High'})</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* User List States */}
            {loadingUsers ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse">
                Fetching Users from Firebase Cloud...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                <User className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-white">No users match your search / filter criteria.</p>
                <p className="text-[11px] text-slate-500 mt-1">Try resetting filters or searching for different keywords.</p>
              </div>
            ) : (
              <>
                {/* 
                  ==============================================================
                  VIEW 1: CARDS VIEW (Clean, touch-friendly for mobile or card layout)
                  ==============================================================
                */}
                {userViewMode === 'cards' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.uid}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 shadow-md transition-all"
                      >
                        {/* Top: Avatar, Name, Badges */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={u.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                              alt=""
                              className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-white truncate">
                                  {u.agencyName || u.displayName}
                                </span>
                                {u.isVerified && (
                                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] px-1.5 py-0.2 rounded font-black flex items-center gap-0.5 shrink-0">
                                    <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
                                    <span>Verified</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                Contact: {u.displayName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1.5 mt-0.5">
                                <span>{u.email}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(u.email);
                                    setStatusMessage(`Copied ${u.email} to clipboard!`);
                                  }}
                                  className="text-slate-400 hover:text-white"
                                  title="Copy Email"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                              u.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>

                        {/* Interactive Verification Status Manual Toggle Switch */}
                        <div className="bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className={`w-3.5 h-3.5 ${u.isVerified ? 'text-amber-400' : 'text-slate-500'}`} />
                            <span className="text-[11px] font-bold text-slate-300">
                              Verification Status:
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleUserVerified(u.uid, u.isVerified || false)}
                            className="inline-flex items-center gap-1.5 cursor-pointer group"
                            title={u.isVerified ? "Click to Revoke Verification" : "Click to Grant Verified Seller Badge"}
                          >
                            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                              u.isVerified ? 'bg-amber-500' : 'bg-slate-700'
                            }`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                u.isVerified ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              u.isVerified ? 'text-amber-300' : 'text-slate-400'
                            }`}>
                              {u.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </button>
                        </div>

                        {/* Middle Row: Phone, WhatsApp, Office Address */}
                        <div className="pt-1 text-[11px] text-slate-300 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 text-[10px]">Phone:</span>
                            {u.phone ? (
                              <a href={`tel:${u.phone}`} className="text-white hover:text-[#D4AF37] font-semibold">
                                📞 {u.phone}
                              </a>
                            ) : (
                              <span className="text-slate-500">Not provided</span>
                            )}
                          </div>
                          {u.whatsapp && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 text-[10px]">WhatsApp:</span>
                              <a
                                href={generateWhatsAppLink(u.whatsapp, `Hello ${u.displayName}, contacting you from Kashpal Enterprises Admin Desk.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline font-semibold"
                              >
                                💬 {u.whatsapp}
                              </a>
                            </div>
                          )}
                          {u.officeAddress && (
                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <span className="text-slate-400 text-[10px] shrink-0">Office:</span>
                              <span className="text-[10px] text-slate-300 text-right truncate max-w-[200px]">
                                {u.officeAddress}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Action Buttons (Touch Friendly & Responsive) */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="flex-1 py-2 px-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-[11px] rounded-xl shadow cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                            title="Edit User Profile & Fix Errors"
                          >
                            <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Edit Profile</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setViewingUserDetails(u)}
                            className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] rounded-xl cursor-pointer flex items-center justify-center gap-1"
                            title="View Full Profile Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAdminTriggerReset(u.email)}
                            className="py-2 px-2.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[11px] font-bold rounded-xl border border-emerald-500/40 cursor-pointer"
                            title="Send Automated Cloud Password Reset Email"
                          >
                            Reset Pass
                          </button>

                          {u.email !== 'zikysniper@gmail.com' && canManageUsers && (
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer"
                              title={`Remove user account for ${u.displayName || u.email}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 
                  ==============================================================
                  VIEW 2: TABULAR DATA-GRID (Standard desktop/laptop table view)
                  ==============================================================
                */}
                {userViewMode === 'table' && (
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/60 shadow-lg">
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider select-none">
                          {/* Col 1: User / Agency */}
                          <th
                            className="py-3 px-3.5 font-bold cursor-pointer hover:text-white"
                            onClick={() => {
                              if (userSortColumn === 'name') {
                                setUserSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setUserSortColumn('name');
                                setUserSortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>User / Agency</span>
                              <ArrowUpDown className={`w-3 h-3 ${userSortColumn === 'name' ? 'text-[#D4AF37]' : 'text-slate-600'}`} />
                            </div>
                          </th>

                          {/* Col 2: Email */}
                          <th
                            className="py-3 px-3 font-bold cursor-pointer hover:text-white"
                            onClick={() => {
                              if (userSortColumn === 'email') {
                                setUserSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setUserSortColumn('email');
                                setUserSortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Email Address</span>
                              <ArrowUpDown className={`w-3 h-3 ${userSortColumn === 'email' ? 'text-[#D4AF37]' : 'text-slate-600'}`} />
                            </div>
                          </th>

                          {/* Col 3: Role */}
                          <th
                            className="py-3 px-3 font-bold cursor-pointer hover:text-white"
                            onClick={() => {
                              if (userSortColumn === 'role') {
                                setUserSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setUserSortColumn('role');
                                setUserSortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Role</span>
                              <ArrowUpDown className={`w-3 h-3 ${userSortColumn === 'role' ? 'text-[#D4AF37]' : 'text-slate-600'}`} />
                            </div>
                          </th>

                          {/* Col 4: Verification Status with Toggle Switch */}
                          <th
                            className="py-3 px-3 font-bold cursor-pointer hover:text-white"
                            onClick={() => {
                              if (userSortColumn === 'verified') {
                                setUserSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setUserSortColumn('verified');
                                setUserSortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Verification Status</span>
                              <ArrowUpDown className={`w-3 h-3 ${userSortColumn === 'verified' ? 'text-[#D4AF37]' : 'text-slate-600'}`} />
                            </div>
                          </th>

                          {/* Col 5: Phone / WhatsApp */}
                          <th className="py-3 px-3 font-bold">Contact</th>

                          {/* Col 6: Office */}
                          <th className="py-3 px-3 font-bold">Office Address</th>

                          {/* Col 7: Actions */}
                          <th className="py-3 px-3 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredUsers.map((u) => (
                          <tr key={u.uid} className="hover:bg-slate-900/50 transition-colors">
                            {/* User / Agency Cell */}
                            <td className="py-3 px-3.5 font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                                  alt=""
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white text-xs font-bold truncate max-w-[140px]">
                                      {u.agencyName || u.displayName}
                                    </span>
                                    {u.isVerified && (
                                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] px-1.5 py-0.2 rounded font-extrabold flex items-center gap-0.5 shrink-0" title="Verified Seller">
                                        <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
                                        <span>Verified</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{u.displayName}</div>
                                </div>
                              </div>
                            </td>

                            {/* Email Cell */}
                            <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span>{u.email}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(u.email);
                                    setStatusMessage(`Copied ${u.email} to clipboard!`);
                                  }}
                                  className="text-slate-500 hover:text-slate-300 cursor-pointer"
                                  title="Copy Email"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Role Cell */}
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              }`}>
                                {u.role}
                              </span>
                            </td>

                            {/* Verification Status Interactive Toggle Cell */}
                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => handleToggleUserVerified(u.uid, u.isVerified || false)}
                                className="inline-flex items-center gap-2 cursor-pointer group"
                                title={u.isVerified ? "Click to Revoke Verification" : "Click to Grant Verified Seller Badge"}
                              >
                                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                                  u.isVerified ? 'bg-amber-500' : 'bg-slate-700'
                                }`}>
                                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    u.isVerified ? 'translate-x-4' : 'translate-x-0'
                                  }`} />
                                </div>
                                <span className={`text-[10px] font-bold ${
                                  u.isVerified ? 'text-amber-300 font-black' : 'text-slate-400'
                                }`}>
                                  {u.isVerified ? 'Verified' : 'Unverified'}
                                </span>
                              </button>
                            </td>

                            {/* Phone / WhatsApp Cell */}
                            <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                              {u.phone && <div>📞 {u.phone}</div>}
                              {u.whatsapp && (
                                <a
                                  href={generateWhatsAppLink(u.whatsapp, `Hello ${u.displayName}, contacting you from Kashpal Enterprises Admin Desk.`)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-400 hover:underline block"
                                >
                                  💬 {u.whatsapp}
                                </a>
                              )}
                              {!u.phone && !u.whatsapp && <span className="text-slate-600">—</span>}
                            </td>

                            {/* Office Address Cell */}
                            <td className="py-3 px-3 text-slate-400 text-[11px] max-w-[150px] truncate" title={u.officeAddress || ''}>
                              {u.officeAddress || <span className="text-slate-600">—</span>}
                            </td>

                            {/* Action Buttons Cell */}
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* 1. Edit User Details */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="px-2.5 py-1 bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0B132B] font-bold text-[10px] rounded-lg border border-[#D4AF37]/50 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Edit User Details & Fix Errors"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>

                                {/* 2. View Profile Dossier */}
                                <button
                                  type="button"
                                  onClick={() => setViewingUserDetails(u)}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                                  title="View Complete Profile Dossier"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* 3. Trigger Password Reset Email */}
                                <button
                                  type="button"
                                  onClick={() => handleAdminTriggerReset(u.email)}
                                  className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[10px] font-bold rounded-lg border border-emerald-500/40 cursor-pointer transition-colors"
                                  title="Send Cloud Password Reset Email"
                                >
                                  Reset
                                </button>

                                {/* 4. Delete User Doc */}
                                {u.email !== 'zikysniper@gmail.com' && canManageUsers && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUser(u)}
                                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                                    title={`Remove user account for ${u.displayName || u.email}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        MODAL 1: EDIT USER DETAILS MODAL (Admin Edit Capabilities)
        Allows Admin to inspect and edit any user's profile to fix errors/typos
        ========================================================================
      */}
      {editingUser && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-2xl bg-[#0B132B] border border-[#D4AF37]/50 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Edit User Profile: {editingUser.displayName || editingUser.email}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fix coordinates, dealer agency details, phone, role, and verification badge.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveUserEdit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Full Name / Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Agency Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Agency / Business Name
                  </label>
                  <input
                    type="text"
                    value={editAgencyName}
                    onChange={(e) => setEditAgencyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                    placeholder="e.g. Kashpal Enterprises, Ibrahim Real Estate"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Portal Access Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="admin">👑 Administrator (Full Master Delete &amp; Update Authority)</option>
                    <option value="moderator">🛡️ Moderator (Can Update plots, Delete actions restricted)</option>
                    <option value="user">👤 Registered User (Update &amp; Delete own plots only)</option>
                    <option value="dealer">🏢 Authorized Dealer (Agency profile &amp; own listings)</option>
                    <option value="seller">🏡 Private Seller</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Calling Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 0300 1535898"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp Chat Number
                  </label>
                  <input
                    type="tel"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    placeholder="e.g. 0300 1535898"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Office Address */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Office / Branch Address in Lahore
                </label>
                <input
                  type="text"
                  value={editOfficeAddress}
                  onChange={(e) => setEditOfficeAddress(e.target.value)}
                  placeholder="e.g. 180 Ft LDA Road, Gajjumata, Lahore"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Agency Logo URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Agency Logo / Photo URL
                </label>
                <input
                  type="url"
                  value={editAgencyLogo}
                  onChange={(e) => setEditAgencyLogo(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Bio / Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Bio &amp; Consultant Description
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="LDA City Official Real Estate Consultant..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Verified Seller Checkbox */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Verified Seller Badge Status</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Displays official gold checkmark badge on user listings and ads.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsVerified}
                    onChange={(e) => setEditIsVerified(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUserEdit}
                  className="px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-xs rounded-xl shadow-lg cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  {savingUserEdit ? 'Saving to Cloud...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        MODAL 2: VIEW FULL USER DOSSIER
        ========================================================================
      */}
      {viewingUserDetails && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-lg bg-[#0B132B] border border-[#D4AF37]/50 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={viewingUserDetails.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80'}
                  alt=""
                  className="w-12 h-12 rounded-2xl object-cover border border-[#D4AF37]"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                    <span>{viewingUserDetails.agencyName || viewingUserDetails.displayName}</span>
                    {viewingUserDetails.isVerified && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">UID: {viewingUserDetails.uid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUserDetails(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Person:</span>
                  <span className="font-bold text-white">{viewingUserDetails.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-mono text-slate-200">{viewingUserDetails.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-black text-amber-400 uppercase">{viewingUserDetails.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-200">{viewingUserDetails.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WhatsApp:</span>
                  <span className="text-emerald-400 font-semibold">{viewingUserDetails.whatsapp || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Office Address:</span>
                  <span className="text-slate-200 text-right max-w-[200px] truncate">{viewingUserDetails.officeAddress || '—'}</span>
                </div>
                {viewingUserDetails.bio && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Bio:</span>
                    <p className="text-slate-300 italic">&quot;{viewingUserDetails.bio}&quot;</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  const target = viewingUserDetails;
                  setViewingUserDetails(null);
                  handleOpenEditUser(target);
                }}
                className="py-2 px-4 bg-gradient-to-r from-[#D4AF37] to-[#B89628] text-[#0B132B] font-extrabold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Edit User</span>
              </button>

              <div className="flex items-center gap-2">
                {viewingUserDetails.whatsapp && (
                  <a
                    href={generateWhatsAppLink(viewingUserDetails.whatsapp, `Hello ${viewingUserDetails.displayName}, contacting you from Kashpal Enterprises Admin Desk.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                  >
                    💬 Chat
                  </a>
                )}
                {viewingUserDetails.phone && (
                  <a
                    href={`tel:${viewingUserDetails.phone}`}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
                  >
                    📞 Call
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: VERIFIED SELLER APPROVAL QUEUE (Admin Manual Review) */}
      {activeTab === 'verifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-black text-white">
                  Verified Seller Accreditation Desk
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manual admin approval queue. Review CNIC, WhatsApp, and agency documents before granting the official golden verification badge.
              </p>
            </div>

            <button
              onClick={loadVerifications}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-colors self-start sm:self-auto"
            >
              Refresh Queue
            </button>
          </div>

          {loadingVerifications ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse">
              Loading verification applications...
            </div>
          ) : verifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <span>No verification applications in queue.</span>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-bold">Applicant / Agency</th>
                    <th className="pb-3 font-bold">CNIC Number</th>
                    <th className="pb-3 font-bold">WhatsApp / Contact</th>
                    <th className="pb-3 font-bold">Documents &amp; Notes</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {verifications.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-950/40">
                      <td className="py-3 font-bold text-white">
                        <div className="text-sm text-amber-300">{item.agencyName || 'Agency'}</div>
                        <div className="text-[11px] text-slate-300">{item.applicantName}</div>
                        {item.officeAddress && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.officeAddress}</div>
                        )}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-white">
                        {item.cnic || '—'}
                      </td>
                      <td className="py-3 text-slate-300 text-[11px]">
                        <div className="font-semibold text-emerald-400">💬 {item.whatsapp}</div>
                        <div className="text-[10px] text-slate-400">
                          Applied: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </div>
                      </td>
                      <td className="py-3 text-slate-300 text-[11px] max-w-xs">
                        {item.documentUrl ? (
                          <a
                            href={item.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline font-semibold"
                          >
                            <span>View Document Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-500">No document attached</span>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 italic">
                            &quot;{item.notes}&quot;
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : item.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleApproveVerification(item)}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-[10px] rounded-lg shadow-md cursor-pointer transition-transform active:scale-95 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Approve &amp; Grant Badge</span>
                            </button>
                          )}

                          {item.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleRejectVerification(item)}
                              className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[10px] font-bold rounded-lg border border-rose-700/60 cursor-pointer transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PUBLISH NEW INVENTORY PLOT */}
      {activeTab === 'addPlot' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <Plus className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h3 className="text-xl font-black text-white">Publish New LDA City Cash Plot</h3>
              <p className="text-xs text-slate-400">
                100% Cash / Lump Sum Inventory for direct transfer at LDA One-Window Directorate.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddPlotSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Sector
                </label>
                <select
                  value={plotSector}
                  onChange={(e) => setPlotSector(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Jinnah Sector">Jinnah Sector (Phase 1)</option>
                  <option value="Iqbal Sector">Iqbal Sector</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Block
                </label>
                <select
                  value={plotBlock}
                  onChange={(e) => setPlotBlock(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  {['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block J', 'Block K', 'Block L', 'Block M', 'Block N', 'Block P', 'Block Q', 'Eastern CBD', 'Main CBD'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Plot Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 78, 124, 714"
                  value={plotNumber}
                  onChange={(e) => setPlotNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Size / Category
                </label>
                <select
                  value={plotArea}
                  onChange={(e) => setPlotArea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="5 Marla">5 Marla</option>
                  <option value="10 Marla">10 Marla</option>
                  <option value="1 Kanal">1 Kanal</option>
                  <option value="2 Kanal">2 Kanal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Lump Sum Cash Price (PKR)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 48 Lakh or 1.25 Crore"
                  value={plotPrice}
                  onChange={(e) => setPlotPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={plotStatus}
                  onChange={(e) => setPlotStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="available">Available (Spot Cash)</option>
                  <option value="under_offer">Under Offer</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Features & Highlights
              </label>
              <input
                type="text"
                placeholder="e.g. Corner, Park Facing, 150ft Boulevard, Cleared File"
                value={plotFeatures}
                onChange={(e) => setPlotFeatures(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Description / Deal Terms
              </label>
              <textarea
                rows={3}
                value={plotDescription}
                onChange={(e) => setPlotDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
              <strong>Notice:</strong> LDA City Lahore deals are 100% full cash payment. Plot will automatically link to your Agency account (<code className="text-white">{agencyName || currentUser.agencyName}</code>).
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addPlotLoading}
                className="flex-1 py-3.5 bg-[#D4AF37] hover:bg-[#c29d2b] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer"
              >
                {addPlotLoading ? 'Publishing to Cloud...' : 'Publish Plot to Cloud Inventory'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: RECYCLE BIN / TRASHED LISTINGS (Admin Directorate Oversight) */}
      {activeTab === 'trash' && currentUser.role === 'admin' && (
        <div className="space-y-4 max-w-6xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>Recycle Bin &amp; Deleted Listings</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                      {trashedPlots.length} in Bin
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Listings moved to Recycle Bin by dealers or admins. Soft-deleted ads are hidden from the live website &amp; map until restored.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadTrashed}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                >
                  Refresh
                </button>
                {trashedPlots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEmptyAllTrash}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer"
                  >
                    Empty Entire Bin
                  </button>
                )}
              </div>
            </div>

            {loadingTrash ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse">
                Fetching Trashed Listings from Cloud Firestore...
              </div>
            ) : trashedPlots.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800 my-4">
                <Trash2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-white text-sm">Recycle Bin is Clean &amp; Empty</p>
                <p className="text-[11px] text-slate-500 mt-1">No listings currently in trash.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {trashedPlots.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-rose-900/40 hover:border-rose-700/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{item.sector}</span>
                          <h4 className="text-base font-black text-white">
                            {item.block} • Plot #{item.plotNumber}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          In Trash
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-3 bg-slate-900/60 p-2.5 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Area</span>
                          <span className="font-bold text-white">{item.area}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Demand</span>
                          <span className="font-black text-[#D4AF37]">{item.price}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 mb-1">
                        Seller: <strong className="text-slate-300">{item.sellerName || item.agencyName}</strong>
                      </div>
                      {item.trashedAt && (
                        <div className="text-[10px] text-slate-500">
                          Trashed: {new Date(item.trashedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestorePlot(item.id, item.plotNumber)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore to Active</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(item.id, item.plotNumber)}
                        className="py-2 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purge</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT PLOT LISTING (Admin Oversight) */}
      {editingPlot && (
        <div className="fixed inset-0 z-[10070] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0B132B] border border-[#D4AF37]/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-lg font-black text-white">
                  Edit Listing • Plot #{editingPlot.plotNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlotEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Block</label>
                  <input
                    type="text"
                    value={editBlock}
                    onChange={(e) => setEditBlock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Sector</label>
                  <input
                    type="text"
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Area / Size</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Demand Price</label>
                  <input
                    type="text"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="available">Available (Cash Spot)</option>
                  <option value="under_offer">Under Offer</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Features / Key Highlights</label>
                <input
                  type="text"
                  value={editFeatures}
                  onChange={(e) => setEditFeatures(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlot(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlotEdit}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c29d2b] text-slate-950 font-black rounded-xl text-xs shadow-lg cursor-pointer"
                >
                  {savingPlotEdit ? 'Saving Changes...' : 'Save Listing Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        MODAL 3: ADD NEW REGISTERED USER MODAL (Admin Full Authority)
        User requirement: "admin kisi ko bhi add or remove kr dain no issue. uske pass access honi chaiye."
        ========================================================================
      */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-xl bg-[#0B132B] border border-[#D4AF37]/50 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Add New Registered User / Agent</h3>
                  <p className="text-[11px] text-slate-400">Directly provision accounts with custom RBAC access roles.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addUserError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{addUserError}</span>
              </div>
            )}

            <form onSubmit={handleAddNewUserSubmit} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asif Mehmood"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. asif@estate.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Access Role (RBAC) *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="user">👤 Registered User (Owner-restricted)</option>
                    <option value="moderator">🛡️ Moderator (Can Update, Delete restricted)</option>
                    <option value="admin">👑 Administrator (Full Master Control)</option>
                    <option value="dealer">🏢 Authorized Dealer</option>
                    <option value="seller">🏡 Private Seller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Agency / Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Asif Associates"
                    value={newUserAgency}
                    onChange={(e) => setNewUserAgency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Calling Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0300 1234567"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp Chat Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0300 1234567"
                    value={newUserWhatsapp}
                    onChange={(e) => setNewUserWhatsapp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Office / Site Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. 180 Ft Main Boulevard, LDA City"
                  value={newUserOffice}
                  onChange={(e) => setNewUserOffice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newUserVerifiedCheckbox"
                  checked={newUserVerified}
                  onChange={(e) => setNewUserVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37] accent-[#D4AF37]"
                />
                <label htmlFor="newUserVerifiedCheckbox" className="text-slate-300 font-bold text-[11px] cursor-pointer">
                  Grant Official Verified Badge &amp; Trust Seal
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUserLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-black rounded-xl shadow-lg cursor-pointer transition-transform active:scale-95"
                >
                  {addingUserLoading ? 'Registering User...' : 'Create & Authorize User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        MODAL 4: RBAC PERMISSIONS MATRIX MODAL
        Comprehensive audit matrix detailing fine-grained access control
        ========================================================================
      */}
      {showRbacModal && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-2xl bg-[#0B132B] border-2 border-[#D4AF37]/60 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Fine-Grained RBAC Permission Matrix</h3>
                  <p className="text-[11px] text-slate-400">Plot Listing actions visibility &amp; administrative authority matrix.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRbacModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] tracking-wider">
                  <tr className="border-b border-slate-800">
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Plot Update</th>
                    <th className="py-2.5 px-3 text-center">Plot Delete / Trash</th>
                    <th className="py-2.5 px-3 text-center">User Management</th>
                    <th className="py-2.5 px-3 text-center">Verification Queue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-[11px]">
                  <tr className="hover:bg-slate-900/40 bg-amber-500/5">
                    <td className="py-3 px-3 font-bold text-amber-300 flex items-center gap-1.5">
                      <span>👑</span>
                      <span>Admin</span>
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">✓ All Plots</td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">✓ Full Authority</td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">✓ Add &amp; Remove Any</td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">✓ Approve / Reject</td>
                  </tr>

                  <tr className="hover:bg-slate-900/40 bg-blue-500/5">
                    <td className="py-3 px-3 font-bold text-blue-300 flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>Moderator</span>
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">✓ All Plots</td>
                    <td className="py-3 px-3 text-center text-rose-400 font-bold">✕ RESTRICTED / HIDDEN</td>
                    <td className="py-3 px-3 text-center text-slate-500">Read-Only</td>
                    <td className="py-3 px-3 text-center text-blue-300 font-bold">✓ Review Only</td>
                  </tr>

                  <tr className="hover:bg-slate-900/40 bg-emerald-500/5">
                    <td className="py-3 px-3 font-bold text-emerald-300 flex items-center gap-1.5">
                      <span>👤</span>
                      <span>Registered User</span>
                    </td>
                    <td className="py-3 px-3 text-center text-amber-300 font-bold">🔒 Own Plots Only</td>
                    <td className="py-3 px-3 text-center text-amber-300 font-bold">🔒 Own Plots Only</td>
                    <td className="py-3 px-3 text-center text-slate-500">✕ Restricted</td>
                    <td className="py-3 px-3 text-center text-slate-500">Submit Request</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-300 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Active RBAC Implementation Details:</span>
              </div>
              <p className="text-slate-400">
                • <strong>Moderator Delete Restriction:</strong> On plot listings, delete and trash buttons are completely removed/hidden for Moderators. Only update actions are exposed.
              </p>
              <p className="text-slate-400">
                • <strong>Registered User Isolation:</strong> Users cannot edit or delete inventory posted by other agents or master listings.
              </p>
              <p className="text-slate-400">
                • <strong>Admin User Control:</strong> Admins can provision new users with any custom role, change existing roles, or delete users directly.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRbacModal(false)}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c29d2b] text-slate-950 font-black rounded-xl text-xs shadow-lg cursor-pointer"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
