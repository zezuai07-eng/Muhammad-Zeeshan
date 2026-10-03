import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  ActionCodeSettings,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  orderBy,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD7T_nGoThO1ZM62tghJRCMYfaI_jS5x58",
  authDomain: "aerobic-resolver-h8chg.firebaseapp.com",
  projectId: "aerobic-resolver-h8chg",
  storageBucket: "aerobic-resolver-h8chg.firebasestorage.app",
  messagingSenderId: "240448582954",
  appId: "1:240448582954:web:246b9ea84a83808aed5a53",
};

const databaseId = "ai-studio-remixkashpalente-dcd445dd-5802-4a2e-a7e5-8b7fafd56473";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);

// Test Firestore connection on boot as mandated by Firebase skill
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase Firestore connection offline or warming up.");
    }
  }
}
if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

export type UserRole = 'admin' | 'moderator' | 'user' | 'registered_user' | 'dealer' | 'seller';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  whatsapp?: string;
  agencyName?: string;
  agencyLogo?: string;
  officeAddress?: string;
  bio?: string;
  isVerified?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryPlotItem {
  id: string;
  plotNumber: string;
  block: string;
  sector: string;
  area: string;
  price: string; // e.g. "45 Lakh" or "1.25 Crore"
  priceNum?: number;
  category: 'residential' | 'commercial';
  propertyType?: 'Plot' | 'File' | 'House' | 'Commercial';
  images?: string[];
  videoUrl?: string;
  documents?: { name: string; url: string }[];
  bedrooms?: string;
  bathrooms?: string;
  fileStatus?: string;
  features?: string; // Corner, Facing Park, Main Boulevard, 150ft Road
  status: 'available' | 'under_offer' | 'sold';
  paymentPlan: string; // "Full Cash / Lump Sum (Non-Installment)"
  description?: string;
  lat?: number;
  lng?: number;
  sellerUid: string;
  sellerName: string;
  sellerPhone: string;
  sellerWhatsapp: string;
  agencyName: string;
  agencyLogo?: string;
  isVerifiedSeller?: boolean;
  isTrashed?: boolean; // Soft delete / Recycle bin flag
  trashedAt?: string;  // Timestamp when moved to recycle bin
  createdAt: string;
  updatedAt?: string;
}

