import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Upload, Loader2, AlertCircle, Coins, ShieldCheck, Clock, CheckCircle2, Ticket, XCircle, MessageCircle, Copy } from 'lucide-react';
import { useUser } from '../lib/UserContext';
import { useSettings } from '../lib/SettingsContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, getDocs, updateDoc, doc } from '../lib/firestore-compat';
import { toast } from 'sonner';
import { WalletTransactionType, WalletTransactionStatus } from '../types';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { createWalletTransaction, getWalletTransactions, updateWalletTransactionStatus } from '../services/db';
import { WalletTransaction } from '../types';

const BankIcon = (props: any) => (
  <img 
    src="https://previews.123rf.com/images/briang77/briang771512/briang77151200087/49534152-bank-vector-icon.jpg" 
    alt="Bank Transfer" 
    className={`${props.className || ''} object-contain rounded`}
    referrerPolicy="no-referrer"
  />
);

const EzCashIcon = (props: any) => (
  <img 
    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQY3gt-uAtlVpI7K11N75UYtZSKbu-7jJ82oA&s" 
    alt="eZ Cash" 
    className={`${props.className || ''} object-contain rounded`}
    referrerPolicy="no-referrer"
  />
);

const BinanceIcon = (props: any) => (
  <img 
    src="https://images.seeklogo.com/logo-png/59/2/binance-icon-logo-png_seeklogo-598330.png" 
    alt="Binance Pay" 
    className={`${props.className || ''} object-contain rounded`}
    referrerPolicy="no-referrer"
  />
);

