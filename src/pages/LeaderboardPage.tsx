import React, { useEffect, useState, useMemo } from 'react';
import { Trophy, Medal, Crown, Star, ArrowUp, TrendingUp, Search, User, Zap, Wallet, Heart, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLeaderboard, getSpendersLeaderboard } from '../services/db';
import { useUser } from '../lib/UserContext';

interface LeaderboardUser {
  id: string;
  customerName?: string;
  email?: string;
  loyaltyPoints?: number;
  totalSpent?: number;
  photoURL?: string;
  whatsappNumber?: string;
}

type LeaderboardType = 'LOYALTY' | 'SPENDERS';

const CrownRank1 = ({ className }: { className?: string }) => (
  <img 
    src="https://img.magnific.com/premium-vector/gold-crown-reputation-icon-flat-illustration-gold-crown-reputation-vector-icon-web-design_98396-43864.jpg?semt=ais_hybrid&w=740&q=80" 
    alt="Gold Crown" 
    className={`${className || 'w-14 h-14'} object-cover rounded-full border-2 border-amber-400 bg-white shadow-lg shadow-amber-500/20`}
    referrerPolicy="no-referrer"
  />
);

const CrownRank2 = ({ className }: { className?: string }) => (
  <img 
    src="https://i.ibb.co/1kvVS9J/e1b0d3c4-b443-4921-b2e9-c1770e14b6bd.png" 
    alt="Silver Crown" 
    className={`${className || 'w-11 h-11'} object-cover rounded-full border-2 border-slate-300 bg-white shadow-md`}
    referrerPolicy="no-referrer"
  />
);

const CrownRank3 = ({ className }: { className?: string }) => (
  <img 
    src="https://i.ibb.co/kgkkGtJz/6afc6cd3-41d3-461b-9af2-b181f5c24a8b.png" 
    alt="Bronze Crown" 
    className={`${className || 'w-10 h-10'} object-cover rounded-full border-2 border-amber-600/50 bg-white shadow-md`}
    referrerPolicy="no-referrer"
  />
);