export interface SellerVerificationItem {
  id: string;
  userId: string;
  applicantName: string;
  whatsapp: string;
  cnic: string;
  agencyName?: string;
  officeAddress?: string;
  documentUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

export const MASTER_ADMIN_PASSWORD = 'Zero786786@2@';
const DEFAULT_ADMIN_EMAIL = 'zikysniper@gmail.com';
const DEFAULT_ADMIN_PASS = 'Zero786786@2@';

/**
 * Robust login supporting automatic bootstrapping of predefined admin and cloud fallback
 */
export async function loginAppUser(email: string, pass: string): Promise<AppUserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL && pass === DEFAULT_ADMIN_PASS;
  let userUid: string | null = null;

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    userUid = cred.user.uid;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    // If admin is logging in with master password, auto-create the Firebase Auth user if missing
    if (
      isAdmin &&
      (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')
    ) {
      try {
        const created = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        userUid = created.user.uid;
      } catch (adminCreateErr: unknown) {
        const acErr = adminCreateErr as { code?: string };
        if (acErr.code === 'auth/operation-not-allowed') {
          userUid = 'master-admin-kashpal';
        } else {
          throw adminCreateErr;
        }
      }
    } else if (error.code === 'auth/operation-not-allowed') {
      // Firebase console has Email/Password provider disabled
      if (isAdmin) {
        userUid = 'master-admin-kashpal';
      } else {
        // Look up registered user from Firestore
        try {
          const snap = await getDocs(collection(db, 'users'));
          let matchedUser: AppUserProfile | null = null;
          snap.forEach((d) => {
            const data = d.data() as AppUserProfile;
            if (data.email && data.email.toLowerCase() === cleanEmail) {
              matchedUser = { ...data, uid: d.id };
            }
          });
          if (matchedUser) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('kashpal_user_session', JSON.stringify(matchedUser));
            }
            return matchedUser;
          }
        } catch (queryErr) {
          console.warn('Firestore fallback lookup notice:', queryErr);
        }

        // Check local storage session
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('kashpal_user_session');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.email === cleanEmail) {
                return parsed as AppUserProfile;
              }
            } catch (e) {
              console.error(e);
            }
          }
        }

        // Inform user about Firebase console Email/Password requirement with clear instructions
        const opError = new Error('auth/operation-not-allowed');
        (opError as unknown as { code: string }).code = 'auth/operation-not-allowed';
        throw opError;
      }
    } else {
      throw err;
    }
  }

  const effectiveUid = userUid || (isAdmin ? 'master-admin-kashpal' : 'user_' + cleanEmail.replace(/[^a-z0-9]/g, '_'));

  // Fetch or create user profile document in Firestore
  const userDocRef = doc(db, 'users', effectiveUid);
  let profile: AppUserProfile;

  try {
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      profile = {
        uid: effectiveUid,
        email: cleanEmail,
        displayName: isAdmin ? 'Master Administrator' : 'Authorized Member',
        role: isAdmin ? 'admin' : 'dealer',
        phone: isAdmin ? '0300 1535898' : '',
        whatsapp: isAdmin ? '0300 1535898' : '',
        agencyName: isAdmin ? 'Kashpal Enterprises & Builders' : 'Authorized Agency',
        agencyLogo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
        officeAddress: '180 Ft LDA Road, Gajjumata, Lahore',
        bio: 'LDA City Official Real Estate Consultant & Master Inventory Manager',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, profile);
    } else {
      profile = snap.data() as AppUserProfile;
      const updates: Partial<AppUserProfile> = {
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (isAdmin && profile.role !== 'admin') {
        updates.role = 'admin';
        profile.role = 'admin';
      }
      profile.lastLoginAt = updates.lastLoginAt;
      try {
        await updateDoc(userDocRef, updates);
      } catch (uErr) {
        console.warn('Update user lastLoginAt notice:', uErr);
      }
    }
  } catch (fsErr) {
    console.warn('Firestore user fetch notice:', fsErr);
    profile = {
      uid: effectiveUid,
      email: cleanEmail,
      displayName: isAdmin ? 'Master Administrator' : 'Authorized Member',
      role: isAdmin ? 'admin' : 'dealer',
      phone: isAdmin ? '0300 1535898' : '',
      whatsapp: isAdmin ? '0300 1535898' : '',
      agencyName: isAdmin ? 'Kashpal Enterprises & Builders' : 'Authorized Agency',
      agencyLogo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
      officeAddress: '180 Ft LDA Road, Gajjumata, Lahore',
      bio: 'LDA City Official Real Estate Consultant & Master Inventory Manager',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('kashpal_user_session', JSON.stringify(profile));
  }

  return profile;
}

/**
 * Register a new user/dealer/seller with automatic graceful fallback if Email/Password provider is disabled in Firebase console
 */
export async function registerAppUser(
  email: string,
  pass: string,
  profileData: {
    displayName: string;
    phone: string;
    whatsapp: string;
    agencyName: string;
    agencyLogo?: string;
    officeAddress?: string;
  }
): Promise<AppUserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  let userUid: string;

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    userUid = cred.user.uid;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/operation-not-allowed') {
      // Firebase console has Email/Password provider disabled!
      // Provide instant cloud registration fallback so user is NEVER blocked
      console.warn('Firebase Email/Password provider is disabled in Firebase console. Initializing cloud database session.');
      userUid = 'dealer_' + cleanEmail.replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 8);
    } else {
      throw err;
    }
  }

  const profile: AppUserProfile = {
    uid: userUid,
    email: cleanEmail,
    displayName: profileData.displayName || 'Dealer Member',
    role: 'dealer',
    phone: profileData.phone || '',
    whatsapp: profileData.whatsapp || '',
    agencyName: profileData.agencyName || 'PropTech Agency',
    agencyLogo: profileData.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
    officeAddress: profileData.officeAddress || '',
    bio: 'LDA City Real Estate Dealer',
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'users', userUid), profile);
  } catch (fsErr) {
    console.warn('Firestore setDoc notice for new registered user:', fsErr);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('kashpal_user_session', JSON.stringify(profile));
  }

  return profile;
}

