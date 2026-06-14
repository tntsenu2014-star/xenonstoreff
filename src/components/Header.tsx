import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Menu, X, User as UserIcon, LogIn, Sun, Moon, Trophy } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsAdmin } from '../lib/useIsAdmin';
import { useUser } from '../lib/UserContext';
import { useTheme } from '../lib/ThemeContext';
import { useSettings } from '../lib/SettingsContext';
import NotificationCenter from './NotificationCenter';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { user, profile } = useUser();
  const { theme, toggleTheme } = useTheme();
  const settingsContext = useSettings();
  const settings = settingsContext?.settings;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/55 dark:bg-[#070708]/55 backdrop-blur-[24px] border-b border-white/25 dark:border-white/5 shadow-lg shadow-black/[0.03] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 md:space-x-3 group animate-fade-in">
              {settings?.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings.siteName || "Logo"} 
                  className="h-8 md:h-10 w-auto object-contain transition-transform group-hover:scale-105 rounded-2xl" 
                  referrerPolicy="no-referrer" 
                  fetchPriority="high" 
                  decoding="async" 
                />
              ) : (
                <div className="primary-gradient p-2 md:p-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-110">
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              )}
              <span className="text-lg md:text-xl lg:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                {settings?.siteName ? (
                  <>
                    {settings.siteName.split(' ')[0]} <span className="text-blue-600 dark:text-blue-500">{settings.siteName.split(' ').slice(1).join(' ')}</span>
                  </>
                ) : (
                  <>
                    Xenon <span className="text-blue-600 dark:text-blue-500">Store</span>
                  </>
                )}
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-3 lg:space-x-5">
            <Link to="/" className="text-xs lg:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">Store</Link>
            <Link to="/accounts" className="text-xs lg:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">Buy FF Accounts</Link>
            <Link to="/payment-details" className="text-xs lg:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">Payment Details</Link>
            <Link to="/history" className="text-xs lg:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">My Orders</Link>
            <Link to="/leaderboard" className="text-xs lg:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Leaderboard</span>
            </Link>
            <Link to="/wallet" className="text-xs lg:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap flex items-center space-x-1">
              <span>My Wallet</span>
              {user && (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                  LKR {((profile?.loyaltyPoints || 0) * 0.000002).toLocaleString()}
                </span>
              )}
            </Link>
            
            <NotificationCenter />

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-400"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Moon className="h-4 w-4 text-blue-500" /> : <Sun className="h-4 w-4 text-yellow-500" />}
            </button>

            {user ? (
              <Link to="/profile" className="flex items-center space-x-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all group">
                {profile?.photoURL || user?.photoURL ? (
                  <img src="/src/assets/images/regenerated_image_1781404875353.avif" alt="User" className="w-5 h-5 rounded-full ring-2 ring-blue-500/10 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Profile Settings
                </span>
              </Link>
            ) : (
              <Link to="/profile" className="flex items-center space-x-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                <LogIn className="h-4 w-4" />
                <span>Login / Register</span>
              </Link>
            )}

            {isAdmin && (
              <Link to="/secure-portal" className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border-l border-gray-100 dark:border-white/10 pl-4">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2.5 lg:hidden animate-fade-in">
            <NotificationCenter />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              {theme === 'dark' ? <Moon className="h-5 w-5 text-blue-500" /> : <Sun className="h-5 w-5 text-yellow-500" />}
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            key="mobile-nav-root"
            className="fixed inset-0 z-50 lg:hidden flex justify-end overflow-hidden h-[100dvh]"
            style={{ height: '100dvh' }}
          >
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            />

            {/* Sidebar Slide-out Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-[85vw] max-w-sm h-full bg-white dark:bg-[#0d0d0f] border-l border-gray-100 dark:border-white/5 shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center px-6 py-5 shrink-0 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                  {settings?.siteName || "Xenon Store"}
                </span>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6 pb-32">
                {user && (
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 animate-in fade-in duration-300 animate-out fade-out">
                    {profile?.photoURL || user?.photoURL ? (
                      <img src={profile?.photoURL || user?.photoURL} alt="User" className="w-12 h-12 rounded-full ring-4 ring-blue-50 dark:ring-blue-500/10 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl primary-gradient flex items-center justify-center text-white font-bold">
                        {(profile?.customerName || user?.displayName)?.charAt(0) || user?.email?.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{profile?.customerName || user?.displayName || 'Gamer'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid gap-1">
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center justify-between">
                    <span>Store</span>
                  </Link>
                  <Link to="/accounts" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center justify-between">
                    <span>Buy FF Accounts</span>
                  </Link>
                  <Link to="/payment-details" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center justify-between">
                    <span>Payment Details</span>
                  </Link>
                  <Link to="/history" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center justify-between">
                    <span>My Orders</span>
                  </Link>
                  <Link to="/leaderboard" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Trophy className="h-4 w-4 text-amber-500" />
                       <span>Leaderboard</span>
                    </div>
                  </Link>
                  <Link to="/wallet" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center justify-between">
                    <span>My Wallet</span>
                    {user && (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                        LKR {((profile?.loyaltyPoints || 0) * 0.000002).toLocaleString()}
                      </span>
                    )}
                  </Link>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center justify-between">
                    <span>{user ? 'Profile Settings' : 'Login / Register'}</span>
                  </Link>
                  {isAdmin && (
                    <Link to="/secure-portal" onClick={() => setIsMenuOpen(false)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 mt-4 text-center">
                      Admin Panel
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
