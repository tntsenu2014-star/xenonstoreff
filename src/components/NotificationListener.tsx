import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from '../lib/firestore-compat';
import { db } from '../lib/firebase';
import { mapDocData } from '../services/db';
import { AppNotification } from '../types';
import { toast } from 'sonner';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { useIsAdmin } from '../lib/useIsAdmin';

const NotificationListener: React.FC = () => {
  const { isAdmin } = useIsAdmin();
  const lastNotificationId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Single snapshot subscription to avoid state races and duplicate execution
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifications = snapshot.docs.map(doc => mapDocData<AppNotification>(doc));
      
      // Filter based on whether user is admin or not
      const visibleNotifications = allNotifications.filter(n => 
        n.target === 'all' || (isAdmin && n.target === 'admin')
      );

      if (visibleNotifications.length === 0) return;

      // On first load, record existing IDs to avoid showing them as new toasted alerts
      if (isFirstLoad.current) {
        lastNotificationId.current = visibleNotifications[0].id;
        isFirstLoad.current = false;
        return;
      }

      const newId = visibleNotifications[0].id;
      if (newId !== lastNotificationId.current) {
        // Find which notifications are actually new compared to the last ID seen.
        const lastIdx = visibleNotifications.findIndex(n => n.id === lastNotificationId.current);
        const newItems = lastIdx === -1 ? [visibleNotifications[0]] : visibleNotifications.slice(0, lastIdx);
        
        if (newItems.length > 0) {
          // Toast them in reverse order (oldest first)
          newItems.reverse().forEach(n => {
            showNotificationToast(n);
          });
        }
        lastNotificationId.current = newId;
      }
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const showNotificationToast = (notification: AppNotification) => {
    const Icon = getIcon(notification.type);
    
    toast.custom((id) => (
      <div 
        className="max-w-md w-full bg-white dark:bg-[#121214] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-gray-100 dark:border-white/10 overflow-hidden"
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getIconBg(notification.type)}`}>
                <Icon className={`h-5 w-5 ${getIconColor(notification.type)}`} />
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                {notification.title}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {notification.message}
              </p>
            </div>
          </div>
        </div>

      </div>
    ), {
      duration: 5000,
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Info;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-100 dark:bg-emerald-500/20';
      case 'warning': return 'bg-amber-100 dark:bg-amber-500/20';
      case 'error': return 'bg-red-100 dark:bg-red-500/20';
      default: return 'bg-blue-100 dark:bg-blue-500/20';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  return null;
};

export default NotificationListener;