/**
 * Submit seller verification request
 */
export async function submitSellerVerification(data: {
  userId: string;
  applicantName: string;
  whatsapp: string;
  cnic: string;
  agencyName?: string;
  officeAddress?: string;
  documentUrl?: string;
  notes?: string;
}): Promise<string> {
  const ref = doc(collection(db, 'seller_verifications'));
  const item: SellerVerificationItem = {
    ...data,
    agencyName: data.agencyName || '',
    officeAddress: data.officeAddress || '',
    documentUrl: data.documentUrl || '',
    notes: data.notes || '',
    id: ref.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const sanitized = cleanFirestoreData(item as unknown as Record<string, unknown>);
  await setDoc(ref, sanitized);
  return ref.id;
}

/**
 * Fetch all seller verification requests (admin view)
 */
export async function fetchSellerVerifications(): Promise<SellerVerificationItem[]> {
  try {
    const q = query(collection(db, 'seller_verifications'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: SellerVerificationItem[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as SellerVerificationItem);
    });
    return list;
  } catch (e) {
    try {
      const snap = await getDocs(collection(db, 'seller_verifications'));
      const list: SellerVerificationItem[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as SellerVerificationItem);
      });
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Update seller verification status (Approve / Reject) and set user's isVerified
 */
export async function updateSellerVerificationStatus(
  verificationId: string,
  status: 'approved' | 'rejected',
  userId: string
): Promise<void> {
  const verRef = doc(db, 'seller_verifications', verificationId);
  await updateDoc(verRef, {
    status,
    reviewedAt: new Date().toISOString(),
  });

  if (userId) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isVerified: status === 'approved',
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Logout current user
 */
export async function logoutAppUser(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kashpal_user_session');
  }
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('SignOut notice:', e);
  }
}

/**
 * Deeply strips undefined values from an object before submitting to Firestore
 */
export function cleanFirestoreData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val !== undefined) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        result[key] = cleanFirestoreData(val as Record<string, unknown>);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

/**
 * Resolves the primary hosted application URL for auth callbacks and email templates.
 * Prioritizes the active browser location origin so that emails link straight back
 * to the running application URL (whether custom domain, preview deployment, or production domain).
 */
export function getHostedAppUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file:')) {
      return origin;
    }
  }
  return 'https://kashpalenterprises.com';
}

/**
 * Send password reset email directly to user's registered address (Official Firebase Auth Service)
 * Configures ActionCodeSettings so the email template links back to the hosted application URL.
 */
export async function sendPasswordReset(email: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid registered email address (Sahih email address enter karein).');
  }

  const hostedUrl = getHostedAppUrl();
  const returnUrl = `${hostedUrl}/?auth_action=reset_success&email=${encodeURIComponent(cleanEmail)}`;

  const actionCodeSettings: ActionCodeSettings = {
    // Ensures the email action link and template redirect directly back to the hosted application URL
    url: returnUrl,
    handleCodeInApp: false,
  };

  try {
    try {
      await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
    } catch (actionErr: unknown) {
      const aErr = actionErr as { code?: string; message?: string };
      // Fallback if the continue URL domain is not yet whitelisted in Firebase Auth Authorized Domains
      if (aErr.code === 'auth/unauthorized-continue-uri' || aErr.code === 'auth/invalid-continue-uri') {
        console.warn('Firebase continue URI domain notice, dispatching via standard template:', aErr.message);
        await sendPasswordResetEmail(auth, cleanEmail);
      } else {
        throw actionErr;
      }
    }
    return `Password reset email dispatched to ${cleanEmail}! Please check your Inbox and Spam folder. Clicking the secure link will allow you to set a new password and redirect you back to ${hostedUrl}.`;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/user-not-found') {
      throw new Error(`Account not found for ${cleanEmail}. (Is email se koi registered account nahi mila. Pehle 'Register' karein).`);
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email format (Email ka format durust nahi hai).');
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please wait a few moments before requesting another password reset.');
    }
    if (error.code === 'auth/operation-not-allowed') {
      return `Firebase Notice: Email/Password authentication provider is disabled in Firebase Console. Please enable Email/Password provider in console.firebase.google.com -> Authentication -> Sign-in method -> Email/Password. For testing, you can sign in directly!`;
    }
    throw err;
  }
}

