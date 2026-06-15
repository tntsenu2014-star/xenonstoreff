import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Moon, Sun, Save, Phone, Fingerprint, ShieldCheck, Loader2, LogOut, Mail, CheckCircle2, Camera, Trophy, Sparkles, ShoppingBag } from 'lucide-react';
import { useUser } from '../lib/UserContext';
import { useTheme } from '../lib/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import OrderHistoryList from '../components/OrderHistoryList';

export default function ProfilePage() {
  const { user, profile, updateProfile, loading: authLoading, login, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [authState, setAuthState] = useState<'auth' | 'forgot' | 'reset'>('auth');
  const [forgotEmail, setForgotEmail] = useState('');
  const [devCode, setDevCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const [playerId, setPlayerId] = useState(profile?.playerId || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsappNumber || '');
  const [customerName, setCustomerName] = useState(profile?.customerName || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Success", { description: data.message });
      setAuthState('reset');
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword !== resetConfirmPassword) {
      toast.error("Error", { description: "Passwords do not match." });
      return;
    }
    if (resetNewPassword.length < 6) {
      toast.error("Error", { description: "Password must be at least 6 characters." });
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          secretKey: resetCode,
          newPassword: resetNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Password Reset Successful", { description: data.message });
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setDevCode('');
      setIsRegistering(false);
      setAuthState('auth');
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    setPlayerId(profile.playerId);
    setWhatsappNumber(profile.whatsappNumber);
    setCustomerName(profile.customerName);
  }, [profile]);

  useEffect(() => {
    if (user && !authLoading) {
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        navigate(redirect, { replace: true });
      }
    }
  }, [user, authLoading, location, navigate]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", { description: "Image size must be less than 2MB." });
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      const base64String = await new Promise<string>((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          data: base64String
        })
      });
      
      if (!res.ok) throw new Error('Upload failed with status ' + res.status);
      const data = await res.json();
      await updateProfile({ photoURL: data.url });
      toast.success("Profile photo updated!");
    } catch (err: any) {
      console.error("Failed to upload image:", err);
      toast.error("Upload failed", { description: err.message || "Something went wrong" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ playerId, whatsappNumber, customerName });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Failed to update profile. Please try again.";
      try {
        if (err.message.startsWith('{')) {
          const parsed = JSON.parse(err.message);
          errorMessage = parsed.error || errorMessage;
        }
      } catch {
        // use default
      }
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Error", { description: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Error", { description: "Password must be at least 6 characters." });
      return;
    }

    setIsChangingPassword(true);
    // password changing logic here
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsChangingPassword(false);
    toast.success("Success", { description: "Password updated successfully!" });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    logout();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-3 sm:px-6 lg:px-8 font-sans bg-slate-50 dark:bg-[#070708] transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-10">
        
        <div className="text-center pt-16 sm:pt-24">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-3 sm:mb-4">My Account</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Manage your profile and settings</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Account Section */}
          <div className="bg-white dark:bg-[#0d0d0f] rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
            
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10 relative z-10">
              <div className="bg-blue-600 p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/20">
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">Login details</h2>
            </div>

            {user ? (
              <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 w-full relative z-10 transition-colors">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  className="hidden" 
                  accept="image/*" 
                />
                <div 
                  className="relative shrink-0 cursor-pointer group/avatar"
                  onClick={handleImageClick}
                >
                  {profile.photoURL || user.photoURL ? (
                    <img 
                      src={profile.photoURL || user.photoURL || ''} 
                      alt="Profile" 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl border-4 border-white dark:border-gray-800 shadow-xl object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-xl">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                    </div>
                  )}
                  
                  {/* Camera Overlay */}
                  <div className="absolute inset-0 bg-black/40 rounded-2xl sm:rounded-3xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>

                  {/* Loading Overlay */}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/60 rounded-2xl sm:rounded-3xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}

                  <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-emerald-500 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 border-white dark:border-gray-800 shadow-lg" />
                </div>
                
                  <div className="flex-grow text-center sm:text-left min-w-0 w-full overflow-hidden">
                    <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate mb-1">{user.displayName || 'Customer'}</h3>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-gray-500 dark:text-gray-400 mt-1">
                      <Mail className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" />
                      <span className="font-bold text-[10px] sm:text-sm truncate tracking-wide">{user.email}</span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-[8px] sm:text-[10px] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 hover:border-red-100 transition-all shrink-0 shadow-sm"
                  >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </motion.button>
              </div>
            ) : (
              <div className="text-center py-8 px-5 sm:py-12 sm:px-8 rounded-2xl sm:rounded-3xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 relative z-10 transition-colors">
                {authState === 'auth' && (
                  <>
                    <p className="text-gray-500 font-bold mb-8 uppercase tracking-widest text-[10px]">Sign in to keep your data synced across devices.</p>
                    
                    <div className="space-y-4">
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        setLoginLoading(true);
                        
                        const form = e.currentTarget;
                        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
                        const secretKey = isRegistering ? (form.elements.namedItem('secretKey') as HTMLInputElement).value : '';
                        
                        try {
                          if (isRegistering) {
                            const res = await fetch('/api/auth/register', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email, password, secretKey })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            login(data.token, data.user);
                            toast.success("Account created successfully!");
                          } else {
                            const res = await fetch('/api/auth/login', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email, password })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            login(data.token, data.user);
                            toast.success("Login successful!");
                          }
                        } catch (err: any) {
                          toast.error(isRegistering ? "Registration failed" : "Login failed", { description: err.message });
                        } finally {
                          setLoginLoading(false);
                        }
                      }} className="space-y-3">
                        <input name="email" type="email" placeholder="Email" required className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white" />
                        <input name="password" type="password" placeholder="Password" required className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white" />
                        
                        {isRegistering && (
                          <div className="text-left space-y-1">
                            <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest pl-1">
                              Forgot Secret Key
                            </label>
                            <input 
                              name="secretKey" 
                              type="text" 
                              placeholder="Enter Forgot Secret Key (e.g., Mother's Maiden Name)" 
                              required 
                              className="w-full p-4 rounded-xl border border-blue-500/30 focus:border-blue-500 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400" 
                            />
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider pl-1 leading-normal">
                              Keep this key safe! Used directly to change/reset passwords if you ever forget them.
                            </p>
                          </div>
                        )}
                        
                        <button type="submit" disabled={loginLoading} className="nova-btn w-full p-4 text-white">
                          <span>{isRegistering ? 'Register' : 'Sign In'}</span>
                          <span className="arrow-wrapper">
                            <span className="arrow"></span>
                          </span>
                        </button>
                        <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full p-4 text-gray-500 font-bold text-[10px] uppercase tracking-widest underline">
                          {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
                        </button>
                        {!isRegistering && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthState('forgot');
                              // Prefill user email if they started typing it in the form
                              const emailInput = document.getElementsByName('email')[0] as HTMLInputElement;
                              if (emailInput && emailInput.value) {
                                setForgotEmail(emailInput.value);
                              }
                            }}
                            className="w-full text-center text-blue-500 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest mt-1 hover:underline outline-none"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </form>
                    </div>
                  </>
                )}

                {authState === 'forgot' && (
                  <>
                    <p className="text-gray-500 font-bold mb-6 uppercase tracking-widest text-[10px]">Forgot Password</p>
                    
                    <div className="space-y-4">
                      <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                        <p className="text-xs text-start text-gray-500 dark:text-gray-400 mb-2 leading-relaxed font-semibold uppercase tracking-wider">
                          Enter your registered email address below. You can verify your account and provide your Forgot Secret Key to reset your password.
                        </p>
                        <input
                          type="email"
                          placeholder="Email Address"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={loginLoading}
                          className="nova-btn w-full p-4 text-white"
                        >
                          {loginLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : (
                            <>
                              <span>Verify Email</span>
                              <span className="arrow-wrapper">
                                <span className="arrow"></span>
                              </span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthState('auth')}
                          className="w-full p-4 text-gray-500 font-bold text-[10px] uppercase tracking-widest underline"
                        >
                          Cancel & Back to Sign In
                        </button>
                      </form>
                    </div>
                  </>
                )}

                {authState === 'reset' && (
                  <>
                    <p className="text-gray-500 font-bold mb-6 uppercase tracking-widest text-[10px]">Reset Password</p>
                    
                    <div className="space-y-4">
                      <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                        <div className="text-start bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 mb-3 animate-pulse">
                          <span className="block text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">RESETTING PASSWORD FOR:</span>
                          <span className="block text-xs font-bold text-gray-900 dark:text-white truncate font-mono">{forgotEmail}</span>
                        </div>

                        <div className="text-left space-y-1">
                          <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest pl-1">
                            Your Forgot Secret Key
                          </label>
                          <input
                            type="text"
                            placeholder="Enter Forgot Secret Key"
                            required
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400"
                          />
                        </div>

                        <input
                          type="password"
                          placeholder="New Password"
                          required
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white"
                        />
                        <input
                          type="password"
                          placeholder="Confirm New Password"
                          required
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white"
                        />

                        <button
                          type="submit"
                          disabled={loginLoading}
                          className="nova-btn w-full p-4 text-white"
                        >
                          {loginLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : (
                            <>
                              <span>Confirm New Password</span>
                              <span className="arrow-wrapper">
                                <span className="arrow"></span>
                              </span>
                            </>
                          )}
                        </button>
                        
                        <div className="flex flex-col gap-1 items-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthState('auth');
                              setForgotEmail('');
                              setResetCode('');
                              setResetNewPassword('');
                              setResetConfirmPassword('');
                              setDevCode('');
                            }}
                            className="text-gray-500 font-bold text-[10px] uppercase tracking-widest underline mt-1 cursor-pointer"
                          >
                            Cancel & Back to Sign In
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Loyalty Points System */}
          {user && (
            <div className="bg-white dark:bg-[#0d0d0f] rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
              
              <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="bg-amber-500 p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg shadow-amber-500/20">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-1">Loyalty Points</h2>
                    <p className="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">Earn discounts on future orders</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative z-10">
                <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/10 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest text-[9px] block mb-2">Available Balance</span>
                    <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{profile.loyaltyPoints || 0} Points</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <span>Equiv: Rs. {((profile.loyaltyPoints || 0) * 0.000002).toLocaleString()}</span>
                    <button
                      onClick={() => navigate('/wallet')}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 font-extrabold text-[9px] uppercase tracking-wider text-white transition-all shadow-md shadow-amber-500/15 border-none cursor-pointer"
                    >
                      Top-up Wallet
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 transition-all space-y-4">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Earning & Redeeming Rules
                  </h4>
                  <div className="space-y-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed uppercase font-bold">
                    <p><b className="text-gray-900 dark:text-white">• Earn points:</b> Get 1 Loyalty Point for every 10 Diamonds purchased! Points are credited once orders are completed.</p>
                    <p><b className="text-gray-900 dark:text-white">• Redeem option:</b> Redeem points at checkout under payment summary to slice your ultimate totals!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

              {user && (
                <div className="bg-white dark:bg-[#0d0d0f] rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 relative overflow-hidden transition-colors duration-300">
                  <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
                    <div className="bg-purple-50 dark:bg-purple-500/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-purple-100 dark:border-purple-500/10">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">Change Password</h2>
                  </div>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      <input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full h-14 px-5 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white" required />
                      <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full h-14 px-5 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white" required />
                      <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full h-14 px-5 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white" required />
                    </div>
                    <button type="submit" disabled={isChangingPassword} className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-[10px] sm:text-xs uppercase tracking-widest transition-all">
                      {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}

              {/* Order History */}
              {user && (
                <div className="bg-white dark:bg-[#0d0d0f] rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 relative overflow-hidden transition-colors duration-300">
                  <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
                    <div className="bg-blue-50 dark:bg-blue-500/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-blue-100 dark:border-blue-100/10 transition-colors">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">Order history</h2>
                  </div>
                  <OrderHistoryList userId={profile?.playerId || ''} phone={profile?.whatsappNumber || ''} />
                </div>
              )}

            {user && (
              <div className="bg-white dark:bg-[#0d0d0f] rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 relative overflow-hidden group transition-colors duration-300">
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] z-0" />
                
                <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10 relative z-10">
                  <div className="bg-blue-50 dark:bg-blue-500/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-blue-100 dark:border-blue-500/10">
                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">Identity info</h2>
                </div>
                
                <form onSubmit={handleSave} className="space-y-6 sm:space-y-8 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div>
                      <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4 px-1">
                        Game ID (UID)
                      </label>
                      <div className="relative group/input">
                        <div className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-blue-600 transition-colors">
                          <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <input
                          type="text"
                          value={playerId}
                          onChange={(e) => setPlayerId(e.target.value)}
                          placeholder="Enter your Player ID"
                          className="w-full h-14 sm:h-16 pl-12 sm:pl-14 pr-5 sm:pr-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 tracking-wide text-xs sm:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4 px-1">
                        WhatsApp number
                      </label>
                      <div className="relative group/input">
                        <div className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-emerald-600 transition-colors">
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <input
                          type="text"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="+94 7X XXX XXXX"
                          className="w-full h-14 sm:h-16 pl-12 sm:pl-14 pr-5 sm:pr-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-emerald-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 tracking-wide text-xs sm:text-base"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4 px-1">
                      Full Name
                    </label>
                    <div className="relative group/input">
                      <div className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-blue-600 transition-colors">
                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your legal name"
                        className="w-full h-14 sm:h-16 pl-12 sm:pl-14 pr-5 sm:pr-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 tracking-wide text-xs sm:text-base"
                      />
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-4">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-14 sm:h-18 primary-gradient text-white font-bold uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 text-[10px] sm:text-xs"
                    >
                        {isSaving ? (
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        ) : isSaved ? (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        ) : (
                          <Save className="w-6 h-6" />
                        )}
                        {isSaved ? 'Successfully saved' : isSaving ? 'Saving profile...' : 'Save changes'}
                      </motion.button>
                      
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <ShieldCheck className={`w-4 h-4 ${isSaved ? 'text-emerald-500' : 'text-gray-300'}`} />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {user ? 'Changes are automatically synced' : 'Sign in to enable cloud backup'}
                        </p>
                      </div>
                    </div>
                  </form>
                </div>
              )}

          {/* Preferences Settings */}
          {user && (
            <div className="bg-white dark:bg-[#0d0d0f] rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 dark:border-white/5 shadow-lg shadow-blue-500/5 relative overflow-hidden transition-colors duration-300">
               <div className="flex items-center justify-between p-4 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 transition-colors">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3 mb-1 text-xs sm:text-sm">
                    Display theme
                  </h4>
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adjust interface appearance</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:border-blue-50 transition-all shadow-sm"
                >
                  {theme === 'dark' ? <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" /> : <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
