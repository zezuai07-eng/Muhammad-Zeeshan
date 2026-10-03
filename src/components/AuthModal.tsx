import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  Phone, 
  MessageSquare, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  KeyRound,
  Globe,
  RefreshCw,
  ExternalLink,
  Check
} from 'lucide-react';
import { 
  loginAppUser, 
  registerAppUser, 
  sendPasswordReset, 
  verifyPasswordReset,
  confirmNewPassword,
  getHostedAppUrl,
  AppUserProfile,
  MASTER_ADMIN_PASSWORD
} from '../utils/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUserProfile) => void;
  onOpenAdminPortal?: () => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'admin' | 'confirm_reset';
  resetCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenAdminPortal,
  initialMode = 'login',
  resetCode,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'admin' | 'confirm_reset'>(initialMode);
  
  // Login fields (BLANK by default - strictly zero password leakage)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields for Dealer / Seller
  const [displayName, setDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [agencyLogo, setAgencyLogo] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');

  // Admin access password field (BLANK by default)
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Password reset confirmation fields (when entering via link)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetDispatchedTo, setResetDispatchedTo] = useState<string | null>(null);

  // Sync mode whenever initialMode or isOpen or resetCode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMsg(null);
      setResetDispatchedTo(null);

      if (initialMode === 'confirm_reset' && resetCode) {
        setIsVerifyingCode(true);
        verifyPasswordReset(resetCode)
          .then((resolvedEmail) => {
            setVerifiedEmail(resolvedEmail);
          })
          .catch((err) => {
            const e = err as { message?: string };
            setError(e.message || 'Password reset security link is invalid or expired. Please request a new one.');
          })
          .finally(() => {
            setIsVerifyingCode(false);
          });
      }
    }
  }, [isOpen, initialMode, resetCode]);

  if (!isOpen) return null;

  // Handle standard user login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await loginAppUser(email.trim(), password);
      setSuccessMsg(`Welcome back, ${user.displayName || user.agencyName}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Incorrect password or email. Please check your credentials.');
      } else if (e.code === 'auth/user-not-found') {
        setError('No account found with this email. Please click "Register Seller".');
      } else if (e.code === 'auth/operation-not-allowed') {
        setError('auth/operation-not-allowed: Firebase Console me Email/Password provider disabled hai.');
      } else {
        setError(e.message || 'Login failed. Please verify internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Dealer / Seller Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!displayName.trim() || !regEmail.trim() || !regPassword || !regPhone.trim() || !agencyName.trim()) {
      setError('Please fill in all mandatory fields (Name, Email, Password, Phone & Company Name).');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const user = await registerAppUser(regEmail.trim(), regPassword, {
        displayName: displayName.trim(),
        phone: regPhone.trim(),
        whatsapp: regWhatsapp.trim() || regPhone.trim(),
        agencyName: agencyName.trim(),
        agencyLogo: agencyLogo.trim() || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
        officeAddress: officeAddress.trim() || 'LDA City Lahore',
      });
      setSuccessMsg(`Account created successfully! Welcome ${user.agencyName}.`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in.');
      } else if (e.code === 'auth/operation-not-allowed') {
        setError('auth/operation-not-allowed: Firebase Console me Email/Password provider disabled hai.');
      } else {
        setError(e.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Admin Password Access
  const handleAdminAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adminPasswordInput.trim() === MASTER_ADMIN_PASSWORD) {
      setLoading(true);
      try {
        // Authenticate with predefined admin account
        const user = await loginAppUser('zikysniper@gmail.com', MASTER_ADMIN_PASSWORD);
        setSuccessMsg('Master Admin Authorized! Loading Control Panel...');
        setTimeout(() => {
          onLoginSuccess(user);
          if (onOpenAdminPortal) {
            onOpenAdminPortal();
          }
          onClose();
        }, 600);
      } catch {
        // Fallback local admin profile
        const localAdmin: AppUserProfile = {
          uid: 'master-admin',
          email: 'zikysniper@gmail.com',
          displayName: 'Master Administrator',
          role: 'admin',
          phone: '0300 1535898',
          whatsapp: '0300 1535898',
          agencyName: 'Kashpal Enterprises & Builders',
          officeAddress: '180 Ft LDA Road, Gajjumata, Lahore',
          isVerified: true,
        };
        onLoginSuccess(localAdmin);
        if (onOpenAdminPortal) {
          onOpenAdminPortal();
        }
        onClose();
      } finally {
        setLoading(false);
      }
    } else {
      setError('Invalid Admin Authorization Password! Access Denied.');
    }
  };

  // Handle Password Reset
  const handleForgotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setResetDispatchedTo(null);

    const targetEmail = email.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const msg = await sendPasswordReset(targetEmail);
      setSuccessMsg(msg);
      setResetDispatchedTo(targetEmail);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Could not send reset link. Verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle In-App New Password Confirmation
  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!resetCode) {
      setError('Missing security verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPass) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await confirmNewPassword(resetCode, newPassword);
      setSuccessMsg('Your password has been reset successfully! You can now log in.');
      if (verifiedEmail) {
        setEmail(verifiedEmail);
      }
      setPassword(newPassword);
      setTimeout(() => {
        setMode('login');
      }, 1500);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to update password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#0B132B] border border-[#D4AF37]/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#1C2541] to-[#111A35] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#0B132B] rounded-[14px] flex items-center justify-center text-[#D4AF37]">
                {mode === 'admin' ? <Lock className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>
                  {mode === 'login' && 'User & Dealer Login'}
                  {mode === 'register' && 'Register Seller / Dealer Account'}
                  {mode === 'admin' && 'Master Admin Authorization'}
                  {mode === 'forgot' && 'Reset Portal Password'}
                  {mode === 'confirm_reset' && 'Set New Password'}
                </span>
              </h3>
              <p className="text-xs text-[#D4AF37]">
                Kashpal Enterprises • LDA City Lahore
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0B132B] text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Strictly User Login, Register User, and Forgot Password */}
        <div className="flex border-b border-slate-800 bg-[#0E1738] p-1.5 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); setResetDispatchedTo(null); }}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all cursor-pointer text-center ${
              mode === 'login'
                ? 'bg-[#1C2541] text-[#D4AF37] border border-[#D4AF37]/40 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); setResetDispatchedTo(null); }}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all cursor-pointer text-center ${
              mode === 'register'
                ? 'bg-[#1C2541] text-[#D4AF37] border border-[#D4AF37]/40 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register User
          </button>
          <button
            type="button"
            onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
              mode === 'forgot' || mode === 'confirm_reset'
                ? 'bg-[#1C2541] text-[#D4AF37] border border-[#D4AF37]/40 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Forgot Password
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Notifications */}
          {error && (
            <div className={`p-3.5 rounded-xl border text-xs shadow-md space-y-2 ${
              error.includes('operation-not-allowed')
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  error.includes('operation-not-allowed') ? 'text-amber-400' : 'text-rose-400'
                }`} />
                <div className="flex-1 font-semibold text-white">
                  {error.includes('operation-not-allowed')
                    ? 'Firebase Auth: Email/Password Sign-in Method Disabled'
                    : 'Notice'}
                </div>
              </div>
              
              {error.includes('operation-not-allowed') ? (
                <div className="space-y-2 text-[11px] text-slate-200 leading-relaxed border-t border-amber-500/30 pt-2">
                  <p className="text-amber-300 font-medium">
                    فائر بیس کنسول میں "Email/Password" آپشن غیر فعال (Disabled) ہے۔ اس کو فعال (Enable) کرنے کا آسان طریقہ:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 font-mono text-[10.5px]">
                    <li>Open <strong>console.firebase.google.com</strong></li>
                    <li>Go to <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong></li>
                    <li>Click <strong>Email/Password</strong> &rarr; Toggle <strong>Enable</strong> &rarr; <strong>Save</strong></li>
                  </ol>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const fallbackUser: AppUserProfile = {
                          uid: 'dealer_' + Date.now(),
                          email: regEmail.trim() || email.trim() || 'dealer@kashpal.com',
                          displayName: displayName.trim() || 'Verified Dealer Member',
                          role: 'dealer',
                          phone: regPhone.trim() || '0300 1535898',
                          whatsapp: regWhatsapp.trim() || regPhone.trim() || '0300 1535898',
                          agencyName: agencyName.trim() || 'Authorized LDA Partner Agency',
                          agencyLogo: agencyLogo.trim() || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=160&q=80',
                          officeAddress: officeAddress.trim() || '180 Ft Boulevard, LDA City',
                          isVerified: true,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                        localStorage.setItem('kashpal_user_session', JSON.stringify(fallbackUser));
                        onLoginSuccess(fallbackUser);
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B89628] text-[#0B132B] font-bold hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Instant Bypass: Login Directly &amp; Post Plots Now</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11.5px]">{error}</div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-start gap-2 shadow-md">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode 1: USER / DEALER LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                      setResetDispatchedTo(null);
                    }}
                    className="text-[11px] font-semibold text-[#D4AF37] hover:text-[#f8d87c] hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <KeyRound className="w-3 h-3 text-[#D4AF37]" />
                    <span>Forgot Password?</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Instant password recovery prompt if password error occurs */}
              {error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('credential')) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Forgot your login credentials?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="font-bold text-[#D4AF37] hover:text-white hover:underline cursor-pointer text-xs shrink-0 flex items-center gap-1 ml-2"
                  >
                    <span>Reset Password &rarr;</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">
                  New dealer or seller?{' '}
                </span>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs font-bold text-[#D4AF37] hover:underline cursor-pointer"
                >
                  Create Seller Account
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: REGISTER SELLER / DEALER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#1C2541]/70 border border-[#D4AF37]/30 text-xs text-slate-300">
                <span className="font-bold text-[#D4AF37]">Seller Account: </span>
                Add your company name, logo &amp; phone number to upload LDA City plots directly to the live map &amp; marketplace.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Ali"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="ali@estate.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company / Agency Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. City Prime Real Estate"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Account Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="0300 1234567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="0300 1234567"
                      value={regWhatsapp}
                      onChange={(e) => setRegWhatsapp(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company Logo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://... logo image link"
                  value={agencyLogo}
                  onChange={(e) => setAgencyLogo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Office Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Office #4, Main Boulevard, LDA City"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Register Seller Account &amp; Start Uploading</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mode 3: MASTER ADMIN AUTHORIZATION */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminAccess} className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Master Administrator Security Gateway</span>
                </div>
                Enter the master administrator authorization password to access user management, seller verifications, and global plot inventory.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admin Authorization Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Enter admin password..."
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#1C2541] border border-slate-700 focus:border-amber-400 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none font-mono tracking-wider transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Verifying Authorization...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Unlock Admin Panel</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mode 4: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {resetDispatchedTo ? (
                <div className="p-5 rounded-2xl bg-gradient-to-b from-[#1C2541] to-[#0E1738] border border-emerald-500/40 text-center space-y-3.5 shadow-xl animate-fade-in">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Reset Email Dispatched!</h4>
                    <p className="text-xs text-emerald-300 mt-1">
                      A password reset link was sent to:
                    </p>
                    <p className="text-xs font-mono font-bold text-white bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 mt-1.5 inline-block">
                      {resetDispatchedTo}
                    </p>
                  </div>

                  <div className="text-left text-xs text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold text-[11px]">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Direct Link Back to Hosted Application</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      The Firebase email template includes an authenticated secure link that allows you to reset your password and links directly back to:
                    </p>
                    <p className="text-[10px] font-mono text-emerald-300 break-all bg-black/40 p-1.5 rounded border border-slate-800">
                      {getHostedAppUrl()}
                    </p>
                    <p className="text-[10.5px] text-slate-400 italic">
                      💡 Tip: Please check your Spam / Junk folder if you do not see the email in your primary inbox within 1–2 minutes.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                        setSuccessMsg('Please enter your new password once updated.');
                        setResetDispatchedTo(null);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-xs shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Back to Login</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetDispatchedTo(null);
                        setSuccessMsg(null);
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Email</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPass} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#1C2541]/80 border border-[#D4AF37]/30 text-xs text-slate-300 leading-relaxed space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[#D4AF37]">
                      <Mail className="w-4 h-4 text-[#D4AF37]" />
                      <span>Firebase Auth Password Reset Service</span>
                    </div>
                    <p>
                      Enter your registered account email. A secure password reset email will be sent with a link that lets you choose a new password and directs you directly back to this application.
                    </p>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-amber-300/90 font-mono pt-1.5 border-t border-slate-700/60">
                      <Globe className="w-3.5 h-3.5 shrink-0 text-[#D4AF37]" />
                      <span className="truncate">Hosted Destination: {getHostedAppUrl()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Registered Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        autoFocus
                        placeholder="Enter your registered account email..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span>Sending Reset Link via Firebase...</span>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Password Reset Email</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); }}
                      className="text-xs text-[#D4AF37] hover:underline cursor-pointer font-semibold"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Mode 5: IN-APP CONFIRM PASSWORD RESET (When navigated via email link with oobCode) */}
          {mode === 'confirm_reset' && (
            <div className="space-y-4">
              {isVerifyingCode ? (
                <div className="p-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                  <p className="text-xs text-slate-300">Verifying secure password reset code with Firebase...</p>
                </div>
              ) : (
                <form onSubmit={handleConfirmNewPassword} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#1C2541]/80 border border-[#D4AF37]/30 text-xs text-slate-300 leading-relaxed space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-[#D4AF37]">
                      <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                      <span>Set New Account Password</span>
                    </div>
                    {verifiedEmail && (
                      <p className="text-xs text-white">
                        Updating password for: <span className="font-bold text-[#D4AF37]">{verifiedEmail}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Choose a secure new password for your account (minimum 6 characters).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Re-enter new password"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#0B132B] font-extrabold text-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span>Updating Password...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save New Password &amp; Continue</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); }}
                      className="text-xs text-[#D4AF37] hover:underline cursor-pointer font-semibold"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
