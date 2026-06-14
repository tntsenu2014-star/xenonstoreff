import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package as PackageIcon, Clock, CheckCircle2, XCircle, AlertCircle, ShoppingBag, ShieldAlert, Award, FileText, Copy, Check } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { mapDocData } from '../services/db';
import { db } from '../lib/firebase';
import { collection, query, or, where, onSnapshot } from '../lib/firestore-compat';
import { Link } from 'react-router-dom';
import { useUser } from '../lib/UserContext';
import { toast } from 'sonner';

interface OrderHistoryListProps {
  userId: string;
  phone: string;
}

interface NormalizedOrder {
  id: string;
  amount: number;
  status: OrderStatus;
  createdAt: number;
  _type: 'PACKAGE' | 'SERVICE' | 'ACCOUNT';
  _displayTitle: string;
}

export default function OrderHistoryList({ userId, phone }: OrderHistoryListProps) {
  const { user } = useUser();
  const [orders, setOrders] = useState<NormalizedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Order ID copied to clipboard!", { description: id });
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const conditions: any[] = [];
    if (user?.id) {
      conditions.push(where('authUid', '==', user.id));
    }
    if (userId) {
      conditions.push(where('userId', '==', userId));
    }
    if (phone) {
      conditions.push(where('customerPhone', '==', phone));
    }

    if (conditions.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubOrders = () => {};
    let unsubAccOrders = () => {};

    let ordersList: NormalizedOrder[] = [];
    let accOrdersList: NormalizedOrder[] = [];

    const updateCombined = () => {
      const combined = [...ordersList, ...accOrdersList];
      combined.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(combined);
      setLoading(false);
    };

    try {
      const qOrders = query(
        collection(db, 'orders'),
        or(...conditions)
      );

      unsubOrders = onSnapshot(qOrders, (snapshot) => {
        ordersList = snapshot.docs.map(doc => {
          const item = mapDocData<any>(doc);
          const isService = (item.diamonds === 0 || !item.diamonds) && item.packageId !== 'custom';
          return {
            id: item.id,
            amount: Number(item.amount) || 0,
            status: item.status,
            createdAt: item.createdAt,
            _type: isService ? 'SERVICE' : 'PACKAGE' as const,
            _displayTitle: item.packageName || 'Diamond Rank Top-up'
          };
        });
        updateCombined();
      }, (err) => {
        console.error("Error fetching regular orders:", err);
        updateCombined();
      });
    } catch (err) {
      console.error("Query format/init error for orders:", err);
    }

    try {
      const qAccOrders = query(
        collection(db, 'accountOrders'),
        or(...conditions)
      );

      unsubAccOrders = onSnapshot(qAccOrders, (snapshot) => {
        accOrdersList = snapshot.docs.map(doc => {
          const item = mapDocData<any>(doc);
          return {
            id: item.id,
            amount: Number(item.amount) || 0,
            status: item.status,
            createdAt: item.createdAt,
            _type: 'ACCOUNT' as const,
            _displayTitle: item.accountTitle || 'Premium Game Account'
          };
        });
        updateCombined();
      }, (err) => {
        console.error("Error fetching account orders:", err);
        updateCombined();
      });
    } catch (err) {
      console.error("Query format/init error for account orders:", err);
    }

    return () => {
      unsubOrders();
      unsubAccOrders();
    };
  }, [userId, phone, user?.id]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20';
      case OrderStatus.CONFIRMED: return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20';
      case OrderStatus.PENDING: return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20';
      case OrderStatus.CANCELED: return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20';
      default: return 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/10';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return <CheckCircle2 className="w-3.5 h-3.5 mr-2" />;
      case OrderStatus.CONFIRMED: return <CheckCircle2 className="w-3.5 h-3.5 mr-2" />;
      case OrderStatus.PENDING: return <Clock className="w-3.5 h-3.5 mr-2 animate-pulse" />;
      case OrderStatus.CANCELED: return <XCircle className="w-3.5 h-3.5 mr-2" />;
      default: return <AlertCircle className="w-3.5 h-3.5 mr-2" />;
    }
  };

  const getTypeBadge = (type: 'PACKAGE' | 'SERVICE' | 'ACCOUNT') => {
    switch (type) {
      case 'PACKAGE':
        return 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'SERVICE':
        return 'bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'ACCOUNT':
        return 'bg-amber-600/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  const getTypeLabel = (type: 'PACKAGE' | 'SERVICE' | 'ACCOUNT') => {
    switch (type) {
      case 'PACKAGE': return '💎 Diamond Top-up';
      case 'SERVICE': return '🛠️ Xenon Service';
      case 'ACCOUNT': return '🎮 Game Account';
    }
  };

  if (loading) {
    return <div className="text-center py-10 font-bold uppercase tracking-widest text-[10px] text-gray-400">Loading order history records...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
        <ShoppingBag className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">No purchases found for this profile.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {orders.map((order, index) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          key={order.id}
          className="bg-white dark:bg-[#09090a] rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5 sm:gap-6 sm:items-center justify-between group"
        >
          <div className="flex-1 space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                {order.status}
              </span>
              <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${getTypeBadge(order._type)}`}>
                {getTypeLabel(order._type)}
              </span>
              <button
                type="button"
                onClick={(e) => handleCopy(order.id, e)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-widest bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/10 hover:border-blue-500/30 text-gray-400 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group/copy"
                title="Click to copy full Order ID"
              >
                <span>#{order.id.slice(-6).toUpperCase()}</span>
                {copiedId === order.id ? (
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400 hover:text-blue-500 group-hover/copy:scale-110 transition-transform shrink-0" />
                )}
              </button>
            </div>
            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
              {order._displayTitle}
            </h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-2 justify-center border-t sm:border-t-0 border-gray-50 dark:border-white/5 pt-4 sm:pt-0">
            <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">LKR {(order.amount || 0).toFixed(2)}</p>
            <Link 
              to={order._type === 'ACCOUNT' ? `/confirmation/acc_${order.id}` : `/confirmation/${order.id}`} 
              className="px-5 sm:px-6 py-2.5 sm:py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/10 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-gray-700 dark:text-gray-300 font-extrabold rounded-xl transition-all text-[8px] sm:text-[9px] uppercase tracking-widest text-center shadow-sm w-full sm:w-auto"
            >
              View Order
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