export default function WalletPage() {
  const { user, profile, updateProfile, loading: authLoading } = useUser();
  const settingsContext = useSettings();
  const settings = settingsContext?.settings;

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'ez_cash' | 'binance' | 'gift_code' | ''>('');
  const [ezCashNumber, setEzCashNumber] = useState('');
  const [ezCashRn, setEzCashRn] = useState('');
  const [binanceOption, setBinanceOption] = useState<'pay_id' | 'usdt'>('pay_id');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Gift code states
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoadingTransactions(true);
    try {
      const txs = await getWalletTransactions(user.id);
      setTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleAmountPreset = (value: number) => {
    setAmount(value.toString());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', { description: 'Please choose an image under 5MB.' });
        return;
      }
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Instant redemption of gift codes
  const handleRedeemGiftCode = async () => {
    if (!user) {
      toast.error('Logging in required', { description: 'Please log in before redeeming gift codes.' });
      return;
    }
    
    const codeClean = giftCodeInput.trim().toUpperCase();
    if (!codeClean) {
      toast.error('Code required', { description: 'Please enter a valid gift code starting with XENON-.' });
      return;
    }

    if (!codeClean.startsWith('XENON-')) {
      toast.error('Invalid format', { description: 'Xenon gift codes must start with the XENON- prefix.' });
      return;
    }

    setIsRedeemingCode(true);
    try {
      // 1. Fetch matching gift code from 'giftCodes' collection
      const q = query(collection(db, 'giftCodes'), where('code', '==', codeClean));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Invalid code', { description: 'The gift code you entered is invalid or does not exist.' });
        setIsRedeemingCode(false);
        return;
      }

      const gcDoc = querySnapshot.docs[0];
      const gcData = gcDoc.data();

      if (gcData.isRedeemed) {
        toast.error('Code already used', { description: 'This gift code has already been redeemed and cannot be used again.' });
        setIsRedeemingCode(false);
        return;
      }

      // 2. Mark gift code as redeemed in database
      await updateDoc(doc(db, 'giftCodes', gcDoc.id), {
        isRedeemed: true,
        redeemedBy: user.id,
        redeemedByName: profile?.customerName || user.customerName || 'Anonymous Gamer',
        redeemedAt: Date.now()
      });

      // 3. Create a pending wallet transaction for this topup
      const txId = await createWalletTransaction({
        userId: user.id,
        customerName: profile?.customerName || user.customerName || 'Gamer',
        customerPhone: profile?.whatsappNumber || '',
        amount: gcData.amount,
        type: WalletTransactionType.TOPUP,
        status: WalletTransactionStatus.PENDING,
        paymentMethod: 'gift_code',
        paymentProofUrl: '',
        adminNotes: ''
      });

      // 4. Instantly approve the wallet transaction (which updates loyaltyPoints internally)
      await updateWalletTransactionStatus(txId, WalletTransactionStatus.APPROVED, `Instant Gift Code: ${codeClean}`);

      toast.success('Gift code redeemed!', {
        description: `Successfully credited LKR ${gcData.amount.toLocaleString()} to your wallet.`
      });

      // Clean inputs and refresh profile/transactions
      setGiftCodeInput('');
      setPaymentMethod('');
      fetchTransactions();

    } catch (err: any) {
      console.error("Failed to redeem code:", err);
      toast.error('Redemption failed', { description: err.message || 'Unknown network error occurred.' });
    } finally {
      setIsRedeemingCode(false);
    }
  };

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login first to submit top-up request.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Invalid amount', { description: 'Please enter a valid amount greater than LKR 0' });
      return;
    }

    if (!paymentMethod) {
      toast.error('Select payment method', { description: 'Please select a payment channel for top-up.' });
      return;
    }

    if (paymentMethod === 'ez_cash' && !ezCashRn.trim()) {
      toast.error('Reference required', { description: 'Please enter your Transaction RN (Reference) Number for eZ Cash.' });
      return;
    }

    if (!proofFile) {
      toast.error('Proof required', { description: 'Please upload a screenshot/receipt of the transaction.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload proof attachment using backend API proxy rather than Firebase storage (no-creds fallbacks)
      let googleDriveUrl = '';
      const reader = new FileReader();
      
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: `${user.id}_${Date.now()}_${proofFile.name}`,
                mimeType: proofFile.type,
                data: reader.result
              })
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            googleDriveUrl = data.url;
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsDataURL(proofFile);
      });

      // 2. Write WalletTransaction to Firestore with PENDING state
      await createWalletTransaction({
        userId: user.id,
        customerName: profile?.customerName || user.customerName || 'Gamer',
        customerPhone: profile?.whatsappNumber || '',
        amount: numericAmount,
        type: WalletTransactionType.TOPUP,
        status: WalletTransactionStatus.PENDING,
        paymentMethod: paymentMethod,
        paymentProofUrl: googleDriveUrl,
        adminNotes: '',
        referenceNumber: (paymentMethod === 'ez_cash') ? ezCashRn.trim() : undefined
      });

      toast.success('Top-up request submitted!', {
        description: `Your request for LKR ${numericAmount.toLocaleString()} is pending administrator review.`
      });

      // Reset form
      setAmount('');
      setPaymentMethod('');
      setEzCashNumber('');
      setEzCashRn('');
      setProofFile(null);
      setProofPreview(null);
      
      // Refresh transaction ledger
      fetchTransactions();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to submit request', { description: err.message || 'Unknown error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#070708]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-24 flex items-center justify-center bg-slate-50 dark:bg-[#070708] px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0d0d0f] rounded-3xl p-8 text-center border border-gray-100 dark:border-white/5 shadow-2xl animate-fade-in">
          <Wallet className="w-16 h-16 mx-auto text-blue-500 mb-6" />
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3">Loyal Wallet</h2>
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8 leading-relaxed">
            Please log in with your Google account to top up and pay using your digital wallet balance.
          </p>
          <button
            onClick={() => window.location.href = '/profile'}
            className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 font-sans bg-slate-50 dark:bg-[#070708] transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Page title */}
        <div className="text-center pt-24 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-4">My Wallet</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Secure instant checkout wallet</p>
        </div>

        {/* Desktop grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Balance + Topup Form (7 columns on large) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-72 h-72 bg-white/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl" />
              
              <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-200 mb-2">Available Wallet Balance</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-blue-200">LKR</span>
                      <span className="text-4xl md:text-5xl font-black tracking-tight font-mono">
                        {((profile?.loyaltyPoints || 0) * 0.000002).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shadow-inner">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-blue-100 uppercase tracking-widest font-black">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Real-time Secure Balance</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 font-mono text-[10px]">
                    <Coins className="h-3.5 w-3.5" />
                    <span>{Math.floor(profile?.loyaltyPoints || 0).toLocaleString()} pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top-up Form Panel */}
            <div className="bg-white dark:bg-[#0d0d0f] rounded-[2.5rem] p-8 md:p-10 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Request Wallet Top-up</h2>
              </div>

              <form onSubmit={handleSubmitTopup} className="space-y-6 relative z-10">
                
                {/* Choose Payment Method */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3.5 px-1">
                    Choose Funding Channel
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {[
                      { id: 'bank', label: 'Bank Transfer', icon: BankIcon },
                      { id: 'ez_cash', label: 'eZ Cash LKR', icon: EzCashIcon },
                      { id: 'binance', label: 'Binance Pay USD', icon: BinanceIcon },
                      { id: 'gift_code', label: 'Redeem Gift Code', icon: Ticket },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.id as any);
                          setProofFile(null);
                          setProofPreview(null);
                        }}
                        className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 text-left ${
                          paymentMethod === method.id 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' 
                          : 'border-gray-100 dark:border-white/5 bg-white dark:bg-black/20 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className={`p-2 rounded-xl transition-colors ${
                              paymentMethod === method.id ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-white/5'
                          }`}>
                            {React.isValidElement(method.icon) || typeof method.icon === 'string' ? (
                              method.label
                            ) : (
                              React.createElement(method.icon as any, { className: "h-6 w-6" })
                            )}
                          </div>
                          <span className="text-sm font-extrabold">{method.label}</span>
                        </div>
                        {paymentMethod === method.id && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount input - Hidden if utilizing the gift code since amount values are locked to the gift code itself */}
                {paymentMethod !== 'gift_code' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3.5 px-1">
                      Enter Amount (LKR)
                    </label>
                    <div className="relative group/input">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-blue-600 transition-colors font-bold text-sm">
                        Rs.
                      </div>
                      <input
                        type="number"
                        required={paymentMethod !== 'gift_code'}
                        min="1"
                        value={amount}
                        disabled={paymentMethod === ''}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-16 pl-14 pr-6 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 tracking-wide disabled:opacity-50"
                      />
                    </div>

                    {/* Preset Shortcuts */}
                    {paymentMethod !== '' && (
                      <div className="flex flex-wrap gap-2 mt-3.5">
                        {[500, 1000, 2000, 5000, 10000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleAmountPreset(val)}
                            className="px-4 py-2 text-[10px] md:text-xs font-bold rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 transition-all font-sans"
                          >
                            +Rs. {val.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Show Account Details Dynamically */}
                <AnimatePresence mode="wait">
                  {paymentMethod === 'bank' && (
                    <motion.div
                      key="bank"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <BankIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Store Bank Details</h4>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-[11px] uppercase font-bold text-gray-600 dark:text-gray-400">
                            <span>Bank Name:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-900 dark:text-white leading-relaxed">{settings?.bankName || 'HNB Bank'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(settings?.bankName || 'HNB Bank');
                                  toast.success("Bank Name Copied!");
                                }}
                                className="p-1 text-gray-400 hover:text-blue-500 active:scale-[0.85] transition-all shrink-0"
                                title="Copy Bank Name"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-[11px] uppercase font-bold text-gray-600 dark:text-gray-400 pt-2 border-t border-blue-500/5">
                            <span>Account Number:</span>
                            <div className="flex items-center gap-1 font-mono">
                              <span className="text-gray-900 dark:text-white font-black">{settings?.bankAccountNumber || 'Not Configured'}</span>
                              {settings?.bankAccountNumber && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(settings.bankAccountNumber);
                                    toast.success("Account Number Copied!");
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-500 active:scale-[0.85] transition-all shrink-0"
                                  title="Copy Account Number"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-[11px] uppercase font-bold text-gray-600 dark:text-gray-400 pt-2 border-t border-blue-500/5">
                            <span>Account Holder:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-900 dark:text-white leading-relaxed">{settings?.bankAccountHolder || 'Xenon Owner'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(settings?.bankAccountHolder || 'Xenon Owner');
                                  toast.success("Account Holder Copied!");
                                }}
                                className="p-1 text-gray-400 hover:text-blue-500 active:scale-[0.85] transition-all shrink-0"
                                title="Copy Account Holder"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {paymentMethod === 'ez_cash' && (
                    <motion.div
                      key="ez_cash"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <EzCashIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">eZ Cash Details</h4>
                        </div>
                        <div className="flex justify-between items-center text-[11px] uppercase font-bold text-gray-600 dark:text-gray-400 gap-4">
                          <span>eZ Cash Number:</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-gray-900 dark:text-white font-black">{settings?.ezCashNumber || 'Not Configured'}</span>
                            {settings?.ezCashNumber && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(settings.ezCashNumber);
                                  toast.success("eZ Cash Number Copied!");
                                }}
                                className="p-1 text-gray-400 hover:text-blue-500 active:scale-[0.85] transition-all shrink-0"
                                title="Copy eZ Cash Number"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-blue-500/10 space-y-3.5">
                          <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1 font-sans">
                              Transaction RN (Reference) Number *
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={14}
                              required
                              value={ezCashRn}
                              onChange={(e) => setEzCashRn(e.target.value.replace(/\D/g, '').slice(0, 14))}
                              className="w-full h-10 px-4 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black/20 outline-none transition-all font-mono font-black text-xs text-gray-900 dark:text-white placeholder:text-gray-400 placeholder:font-sans placeholder:font-bold tracking-widest"
                              placeholder="Enter 14-digit RN Reference Number..."
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {paymentMethod === 'binance' && (
                    <motion.div
                      key="binance"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Binance Pay Details</h4>
                        </div>

                        {/* Selection Tabs */}
                        <div className="flex p-1 bg-gray-100 dark:bg-black/20 rounded-xl mb-2">
                          <button
                            type="button"
                            onClick={() => setBinanceOption('pay_id')}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                              binanceOption === 'pay_id' 
                                ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            Pay ID
                          </button>
                          <button
                            type="button"
                            onClick={() => setBinanceOption('usdt')}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                              binanceOption === 'usdt' 
                                ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            USDT (BEP20)
                          </button>
                        </div>

                        <div className="space-y-4 text-[11px] uppercase font-bold text-gray-600 dark:text-gray-400">
                          {binanceOption === 'pay_id' ? (
                            <div className="flex justify-between items-center py-2">
                              <span>Binance Pay ID:</span>
                              <div className="flex items-center gap-1 font-mono text-[11px]">
                                <span className="text-gray-900 dark:text-white font-black">{settings?.binancePayId || 'Not Configured'}</span>
                                {settings?.binancePayId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(settings.binancePayId);
                                      toast.success("Binance Pay ID Copied!");
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-500 active:scale-[0.85] transition-all shrink-0"
                                    title="Copy Binance Pay ID"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2">
                              <span className="block mb-3 text-[9px] text-gray-400 text-center uppercase tracking-widest">Pay via QR or Wallet Address:</span>
                              <div className="flex flex-col items-center gap-5">
                                <div className="w-32 h-32 bg-white p-2 rounded-xl border border-gray-100 shadow-sm overflow-hidden shrink-0">
                                  <img 
                                    src="https://i.ibb.co/3mXBdhKk/Screenshot-20260613-205113-2.jpg" 
                                    alt="Binance QR" 
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 bg-white dark:bg-black/20 rounded-xl px-4 py-2.5 w-full border border-gray-100 dark:border-white/5">
                                  <span className="text-gray-950 dark:text-white font-mono text-[10px] break-all block flex-1 text-center font-black">{settings?.binanceAddress || 'Address Not Configured'}</span>
                                  {settings?.binanceAddress && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(settings.binanceAddress);
                                        toast.success("Binance Address Copied!");
                                      }}
                                      className="p-1.5 text-amber-500 hover:text-amber-600 transition-colors shrink-0"
                                      title="Copy Binance Address"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {paymentMethod === 'gift_code' && (
                    <motion.div
                      key="gift_code"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Ticket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Redeem Gift Code Vouchers</h4>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-normal font-extrabold uppercase tracking-wide">
                          Paid via bank transfer on WhatsApp? Input the voucher code you received below to instantly apply funds to your wallet balance.
                        </p>
                        
                        <div>
                          <label className="block text-[8.5px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                            Voucher Code (starts with XENON-):
                          </label>
                          <input
                            type="text"
                            value={giftCodeInput}
                            onChange={(e) => setGiftCodeInput(e.target.value.toUpperCase().trim())}
                            className="w-full h-12 px-4 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black/20 outline-none transition-all font-mono font-black text-gray-900 dark:text-white placeholder:text-gray-400 text-xs tracking-wider"
                            placeholder="XENON-XXXX-XXXX-XXXX-XXXX"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isRedeemingCode || !giftCodeInput}
                          onClick={handleRedeemGiftCode}
                          className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2"
                        >
                          {isRedeemingCode ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Validating & Adding Funds...</span>
                            </>
                          ) : (
                            <>
                              <span>Redeem Balance Instantly</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload Proof */}
                {paymentMethod !== '' && paymentMethod !== 'gift_code' && (
                  <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-3.5 animate-fade-in">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                      Proof of Payment (Required)
                    </label>
                    <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wide flex items-start gap-1 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10 leading-normal">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Please complete payment to the account details shown above, take a screenshot of the receipt, and attach it below for validation.</span>
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-blue-500/40 dark:hover:border-blue-500/40 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white dark:bg-white/[0.01]"
                    >
                      {proofPreview ? (
                        <div className="relative w-full max-h-48 rounded-lg overflow-hidden flex justify-center bg-black/5 dark:bg-white/5">
                          <img src={proofPreview} alt="Receipt proof" className="max-h-48 object-contain" />
                          <div className="absolute inset-0 bg-black/40 hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Change Screenshot</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Choose Receipt Image</span>
                          <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider font-mono">PNG, JPG up to 5MB</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit button */}
                {paymentMethod !== '' && paymentMethod !== 'gift_code' && (
                  <button
                    type="submit"
                    disabled={isSubmitting || !paymentMethod || !proofFile}
                    className="pay-btn w-full h-16 disabled:opacity-40 text-white flex items-center justify-center gap-3"
                  >
                    <span className="btn-text">
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Uploading & Submitting...</span>
                        </span>
                      ) : (
                        <span>Submit Top-up Request</span>
                      )}
                    </span>
                    {!isSubmitting && (
                      <div className="pay-btn-icon-container">
                        <svg viewBox="0 0 24 24" className="pay-btn-icon card-icon">
                          <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V6C22,4.89 21.11,4 20,4Z" fill="currentColor"></path>
                        </svg>
                        <svg viewBox="0 0 24 24" className="pay-btn-icon payment-icon">
                          <path d="M2,17H22V21H2V17M6.25,7H9V6H6V3H18V6H15V7H17.75L19,17H5L6.25,7M9,10H15V8H9V10M9,13H15V11H9V13Z" fill="currentColor"></path>
                        </svg>
                        <svg viewBox="0 0 24 24" className="pay-btn-icon dollar-icon">
                          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="currentColor"></path>
                        </svg>
                        <svg viewBox="0 0 24 24" className="pay-btn-icon wallet-icon default-icon">
                          <path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z" fill="currentColor"></path>
                        </svg>
                        <svg viewBox="0 0 24 24" className="pay-btn-icon check-icon">
                          <path d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z" fill="currentColor"></path>
                        </svg>
                      </div>
                    )}
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* RIGHT SIDE: Transaction History Ledger (5 columns on large) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#0d0d0f] rounded-[2.5rem] p-8 md:p-10 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 relative overflow-hidden transition-colors duration-300 min-h-[400px]">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
              
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/10">
                    <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Ledger history</h2>
                </div>
                <button
                  onClick={fetchTransactions}
                  className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-100/10 transition-colors focus:outline-none"
                >
                  Sync list
                </button>
              </div>

              {loadingTransactions ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 font-bold uppercase tracking-widest text-[10px] space-y-4">
                  <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                  <span>Fetching transactions...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 text-gray-400">
                  <Coins className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">No account ledger</h4>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                      Your ledger is empty. Submit a top-up request to start playing and buying!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2 overscroll-contain">
                  {transactions.map((tx) => {
                    const isDebit = tx.type === WalletTransactionType.DEBIT;
                    const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit'
                    }) : '';
                    
                    return (
                      <div
                        key={tx.id}
                        className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-3 transition-colors hover:bg-gray-100/50 dark:hover:bg-white/[0.04]"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                              isDebit 
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className="block font-black text-xs text-gray-800 dark:text-gray-200 capitalize tracking-wide">
                                {tx.type === WalletTransactionType.TOPUP ? 'Wallet Top-up' : tx.type === WalletTransactionType.MANUAL ? 'Balance Adjust' : 'Order Debit'}
                              </span>
                              <span className="block font-mono text-[9px] text-gray-400">{date}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`block font-extrabold text-sm font-mono ${
                              isDebit ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isDebit ? '-' : '+'} LKR {tx.type === WalletTransactionType.MANUAL ? (tx.amount * 0.000002).toLocaleString() : tx.amount?.toLocaleString()}
                            </span>
                            
                            {/* Status badge */}
                            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              tx.status === WalletTransactionStatus.APPROVED 
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : tx.status === WalletTransactionStatus.PENDING
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}>
                              {tx.status === WalletTransactionStatus.PENDING && <Clock className="w-2.5 h-2.5 shrink-0" />}
                              {tx.status === WalletTransactionStatus.APPROVED && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                              {tx.status === WalletTransactionStatus.REJECTED && <XCircle className="w-2.5 h-2.5 shrink-0" />}
                              {tx.status}
                            </span>
                          </div>
                        </div>

                        {tx.adminNotes && (
                          <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-500 leading-normal">
                            <span className="font-extrabold uppercase text-[8px] text-gray-400 block mb-0.5">Note:</span>
                            <span className="font-bold">{tx.adminNotes}</span>
                          </div>
                        )}
                        {!tx.adminNotes && tx.paymentMethod && (
                          <div className="pt-2 border-t border-gray-100 dark:border-white/5 text-[9px] text-gray-400 uppercase tracking-widest font-mono">
                            Channel: {tx.paymentMethod.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
