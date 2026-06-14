import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import { Package } from '../types';
import { Gem, ArrowRight, Loader2, AlertCircle, TrendingUp, Sparkles, Gamepad2, ChevronLeft, ChevronRight, MoreHorizontal, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPackages, getBanners, getServices, getEvents, mapDocData, getSettings, getTopSpenders } from '../services/db';
import { GAMES } from '../constants';
import { Banner, Service, Event, Settings, Game } from '../types';
import { collection, query, where, onSnapshot, orderBy, limit } from '../lib/firestore-compat';
import { db } from '../lib/firebase';
import { Skeleton, PackageSkeleton, BannerSkeleton } from '../components/Skeleton';

function BannerSlideshow() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try cache first
    const loadCached = async () => {
      const cached = await getBanners(true);
      if (cached.length > 0) {
        setBanners(cached);
        setIsLoading(false);
      }
    };
    loadCached();

    const q = query(collection(db, 'banners'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocData<Banner>(doc)).sort((a, b) => (a.order || 0) - (b.order || 0));
      setBanners(data);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (isLoading) {
    return (
      <div className="relative w-full aspect-[4/3] sm:aspect-[21/9] md:aspect-[24/7] rounded-[1.5rem] sm:rounded-[2rem] bg-gray-100 dark:bg-white/5 animate-pulse mb-12 overflow-hidden shadow-lg border border-gray-100 dark:border-white/5" />
    );
  }

  if (banners.length === 0) return null;

  const prev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  const next = () => setCurrentIndex((prev) => (prev + 1) % banners.length);

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[21/9] md:aspect-[24/7] rounded-[1.5rem] sm:rounded-[2rem] bg-gray-100 overflow-hidden group shadow-lg mb-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {banners[currentIndex].linkUrl ? (
            <Link to={banners[currentIndex].linkUrl!}>
              <img 
                src={banners[currentIndex].imageUrl} 
                alt="banner" 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </Link>
          ) : (
            <img 
              src={banners[currentIndex].imageUrl} 
              alt="banner" 
              className="w-full h-full object-cover" 
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Navigation Controls */}
      {banners.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all sm:opacity-0 sm:group-hover:opacity-100 z-10">
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button onClick={next} className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all sm:opacity-0 sm:group-hover:opacity-100 z-10">
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 sm:w-8 bg-blue-600' : 'w-1.5 sm:w-2 bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GameCardImage({ src, alt, gameId, comingSoon }: { src: string, alt: string, gameId: string, comingSoon?: boolean }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div className="relative aspect-square overflow-hidden bg-[#f8fafc]">
      {/* Loading Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer" 
             style={{ backgroundSize: '200% 100%' }} />
      )}
      
      <motion.img 
        ref={imgRef}
        src={src} 
        alt={alt} 
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
      />
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [packages, setPackages] = useState<Package[]>([]);
  const [dbGames, setDbGames] = useState<Game[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [topSpenders, setTopSpenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleContact = () => {
    if (settings?.whatsappNumber) {
      window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`, '_blank');
    } else {
      navigate('/order');
    }
  };

  useEffect(() => {
    // Try to load initial data from cache first for instant render
    const loadInitialData = async () => {
      try {
        const [cachedPackages, cachedServices, cachedEvents] = await Promise.all([
          getPackages(true),
          getServices(true),
          getEvents(true)
        ]);
        
        if (cachedPackages.length > 0) setPackages(cachedPackages);
        if (cachedServices.length > 0) setServices(cachedServices);
        if (cachedEvents.length > 0) setEvents(cachedEvents);
        
        // If we have any data, don't show the initial big skeleton
        if (cachedPackages.length > 0 || cachedServices.length > 0) {
          setLoading(false);
        }
      } catch (err) {
        console.warn('Initial cache load failed:', err);
      }
    };
    
    loadInitialData();

    // Create multiple snapshot listeners for live updates
    const bannersUnsubscribe = onSnapshot(query(collection(db, 'banners'), where('isActive', '==', true)), (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocData<Banner>(doc)).sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    const packagesUnsubscribe = onSnapshot(query(collection(db, 'packages'), where('isActive', '==', true)), (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocData<Package>(doc)).sort((a: any, b: any) => b.createdAt - a.createdAt);
      setPackages(data);
    });

    const servicesUnsubscribe = onSnapshot(query(collection(db, 'services'), where('isActive', '==', true)), (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocData<Service>(doc)).sort((a: any, b: any) => b.createdAt - a.createdAt);
      setServices(data);
    });

    const gamesUnsubscribe = onSnapshot(query(collection(db, 'games'), where('isActive', '==', true)), (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocData<Game>(doc)).sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
      setDbGames(data);
    });

    const eventsUnsubscribe = onSnapshot(query(collection(db, 'events'), where('isActive', '==', true)), (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocData<Event>(doc)).sort((a: any, b: any) => b.createdAt - a.createdAt);
      setEvents(data);
      setLoading(false); // Finally disable loading if it was still on
    }, (err) => {
      console.error(err);
      if (packages.length === 0) setError("Failed to load data.");
      setLoading(false);
    });

    const topSpendersUnsubscribe = onSnapshot(query(collection(db, 'customers'), orderBy('loyaltyPoints', 'desc'), limit(3)), (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocData<any>(doc));
      setTopSpenders(data);
    });

    return () => {
      bannersUnsubscribe();
      packagesUnsubscribe();
      servicesUnsubscribe();
      gamesUnsubscribe();
      eventsUnsubscribe();
      topSpendersUnsubscribe();
    };
  }, []);

  const displayGames = useMemo(() => {
    const baseGames = dbGames.length > 0 ? dbGames : GAMES;
    const seen = new Set();
    const uniqueGames = baseGames.filter(game => {
      const isDuplicate = seen.has(game.name);
      seen.add(game.name);
      return !isDuplicate;
    });

    if (!searchQuery) return uniqueGames;
    return uniqueGames.filter(game =>
      game.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dbGames, searchQuery]);

  return (
    <div className="min-h-screen relative transition-colors duration-300">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/5 dark:bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8 mb-16">
        {loading ? (
          <div className="max-w-7xl mx-auto">
            <BannerSkeleton />
          </div>
        ) : (
          <div 
            className={`max-w-7xl mx-auto glass-card rounded-[2.5rem] p-6 sm:p-8 md:p-16 relative overflow-hidden ${settings?.heroBannerUrl ? 'bg-cover bg-center' : ''}`}
            style={settings?.heroBannerUrl ? {
              backgroundImage: theme === 'dark' 
                ? `linear-gradient(to right, rgba(13, 13, 15, 0.95), rgba(13, 13, 15, 0.75)), url(${settings.heroBannerUrl})`
                : `linear-gradient(to right, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.8)), url(${settings.heroBannerUrl})`,
            } : undefined}
          >
          <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-blue-900/5' : 'bg-blue-50/50'} mix-blend-overlay`} />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
            <div className="max-w-2xl flex flex-col items-center md:items-start">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold mb-6 sm:mb-8 border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-blue-500/10 border-blue-500/10 text-blue-400' 
                    : 'bg-blue-50 border-blue-100 text-blue-600'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Premium Top-Up Service</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-4xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                Level Up <br className="hidden sm:block" />
                <span className="text-gradient">Instantly</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`font-semibold text-base sm:text-lg mb-8 sm:mb-10 max-w-lg leading-relaxed ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                Get your diamonds and gaming credits delivered in seconds. Safe, secure, and the best prices in the market.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-4"
              >
                 <div className={`flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-full border transition-colors ${
                   theme === 'dark'
                     ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                     : 'bg-emerald-50/80 border-emerald-100 text-emerald-700'
                 }`}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live 24/7 Delivery</span>
                 </div>
              </motion.div>
            </div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="relative"
            >
              <div className="absolute inset-0 bg-blue-600/10 blur-3xl rounded-full"></div>
              <div className="relative bg-white dark:bg-[#0d0d0f] p-4 rounded-[2rem] shadow-2xl shadow-blue-500/10 border border-blue-50 dark:border-white/10 transition-colors">
                <img 
                  src="https://i.postimg.cc/L4QDxTxM/Chat-GPT-Image-Jun-13-2026-06-24-44-PM.png" 
                  alt={settings?.siteName || "Store Logo"} 
                  className="w-80 h-48 md:w-96 md:h-64 object-contain rounded-2xl"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <BannerSlideshow />

        {/* Search Bar Container */}
        <div className="relative max-w-xl mx-auto mb-16 px-4 animate-fade-in">
          <div className="relative shadow-xl shadow-blue-500/[0.03] dark:shadow-none">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games (e.g. Free Fire)..."
              className="w-full py-4.5 pl-12 pr-12 border-2 border-slate-200/80 dark:border-white/5 rounded-full text-sm font-semibold bg-white dark:bg-[#0d0d0f] text-slate-800 dark:text-gray-100 transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none hover:scale-[1.01] focus:scale-[1.01] placeholder-gray-400"
            />
            <div className="absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-white/10 rounded-full p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-center text-xs text-slate-400 dark:text-gray-500 mt-2.5 font-semibold">
              Found {displayGames.length} {displayGames.length === 1 ? 'game' : 'games'}
            </div>
          )}
        </div>

        {/* Section Header */}
        <div className="flex items-center space-x-4 sm:space-x-6 mb-12">
          <div className="h-[2px] flex-grow bg-gray-200 dark:bg-white/10"></div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center transition-colors text-center px-4">
             <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4 text-blue-600 shrink-0" />
             Popular Games
          </h2>
          <div className="h-[2px] flex-grow bg-gray-200 dark:bg-white/10"></div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 mb-32">
          {displayGames.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-slate-300 dark:text-slate-700 font-black text-5xl mb-3">🔍</div>
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">No games found</h4>
              <p className="text-xs text-slate-400 mt-1">Try checking your spelling or search terms.</p>
            </div>
          ) : (
            displayGames.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04, duration: 0.4 }}
                className="group relative bg-white dark:bg-[#0d0d0f] rounded-2xl border-1.5 border-slate-200/80 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/[0.03] hover:-translate-y-1.5 cursor-pointer flex flex-col shadow-sm"
                onClick={() => !game.comingSoon && navigate(`/order?game=${encodeURIComponent(game.name)}`)}
              >
                {/* Custom top gradient bar matching mockup styling */}
                <div className="absolute top-0 left-0 right-0 h-[3px] primary-gradient transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-30 rounded-t-2xl" />

                <div className="relative">
                  <GameCardImage 
                    src={game.image} 
                    alt={game.name} 
                    gameId={game.id}
                    comingSoon={game.comingSoon}
                  />
                  
                  {/* Status Badges Overlay */}
                  <div className="absolute top-1 right-1 z-20">
                    {!game.comingSoon && (
                      <div className="bg-emerald-500 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
                        Active
                      </div>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors duration-300 z-10 flex flex-col items-center justify-center">
                    <span className="bg-white text-blue-600 text-[9px] font-bold px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-300 shadow-md">Top Up</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-1.5 text-center bg-white dark:bg-[#0d0d0f] flex-grow flex flex-col justify-center border-t border-gray-100 dark:border-white/5">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-[11px] sm:text-[12px] leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {game.name}
                  </h3>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Free Fire Accounts Section */}
        <div className="mb-32">
          <div className="flex items-center space-x-4 sm:space-x-6 mb-12">
            <div className="h-[2px] flex-grow bg-gray-200 dark:bg-white/10"></div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center transition-colors text-center px-4">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4 text-blue-600 shrink-0" />
              FF Account Shop
            </h2>
            <div className="h-[2px] flex-grow bg-gray-200 dark:bg-white/10"></div>
          </div>

          <div 
            onClick={() => navigate('/accounts')}
            className="relative min-h-[340px] sm:h-80 lg:h-[450px] rounded-[2.5rem] sm:rounded-[4rem] overflow-hidden cursor-pointer border border-white/5 shadow-2xl bg-[#050508]"
          >
            {/* Background (Glow & Image) */}
            <div className="absolute inset-0 sm:left-1/3 w-full h-full sm:w-[70%] z-0">
               {/* Decorative Glow behind image */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/20 blur-[100px] rounded-full" />
               <img 
                src="https://static.vecteezy.com/system/resources/thumbnails/056/309/847/small/white-paper-flowers-on-a-white-background-photo.jpg" 
                alt="FF Accounts Rare" 
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
               />
               <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/40 to-transparent" />
            </div>

            {/* Center Split Seam Line (Fades & Scales Away on Hover) */}


            {/* Content Sidebar Overlay */}
            <div className="absolute inset-0 flex items-center px-8 sm:px-20 z-10" id="accounts-promo-card">
              <div className="max-w-xl w-full">
                <h3 className="text-4xl sm:text-6xl lg:text-8xl font-black text-white tracking-tighter mb-4 leading-[0.85] uppercase">
                   Legendary <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Accounts</span>
                </h3>
                
                <div className="flex flex-wrap items-center gap-6">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/accounts');
                    }}
                    className="h-14 sm:h-16 px-10 sm:px-12 bg-white text-black font-black text-xs sm:text-base uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-blue-600 hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center space-x-4 group/btn"
                  >
                    <span>Browse Shop</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* More Services */}
        {(loading || services.length > 0) && (
          <div className="mb-32">
             <div className="flex items-center space-x-4 sm:space-x-6 mb-12">
              <div className="h-[2px] flex-grow bg-gray-200 dark:bg-white/10"></div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center transition-colors text-center px-4">
                 <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4 text-blue-600 shrink-0" />
                 Special Services
              </h2>
              <div className="h-[2px] flex-grow bg-gray-200 dark:bg-white/10"></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="glass-card rounded-[2rem] p-6 sm:p-10 flex flex-col items-center text-center border border-gray-100 dark:border-white/5">
                    <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mb-6 sm:mb-8 shrink-0" />
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-8" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ))
              ) : services.map((service, idx) => (
                <motion.div
                  key={service.id}
                  onClick={() => navigate(`/service/${service.id}`)}
                  className="card-hover glass-card rounded-[2.5rem] p-8 sm:p-12 flex flex-col items-center text-center cursor-pointer group hover:bg-white dark:hover:bg-white/5 transition-all duration-500 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-yellow-500/10"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-8 sm:mb-10 border border-blue-100 dark:border-blue-500/10 group-hover:bg-yellow-500 group-hover:border-yellow-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0 shadow-lg shadow-blue-500/5 group-hover:shadow-yellow-500/20">
                      {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.title} className="w-20 h-20 object-contain rounded-[1.25rem] transition-all duration-500 group-hover:scale-110" />
                      ) : (
                        <MoreHorizontal className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 group-hover:text-white" />
                      )}
                  </div>
                  
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors tracking-tight">
                    {service.title}
                  </h3>
                  
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-medium leading-relaxed mb-10 sm:mb-12 flex-grow max-w-[280px]">
                    {service.description}
                  </p>

                  <button className="nova-btn w-full h-14">
                    <span>Explore Now</span>
                    <span className="arrow-wrapper">
                      <span className="arrow"></span>
                    </span>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Top Spenders Leaders Section */}
        {topSpenders.length > 0 && (
          <div className="mb-32 relative">
            <div className="relative w-full flex flex-col items-center justify-center text-center mb-16">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-yellow-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-yellow-500/10 px-4 py-1.5 rounded-full text-xs font-bold mb-4 text-amber-700 dark:text-yellow-500 animate-pulse">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-550"></span>
                </span>
                <span>Hall of Fame Spenders</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Top Spenders
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mt-2">Our most valued customers of the month</p>

              {/* View More Button - right aligned on desktop, centered with margin on mobile */}
              <div className="mt-6 md:mt-0 md:absolute md:top-1/2 md:-translate-y-1/2 md:right-0">
                <button 
                  onClick={() => navigate('/leaderboard')}
                  className="nova-btn text-white px-6 py-3.5 font-bold text-xs uppercase tracking-widest rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-blue-500/10"
                >
                  <span>View More</span>
                  <span className="arrow-wrapper">
                    <span className="arrow"></span>
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8 max-w-4xl mx-auto items-end">
              {/* Rank 2 */}
              {topSpenders[1] && (
                <div className="glass-card rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-8 text-center border-t-[3px] border-slate-300 dark:border-slate-500 relative transition-all duration-300 hover:shadow-2xl hover:shadow-slate-500/10 hover:-translate-y-2 order-1">
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] sm:text-xs font-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-slate-250 dark:border-slate-700">
                    #2
                  </div>
                  <div className="mb-2 sm:mb-4 flex justify-center">
                    <img
                      src="https://i.ibb.co/1kvVS9J/e1b0d3c4-b443-4921-b2e9-c1770e14b6bd.png"
                      alt="Silver Medal"
                      className="w-6 h-6 sm:w-12 sm:h-12 object-contain"
                    />
                  </div>
                  <div className="relative w-10 h-10 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-4">
                    <div className="absolute inset-0 rounded-full bg-slate-200 dark:bg-slate-500 animate-rotate-slow" />
                    <div className="absolute inset-[2px] sm:inset-[3px] rounded-full overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center font-black text-xs sm:text-xl text-slate-400 uppercase">
                      {topSpenders[1].imageUrl ? (
                        <img src={topSpenders[1].imageUrl} alt={topSpenders[1].customerName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{topSpenders[1].customerName.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-[10px] sm:text-base line-clamp-1">{topSpenders[1].customerName}</h3>
                  <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 text-[8px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full border border-slate-200 dark:border-slate-800 uppercase tracking-tighter truncate max-w-full">
                    {Math.floor(topSpenders[1].loyaltyPoints || 0).toLocaleString()} PTS
                  </span>
                </div>
              )}

              {/* Rank 1 */}
              {topSpenders[0] && (
                <div className="glass-card bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-[#0d0d0f]/85 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-10 text-center border-t-[4px] border-amber-400 relative transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-2 animate-float order-2 h-full flex flex-col justify-center shadow-lg">
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[8px] sm:text-xs font-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-amber-200/80 dark:border-amber-800">
                    #1
                  </div>
                  <div className="mb-2 sm:mb-4 flex justify-center animate-bounce">
                    <img
                      src="https://img.magnific.com/premium-vector/gold-crown-reputation-icon-flat-illustration-gold-crown-reputation-vector-icon-web-design_98396-43864.jpg?semt=ais_hybrid&w=740&q=80"
                      alt="Crown"
                      className="w-7 h-7 sm:w-12 sm:h-12 object-contain"
                    />
                  </div>
                  <div className="relative w-12 h-12 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-4">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 animate-rotate-slow" />
                    <div className="absolute inset-[2px] sm:inset-[3px] rounded-full overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center font-black text-sm sm:text-3xl text-amber-500 uppercase">
                      {topSpenders[0].imageUrl ? (
                        <img src={topSpenders[0].imageUrl} alt={topSpenders[0].customerName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{topSpenders[0].customerName.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-[11px] sm:text-lg mb-1 line-clamp-1">{topSpenders[0].customerName}</h3>
                  <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[8px] sm:text-xs font-black px-1.5 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full border border-amber-200/50 dark:border-amber-900/50 uppercase tracking-widest truncate max-w-full">
                    {Math.floor(topSpenders[0].loyaltyPoints || 0).toLocaleString()} PTS
                  </span>
                </div>
              )}

              {/* Rank 3 */}
              {topSpenders[2] && (
                <div className="glass-card rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-8 text-center border-t-[3px] border-amber-600/60 relative transition-all duration-300 hover:shadow-2xl hover:shadow-amber-700/10 hover:-translate-y-2 order-3">
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-amber-50 dark:bg-[#201005] text-amber-700 dark:text-amber-500 text-[8px] sm:text-xs font-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-amber-100 dark:border-amber-900/50">
                    #3
                  </div>
                  <div className="mb-2 sm:mb-4 flex justify-center">
                    <img
                      src="https://i.ibb.co/kgkkGtJz/6afc6cd3-41d3-461b-9af2-b181f5c24a8b.png"
                      alt="Bronze Medal"
                      className="w-6 h-6 sm:w-12 sm:h-12 object-contain"
                    />
                  </div>
                  <div className="relative w-10 h-10 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-4">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 animate-rotate-slow" />
                    <div className="absolute inset-[2px] sm:inset-[3px] rounded-full overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center font-black text-xs sm:text-xl text-amber-700 uppercase">
                      {topSpenders[2].imageUrl ? (
                        <img src={topSpenders[2].imageUrl} alt={topSpenders[2].customerName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{topSpenders[2].customerName.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-[10px] sm:text-base line-clamp-1">{topSpenders[2].customerName}</h3>
                  <span className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-[8px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full border border-orange-200 dark:border-orange-900/50 uppercase tracking-tighter truncate max-w-full">
                   {Math.floor(topSpenders[2].loyaltyPoints || 0).toLocaleString()} PTS
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Google Play / Download App Banner */}
        <div className="relative mb-32 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-[#111115] to-slate-950 border border-white/5 p-12 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left group/banner">
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none group-hover/banner:scale-110 transition-transform duration-[2s]" />
          <div className="absolute bottom-[20%] left-[-10%] w-[20%] h-[20%] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 max-w-xl">
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 uppercase">
              Download Our App
            </h3>
            <p className="text-gray-400 font-medium text-sm sm:text-base leading-relaxed">
              Experience the fastest topups on your mobile device. Get exclusive deals, live notifications, and instantaneous checkouts through Google Play.
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <a 
              href="https://median.co/share/dywpzal#apk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-3.5 bg-white hover:bg-emerald-500 text-slate-950 hover:text-white font-black text-xs sm:text-sm uppercase tracking-widest px-8 py-5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all outline-none"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.609 1.814L13.784 12L3.609 22.186C3.256 21.803 3 21.144 3 20.25V3.75C3 2.856 3.256 2.197 3.609 1.814ZM4.706 1.134L14.734 11.163L15.397 12L14.734 12.838L4.706 22.866C4.469 22.997 4.197 23.016 3.938 22.925C3.678 22.834 3.472 22.647 3.391 22.391L13.063 12L3.391 1.609C3.472 1.353 3.678 1.166 3.938 1.075C4.197 0.984 4.469 1.003 4.706 1.134ZM15.828 10.075L20.391 12L15.828 13.925C15.656 14.156 15.656 14.844 15.828 15.075L21.094 12L15.828 8.925C15.656 9.156 15.656 9.844 15.828 10.075Z"/>
              </svg>
              <span>Get the App</span>
            </a>
          </div>
        </div>

        {/* Footer Support Panel */}
        <div className="relative">
          <motion.div 
            className="glass-card rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 md:p-20 text-center flex flex-col items-center shadow-2xl shadow-blue-500/5"
          >
            <div className="w-16 h-16 sm:w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 border border-blue-100 dark:border-blue-500/10 transition-colors">
              <Gamepad2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4 sm:mb-6">Need a Special Item?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg md:text-xl font-medium mb-8 sm:mb-12 max-w-2xl leading-relaxed">
              Our 24/7 support team is here to assist you with custom top-ups, game cards, and professional gaming support.
            </p>
            <button 
              onClick={handleContact}
              className="nova-btn w-full sm:w-auto text-white sm:px-12 py-4 sm:py-5 font-bold"
            >
              <span>Contact Support</span>
              <span className="arrow-wrapper">
                <span className="arrow"></span>
              </span>
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
