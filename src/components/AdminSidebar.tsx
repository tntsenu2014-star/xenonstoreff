import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Package as PackageIcon, 
  ShoppingCart, 
  Settings, 
  LogOut,
  LayoutDashboard,
  Image as ImageIcon,
  LayoutTemplate,
  Sparkles,
  Calendar,
  User as UserIcon,
  Menu,
  X,
  ShieldCheck,
  Bell,
  BellRing,
  ShoppingBag
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, limit, Timestamp } from '../lib/firestore-compat';
import { motion, AnimatePresence } from 'motion/react';
import { OrderStatus } from '../types';
import { useUser } from '../lib/UserContext';

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    try {
      logout();
      navigate('/secure-portal/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/secure-portal', icon: LayoutDashboard },
    { name: 'Games', path: '/secure-portal/games', icon: ShoppingBag },
    { name: 'Packages', path: '/secure-portal/packages', icon: PackageIcon },
    { name: 'Banners', path: '/secure-portal/banners', icon: ImageIcon },
    { name: 'Services', path: '/secure-portal/services', icon: Sparkles },
    { name: 'Banner Designs', path: '/secure-portal/templates', icon: LayoutTemplate },
    { name: 'Events', path: '/secure-portal/events', icon: Calendar },
    { name: 'FF Accounts', path: '/secure-portal/accounts', icon: UserIcon },
    { name: 'Account Orders', path: '/secure-portal/account-orders', icon: ShoppingBag },
    { name: 'Service Orders', path: '/secure-portal/service-orders', icon: Sparkles },
    { name: 'Orders', path: '/secure-portal/orders', icon: ShoppingCart },
    { name: 'Settings', path: '/secure-portal/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="p-4 md:p-6 h-full flex flex-col bg-white dark:bg-[#0d0d0f] overflow-y-auto pb-24 md:pb-6 overscroll-y-contain">
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-8 md:mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Menu</h2>
          <div className="flex items-center space-x-2">
            <button className="md:hidden p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                  ? 'bg-[#645bff] text-white shadow-lg shadow-[#645bff]/20' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#645bff] dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-4 pt-12">
        {user && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center gap-3">
            <div className="bg-white dark:bg-white/10 p-2 rounded-xl shadow-sm">
              {profile.photoURL || user.photoURL ? (
                <img src={profile.photoURL || user.photoURL} alt="Admin" className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <UserIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                {profile.customerName || user.displayName || 'Administrator'}
              </span>
              <span className="text-[10px] text-gray-400 font-bold truncate">
                {user.email}
              </span>
            </div>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border-t border-gray-100 dark:border-white/5 mt-4 pt-4"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Nav Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-[#0d0d0f] border-b border-gray-100 dark:border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg">
             <img src="https://i.postimg.cc/L4QDxTxM/Chat-GPT-Image-Jun-13-2026-06-24-44-PM.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-black text-gray-900 dark:text-white tracking-tight">Admin Panel</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-64 shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="w-64 bg-white dark:bg-[#0d0d0f] border-r border-gray-200 dark:border-white/5 min-h-screen hidden md:block shrink-0">
        <SidebarContent />
      </div>
    </>
  );
}
