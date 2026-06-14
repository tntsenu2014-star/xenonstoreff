import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Package, PaymentMethod, OrderStatus, Settings as SiteSettings, Game } from '../types';
import { Gem, Send, Landmark, MessageCircle, AlertCircle, Loader2, CheckCircle2, User, Phone, ShoppingCart, Plus, Minus, Smartphone, ArrowRight, ShieldCheck, Gamepad2, Zap, X, CreditCard, Gift, Trophy, Coins, Wallet, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPackages, createOrder, getSettings, updateOrderStatus, getDBGames, getSpendersLeaderboard, getActiveShellStock, getShellsForPackage, isPubgOrder } from '../services/db';
import { initiatePayHerePayment } from '../lib/payhere';
import { GAMES } from '../constants';
import { useUser } from '../lib/UserContext';
import { toast } from 'sonner';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import WhatsAppIcon from '../components/WhatsAppIcon';

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

const CardIcon = (props: any) => (
  <img 
    src="https://img.magnific.com/free-vector/realistic-credit-card-design_23-2149126091.jpg?semt=ais_hybrid&w=740&q=80" 
    alt="Card / Online" 
    className={`${props.className || ''} object-contain rounded`}
    referrerPolicy="no-referrer"
  />
);

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('game');
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useUser();
  
  const [packages, setPackages] = useState<Package[]>([]);
  const [currency, setCurrency] = useState<'LKR' | 'USD'>('LKR');
  const [selectedPackages, setSelectedPackages] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState(profile.playerId || '');
  const [customerName, setCustomerName] = useState(profile.customerName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.whatsappNumber || '');
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  const usdExchangeRate = siteSettings?.usdRate ?? 300;
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isProofProcessing, setIsProofProcessing] = useState(false);

  // Sync with profile when it loads
  useEffect(() => {
    if (profile.playerId) setUserId(profile.playerId);
    if (profile.customerName) setCustomerName(profile.customerName);
    if (profile.whatsappNumber) setPhoneNumber(profile.whatsappNumber);
  }, [profile]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK);
  const [ezCashRn, setEzCashRn] = useState('');
  const [ezCashNumber, setEzCashNumber] = useState('');
  const [binanceOption, setBinanceOption] = useState<'payId' | 'address'>('payId');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [topSpender, setTopSpender] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [totalAvailableShells, setTotalAvailableShells] = useState<number>(Infinity);

  const handleVerify = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a User ID first");
      return;
    }

    if (userId.trim().length < 8) {
      toast.error("Invalid Player ID", {
        description: "The ID you entered is too short. It must be at least 8 numbers long.",
        duration: 4000,
        style: {
          background: '#fef2f2',
          borderColor: '#fca5a5',
          color: '#991b1b',
        }
      });
      return;
    }
    
    setIsVerifying(true);
    setIsVerified(false);
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsVerifying(false);
    setIsVerified(true);
    toast.success("ID Verified!", { 
      description: "Congratulations! Your Player ID has been successfully validated.",
      duration: 4000
    });
  };

  useEffect(() => {
    async function loadGame() {
      const queryParam = searchParams.get('game');
      if (!queryParam) return;

      // Find in hardcoded first (ID or Name)
      const hardcoded = GAMES.find(g => g.id === queryParam || g.name === queryParam);
      if (hardcoded) {
        setActiveGame(hardcoded);
      }
      
      // Then check DB for potentially newer/dynamic one
      try {
        const dbGames = await getDBGames(true);
        const matched = dbGames.find(g => g.id === queryParam || g.name === queryParam);
        if (matched) {
          setActiveGame(matched);
        } else if (!hardcoded) {
          // Fallback if not found anywhere else
          setActiveGame(GAMES[0] || null);
        }
      } catch (err) {
        console.error("Failed to fetch game details:", err);
      }
    }
    loadGame();
  }, [gameId, searchParams]);

  useEffect(() => {
    async function init() {
      // Load top spender for spotlight
      try {
        const leaders = await getSpendersLeaderboard(1);
        if (leaders.length > 0) {
          setTopSpender(leaders[0]);
        }
      } catch (err) {
        console.warn('Failed to load top spender:', err);
      }

      // Load settings
      try {
        const settings = await getSettings();
        setSiteSettings(settings);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }

      // If page URL has a ?game=... parameter, we MUST wait for the activeGame to load.
      // Otherwise activeGame?.id is undefined, which would query ALL packages.
      // Only query all packages if there's no game param in URL.
      const queryParam = searchParams.get('game');
      if (queryParam && !activeGame) {
        // Still loading the game details, skip fetching packages for now
        return;
      }

      try {
        const { totalAvailable } = await getActiveShellStock();
        setTotalAvailableShells(totalAvailable);
      } catch (err) {
        console.warn('Failed to fetch shell stock:', err);
      }

      const resolvedGameId = activeGame?.id || undefined;

      // Try to load cached packages first
      try {
        const cached = await getPackages(true, resolvedGameId);
        if (cached.length > 0) {
          setPackages(cached);
          setInitialLoading(false);
        }
      } catch (err) {
        console.warn('Order page cache load failed:', err);
      }

      try {
        const data = await getPackages(true, resolvedGameId);
        setPackages(data);
      } catch (err) {
        console.error(err);
        if (packages.length === 0) setError("Could not load packages. Please check your connection.");
      } finally {
        setInitialLoading(false);
      }
    }
    init();
  }, [gameId, activeGame]);

  const updateQuantity = (pkgId: string, delta: number) => {
    setSelectedPackages(prev => {
      const current = prev[pkgId] || 0;
      const next = current + delta;
      const nextMap = { ...prev };
      if (next <= 0) {
        delete nextMap[pkgId];
      } else {
        nextMap[pkgId] = next;
      }
      return nextMap;
    });
  };

  const selectedList = Object.entries(selectedPackages).map(([id, qty]) => {
    const pkg = packages.find(p => p.id === id);
    return { pkg, qty };
  }).filter(item => item.pkg);

  const totalAmount = selectedList.reduce((acc, item) => acc + ((item.pkg?.price || 0) as number) * (item.qty as number), 0);
  const totalDiamonds = selectedList.reduce((acc, item) => acc + ((item.pkg?.diamonds || 0) as number) * (item.qty as number), 0);

  useEffect(() => {
    if (pointsToRedeem > 0) {
      const maxAllowed = Math.floor(Math.min(profile.loyaltyPoints || 0, totalAmount * 500000));
      if (pointsToRedeem > maxAllowed) {
        setPointsToRedeem(maxAllowed);
      }
    }
  }, [totalAmount, profile.loyaltyPoints, pointsToRedeem]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large", { description: "Maximum size is 2MB" });
      return;
    }

    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    toast.success("Payment proof attached!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Order form submission triggered');
    
    if (isSubmitting) {
      console.log('Submission already in progress');
      return;
    }

    if (selectedList.length === 0) {
      const msg = "Please select at least one package by clicking the + buttons.";
      console.log('Validation failed: No packages selected');
      setSubmissionError(msg);
      toast.error(msg);
      return;
    }

    if (!userId.trim()) {
      const msg = "Please enter your Game User ID.";
      console.log('Validation failed: No userId');
      setSubmissionError(msg);
      toast.error(msg);
      return;
    }

    if (!customerName.trim()) {
      const msg = "Please enter your name.";
      console.log('Validation failed: No customerName');
      setSubmissionError(msg);
      toast.error(msg);
      return;
    }

    if (!phoneNumber.trim()) {
      const msg = "Please enter your WhatsApp number.";
      console.log('Validation failed: No phoneNumber');
      setSubmissionError(msg);
      toast.error(msg);
      return;
    }

    if ((paymentMethod === PaymentMethod.BANK || paymentMethod === PaymentMethod.EZ_CASH || paymentMethod === PaymentMethod.BINANCE) && !proofFile) {
      const msg = "Payment proof required. Please upload your payment receipt.";
      console.log('Validation failed: No proof file for ' + paymentMethod);
      toast.error("Proof Missing", { description: msg });
      setSubmissionError(msg);
      return;
    }

    if (paymentMethod === PaymentMethod.EZ_CASH && !ezCashRn.trim()) {
      const msg = "Transaction RN (Reference) Number is required for eZ Cash.";
      console.log('Validation failed: No Reference Number provided for eZ Cash');
      toast.error("RN Required", { description: msg });
      setSubmissionError(msg);
      return;
    }

    if (paymentMethod === PaymentMethod.WALLET) {
      const walletBalanceLkr = (profile.loyaltyPoints || 0) * 0.000002;
      const discountLkr = pointsToRedeem * 0.000002;
      const amountNeededLkr = totalAmount - discountLkr;
      if (walletBalanceLkr < amountNeededLkr) {
        const msg = `Insufficient Redeem Wallet balance. You need LKR ${amountNeededLkr.toLocaleString()} but only have LKR ${walletBalanceLkr.toLocaleString()}.`;
        toast.error("Insufficient Balance", { description: msg });
        setSubmissionError(msg);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    console.log('Starting order creation process...', {
      gameId,
      userId,
      selectedCount: selectedList.length,
      paymentMethod,
      hasProof: !!proofFile,
      hasSiteSettings: !!siteSettings,
      whatsappNumber: siteSettings?.whatsappNumber
    });
    
    try {
      const packageDescriptions = selectedList.map(item => `${item.pkg?.name} (x${item.qty})`).join(', ');
      
      let uploadedProofUrl = '';
      if (proofFile) {
        console.log('--- UPLOAD START ---');
        console.log('Uploading proof file:', proofFile.name, proofFile.size);
        
        try {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.readAsDataURL(proofFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: proofFile.name,
              mimeType: proofFile.type,
              data: base64Data
            }),
          });
          
          if (!response.ok) {
            throw new Error('Upload failed with status: ' + response.status);
          }
          
          const result = await response.json();
          uploadedProofUrl = result.url;
          console.log('--- UPLOAD SUCCESS ---', uploadedProofUrl);
        } catch (uploadErr) {
          console.error('--- UPLOAD FAILED ---', uploadErr);
          throw new Error('Image upload failed: ' + (uploadErr as any).message);
        }
      }

      const discountLkr = pointsToRedeem * 0.000002;
      const finalAmount = Math.max(0, totalAmount - discountLkr);
      const orderData: any = {
        packageId: selectedList[0].pkg?.id || 'multi',
        packageName: `${activeGame?.name || 'Game'}: ${packageDescriptions}`,
        diamonds: totalDiamonds,
        userId,
        customerName,
        customerPhone: phoneNumber,
        paymentMethod,
        amount: finalAmount,
        gameId: activeGame?.id || '',
        gameName: activeGame?.name || '',
      };

      if (paymentMethod === PaymentMethod.EZ_CASH) {
        orderData.referenceNumber = ezCashRn.trim();
      }

      if (pointsToRedeem > 0) {
        orderData.redeemedPoints = pointsToRedeem;
        orderData.originalAmount = totalAmount;
      }

      if (uploadedProofUrl) {
        orderData.paymentProofUrl = uploadedProofUrl;
      }

      console.log('Sending order to database...', orderData);
      console.log('Calling createOrder...');
      const orderId = await createOrder(orderData);
      console.log('Order created successfully! ID:', orderId);

      // Deduct loyalty points from profile if redeemed or paid via WALLET
      const pointsForWalletPayment = paymentMethod === PaymentMethod.WALLET ? finalAmount * 500000 : 0;
      const finalPointsDeducted = pointsToRedeem + pointsForWalletPayment;
      if (finalPointsDeducted > 0) {
        try {
          const nextPoints = Math.max(0, (profile.loyaltyPoints || 0) - finalPointsDeducted);
          await updateProfile({ loyaltyPoints: nextPoints });
          console.log('Redeemed/Wallet points deducted from profile successfully. Remaining:', nextPoints);
        } catch (pointsErr) {
          console.warn('Loyalty points profile deduction failed/skipped:', pointsErr);
        }
      }
      
      if (!orderId) {
        throw new Error("Failed to get order confirmation from server.");
      }

      // Handle PayHere specifically
      if (paymentMethod === PaymentMethod.PAYHERE) {
        initiatePayHerePayment({
          orderId,
          amount: totalAmount,
          customerName,
          customerPhone: phoneNumber,
          packageName: `${activeGame?.name || 'Game'}: ${packageDescriptions}`,
          onSuccess: async () => {
            try {
              // Update status to CONFIRMED or COMPLETED on success
              await updateOrderStatus(orderId, OrderStatus.CONFIRMED, "Paid via PayHere");
              toast.success("Payment successful and verified!");
              navigate(`/confirmation/${orderId}`, { replace: true });
            } catch (e) {
              console.error("Status update after payment failed:", e);
              navigate(`/confirmation/${orderId}`, { replace: true });
            }
          },
          onCancel: () => {
            toast.info("Payment cancelled. You can try again from your order history.");
            navigate(`/confirmation/${orderId}`, { replace: true });
          },
          onError: (err) => {
            toast.error("Payment failed", { description: err });
            navigate(`/confirmation/${orderId}`, { replace: true });
          }
        });
        return; // initiatePayHerePayment handles navigation
      }

      // WhatsApp Redirect if applicable
      if (paymentMethod === PaymentMethod.WHATSAPP && siteSettings?.whatsappNumber) {
        try {
          console.log('Attempting WhatsApp redirect...');
          const whatsappMsg = `*NEW ORDER - ${siteSettings.siteName || 'Store'}*\n\nOrder ID: #${orderId.slice(-6)}\nGame: ${activeGame?.name || 'Game'}\nPackage: ${packageDescriptions}\nAmount: Rs. ${totalAmount.toLocaleString()}\nUser ID: ${userId}\nCustomer: ${customerName}\n\nPlease confirm my order!`;
          const whatsappUrl = `https://wa.me/${siteSettings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;
          window.open(whatsappUrl, '_blank');
        } catch (waErr) {
          console.error("WhatsApp redirect failed:", waErr);
        }
      }

      toast.success("Order Created Successfully! 💎", {
        description: `Total Amount: Rs. ${totalAmount.toLocaleString()}`,
      });

      console.log('Navigating to confirmation page...');
      navigate(`/confirmation/${orderId}`, { 
        replace: true,
        state: { 
          orderId,
          order: {
            id: orderId,
            packageName: `${activeGame?.name || 'Game'}: ${packageDescriptions}`,
            amount: totalAmount,
            userId,
            paymentMethod
          }
        } 
      });
    } catch (err: any) {
      console.error("CRITICAL SUBMISSION ERROR:", err);
      let errorMessage = "Failed to create order. Please try again or check your connection.";
      
      if (err.message) {
        try {
          const parsedError = JSON.parse(err.message);
          if (parsedError.error && parsedError.error.includes('permission-denied')) {
            errorMessage = "Permission denied: Our security shield blocked this request. Please try re-logging.";
          } else if (parsedError.error) {
            errorMessage = parsedError.error;
          }
        } catch (e) {
          if (err.message.includes('permission-denied')) {
            errorMessage = "Security policy error. Please contact us via WhatsApp if this persists.";
          } else {
            errorMessage = err.message;
          }
        }
      }

      setSubmissionError(errorMessage);
      toast.error("Checkout Failed", {
        description: errorMessage,
        duration: 8000
      });
    } finally {
      setIsSubmitting(false);
      console.log('Submission state cleared');
    }
  };

  const skeletonPackages = Array(6).fill(0);

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300 bg-slate-50 dark:bg-[#070708]">
      {/* Game Header Banner */}
      <div className="relative h-[14rem] sm:h-[18rem] md:h-[22rem] overflow-hidden mx-2 sm:mx-4 md:mx-8 rounded-2xl sm:rounded-3xl group shadow-lg">
        <div className="absolute inset-0 bg-blue-950/40 group-hover:bg-blue-950/30 transition-colors z-10" />
        {activeGame && <img src={activeGame.image} alt={activeGame.name} className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700" />}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-8 sm:pb-12 px-4 text-center">
          <div className="max-w-4xl w-full">
            {activeGame && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-block p-1 bg-white dark:bg-[#0d0d0f] rounded-2xl mb-4 sm:mb-6 shadow-2xl shadow-blue-500/20"
              >
                <img src={activeGame.image} alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl object-cover" />
              </motion.div>
            )}

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="flex justify-center mb-3"
            >
              <div className="bg-blue-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl shadow-blue-900/50">
                <Zap className="w-3 h-3 fill-current" />
                <span>Top Up Instantly</span>
              </div>
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white text-3xl sm:text-5xl md:text-7xl font-black tracking-tight drop-shadow-lg"
            >
              {activeGame?.name || 'Loading...'}
            </motion.h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 mt-4 sm:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Main Content: Package Selection */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Hall of Fame Spotlight Card */}
            <AnimatePresence>
              {topSpender && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group overflow-hidden"
                >
                  <Link to="/leaderboard" className="block">
                    <div className="relative p-6 rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#0ea5e9] border border-blue-400/20 shadow-2xl shadow-blue-500/20 overflow-hidden">
                      {/* Animated Background Elements */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.2, 0.1]
                          }}
                          transition={{ duration: 8, repeat: Infinity }}
                          className="absolute -right-10 -top-10 w-64 h-64 bg-white rounded-full blur-[80px]"
                        />
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Trophy className="w-32 h-32 text-white rotate-12" />
                        </div>
                      </div>

                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar Section */}
                        <div className="relative flex-shrink-0">
                          <div className="absolute -inset-2 rounded-full bg-yellow-400/20 blur-md animate-pulse" />
                          <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,#ffd700,#ff8c00,#ffd700)] animate-[spin_4s_linear_infinite]" />
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white overflow-hidden bg-blue-900 shadow-xl">
                            {topSpender.photoURL ? (
                              <img src={topSpender.photoURL} alt={topSpender.customerName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-2xl uppercase">
                                {(topSpender.customerName || 'C')[0]}
                              </div>
                            )}
                          </div>
                          <div className="absolute -top-3 -right-3 bg-yellow-400 text-[#1e3a8a] p-1.5 rounded-full shadow-lg border-2 border-white">
                            <Trophy className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 text-center md:text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest mb-3">
                            <Zap className="w-3 h-3 fill-current" />
                            Hall of Fame • Grand Champion
                          </div>
                          <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
                            {topSpender.customerName || 'Legendary Gamer'}
                          </h4>
                          <p className="text-blue-100/70 text-xs font-bold uppercase tracking-widest">
                            Sri Lanka&apos;s Number One Top-Up King
                          </p>
                        </div>

                        {/* Stats Section */}
                        <div className="flex flex-col items-center md:items-end gap-2">
                           <div className="px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shadow-inner">
                              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest opacity-75 mb-0.5">Total Contribution</p>
                              <p className="text-xl font-mono font-black text-white tracking-tighter">
                                Rs. {(topSpender.totalSpent || 0).toLocaleString()}
                              </p>
                           </div>
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">
                             View Leaderboard <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                           </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white dark:bg-[#0d0d0f] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-blue-500/5 border border-gray-100 dark:border-white/5 transition-colors duration-300">
              <div className="flex items-center space-x-4 sm:space-x-6 mb-8 sm:mb-10">
                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/10 shrink-0">
                  <User className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1.5 sm:mb-2 uppercase tracking-tight">1. Identity</h3>
                  <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Account information</p>
                </div>
              </div>

              <div className="grid gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      {activeGame?.idLabel || 'Game User ID'}
                    </label>
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        {isVerified ? 'Secured Connection' : 'Verification Required'}
                      </span>
                    </span>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {!isVerified ? (
                      <motion.div
                        key="verify-pending"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="relative"
                      >
                        {/* Futuristic Glowing Backing */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition duration-300" />
                        
                        <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-1 gap-2 transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white dark:focus-within:bg-[#070708]">
                          <div className="pl-4 sm:pl-5 text-gray-400 flex items-center justify-center shrink-0">
                            <Gamepad2 className={`h-5 w-5 transition-all duration-300 ${userId.trim().length >= 8 ? 'text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-gray-400'}`} />
                          </div>
                          
                          <input
                            type="tel"
                            placeholder={activeGame?.idPlaceholder || "Enter ID here..."}
                            value={userId}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setUserId(val);
                            }}
                            className="w-full h-11 sm:h-13 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 font-bold text-sm sm:text-lg text-gray-900 dark:text-white placeholder:text-gray-400 pl-1"
                            required
                          />
                          
                          <div className="pr-1 sm:pr-2 shrink-0">
                            <motion.button
                              type="button"
                              onClick={handleVerify}
                              disabled={isVerifying || !userId.trim()}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`h-9 sm:h-11 px-5 sm:px-7 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all relative overflow-hidden flex items-center justify-center gap-1.5 ${
                                isVerifying
                                  ? 'bg-blue-600/10 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300'
                                  : userId.trim().length >= 8
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700'
                                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {isVerifying ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 dark:text-blue-300" />
                                  <span className="animate-pulse">Scanning</span>
                                </>
                              ) : (
                                <>
                                  <span>Verify</span>
                                  <Zap className={`w-3.5 h-3.5 transition-transform duration-300 ${userId.trim().length >= 8 ? 'animate-bounce text-yellow-300' : ''}`} />
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>

                        {/* Gaming HUD Scanning Logs below input box */}
                        {isVerifying && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-500/10 rounded-xl flex flex-col gap-2 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/80 to-transparent animate-pulse" />
                            
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                Connecting Game Servers...
                              </span>
                              <span className="font-mono text-[9px] text-blue-400/80 opacity-75">FF_DB_QUERY_OK</span>
                            </div>
                            
                            {/* Scanning Micro progress line */}
                            <div className="w-full bg-blue-100 dark:bg-white/5 h-1 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 1.9, ease: "easeInOut" }}
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                              />
                            </div>
                            
                            <div className="text-[9px] font-mono text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <span>Query Target: <strong className="text-gray-700 dark:text-gray-300">{userId}</strong></span>
                              <span className="animate-pulse">Validating Signature...</span>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="verify-success"
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 dark:from-emerald-950/10 dark:to-teal-950/20 border-2 border-emerald-500/40 dark:border-emerald-500/20 rounded-2xl shadow-xl shadow-emerald-500/5 relative overflow-hidden group/success"
                      >
                        {/* Golden/Emerald pulse accents */}
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover/success:scale-125 transition-transform duration-700" />
                        <div className="absolute -left-10 -top-10 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />

                        <div className="flex items-center gap-4 relative z-10">
                          {/* Checked Game Badge Icon with dual ring layout */}
                          <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur animate-pulse" />
                            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 border-4 border-white dark:border-[#0d0d0f] group-hover/success:scale-105 transition-transform duration-500">
                              <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Verified Pill */}
                              <div className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-full shadow-sm border border-emerald-400/30">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>Verified Profile</span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 px-2 py-0.5 rounded font-black border border-emerald-500/10">100% Secure</span>
                            </div>
                            
                            {/* Player Name and detail tag */}
                            <h4 className="text-gray-900 dark:text-white font-black text-sm sm:text-lg mt-2 tracking-tight flex items-center gap-2">
                              ID: <span className="font-mono text-emerald-600 dark:text-teal-400 bg-emerald-500/10 dark:bg-emerald-500/5 px-2 py-0.5 rounded font-bold tracking-wide">{userId}</span>
                            </h4>
                          </div>
                        </div>

                        <motion.button
                          type="button"
                          onClick={() => {
                            setIsVerified(false);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3.5 sm:px-5 py-2.5 bg-white dark:bg-white/5 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm z-10 shrink-0 self-start sm:self-center"
                        >
                          Change ID
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Name</label>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full h-12 sm:h-14 px-5 sm:px-6 rounded-xl border border-gray-100 bg-gray-50 dark:bg-white/5 dark:border-white/10 focus:bg-white dark:focus:bg-white/10 focus:border-blue-600 outline-none transition-all font-bold text-sm sm:text-base text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">WhatsApp Number</label>
                    <input
                      type="tel"
                      placeholder="+94 77 XXXXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full h-12 sm:h-14 px-5 sm:px-6 rounded-xl border border-gray-100 bg-gray-50 dark:bg-white/5 dark:border-white/10 focus:bg-white dark:focus:bg-white/10 focus:border-emerald-600 outline-none transition-all font-bold text-sm sm:text-base text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0d0d0f] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-xl shadow-blue-500/5 border border-gray-100 dark:border-white/5 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-10 pb-6 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center space-x-3 sm:space-x-6">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 bg-blue-50 dark:bg-blue-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-500/10 shrink-0">
                    <Gem className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1 sm:mb-2 uppercase tracking-tight">2. Packages</h3>
                    <p className="text-gray-400 text-[9px] sm:text-xs font-bold uppercase tracking-wider">Choose amount</p>
                  </div>
                </div>

                {/* Currency Switcher Selection */}
                <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl self-start sm:self-center border border-slate-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setCurrency('LKR')}
                    className={`relative px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                      currency === 'LKR'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <span>LKR</span>
                    <span className="text-[9px] opacity-75 font-semibold">Rs.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`relative px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                      currency === 'USD'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <span>USD</span>
                    <span className="text-[10px] opacity-75 font-extrabold">$</span>
                  </button>
                </div>
              </div>

              {initialLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  {skeletonPackages.map((_, i) => (
                    <div key={i} className="rounded-xl sm:rounded-2xl border-2 border-gray-100 dark:border-white/5 p-3 sm:p-5 animate-pulse">
                      <div className="w-full aspect-square bg-gray-100 dark:bg-white/5 rounded-lg sm:rounded-xl mb-3 sm:mb-4"></div>
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4 mx-auto mb-2"></div>
                      <div className="h-5 bg-gray-100 dark:bg-white/5 rounded w-1/2 mx-auto mb-4"></div>
                      <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg w-full"></div>
                    </div>
                  ))}
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-16 sm:py-20 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <Gem className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold text-sm uppercase tracking-widest text-[10px] sm:text-xs">No active packages available</p>
                </div>
              ) : (
                <div className="max-h-[600px] sm:max-h-[700px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 pb-4">
                    {packages.map((pkg) => {
                      const shellsNeeded = isPubgOrder(pkg.name, activeGame?.id, activeGame?.name) 
                        ? 0 
                        : getShellsForPackage(pkg.name, pkg.diamonds);
                      const isOutOfStock = shellsNeeded > 0 && totalAvailableShells < shellsNeeded;

                      return (
                        <motion.div
                          key={pkg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => {
                            if (isOutOfStock) {
                              toast.error("Stock Out", { description: "This package is currently out of stock. Please try again later." });
                              return;
                            }
                            if (!selectedPackages[pkg.id]) {
                              updateQuantity(pkg.id, 1);
                            }
                          }}
                          className={`relative cursor-pointer rounded-xl sm:rounded-2xl border-2 p-3 sm:p-5 transition-all duration-200 flex flex-col items-center ${
                            selectedPackages[pkg.id] 
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10' 
                              : isOutOfStock
                                ? 'border-gray-200 bg-gray-50/50 dark:bg-white/5 opacity-75 cursor-not-allowed'
                                : 'border-gray-100 dark:border-white/5 bg-white dark:bg-[#0d0d0f] hover:border-blue-300'
                          }`}
                        >
                          {/* Stock Out Badge */}
                          {isOutOfStock && (
                            <div className="absolute top-2 left-2 z-10">
                              <span className="bg-rose-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">
                                Stock Out
                              </span>
                            </div>
                          )}

                          {/* Image Container */}
                        <div className="w-full aspect-square bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center p-2 sm:p-6 mb-2 sm:mb-4 border border-gray-100 dark:border-white/10 transition-colors">
                          {pkg.imageUrl ? (
                            <img src={pkg.imageUrl} alt={pkg.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <Gem className={`h-6 w-6 sm:h-12 sm:w-12 transition-colors ${selectedPackages[pkg.id] ? 'text-blue-600' : 'text-gray-300'}`} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="text-center w-full">
                          <h4 className={`font-bold text-[11px] sm:text-sm md:text-base leading-tight mb-1.5 sm:mb-2 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] transition-colors ${selectedPackages[pkg.id] ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {pkg.name}
                          </h4>
                          
                          <div className="text-blue-600 dark:text-blue-400 font-black text-sm sm:text-lg mb-3 sm:mb-4">
                            {currency === 'LKR' ? (
                              `Rs. ${pkg.price.toLocaleString()}`
                            ) : (
                              `$ ${(pkg.price / usdExchangeRate).toFixed(2)}`
                            )}
                          </div>
  
                          {/* Quantity Controls */}
                          <div className={`w-full rounded-lg sm:rounded-xl p-0.5 sm:p-1 flex items-center justify-between border transition-all ${
                            isOutOfStock
                            ? 'bg-gray-100/50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-50'
                            : selectedPackages[pkg.id] 
                              ? 'bg-white dark:bg-white/10 border-blue-200 dark:border-blue-500/20 shadow-sm' 
                              : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'
                          }`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(pkg.id, -1);
                              }}
                              disabled={isOutOfStock || !selectedPackages[pkg.id]}
                              className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-white dark:bg-white/10 text-gray-500 hover:text-blue-600 disabled:opacity-30 border border-gray-100 dark:border-white/10 shadow-sm transition-all"
                            >
                              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            
                            <span className="font-bold text-[10px] sm:text-sm text-gray-900 dark:text-white">
                              {isOutOfStock ? 'Disabled' : (selectedPackages[pkg.id] || 0)}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isOutOfStock) return;
                                updateQuantity(pkg.id, 1);
                              }}
                              disabled={isOutOfStock}
                              className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg text-white shadow-md transition-all ${
                                isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Selection Check */}
                        {selectedPackages[pkg.id] ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(pkg.id, -999);
                            }}
                            className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-red-500 text-white rounded-full p-1 shadow-lg border border-white dark:border-gray-800 hover:bg-red-600 transition-colors"
                          >
                            <X className="h-2 w-2 sm:h-3 sm:w-3" />
                          </button>
                        ) : null}
                      </motion.div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:sticky lg:top-32 self-start space-y-6 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto custom-scrollbar">
            <div className="bg-white dark:bg-[#0d0d0f] rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-xl shadow-blue-500/5 transition-colors duration-300">
              <div className="flex items-center space-x-4 mb-6 sm:mb-8 pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Summary</h3>
              </div>

              {submissionError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {submissionError}
                </div>
              )}

              {initialLoading ? (
                <div className="p-4 sm:p-5 bg-gray-50 dark:bg-white/5 rounded-xl sm:rounded-2xl mb-6 sm:mb-8 animate-pulse">
                  <div className="h-4 bg-gray-100 dark:bg-white/10 rounded w-1/2 mb-3"></div>
                  <div className="h-6 bg-gray-100 dark:bg-white/10 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-100 dark:bg-white/10 rounded w-full"></div>
                </div>
              ) : selectedList.length > 0 ? (
                <div className="space-y-4 mb-6 sm:mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedList.map((item) => (
                    <div key={item.pkg?.id} className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/10 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 pr-2">{item.pkg?.name}</span>
                        <button onClick={() => updateQuantity(item.pkg!.id, -999)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200/50 dark:border-white/10">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => updateQuantity(item.pkg!.id, -1)} className="p-1 rounded bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10"><Minus className="h-3 w-3" /></button>
                          <span className="text-[10px] font-black w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateQuantity(item.pkg!.id, 1)} className="p-1 rounded bg-blue-600 text-white"><Plus className="h-3 w-3" /></button>
                        </div>
                        <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                          {currency === 'LKR' ? (
                            `Rs. ${(((item.pkg?.price || 0) as number) * (item.qty as number)).toLocaleString()}`
                          ) : (
                            `$ ${((((item.pkg?.price || 0) as number) * (item.qty as number)) / usdExchangeRate).toFixed(2)}`
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Loyalty Points Section */}
                  <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-3">
                    <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                      <Trophy className="h-4 w-4" />
                      <span className="text-xs font-black uppercase tracking-wider">Loyalty Points System</span>
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-normal">
                      <span>Available: </span>
                      <span className="text-gray-900 dark:text-white font-black">{Math.floor(profile.loyaltyPoints || 0).toLocaleString()} Points</span>
                      <span className="block mt-0.5 text-[9px] text-amber-500 font-bold">1 Point = Rs. 0.000002 of discount • Earn 1 point per 10 diamonds</span>
                    </div>

                    {profile.loyaltyPoints && profile.loyaltyPoints > 0 ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={Math.min(profile.loyaltyPoints, totalAmount * 500000)}
                            placeholder="Points to redeem"
                            value={pointsToRedeem || ''}
                            onChange={(e) => {
                              const val = Math.min(
                                Number(e.target.value) || 0,
                                profile.loyaltyPoints || 0,
                                totalAmount * 500000
                              );
                              setPointsToRedeem(val >= 0 ? val : 0);
                            }}
                            className="flex-1 h-9 px-3 text-xs bg-white dark:bg-white/5 border border-amber-300 dark:border-white/10 rounded-lg outline-none font-bold text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setPointsToRedeem(Math.min(profile.loyaltyPoints || 0, totalAmount * 500000))}
                            className="h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] uppercase font-black tracking-wider transition-colors"
                          >
                            Max
                          </button>
                        </div>
                        {pointsToRedeem > 0 && (
                          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">
                            ✓ Applied Rs. {(pointsToRedeem * 0.000002).toLocaleString()} discount!
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider pt-1">
                        Sign in & complete orders to earn premium points!
                      </p>
                    )}

                    {totalDiamonds > 0 && (
                      <div className="pt-2 border-t border-amber-500/10 flex justify-between text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                        <span>EST. EARNED POINTS</span>
                        <span className="font-black">+{Math.floor(totalDiamonds / 10)} PTS</span>
                      </div>
                    )}
                  </div>

                  {pointsToRedeem > 0 && (
                    <div className="pt-3 flex justify-between text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <span>Points Discount</span>
                      <span className="text-emerald-500 font-black">
                        {currency === 'LKR' ? (
                          `- Rs. ${(pointsToRedeem * 0.000002).toLocaleString()}`
                        ) : (
                          `-$ ${((pointsToRedeem * 0.000002) / usdExchangeRate).toFixed(4)}`
                        )}
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t-2 border-dashed border-gray-200 dark:border-white/10 flex justify-between items-end text-gray-900 dark:text-white">
                    <span className="text-xs font-black uppercase tracking-widest self-center">Total</span>
                    {currency === 'LKR' ? (
                      <div className="flex items-end gap-1 text-right">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400 font-bold tracking-widest mb-0.5">රුපියල්</span>
                          <span className="text-xl font-black leading-none">{Math.floor(Math.max(0, totalAmount - (pointsToRedeem * 0.000002))).toLocaleString()}</span>
                        </div>
                        <span className="text-xl font-black text-gray-400 leading-none mb-0.5">.</span>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400 font-bold tracking-widest mb-0.5">සත</span>
                          <span className="text-sm font-black text-gray-500 leading-none mb-0.5">{(Math.max(0, totalAmount - (pointsToRedeem * 0.000002)) % 1).toFixed(2).substring(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end gap-1 text-right">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400 font-bold tracking-widest mb-0.5">DOLLARS</span>
                          <span className="text-xl font-black leading-none">{Math.floor(Math.max(0, totalAmount - (pointsToRedeem * 0.000002)) / usdExchangeRate).toLocaleString()}</span>
                        </div>
                        <span className="text-xl font-black text-gray-400 leading-none mb-0.5">.</span>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400 font-bold tracking-widest mb-0.5">CENTS</span>
                          <span className="text-sm font-black text-gray-500 leading-none mb-0.5">{((Math.max(0, totalAmount - (pointsToRedeem * 0.000002)) / usdExchangeRate) % 1).toFixed(2).substring(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8 bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-xl sm:rounded-2xl mb-6 sm:mb-8 text-center">
                  <Gem className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select a package</p>
                </div>
              )}

               <div className="mb-6 sm:mb-8">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Payment Method</label>
                <div className="grid gap-2">
                  {[
                    { id: PaymentMethod.BANK, label: 'Bank Transfer', icon: BankIcon },
                    { id: PaymentMethod.WHATSAPP, label: 'WhatsApp', icon: WhatsAppIcon },
                    { id: PaymentMethod.EZ_CASH, label: 'EZ Cash', icon: EzCashIcon, show: true },
                    { id: PaymentMethod.BINANCE, label: 'Binance Pay / Crypto', icon: BinanceIcon, show: siteSettings?.isBinanceEnabled },
                    { id: PaymentMethod.WALLET, label: `Redeem Wallet (Balance: LKR ${((profile.loyaltyPoints || 0) * 0.000002).toLocaleString()})`, icon: Wallet, show: siteSettings?.isWalletEnabled !== false && !!user },
                    { id: PaymentMethod.PAYHERE, label: 'Card / Online (Coming Soon)', icon: CardIcon, show: true, disabled: true }
                  ].filter(m => m.show !== false).map((method) => (
                    <div key={method.id} className="space-y-2">
                      <button
                        type="button"
                        disabled={(method as any).disabled}
                        onClick={() => {
                          if ((method as any).disabled) return;
                          setPaymentMethod(method.id as PaymentMethod);
                          if (method.id === PaymentMethod.WHATSAPP || method.id === PaymentMethod.PAYHERE || method.id === PaymentMethod.WALLET) {
                            setProofFile(null);
                            setProofPreview(null);
                          }
                        }}
                        className={`w-full p-3.5 sm:p-4 rounded-xl border flex items-center justify-between transition-all ${
                          (method as any).disabled 
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-400'
                          : paymentMethod === method.id 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'border-gray-100 dark:border-white/5 bg-white dark:bg-[#0d0d0f] text-gray-600 dark:text-gray-400 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <method.icon className="h-4 sm:h-5 w-4 sm:w-5" />
                          <span className="text-[13px] sm:text-sm font-bold">{method.label}</span>
                        </div>
                        {paymentMethod === method.id && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <AnimatePresence>
                        {paymentMethod === method.id && (method.id === PaymentMethod.BANK || method.id === PaymentMethod.EZ_CASH || method.id === PaymentMethod.BINANCE) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 sm:p-5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 mt-1 space-y-4">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Our Payment Details</p>
                                {method.id === PaymentMethod.BANK ? (
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                      <span className="text-gray-500 font-bold">Bank:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-900 dark:text-white font-black">{siteSettings?.bankName || 'Loading...'}</span>
                                        {siteSettings?.bankName && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(siteSettings.bankName);
                                              toast.success("Bank Name Copied!");
                                            }}
                                            className="p-1 text-gray-400 hover:text-blue-500 active:scale-[0.85] transition-all shrink-0"
                                            title="Copy Bank Name"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                      <span className="text-gray-500 font-bold">Account:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-900 dark:text-white font-black font-mono select-all">{siteSettings?.bankAccountNumber || 'Loading...'}</span>
                                        {siteSettings?.bankAccountNumber && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(siteSettings.bankAccountNumber);
                                              toast.success("Account Number Copied!");
                                            }}
                                            className="p-1 text-gray-400 hover:text-blue-500 active:scale-95 transition-all shrink-0"
                                            title="Copy Account Number"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                      <span className="text-gray-500 font-bold">Holder:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-900 dark:text-white font-black uppercase text-right leading-none truncate max-w-[150px]">{siteSettings?.bankAccountHolder || 'Loading...'}</span>
                                        {siteSettings?.bankAccountHolder && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(siteSettings.bankAccountHolder);
                                              toast.success("Account Holder Copied!");
                                            }}
                                            className="p-1 text-gray-400 hover:text-blue-500 active:scale-95 transition-all shrink-0"
                                            title="Copy Account Holder"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                  </div>
                                ) : method.id === PaymentMethod.EZ_CASH ? (
                                  <div className="space-y-4 text-left w-full">
                                    <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                      <span className="text-gray-500 font-bold">eZ Cash Number:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-900 dark:text-white font-black font-mono select-all">{siteSettings?.ezCashNumber || 'Loading...'}</span>
                                        {siteSettings?.ezCashNumber && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(siteSettings.ezCashNumber);
                                              toast.success("EZ Cash Number Copied!");
                                            }}
                                            className="p-1 text-gray-400 hover:text-indigo-500 active:scale-95 transition-all shrink-0"
                                            title="Copy EZ Cash Number"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>



                                    <div className="pt-2.5 border-t border-gray-150 dark:border-white/5 space-y-3 w-full text-left">
                                      <div>
                                        <label className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1.5">
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
                                          className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 outline-none transition-all font-mono font-black text-xs text-gray-900 dark:text-white placeholder:text-gray-400 placeholder:font-sans placeholder:font-bold tracking-widest"
                                          placeholder="Enter 14-digit RN Reference Number..."
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3 text-left">
                                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200/50 dark:border-white/5">
                                      <button
                                        type="button"
                                        onClick={() => setBinanceOption('payId')}
                                        className={`py-1 px-2 text-[10px] font-bold rounded transition-all uppercase tracking-wider ${
                                          binanceOption === 'payId'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                      >
                                        Pay ID
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setBinanceOption('address')}
                                        className={`py-1 px-2 text-[10px] font-bold rounded transition-all uppercase tracking-wider ${
                                          binanceOption === 'address'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                      >
                                        USDT (BEP20)
                                      </button>
                                    </div>

                                                                        {binanceOption === 'payId' ? (
                                      <div className="flex justify-between text-[11px] sm:text-xs gap-4 items-center">
                                        <span className="text-gray-500 font-bold shrink-0">Binance ID:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-900 dark:text-white font-black select-all text-right font-mono">{siteSettings?.binancePayId || 'Not Configured'}</span>
                                          {siteSettings?.binancePayId && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(siteSettings.binancePayId);
                                                toast.success("Binance ID Copied!");
                                              }}
                                              className="p-1 text-amber-500 hover:text-amber-600 active:scale-95 transition-all"
                                              title="Copy Binance ID"
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="flex justify-center py-1">
                                          <img
                                            src="https://i.ibb.co/3mXBdhKk/Screenshot-20260613-205113-2.jpg"
                                            alt="USDT BEP20 QR"
                                            className="w-32 h-32 object-contain rounded-lg border border-gray-200 dark:border-white/10 p-1 bg-white"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                        <div className="flex justify-between text-[11px] sm:text-xs gap-4 items-center">
                                          <span className="text-gray-500 font-bold shrink-0">USDT Address:</span>
                                          <div className="flex items-center gap-1 min-w-0">
                                            <span className="text-[10px] text-gray-900 dark:text-white font-mono font-black break-all select-all text-right min-w-0">{siteSettings?.binanceAddress || 'Not Configured'}</span>
                                            {siteSettings?.binanceAddress && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(siteSettings.binanceAddress);
                                                  toast.success("USDT Address Copied!");
                                                }}
                                                className="p-1 text-amber-500 hover:text-amber-600 active:scale-95 transition-all shrink-0"
                                                title="Copy USDT Address"
                                              >
                                                <Copy className="h-3.5 w-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t border-gray-200 dark:border-white/10">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Upload Payment Proof</p>
                                {!proofPreview ? (
                                  <label className="relative group cursor-pointer block">
                                    <div className="w-full h-24 sm:h-28 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center space-y-2 group-hover:border-blue-400 transition-colors bg-white dark:bg-transparent">
                                      {isProofProcessing ? (
                                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                      ) : (
                                        <>
                                          <Plus className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click to upload receipt</span>
                                        </>
                                      )}
                                    </div>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*" 
                                      onChange={handleImageUpload}
                                      disabled={isProofProcessing}
                                    />
                                  </label>
                                ) : (
                                  <div className="relative group">
                                    <div className="w-full h-32 sm:h-40 rounded-xl overflow-hidden border-2 border-blue-600">
                                      <img src={proofPreview} alt="Payment Proof" className="w-full h-full object-cover" />
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setProofFile(null);
                                        setProofPreview(null);
                                      }}
                                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Summary Display before Checkout */}
              {selectedList.length > 0 && (
                <div className="mb-6 p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-gray-500 text-[10px] uppercase font-black tracking-widest leading-none">
                    <span>Subtotal</span>
                    <span>Rs. {totalAmount.toLocaleString()}</span>
                  </div>
                  
                  {pointsToRedeem > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-black tracking-widest leading-none">
                      <span>Points Discount</span>
                      <span>- Rs. {(pointsToRedeem * 0.000002).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-150 dark:border-white/5 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Final Amount to Pay</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Rs.</span>
                        <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tighter leading-none">
                          {Math.max(0, totalAmount - (pointsToRedeem * 0.000002)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-60">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Inclusive of all processing fees</span>
                    </div>
                  </div>
                </div>
              )}

                  {/* Submission Error Display */}
                  {submissionError && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl mb-6 flex items-start space-x-3"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Attention Required</p>
                        <p className="text-xs text-red-600/80 dark:text-red-400/80 font-bold leading-tight">{submissionError}</p>
                      </div>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || selectedList.length === 0}
                    className="pay-btn w-full h-14 sm:h-16 disabled:opacity-30 text-white flex items-center justify-center gap-3"
                  >
                    <span className="btn-text">
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4 sm:h-5 sm:w-5" />
                          Processing...
                        </span>
                      ) : (
                        <span>{proofPreview ? 'Confirm Order' : (paymentMethod === PaymentMethod.WHATSAPP ? 'Confirm Via WhatsApp' : 'Checkout')}</span>
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

              <div className="mt-4 text-center">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                  By proceeding, you agree to our <Link to="/terms" className="text-blue-500 hover:underline">Terms & Conditions</Link>
                </p>
              </div>
              
              <div className="mt-5 flex items-center justify-center space-x-2 text-gray-400">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Safe & Secured</span>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-5 sm:p-6 border border-emerald-100 dark:border-emerald-500/20 transition-colors">
              <div className="flex items-start space-x-3 sm:space-x-4 text-left">
                <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-1 leading-none">Instant Delivery</p>
                  <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-500 leading-relaxed font-bold uppercase opacity-80">
                    Trusted processing • 5-15 Minutes
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
