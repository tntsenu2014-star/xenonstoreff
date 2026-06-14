import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, ShieldCheck, User, Heart, Zap, Search, Globe, Calendar, ArrowLeft, Loader2, Award, Sparkles, CheckCircle2 } from 'lucide-react';

interface AccountInfo {
  name: string;
  level: number;
  likes: number;
  region: string;
  uid: string;
  lastLogin: string;
}

export default function FreeFireAccountInfo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId.trim()) return;

    setLoading(true);
    setAccountInfo(null);
    
    // Simulate real-time API latency
    setTimeout(() => {
      setLoading(false);
      setAccountInfo({
        name: 'NOVA TOPUP',
        level: 72,
        likes: 15430,
        region: 'SG (Singapore)',
        uid: playerId,
        lastLogin: new Date().toLocaleDateString()
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070708] relative overflow-hidden font-sans pt-20 pb-12 text-slate-800 dark:text-gray-100 transition-colors duration-300">
      {/* Background radial overlays */}
      <div 
        className="fixed top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full pointer-events-none z-0 opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%) animate-pulse',
        }}
      />
      <div 
        className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none z-0 opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="container mx-auto py-8 px-4 relative z-10 flex flex-col justify-center items-center h-full min-h-[80vh]">
        
        {/* Navigation Action */}
        <div className="w-full max-w-lg mb-6 self-center">
          <motion.button
            whileHover={{ x: -4 }}
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </motion.button>
        </div>

        <div className="w-full max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-white dark:bg-[#0d0d0f] border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl dark:shadow-none"
          >
            {/* Pulsing Gamepad Icon Header */}
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              {/* Outer pulsing neon ring */}
              <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur animate-pulse" />
              <div className="h-16 w-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 border-2 border-white dark:border-[#0d0d0f]">
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
            </div>

            <h1 className="text-center font-black text-2xl sm:text-3xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 uppercase tracking-tight">
              UID Checker
            </h1>
            
            <p className="text-slate-500 dark:text-gray-400 text-center mb-8 text-xs sm:text-sm font-semibold">
              Query and check active Garena player profile information instantly.
            </p>

            <form onSubmit={handleSubmit} className="mb-6">
              <div className="mb-4 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl opacity-0 group-focus-within:opacity-25 blur transition duration-300" />
                
                <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-1 gap-2 transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white dark:focus-within:bg-[#070708]">
                  <div className="pl-4 text-gray-400 flex items-center justify-center shrink-0">
                    <Search className={`h-5 w-5 transition-colors duration-300 ${playerId.trim().length >= 7 ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                  
                  <input 
                    type="text" 
                    className="w-full py-3 px-1 text-base bg-transparent border-0 outline-none focus:outline-none focus:ring-0 font-bold tracking-wider placeholder-slate-400 dark:placeholder-gray-500"
                    placeholder="Enter Player ID (e.g. 523617822)" 
                    required
                    pattern="\d{7,}" 
                    title="Player ID must be at least 7 digits."
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <motion.button 
                type="submit" 
                disabled={loading || !playerId.trim()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full h-13 rounded-2xl font-black text-sm uppercase tracking-widest transition-all relative overflow-hidden flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-blue-600/10 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300'
                    : playerId.trim().length >= 7
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 dark:text-blue-300" />
                    <span className="animate-pulse">Accessing Server...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed Audit</span>
                    <Zap className={`w-4 h-4 transition-transform duration-300 ${playerId.trim().length >= 7 ? 'animate-bounce text-yellow-300' : ''}`} />
                  </>
                )}
              </motion.button>
            </form>

            <AnimatePresence>
              {accountInfo && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="mt-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-500/10 shadow-sm relative overflow-hidden group/card"
                >
                  {/* Decorative ambient overlay */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover/card:scale-120 transition-transform duration-500" />

                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur animate-pulse" />
                      <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center border border-blue-200 dark:border-blue-500/20">
                        <User className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-full shadow-sm">
                          <Award className="w-2.5 h-2.5" />
                          <span>Garena Official</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </div>
                      <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl mt-1.5 uppercase tracking-tight">{accountInfo.name}</h3>
                    </div>
                  </div>
                  
                  <div className="grid gap-3.5 relative z-10">
                    {/* UID */}
                    <div className="flex justify-between items-center bg-white/65 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 dark:text-gray-400 font-bold text-xs flex items-center uppercase tracking-wider">
                        <Search className="w-4 h-4 mr-2 text-indigo-500" />
                        Player UID
                      </span>
                      <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded">{accountInfo.uid}</span>
                    </div>

                    {/* LEVEL */}
                    <div className="flex flex-col bg-white/65 dark:bg-white/5 p-3.5 rounded-xl border border-slate-100 dark:border-white/5 gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-gray-400 font-bold text-xs flex items-center uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                          Level Info
                        </span>
                        <span className="font-black text-amber-600 dark:text-amber-400 text-sm">Lv. {accountInfo.level}</span>
                      </div>
                      {/* Level Progress Bar visual */}
                      <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full" style={{ width: `${accountInfo.level}%` }} />
                      </div>
                    </div>

                    {/* LIKES */}
                    <div className="flex justify-between items-center bg-white/65 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 dark:text-gray-400 font-bold text-xs flex items-center uppercase tracking-wider">
                        <Heart className="w-4 h-4 mr-2 text-rose-500 animate-pulse" />
                        Likes Received
                      </span>
                      <span className="font-bold text-slate-800 dark:text-gray-200">{accountInfo.likes.toLocaleString()}</span>
                    </div>

                    {/* SERVER / REGION */}
                    <div className="flex justify-between items-center bg-white/65 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 dark:text-gray-400 font-bold text-xs flex items-center uppercase tracking-wider">
                        <Globe className="w-4 h-4 mr-2 text-emerald-500" />
                        Region / Server
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-xs bg-emerald-500/10 px-2 py-0.5 rounded">{accountInfo.region}</span>
                    </div>

                    {/* LAST LOGIN */}
                    <div className="flex justify-between items-center bg-white/65 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 dark:text-gray-400 font-bold text-xs flex items-center uppercase tracking-wider">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        Last Checked Info
                      </span>
                      <span className="font-semibold text-slate-600 dark:text-gray-300 text-xs">{accountInfo.lastLogin}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