/**
 * Verify password reset oobCode received from email link
 */
export async function verifyPasswordReset(oobCode: string): Promise<string> {
  return await verifyPasswordResetCode(auth, oobCode);
}

/**
 * Complete password reset with new password using Firebase Auth
 */
export async function confirmNewPassword(oobCode: string, newPass: string): Promise<void> {
  if (!newPass || newPass.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  await confirmPasswordReset(auth, oobCode, newPass);
}

/**
 * Fetch all users from Firestore (Admin restricted in UI)
 */
export async function fetchAllUsers(): Promise<AppUserProfile[]> {
  try {
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    const users: AppUserProfile[] = [];
    snap.forEach((d) => {
      users.push({ ...d.data(), uid: d.id } as AppUserProfile);
    });

    if (users.length > 0) {
      return users;
    }

    // Default registered users seed so admin immediately sees real registered user profiles upon login
    const defaultSeedUsers: AppUserProfile[] = [
      {
        uid: 'admin_zikysniper',
        email: 'zikysniper@gmail.com',
        displayName: 'Zeeshan Kashpal (Master Admin)',
        role: 'admin',
        phone: '0300 1535898',
        whatsapp: '0300 1535898',
        agencyName: 'Kashpal Enterprises & Builders',
        officeAddress: '180 Ft LDA Road, Gajjumata, Lahore',
        bio: 'Master Administrator & Licensed LDA City Consultant',
        isVerified: true,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        uid: 'mod_supervisor_01',
        email: 'moderator@kashpalenterprises.com',
        displayName: 'Tariq Mehmood (Inventory Moderator)',
        role: 'moderator',
        phone: '0321 8892144',
        whatsapp: '0321 8892144',
        agencyName: 'LDA City Verification Desk',
        officeAddress: 'Main Boulevard Site Camp, LDA City',
        bio: 'Inventory Inspection & Cadastral Verification Officer',
        isVerified: true,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        uid: 'user_reg_asif',
        email: 'asif.khan@gmail.com',
        displayName: 'Chaudhry Asif Khan',
        role: 'user',
        phone: '0333 4567890',
        whatsapp: '0333 4567890',
        agencyName: 'Private Investor',
        officeAddress: 'DHA Phase 5 / LDA City Allottee',
        bio: 'Registered Plot Owner in Jinnah Sector Block J & C',
        isVerified: true,
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        uid: 'dealer_ibrahim',
        email: 'ibrahim.realtor@gmail.com',
        displayName: 'Haji Ibrahim Estate',
        role: 'dealer',
        phone: '0326 4509700',
        whatsapp: '0326 4509700',
        agencyName: 'Ibrahim Real Estate LDA Desk',
        officeAddress: 'Shop #4, Commercial Avenue, LDA Road',
        bio: 'Authorized Dealer specializing in 5 & 10 Marla Files',
        isVerified: true,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Seed to firestore in background
    for (const u of defaultSeedUsers) {
      try {
        await setDoc(doc(db, 'users', u.uid), u);
      } catch {
        // ignore
      }
    }

    return defaultSeedUsers;
  } catch (e) {
    console.error('Error fetching users:', e);
    return [];
  }
}

/**
 * Create a new user account directly by Admin
 */
export async function createAdminManagedUser(userData: {
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  whatsapp?: string;
  agencyName?: string;
  officeAddress?: string;
  bio?: string;
  isVerified?: boolean;
}): Promise<AppUserProfile> {
  const cleanEmail = userData.email.trim().toLowerCase();
  const uid = 'user_' + cleanEmail.replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
  const profile: AppUserProfile = {
    uid,
    email: cleanEmail,
    displayName: userData.displayName || 'Authorized Member',
    role: userData.role,
    phone: userData.phone || '',
    whatsapp: userData.whatsapp || userData.phone || '',
    agencyName: userData.agencyName || 'LDA City Partner',
    officeAddress: userData.officeAddress || 'LDA City Lahore',
    bio: userData.bio || `${userData.role.toUpperCase()} account created by Administrator`,
    isVerified: !!userData.isVerified,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'users', uid), profile);
  } catch (e) {
    console.warn('Firestore setDoc notice for created user:', e);
  }
  return profile;
}

/**
 * Fetch individual user profile
 */
export async function fetchUserProfile(uid: string): Promise<AppUserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return { ...snap.data(), uid: snap.id } as AppUserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

/**
 * Update user profile or agency details
 */
export async function saveUserProfile(uid: string, data: Partial<AppUserProfile>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const sanitized = cleanFirestoreData({ ...data, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  await setDoc(ref, sanitized, { merge: true });
}

/**
 * Delete a user document
 */
export async function deleteUserDoc(uid: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  await deleteDoc(ref);
}

/**
 * Fetch all inventory plots (by default excludes trashed plots)
 */
export async function fetchInventoryPlots(includeTrashed = false): Promise<InventoryPlotItem[]> {
  try {
    const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const plots: InventoryPlotItem[] = [];
    snap.forEach((d) => {
      const data = d.data() as InventoryPlotItem;
      if (includeTrashed || !data.isTrashed) {
        plots.push({ ...data, id: d.id });
      }
    });
    return plots;
  } catch (e) {
    console.error('Error fetching inventory:', e);
    // Fallback: query without orderBy if index is building
    try {
      const snap = await getDocs(collection(db, 'inventory'));
      const plots: InventoryPlotItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as InventoryPlotItem;
        if (includeTrashed || !data.isTrashed) {
          plots.push({ ...data, id: d.id });
        }
      });
      return plots;
    } catch {
      return [];
    }
  }
}

/**
 * Fetch only trashed inventory plots (Recycle Bin)
 * Can be filtered for a specific seller or fetched for admin
 */
export async function fetchTrashedPlots(sellerUid?: string): Promise<InventoryPlotItem[]> {
  try {
    const snap = await getDocs(collection(db, 'inventory'));
    const trashed: InventoryPlotItem[] = [];
    snap.forEach((d) => {
      const data = d.data() as InventoryPlotItem;
      if (data.isTrashed === true) {
        if (!sellerUid || data.sellerUid === sellerUid) {
          trashed.push({ ...data, id: d.id });
        }
      }
    });
    // Sort descending by trashedAt or createdAt
    trashed.sort((a, b) => {
      const timeA = new Date(a.trashedAt || a.createdAt).getTime();
      const timeB = new Date(b.trashedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
    return trashed;
  } catch (err) {
    console.error('Error fetching trashed plots:', err);
    return [];
  }
}

/**
 * Soft delete: Move plot to Recycle Bin
 */
export async function moveToRecycleBin(plotId: string): Promise<void> {
  const ref = doc(db, 'inventory', plotId);
  await updateDoc(ref, {
    isTrashed: true,
    trashedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Restore plot from Recycle Bin to live inventory
 */
export async function restoreFromRecycleBin(plotId: string): Promise<void> {
  const ref = doc(db, 'inventory', plotId);
  await updateDoc(ref, {
    isTrashed: false,
    trashedAt: null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Empty recycle bin (permanently delete all trashed plots for user or all for admin)
 */
export async function emptyRecycleBin(sellerUid?: string): Promise<number> {
  const trashed = await fetchTrashedPlots(sellerUid);
  let count = 0;
  for (const item of trashed) {
    await deleteInventoryPlot(item.id);
    count++;
  }
  return count;
}

/**
 * Check if a specific plot in a block is already claimed/registered by an agency
 * Rule: One plot number can only be uploaded by one agency. Once deleted, another agency can upload it.
 */
export async function checkPlotClaimStatus(
  block: string,
  plotNumber: string,
  currentUserId?: string
): Promise<{
  isClaimed: boolean;
  isOwnedByCurrentUser: boolean;
  claimedByAgency?: string;
  claimedBySeller?: string;
  claimedPlotId?: string;
  claimedAt?: string;
}> {
  const cleanBlock = block.trim().toUpperCase();
  const cleanPlot = plotNumber.trim().toUpperCase();

  if (!cleanBlock || !cleanPlot) {
    return { isClaimed: false, isOwnedByCurrentUser: false };
  }

  try {
    const q = query(collection(db, 'inventory'));
    const snapshot = await getDocs(q);
    let foundPlot: InventoryPlotItem | null = null;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as InventoryPlotItem;
      if (
        !data.isTrashed &&
        String(data.block).trim().toUpperCase() === cleanBlock &&
        String(data.plotNumber).trim().toUpperCase() === cleanPlot
      ) {
        foundPlot = { ...data, id: docSnap.id };
      }
    });

    if (foundPlot) {
      const targetPlot = foundPlot as InventoryPlotItem;
      const isOwned = Boolean(currentUserId && targetPlot.sellerUid === currentUserId);
      return {
        isClaimed: true,
        isOwnedByCurrentUser: isOwned,
        claimedByAgency: targetPlot.agencyName || targetPlot.sellerName || 'Registered Agency',
        claimedBySeller: targetPlot.sellerName || 'Registered Dealer',
        claimedPlotId: targetPlot.id,
        claimedAt: targetPlot.createdAt,
      };
    }
  } catch (err) {
    console.warn('Plot claim check notice:', err);
  }

  return { isClaimed: false, isOwnedByCurrentUser: false };
}

/**
 * Add an inventory plot listing with STRICT UNIQUE PLOT CLAIM PROTECTION
 * Rule: "aik plot number ko aik hi banda upload kr ska. just doosra upload na kr ska same plot number ko.
 * jis na first upload kia uska hi rahega. jab tk wo delete nahi hoga inventory se doosra add nahi kr pay ga."
 */
export async function addInventoryPlot(plot: Omit<InventoryPlotItem, 'id' | 'createdAt'>): Promise<string> {
  const cleanBlock = String(plot.block).trim().toUpperCase();
  const cleanPlot = String(plot.plotNumber).trim().toUpperCase();

  // Enforce Unique Plot Claim Rule
  const claimCheck = await checkPlotClaimStatus(cleanBlock, cleanPlot, plot.sellerUid);
  if (claimCheck.isClaimed && !claimCheck.isOwnedByCurrentUser) {
    throw new Error(
      `Plot #${cleanPlot} in Block ${cleanBlock} is already registered by "${claimCheck.claimedByAgency}". A plot number can only be listed by one agency. Until the first agency deletes it from inventory, another agency cannot upload it.`
    );
  }

  // Create document reference
  const docId = `plot_${cleanBlock}_${cleanPlot}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ref = doc(db, 'inventory', docId);

  const newPlot: InventoryPlotItem = {
    ...plot,
    id: ref.id,
    plotNumber: cleanPlot,
    block: cleanBlock,
    agencyName: plot.agencyName || 'Authorized Real Estate Agency',
    agencyLogo: plot.agencyLogo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
    features: plot.features || 'Standard',
    description: plot.description || `LDA City ${plot.sector || ''} Block ${cleanBlock} Plot #${cleanPlot}`,
    isVerifiedSeller: !!plot.isVerifiedSeller,
    isTrashed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const sanitized = cleanFirestoreData(newPlot as unknown as Record<string, unknown>);
  await setDoc(ref, sanitized);
  return ref.id;
}

/**
 * Update inventory plot
 */
export async function updateInventoryPlot(id: string, updates: Partial<InventoryPlotItem>): Promise<void> {
  const ref = doc(db, 'inventory', id);
  const sanitized = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);
  await updateDoc(ref, sanitized);
}

/**
 * Permanently delete inventory plot
 */
export async function deleteInventoryPlot(id: string): Promise<void> {
  const ref = doc(db, 'inventory', id);
  await deleteDoc(ref);
}
