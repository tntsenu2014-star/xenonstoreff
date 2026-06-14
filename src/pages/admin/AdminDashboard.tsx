import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  CheckCircle2, 
  TrendingUp, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  MessageCircle,
  Layers,
  PhoneCall,
  UserCheck,
  Ticket,
  Bell,
  BellRing,
  BarChart4,
  KeyRound,
  Settings2,
  Search,
  Eye,
  Check,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, updateDoc, doc, orderBy, limit } from '../../lib/firestore-compat';
import { Order, OrderStatus, AccountOrder } from '../../types';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { mapDocData, createNotification } from '../../services/db';

// Modular Subpanels Imports
import ShellStockPanel from '../../components/admin/ShellStockPanel';
import WhatsAppStockPanel from '../../components/admin/WhatsAppStockPanel';
import CouponsPanel from '../../components/admin/CouponsPanel';
import CustomersPanel from '../../components/admin/CustomersPanel';
import PaymentsPanel from '../../components/admin/PaymentsPanel';
import ReportsPanel from '../../components/admin/ReportsPanel';
import PermissionsPanel from '../../components/admin/PermissionsPanel';
import StoreSettingsPanel from '../../components/admin/StoreSettingsPanel';
import WalletPanel from '../../components/admin/WalletPanel';

type ActiveTab = 'overview' | 'orders' | 'shells' | 'whatsapp' | 'payments' | 'customers' | 'coupons' | 'notifications' | 'reports' | 'permissions' | 'settings' | 'wallet';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [accountOrders, setAccountOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isLoading: loadingAdminCheck } = useIsAdmin();
  const navigate = useNavigate();

  // Integrated Orders State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDetailedOrder, setSelectedDetailedOrder] = useState<Order | null>(null);

  // Notifications Form State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'admin'>('all');
  const [notifType, setNotifType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      
      const ordersQuery = query(collection(db, 'orders'));
      const accOrdersQuery = query(collection(db, 'accountOrders'));
      const notifsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));

      const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => mapDocData<Order>(doc));
        setOrders(data);
        setLoading(false);
      }, (err) => {
        console.error("Orders stream error:", err);
        setLoading(false);
      });

      const unsubscribeAccOrders = onSnapshot(accOrdersQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => mapDocData<AccountOrder>(doc));
        setAccountOrders(data);
        setLoading(false);
      }, (err) => {
        console.error("Account orders stream error:", err);
        setLoading(false);
      });

      const unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => mapDocData<any>(doc));
        setRecentNotifications(data);
      });

      return () => {
        unsubscribeOrders();
        unsubscribeAccOrders();
        unsubscribeNotifs();
      };
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Calculations for KPI widgets
  const packageOrdersList = orders.filter(o => o.diamonds > 0);
  const serviceOrdersList = orders.filter(o => o.diamonds === 0);

  const totalOrdersCount = orders.length + accountOrders.length;
  const pendingOrdersCount = orders.filter(o => o.status === OrderStatus.PENDING).length + 
                             accountOrders.filter(o => o.status === OrderStatus.PENDING).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.COMPLETED).length +
                               accountOrders.filter(o => o.status === OrderStatus.COMPLETED).length;

  const totalRevenueSum = orders
    .filter(o => o.status === OrderStatus.COMPLETED)
    .reduce((sum, o) => sum + (o.amount || 0), 0) +
    accountOrders
    .filter(o => o.status === OrderStatus.COMPLETED)
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  // Trigger actual campaign dispatch
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) {
      toast.error("Please specify a notification Title and Message");
      return;
    }
    setSendingNotif(true);
    
    try {
      await createNotification({
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        target: notifTarget
      });
      
      setSendingNotif(false);
      setNotifTitle('');
      setNotifMessage('');
      toast.success(`Successfully dispatched ${notifTarget.toUpperCase()} notification!`);
    } catch (err) {
      setSendingNotif(false);
      toast.error("Failed to send notification.");
    }
  };

  // Order status triggers
  const handleUpdateOrderStatusInline = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: nextStatus });
      toast.success(`Order #${orderId.slice(-6).toUpperCase()} is now ${nextStatus.toUpperCase()}`);
      if (selectedDetailedOrder && selectedDetailedOrder.id === orderId) {
        setSelectedDetailedOrder(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    } catch (err) {
      toast.error("Could not update order status");
    }
  };

  const handleRefundOrderInline = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'refunded' as any });
      toast.success(`Order #${orderId.slice(-6).toUpperCase()} refunded successfully.`);
      if (selectedDetailedOrder && selectedDetailedOrder.id === orderId) {
        setSelectedDetailedOrder(prev => prev ? { ...prev, status: 'refunded' as any } : null);
      }
    } catch (err) {
      toast.error("Failed to trigger refund sequence");
    }
  };

  // Nav tab buttons with icons
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart4 },
    { id: 'orders', label: 'Orders Queue', icon: ShoppingCart },
    { id: 'shells', label: 'Shell Inventory', icon: Layers },
    { id: 'whatsapp', label: 'WhatsApp Desks', icon: PhoneCall },
    { id: 'payments', label: 'Payments', icon: UserCheck },
    { id: 'customers', label: 'CRM Profiles', icon: UserCheck },
    { id: 'coupons', label: 'Vouchers', icon: Ticket },
    { id: 'notifications', label: 'Campaigns', icon: Bell },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'permissions', label: 'Clearance', icon: KeyRound },
    { id: 'settings', label: 'Settings', icon: Settings2 },
    { id: 'wallet', label: 'User Wallets', icon: Wallet },
  ] as const;

  if (loadingAdminCheck) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-gray-500 max-w-sm mt-1.5 text-xs font-bold uppercase tracking-widest leading-relaxed">
          Your account is not registered as an authorized Store Administrator.
        </p>
        <Link to="/" className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg">
          Return To Storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50/60 dark:bg-[#030303] text-gray-900 dark:text-gray-200">
      <AdminSidebar />
      
      <div className="flex-grow p-4 md:p-8 overflow-x-hidden">
        {/* Dynamic Header */}
        <header className="mb-6 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-500/20">
                  Xenon Store Command Center
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase leading-none mt-1">
                Administrative Studio
              </h1>
            </div>
          </div>

          {/* WooCommerce horizontal grid tabs */}
          <div className="relative">
            <div className="flex overflow-x-auto gap-2 py-3 mt-6 font-sans border-b border-gray-100 dark:border-white/5 scrollbar-none snap-x -mx-4 md:mx-0 px-4 md:px-0">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 whitespace-nowrap shadow-sm border snap-start ${
                      isActive 
                        ? 'bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/20' 
                        : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-100 dark:bg-[#0d0d0f] dark:hover:bg-white/5 dark:border-white/5'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Soft fade for horizontal scroll indicator */}
            <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-[#030303] to-transparent pointer-events-none" />
          </div>
        </header>

        {/* Dynamic Panels switch */}
        <div className="space-y-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats metric dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 font-sans">
                {[
                  { name: 'Total Orders', value: totalOrdersCount, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
                  { name: 'Pending Orders', value: pendingOrdersCount, icon: Package, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
                  { name: 'Completed Orders', value: completedOrdersCount, icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
                  { name: 'Total Revenue', value: `LKR ${totalRevenueSum.toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white dark:bg-[#0d0d0f] p-5 md:p-6 border border-gray-100 dark:border-white/5 rounded-2xl md:rounded-3xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{stat.name}</p>
                      <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-1.5 font-mono">{stat.value}</p>
                    </div>
                    <div className={`h-11 w-11 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Central overview widget */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                
                {/* Micro transactions table */}
                <div className="lg:col-span-2 bg-white dark:bg-[#0d0d0f] rounded-2xl md:rounded-3xl border border-gray-100 dark:border-white/5 p-4 md:p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-white/5 pb-3">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Active processing Stream</h4>
                    <button onClick={() => setActiveTab('orders')} className="text-[9px] font-black uppercase text-blue-600 tracking-widest hover:underline">View All Queue</button>
                  </div>

                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="w-full text-left min-w-[600px] md:min-w-full">
                      <thead className="bg-gray-50/50 dark:bg-white/5 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                        <tr>
                          <th className="px-4 md:px-5 py-3">Order Code</th>
                          <th className="px-4 md:px-5 py-3">Gamer Client Name</th>
                          <th className="px-4 md:px-5 py-3">Asset</th>
                          <th className="px-4 md:px-5 py-3 text-center">Status</th>
                          <th className="px-4 md:px-5 py-3 text-right">Settlement Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-sans">
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.id} className="hover:bg-blue-50/10 dark:hover:bg-white/[0.01] transition-all text-xs">
                            <td className="px-4 md:px-5 py-3 font-mono font-bold text-gray-400">#{order.id.slice(-6).toUpperCase()}</td>
                            <td className="px-4 md:px-5 py-3 font-black text-gray-900 dark:text-white">{order.customerName}</td>
                            <td className="px-4 md:px-5 py-3">
                              <span className="text-[10px] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded font-bold uppercase text-gray-700 dark:text-gray-300">
                                {order.packageName}
                              </span>
                            </td>
                            <td className="px-4 md:px-5 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                order.status === OrderStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' :
                                order.status === OrderStatus.PENDING ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20' :
                                'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 md:px-5 py-3 text-right font-mono font-black text-gray-900 dark:text-white">LKR {(order.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Micro Action Box */}
                <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/5 p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Automated Routing Alerts</h4>
                    <p className="text-[10px] text-gray-400 uppercase leading-relaxed font-bold">
                      The WhatsApp routing logs are active. Shell stock replenishment thresholds are flagged if below 1,000 shells.
                    </p>
                  </div>

                  <div className="space-y-2 mt-6">
                    <button 
                      onClick={() => setActiveTab('shells')}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] rounded-xl uppercase tracking-widest shadow-md shadow-blue-500/20 transition-all"
                    >
                      Inspect Shell depletion thresholds
                    </button>
                    <button 
                      onClick={() => setActiveTab('whatsapp')}
                      className="w-full py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 font-extrabold text-[9px] rounded-xl uppercase tracking-widest border border-gray-200 dark:border-white/10 transition-all"
                    >
                      Audit operator loads
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* INTEGRATED ORDERS QUEUE TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#0d0d0f] rounded-2xl md:rounded-[2rem] border border-gray-100 dark:border-white/5 p-4 md:p-6 shadow-sm">
                
                {/* Search / Filters Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">WooCommerce Order Dashboard</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1.5 font-mono">Process Player diamond orders, assign WhatsApp delivery desks, and approve sales.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 font-sans w-full lg:max-w-xl">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search order ID, gamer name..."
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-10 px-3 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                    >
                      <option value="all">Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                </div>

                {/* Orders Main Table */}
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <table className="w-full text-left min-w-[800px] lg:min-w-full">
                    <thead className="bg-gray-50/50 dark:bg-white/5 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                      <tr>
                        <th className="px-4 md:px-5 py-4">Order Ref</th>
                        <th className="px-4 md:px-5 py-4">Client Detail</th>
                        <th className="px-4 md:px-5 py-4">Asset Bundle</th>
                        <th className="px-4 md:px-5 py-4">Settle Method</th>
                        <th className="px-4 md:px-5 py-4 text-center">State</th>
                        <th className="px-4 md:px-5 py-4 text-right">Price</th>
                        <th className="px-4 md:px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-sans">
                      {orders
                        .filter((o) => {
                          const sQ = searchQuery.toLowerCase();
                          const matchesSearch = 
                            (o.customerName || '').toLowerCase().includes(sQ) || 
                            (o.id || '').toLowerCase().includes(sQ) || 
                            (o.userId || '').toLowerCase().includes(sQ);
                          const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map((order) => (
                          <tr key={order.id} className="hover:bg-blue-50/10 dark:hover:bg-white/[0.01] transition-all whitespace-nowrap">
                            <td className="px-5 py-4 font-mono font-bold text-xs text-gray-400">#{order.id.slice(-8).toUpperCase()}</td>
                            <td className="px-5 py-4">
                              <p className="font-black text-gray-901 dark:text-white text-xs">{order.customerName}</p>
                              <span className="text-[9px] text-blue-600 font-black tracking-widest uppercase font-mono">FF UID: {order.userId || 'N/A'}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-150 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                                {order.packageName}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs font-bold capitalize text-gray-600 dark:text-gray-400">
                              {order.paymentMethod.replace('_', ' ')}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                order.status === OrderStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                order.status === OrderStatus.PENDING ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                order.status === OrderStatus.CONFIRMED ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-mono font-black text-xs text-gray-800 dark:text-white">LKR {(order.amount || 0).toLocaleString()}</td>
                            <td className="px-5 py-4 text-right space-x-1">
                              <button 
                                onClick={() => setSelectedDetailedOrder(order)}
                                className="h-7 px-2.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-black text-[9px] uppercase tracking-widest border border-transparent transition-all"
                              >
                                View Specs
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* SHELL STOCK PANEL TAB */}
          {activeTab === 'shells' && <ShellStockPanel />}

          {/* WHATSAPP STOCK PANEL TAB */}
          {activeTab === 'whatsapp' && <WhatsAppStockPanel />}

          {/* PAYMENTS PANEL TAB */}
          {activeTab === 'payments' && <PaymentsPanel />}

          {/* CRM CUSTOMERS PANEL TAB */}
          {activeTab === 'customers' && <CustomersPanel />}

          {/* COUPONS PANEL TAB */}
          {activeTab === 'coupons' && <CouponsPanel />}

          {/* SYSTEM REPORTING PANEL TAB */}
          {activeTab === 'reports' && <ReportsPanel />}

          {/* CLEARANCE PERMISSIONS PANEL TAB */}
          {activeTab === 'permissions' && <PermissionsPanel />}

          {/* BRAND WEBSITE SETTINGS PANEL TAB */}
          {activeTab === 'settings' && <StoreSettingsPanel />}

          {/* SECURE WALLET LEDGER CONTROL TAB */}
          {activeTab === 'wallet' && <WalletPanel />}

          {/* NOTIFICATION CAMPAIGNS TAB */}
          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-50 dark:border-white/5">
                  <Bell className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">System Campaign Broadcaster</h3>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-4 font-sans">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Notification Header Title</label>
                    <input
                      type="text"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                      placeholder="Ex: Weekly Membership Premium Discount Promo"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Campaign Target Channel</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNotifTarget('all')}
                          className={`h-11 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border ${
                            notifTarget === 'all' 
                              ? 'bg-indigo-600 text-white border-transparent' 
                              : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-transparent hover:bg-gray-100'
                          }`}
                        >
                          All Users
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifTarget('admin')}
                          className={`h-11 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border ${
                            notifTarget === 'admin' 
                              ? 'bg-blue-600 text-white border-transparent' 
                              : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-transparent hover:bg-gray-100'
                          }`}
                        >
                          Admins Only
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Alert Priority</label>
                      <select 
                        value={notifType}
                        onChange={(e) => setNotifType(e.target.value as any)}
                        className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                      >
                        <option value="info">Info (Blue)</option>
                        <option value="success">Success (Emerald)</option>
                        <option value="warning">Warning (Amber)</option>
                        <option value="error">Critical (Red)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Campaign Message Body</label>
                    <textarea
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="w-full h-24 p-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                      placeholder="Enter short promotion or status update update message..."
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={sendingNotif}
                      className="w-full px-6 py-4 bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-gray-100 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center shadow-lg transition-all"
                    >
                      {sendingNotif ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Campaign Dispatch'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-50 dark:border-white/5">
                  <BellRing className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Recent Dispatches</h3>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 max-h-[450px] pr-2 custom-scrollbar">
                  {recentNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                      <Bell className="h-10 w-10 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No recent broadcasts</p>
                    </div>
                  ) : (
                    recentNotifications.map((notif) => (
                      <div key={notif.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{notif.title}</h4>
                            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{notif.message}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20">
                                {notif.target}
                              </span>
                              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                {notif.createdAt ? format(new Date(notif.createdAt), 'MMM d, HH:mm') : 'Just now'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DETAILED SPEC FOR ORDERS VIEW (WOOCOMMERCE INTERFACE) */}
      <AnimatePresence>
        {selectedDetailedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#0d0d0f] rounded-3xl w-full max-w-xl p-6 shadow-2xl relative border border-gray-100 dark:border-white/10"
            >
              <div className="flex justify-between items-start pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
                <div>
                  <span className="text-[9px] bg-blue-50 text-blue-600 font-black px-2 py-0.5 rounded uppercase tracking-widest">Order Specification Record</span>
                  <h4 className="text-xl font-black text-gray-950 dark:text-white mt-1">Order #{selectedDetailedOrder.id.substring(0, 10).toUpperCase()}</h4>
                </div>
                <button 
                  onClick={() => setSelectedDetailedOrder(null)}
                  className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold uppercase tracking-widest"
                >
                  Close Spec
                </button>
              </div>

              {/* Specs parameters lists */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans mb-6">
                <div>
                  <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">GAMER CLIENT NAME</span>
                  <span className="font-extrabold text-gray-900 dark:text-white block mt-0.5">{selectedDetailedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">FF PLAYER UID</span>
                  <span className="font-extrabold text-blue-600 block mt-0.5">{selectedDetailedOrder.userId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">WHATSAPP CONTACT</span>
                  <span className="font-bold text-gray-800 dark:text-gray-300 block mt-0.5">{selectedDetailedOrder.customerPhone}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">SETTLEMENT METHOD</span>
                  <span className="font-bold uppercase text-gray-800 dark:text-gray-300 block mt-0.5">{selectedDetailedOrder.paymentMethod.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">DIAMONDS QUANTITY</span>
                  <span className="font-black text-emerald-500 block mt-0.5">{selectedDetailedOrder.diamonds} Diamonds</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">TOTAL COST</span>
                  <span className="font-black text-gray-900 dark:text-white block mt-0.5">LKR {(selectedDetailedOrder.amount || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons queue */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-2 justify-end">
                {selectedDetailedOrder.status === OrderStatus.PENDING && (
                  <button
                    onClick={() => handleUpdateOrderStatusInline(selectedDetailedOrder.id, OrderStatus.CONFIRMED)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Mark Verified Confirm
                  </button>
                )}
                {selectedDetailedOrder.status !== OrderStatus.COMPLETED && (
                  <button
                    onClick={() => handleUpdateOrderStatusInline(selectedDetailedOrder.id, OrderStatus.COMPLETED)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Mark Process Delivered
                  </button>
                )}
                {selectedDetailedOrder.status !== OrderStatus.CANCELED && (
                  <button
                    onClick={() => handleUpdateOrderStatusInline(selectedDetailedOrder.id, OrderStatus.CANCELED)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-gray-600 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancel Order
                  </button>
                )}
                
                <button
                  onClick={() => handleRefundOrderInline(selectedDetailedOrder.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                >
                  Trigger Refund
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
