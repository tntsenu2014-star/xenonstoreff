import React, { useEffect, useState, useRef } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Trash2, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot } from '../lib/firestore-compat';
import { db } from '../lib/firebase';
import { mapDocData } from '../services/db';
import { AppNotification } from '../types';
import { useIsAdmin } from '../lib/useIsAdmin';

export default function NotificationCenter() {
  const { isAdmin } = useIsAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [clearedIds, setClearedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cleared_notification_ids') || '[]');
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('read_notification_ids', JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    localStorage.setItem('cleared_notification_ids', JSON.stringify(clearedIds));
  }, [clearedIds]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Firestore Snapshot Subscription
  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all: AppNotification[] = snapshot.docs.map(doc => mapDocData<AppNotification>(doc));
      // Filter based on roles (all + admin if user is admin)
      const visible = all.filter(n => n.target === 'all' || (isAdmin && n.target === 'admin'));
      setNotifications(visible);
    }, (error) => {
      console.error('Error in NotificationCenter:', error);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Filter out completely cleared notification IDs
  const activeNotifications = notifications.filter(n => !clearedIds.includes(n.id));
  const unreadCount = activeNotifications.filter(n => !readIds.includes(n.id)).length;

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      setReadIds(prev => [...prev, id]);
    }
  };

  const markAllAsRead = () => {
    const unreadNotificationIds = activeNotifications
      .filter(n => !readIds.includes(n.id))
      .map(n => n.id);
    if (unreadNotificationIds.length > 0) {
      setReadIds(prev => [...prev, ...unreadNotificationIds]);
    }
  };

  const clearAll = () => {
    const currentIds = activeNotifications.map(n => n.id);
    setClearedIds(prev => [...prev, ...currentIds]);
    // Mark as read too
    setReadIds(prev => [...prev, ...currentIds]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Info;
    }
  };

  const getStyleClasses = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
          icon: 'text-emerald-600 dark:text-emerald-400',
          text: 'text-emerald-950 dark:text-emerald-300'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
          icon: 'text-amber-600 dark:text-amber-400',
          text: 'text-amber-950 dark:text-amber-300'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-950 dark:text-red-300'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-950 dark:text-blue-300'
        };
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} id="notification-center-root">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-400 relative focus:outline-none"
        aria-label="View notifications"
        id="notification-bell-btn"
      >
        <Bell className={`h-4.5 w-4.5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white bg-red-600 rounded-full min-w-[18px] flex items-center justify-center border border-white dark:border-[#070708] scale-100 transition-all"
            id="notification-unread-badge"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Drawer/Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop Overlay - Fullscreen behind drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black z-40"
              onClick={() => setIsOpen(false)}
              id="notification-mobile-overlay"
            />

            {/* Panel (Dropdown on Large, Overlay Slide-down Drawer on Mobile) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed lg:absolute right-4 left-4 lg:left-auto top-20 lg:top-full lg:mt-3 z-50 w-auto lg:w-[420px] max-h-[80vh] lg:max-h-[550px] flex flex-col bg-white dark:bg-[#0d0d0f] rounded-2.5xl lg:rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden focus:outline-none"
              id="notification-panel-card"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 uppercase">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {activeNotifications.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>Read All</span>
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 cursor-pointer"
                      title="Clear notifications"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Notification List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-white/5 p-2 space-y-1.5 max-h-[60vh] lg:max-h-[420px]">
                {activeNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 dark:text-white/10 mb-4 animate-pulse">
                      <Bell className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                      All caught up!
                    </p>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">
                      No notifications yet.
                    </p>
                  </div>
                ) : (
                  activeNotifications.map((n) => {
                    const IconComponent = getIcon(n.type);
                    const styles = getStyleClasses(n.type);
                    const isUnread = !readIds.includes(n.id);

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                        }}
                        className={`group p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                          isUnread
                            ? `${styles.bg} border-l-4 shadow-lg shadow-blue-500/[0.01]`
                            : 'bg-white dark:bg-[#0d0d0f] border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${isUnread ? 'bg-white dark:bg-black/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                          <IconComponent className={`h-4.5 w-4.5 ${styles.icon}`} />
                        </div>

                        {/* Text Message Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isUnread ? 'text-gray-950 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                              {n.title}
                            </span>
                            {n.target === 'admin' && (
                              <span className="px-1.5 py-0.5 text-[8px] font-black bg-purple-500/15 text-purple-500 rounded uppercase tracking-widest shrink-0">
                                Admin Only
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed mt-1 font-medium ${isUnread ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                            {n.message}
                          </p>
                          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1.5 block">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>

                        {/* Unread dot indicator */}
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0 self-center" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