export default function LeaderboardPage() {
  const { user, profile } = useUser();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'ALL_TIME' | 'THIS_MONTH'>('ALL_TIME');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getSpendersLeaderboard(50, period);
        setUsers(data);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [period]);

  const filteredUsers = users.filter(userDoc => 
    (userDoc.customerName || 'Gamer').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = filteredUsers.slice(0, 3);
  const restOfUsers = filteredUsers.slice(3);

  const currentUserStats = useMemo(() => {
    if (!user) return null;
    const possibleIds = [
      user.uid, 
      user.email,
      user.phoneNumber,
      profile?.whatsappNumber, 
      profile?.email,
      profile?.customerPhone
    ].filter(Boolean).map(id => String(id).toLowerCase());
    
    return users.find(u => {
      if (!u.id) return false;
      const leaderId = String(u.id).toLowerCase();
      return possibleIds.includes(leaderId);
    });
  }, [user, profile, users]);

  const userRank = useMemo(() => {
    if (!user) return -1;
    const possibleIds = [
      user.uid, 
      user.email,
      user.phoneNumber,
      profile?.whatsappNumber, 
      profile?.email,
      profile?.customerPhone
    ].filter(Boolean).map(id => String(id).toLowerCase());

    const idx = users.findIndex(u => {
      if (!u.id) return false;
      const leaderId = String(u.id).toLowerCase();
      return possibleIds.includes(leaderId);
    });
    return idx === -1 ? -1 : idx + 1;
  }, [user, profile, users]);

  const isCurrentUser = (u?: LeaderboardUser) => {
    if (!user || !u || !u.id) return false;
    const possibleIds = [
      user.uid, 
      user.email,
      user.phoneNumber,
      profile?.whatsappNumber, 
      profile?.email,
      profile?.customerPhone
    ].filter(Boolean).map(id => String(id).toLowerCase());
    
    return possibleIds.includes(String(u.id).toLowerCase());
  };

  const getUserPhoto = (u?: LeaderboardUser) => {
    if (!u) return '';
    if (isCurrentUser(u)) {
      return profile?.photoURL || user?.photoURL || u.photoURL || '';
    }
    return u.photoURL || '';
  };

  // Generate floating dots for hero background
  const dots = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 4,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFF] dark:bg-[#030303] selection:bg-blue-500/30 font-sans">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-24 px-6 text-center bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#0ea5e9] rounded-b-[2.5rem]">
        {/* Floating Dots Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {dots.map(dot => (
            <motion.div
              key={dot.id}
              initial={{ opacity: 0.2, y: 0 }}
              animate={{ 
                opacity: [0.2, 0.6, 0.2],
                y: [0, -20, 0]
              }}
              transition={{
                duration: dot.duration,
                repeat: Infinity,
                delay: dot.delay,
              }}
              style={{
                position: 'absolute',
                left: `${dot.left}%`,
                top: `${dot.top}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.35)',
                borderRadius: '50%',
              }}
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="inline-block mb-4 relative"
          >
            <Trophy className="h-16 w-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
            <motion.span
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute -top-1 -left-2 text-[#ffe066] text-xs"
            >
              ✦
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1.1 }}
              className="absolute -top-1 -right-2 text-[#ffe066] text-xs"
            >
              ✦
            </motion.span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2"
          >
            Hall of <span className="text-blue-200">Fame</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-blue-100/70 font-bold text-sm uppercase tracking-widest"
          >
            Real Spenders • Sri Lanka&apos;s Top Champions
          </motion.p>

          <div className="flex justify-center mt-8">
            <div className="inline-flex p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
              <button
                onClick={() => setPeriod('THIS_MONTH')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  period === 'THIS_MONTH'
                    ? 'bg-white text-blue-600 shadow-md scale-105'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                This Month
              </button>
              <button
                onClick={() => setPeriod('ALL_TIME')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  period === 'ALL_TIME'
                    ? 'bg-white text-blue-600 shadow-md scale-105'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Star className="h-4 w-4" />
                All Time
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2.5 xs:px-4 sm:px-6 -mt-12 pb-28 sm:pb-20 relative z-20">
        
        {/* Mobile Unified Top 3 Podium Row (Thiras Athata) */}
        <div className="block md:hidden mb-8 w-full">
          {loading ? (
            <div className="bg-white dark:bg-[#0d0d10] border border-gray-150 dark:border-white/5 rounded-2xl xs:rounded-3xl p-3 shadow-xl flex flex-col gap-3.5 animate-pulse">
              <div className="grid grid-cols-3 gap-2 items-end pt-8 pb-4">
                <div className="h-28 bg-gray-100 dark:bg-white/5 rounded-xl w-full" />
                <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl w-full" />
                <div className="h-28 bg-gray-100 dark:bg-white/5 rounded-xl w-full" />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0d0d10] border border-slate-150 dark:border-white/5 rounded-2xl xs:rounded-3xl p-2 xs:p-3 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />
               
              <div className="grid grid-cols-3 gap-1.5 xs:gap-2 items-end pt-8 pb-1.5">
                
                {/* RANK 2 */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-slate-50 dark:bg-white/5 rounded-xl xs:rounded-2xl p-1.5 xs:p-2 border border-slate-200/50 dark:border-white/5 text-center flex flex-col items-center justify-between min-h-[135px] xs:min-h-[145px] relative"
                >
                  <div className="relative w-8 h-8 xs:w-10 xs:h-10 mt-4 xs:mt-5 mb-1 shrink-0">
                    <div className="absolute -top-[14px] xs:-top-[20px] left-1/2 -translate-x-1/2 z-20">
                      <CrownRank2 className="w-[18px] h-[19px] xs:w-11 xs:h-11" />
                    </div>
                    <div className="absolute -inset-0.5 xs:-inset-1 rounded-full bg-slate-300 animate-pulse opacity-40" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#0d0d10] bg-gray-100 dark:bg-gray-800">
                      {getUserPhoto(topThree[1]) ? (
                        <img src={getUserPhoto(topThree[1])} alt={topThree[1]?.customerName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-500 to-slate-400 text-white font-black text-[10px] xs:text-xs uppercase">
                          {(topThree[1]?.customerName || '2')[0]}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-slate-400 text-white font-black text-[7px] xs:text-[8px] w-4 h-4 xs:w-4.5 xs:h-4.5 rounded-full flex items-center justify-center border border-white dark:border-[#0d0d10] leading-none z-10">
                      2
                    </div>
                  </div>

                  <div className="w-full">
                    <p className="text-[6.5px] xs:text-[7.5px] font-black text-slate-400 uppercase tracking-tight line-clamp-1">Runner Up</p>
                    <h4 className="font-extrabold text-gray-900 dark:text-gray-100 text-[8.5px] xs:text-[10px] sm:text-xs leading-none truncate w-full px-1 mt-0.5">
                      {topThree[1]?.customerName || 'Master Gamer'}
                    </h4>
                  </div>

                  <div className="mt-1.5 text-[8.5px] xs:text-[9.5px] font-black text-slate-600 dark:text-slate-400 font-mono bg-slate-100/80 dark:bg-white/5 px-1 xs:px-1.5 py-0.5 rounded w-full truncate text-center">
                    Rs. {(topThree[1]?.totalSpent || 0).toLocaleString()}
                  </div>
                </motion.div>

                {/* RANK 1 */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                  className="bg-amber-500/5 dark:bg-amber-500/5 rounded-xl xs:rounded-2xl p-1.5 xs:p-2 border-2 border-amber-400 text-center flex flex-col items-center justify-between min-h-[150px] xs:min-h-[165px] relative z-10 shadow-lg shadow-amber-500/10"
                >
                  <div className="relative w-10 h-10 xs:w-12 xs:h-12 mt-6 xs:mt-7 mb-1 shrink-0">
                    <div className="absolute -top-[18px] xs:-top-[26px] left-1/2 -translate-x-1/2 z-20">
                      <CrownRank1 className="w-[18px] h-[19px] xs:w-14 xs:h-14" />
                    </div>
                    <div className="absolute -inset-1 rounded-full bg-amber-400 blur-sm opacity-20" />
                    <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,#ffd700,#ff8c00,#ffe66d,#fff5a0,#ffd700)] animate-[spin_4s_linear_infinite]" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#0d0d10] bg-gray-100 dark:bg-gray-800">
                      {getUserPhoto(topThree[0]) ? (
                        <img src={getUserPhoto(topThree[0])} alt={topThree[0]?.customerName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-black text-xs xs:text-sm uppercase">
                          {(topThree[0]?.customerName || '1')[0]}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-black text-[7px] xs:text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-[#0d0d10] leading-none z-10">
                      1
                    </div>
                  </div>

                  <div className="w-full">
                    <p className="text-[6.5px] xs:text-[7.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tight line-clamp-1">Champion</p>
                    <h4 className="font-extrabold text-gray-950 dark:text-gray-100 text-[9px] xs:text-[10.5px] sm:text-xs leading-none truncate w-full px-0.5 xs:px-1 mt-0.5">
                      {topThree[0]?.customerName || 'Legend Gamer'}
                    </h4>
                  </div>

                  <div className="mt-1.5 text-[8.5px] xs:text-[9.5px] font-black text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-0.5 xs:px-1 py-0.5 rounded w-full truncate flex items-center justify-center gap-0.5">
                    <Zap className="w-2 h-2 xs:w-2.5 xs:h-2.5 text-amber-500 animate-bounce hidden xs:block" />
                    <span>Rs. {(topThree[0]?.totalSpent || 0).toLocaleString()}</span>
                  </div>
                </motion.div>

                {/* RANK 3 */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="bg-slate-50 dark:bg-white/5 rounded-xl xs:rounded-2xl p-1.5 xs:p-2 border border-slate-200/50 dark:border-white/5 text-center flex flex-col items-center justify-between min-h-[135px] xs:min-h-[145px] relative"
                >
                  <div className="relative w-8 h-8 xs:w-10 xs:h-10 mt-4 xs:mt-5 mb-1 shrink-0">
                    <div className="absolute -top-[14px] xs:-top-[18px] left-1/2 -translate-x-1/2 z-20">
                      <CrownRank3 className="w-[18px] h-[19px] xs:w-10 xs:h-10" />
                    </div>
                    <div className="absolute -inset-0.5 xs:-inset-1 rounded-full bg-[#cd8a4e] animate-pulse opacity-40" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#0d0d10] bg-gray-100 dark:bg-gray-800">
                      {getUserPhoto(topThree[2]) ? (
                        <img src={getUserPhoto(topThree[2])} alt={topThree[2]?.customerName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-800 to-amber-700 text-white font-black text-[10px] xs:text-xs uppercase">
                          {(topThree[2]?.customerName || '3')[0]}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-amber-700 text-white font-black text-[7px] xs:text-[8px] w-4 h-4 xs:w-4.5 xs:h-4.5 rounded-full flex items-center justify-center border border-white dark:border-[#0d0d10] leading-none z-10">
                      3
                    </div>
                  </div>

                  <div className="w-full">
                    <p className="text-[6.5px] xs:text-[7.5px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-tight line-clamp-1">3rd Place</p>
                    <h4 className="font-extrabold text-gray-900 dark:text-gray-100 text-[8.5px] xs:text-[10px] sm:text-xs leading-none truncate w-full px-1 mt-0.5">
                      {topThree[2]?.customerName || 'Elite Gamer'}
                    </h4>
                  </div>

                  <div className="mt-1.5 text-[8.5px] xs:text-[9.5px] font-black text-amber-700 dark:text-amber-500 font-mono bg-slate-100/80 dark:bg-white/5 px-1 xs:px-1.5 py-0.5 rounded w-full truncate text-center">
                    Rs. {(topThree[2]?.totalSpent || 0).toLocaleString()}
                  </div>
                </motion.div>

              </div>
            </div>
          )}
        </div>

        {/* Podium Top 3 (Desktop Only) */}
        <div className="hidden md:flex md:flex-row items-center md:items-end justify-center gap-6 md:gap-4 mb-20">
          {loading ? (
             Array(3).fill(0).map((_, i) => (
              <div key={i} className="w-full md:flex-1 h-64 bg-white dark:bg-gray-900 rounded-3xl animate-pulse shadow-xl" />
             ))
          ) : (
            <>
              {/* Rank 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full md:flex-1 order-2 md:order-1"
              >
                <div className="relative group p-6 rounded-[2rem] bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-white/5 shadow-xl hover:-translate-y-2 transition-all duration-500 text-center">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-200 rounded-t-[2rem]" />

                  <div className="relative w-20 h-20 mx-auto mb-4 mt-8">
                    <div className="absolute -top-[42px] left-1/2 -translate-x-1/2 z-20 scale-[0.95]">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4.2, repeat: Infinity }}>
                        <CrownRank2 />
                      </motion.div>
                    </div>
                    <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-200 animate-pulse opacity-50" />
                    <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,#94a3b8,#e2e8f0,#94a3b8,#cbd5e1,#94a3b8)] animate-[spin_4.5s_linear_infinite]" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white dark:border-[#0d0d10] bg-gray-100 dark:bg-gray-800">
                      {getUserPhoto(topThree[1]) ? (
                        <img src={getUserPhoto(topThree[1])} alt={topThree[1]?.customerName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-500 to-slate-400 text-white font-black text-2xl uppercase">
                          {(topThree[1]?.customerName || 'G')[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Runner Up</p>
                  <h3 className="font-black text-gray-900 dark:text-white truncate px-2 mb-4">
                    {topThree[1]?.customerName || 'Master Gamer'}
                  </h3>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-xs">
                    Rs. {(topThree[1]?.totalSpent || 0).toLocaleString()}
                  </div>
                </div>
                <div className="hidden md:block h-3 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-white/5 dark:to-transparent rounded-b-2xl border-x border-b border-slate-200 dark:border-white/5 mx-4" />
              </motion.div>

              {/* Rank 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="w-full md:flex-1 order-1 md:order-2 z-10"
              >
                <div className="relative group p-8 md:p-10 rounded-[2.5rem] bg-white dark:bg-[#0d0d10] border border-yellow-200/50 dark:border-yellow-500/10 shadow-2xl hover:-translate-y-2 transition-all duration-500 text-center overflow-visible">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500 rounded-t-[2.5rem]" />

                  <div className="relative w-28 h-28 mx-auto mb-6 mt-10">
                    <div className="absolute -top-[52px] left-1/2 -translate-x-1/2 z-30 scale-[1.1]">
                      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.6, repeat: Infinity }}>
                        <CrownRank1 />
                      </motion.div>
                    </div>
                    <div className="absolute -inset-2.5 rounded-full bg-yellow-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute -inset-2 rounded-full bg-[conic-gradient(from_0deg,#ffd700,#ff8c00,#ffe66d,#fff5a0,#ffd700)] animate-[spin_3s_linear_infinite]" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-[4px] border-white dark:border-[#0d0d10] bg-gray-100 dark:bg-gray-800">
                      {getUserPhoto(topThree[0]) ? (
                        <img src={getUserPhoto(topThree[0])} alt={topThree[0]?.customerName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-black text-4xl uppercase">
                          {(topThree[0]?.customerName || 'C')[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Grand Champion</p>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white truncate px-2 mb-6">
                    {topThree[0]?.customerName || 'Legend Gamer'}
                  </h3>
                  
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-sm shadow-lg shadow-amber-500/10">
                    <Zap className="h-4 w-4" />
                    Rs. {(topThree[0]?.totalSpent || 0).toLocaleString()}
                  </div>
                </div>
                <div className="hidden md:block h-6 bg-gradient-to-b from-yellow-50 to-amber-50/20 dark:from-yellow-500/10 dark:to-transparent rounded-b-2xl border-x border-b border-yellow-200/40 dark:border-yellow-500/10 mx-6" />
              </motion.div>

              {/* Rank 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="w-full md:flex-1 order-3"
              >
                <div className="relative group p-6 rounded-[2rem] bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-white/5 shadow-xl hover:-translate-y-2 transition-all duration-500 text-center">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#cd8a4e] to-[#fcd34d] rounded-t-[2rem]" />

                  <div className="relative w-20 h-20 mx-auto mb-4 mt-8">
                    <div className="absolute -top-[42px] left-1/2 -translate-x-1/2 z-20 scale-[0.95]">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4.2, repeat: Infinity, delay: 0.5 }}>
                        <CrownRank3 />
                      </motion.div>
                    </div>
                    <div className="absolute -inset-1.5 rounded-full bg-[#cd8a4e] animate-pulse opacity-30" />
                    <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,#cd8a4e,#a16207,#fcd34d,#cd8a4e)] animate-[spin_5.5s_linear_infinite]" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white dark:border-[#0d0d10] bg-gray-100 dark:bg-gray-800">
                      {getUserPhoto(topThree[2]) ? (
                        <img src={getUserPhoto(topThree[2])} alt={topThree[2]?.customerName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-800 to-amber-700 text-white font-black text-2xl uppercase">
                          {(topThree[2]?.customerName || 'G')[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1">3rd Place</p>
                  <h3 className="font-black text-gray-900 dark:text-white truncate px-2 mb-4">
                    {topThree[2]?.customerName || 'Elite Gamer'}
                  </h3>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-xs">
                    Rs. {(topThree[2]?.totalSpent || 0).toLocaleString()}
                  </div>
                </div>
                <div className="hidden md:block h-2 bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-900/10 dark:to-transparent rounded-b-2xl border-x border-b border-amber-200/30 dark:border-white/5 mx-4" />
                </motion.div>
            </>
          )}
        </div>

        {/* Global Contenders List */}
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-white/10" />
            The Contenders
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-white/10" />
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contender database..."
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-white/5 shadow-md text-xs xs:text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-4 ring-blue-500/5 transition-all outline-none"
            />
          </div>

          <div className="space-y-2.5">
             {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-white dark:bg-white/5 rounded-xl animate-pulse" />
                ))
             ) : restOfUsers.length > 0 ? (
                restOfUsers.map((userDoc, i) => (
                  <motion.div
                    key={userDoc.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 10) * 0.04 }}
                    className="group relative flex items-center gap-2.5 xs:gap-4 p-2.5 xs:p-4 rounded-xl xs:rounded-2xl bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:translate-x-1.5 transition-all duration-300"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <span className="w-5 xs:w-8 text-center text-[10px] xs:text-xs font-black text-gray-300 dark:text-gray-700 font-mono">
                      {(i + 4).toString().padStart(2, '0')}
                    </span>

                    <div className="relative w-9 h-9 xs:w-12 xs:h-12 flex-shrink-0">
                       <div className="absolute -inset-0.5 rounded-full bg-blue-500/20 group-hover:bg-blue-500/40 animate-[spin_5s_linear_infinite]" />
                       <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#0d0d10] bg-gray-55 dark:bg-gray-800">
                          {getUserPhoto(userDoc) ? (
                            <img src={getUserPhoto(userDoc)} alt={userDoc.customerName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 font-black text-xs xs:text-sm uppercase">
                              {(userDoc.customerName || 'G')[0]}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs xs:text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight">
                        {userDoc.customerName || 'Elite Guard'}
                      </h4>
                      <div className="flex items-center gap-1 opacity-50">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] xs:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Member</span>
                      </div>
                    </div>

                    <div className="px-2.5 xs:px-4 py-1.5 rounded-lg xs:rounded-xl bg-blue-50/50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 font-black text-[10px] xs:text-xs border border-blue-100/50 dark:border-white/5 shadow-inner shrink-0">
                      Rs. {(userDoc.totalSpent || 0).toLocaleString()}
                    </div>
                  </motion.div>
                ))
             ) : (
                <div className="py-16 text-center space-y-3 bg-white/50 dark:bg-white/[0.02] rounded-[2rem] border border-dashed border-gray-200 dark:border-white/10">
                   <Award className="h-8 w-8 text-gray-300 mx-auto" />
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching contenders found</p>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Sticky Rank Bar for User */}
      <AnimatePresence>
        {user && userRank > 3 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-3 xs:p-4"
          >
            <div className="max-w-2xl mx-auto p-3 xs:p-4 rounded-xl xs:rounded-2xl bg-white/95 dark:bg-[#0d0d10]/95 backdrop-blur-xl border border-blue-500/20 shadow-2xl shadow-blue-500/20 animate-in slide-in-from-bottom-5">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
              <div className="flex items-center gap-2.5 xs:gap-4">
                <div className="relative w-10 h-10 xs:w-12 xs:h-12 flex-shrink-0">
                   <div className="absolute -inset-0.5 rounded-full bg-blue-500/30 animate-[spin_4s_linear_infinite]" />
                   <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#141416] bg-gray-55 dark:bg-gray-800">
                      {profile?.photoURL || user?.photoURL ? (
                        <img src={profile.photoURL || user.photoURL} alt="Me" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-2 text-gray-300" />
                      )}
                   </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] xs:text-[10px] font-black uppercase tracking-widest mb-0.5 shadow-inner">
                    <ArrowUp className="h-2.5 w-2.5" />
                    Rank #{userRank}
                  </div>
                  <p className="text-xs xs:text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{profile?.customerName || 'Me'}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-base xs:text-lg font-mono font-black text-blue-600 dark:text-blue-400 tracking-tighter leading-none">
                    Rs. {(currentUserStats?.totalSpent || (period === 'ALL_TIME' ? profile?.totalSpent : 0) || 0).toLocaleString()}
                  </p>
                  <p className="text-[8px] xs:text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mt-1">{period === 'ALL_TIME' ? 'All Time' : 'This Month'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
