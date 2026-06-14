import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Coins, 
  Search, 
  Check, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Plus, 
  Minus,
  MessageSquare,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs, where } from '../../lib/firestore-compat';
import { WalletTransaction, WalletTransactionType, WalletTransactionStatus } from '../../types';
import { updateWalletTransactionStatus, manuallyAdjustWallet, mapDocData } from '../../services/db';
import { toast } from 'sonner';

interface CustomerProfile {
  id: string;
  customerName: string;
  email: string;
  whatsappNumber: string;
  loyaltyPoints: number;
}

export default function WalletPanel() {
  const [requests, setRequests] = useState<WalletTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  // Modal / Interaction states
  const [activeTab, setActiveTab] = useState<'requests' | 'balances'>('requests');
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  
  // Manual adjust state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustAction, setAdjustAction] = useState<'add' | 'deduct'>('add');

  // Reject dialog state
  const [rejectingTx, setRejectingTx] = useState<WalletTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Loading request action State
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  // Listen to all wallet transactions in real-time
  useEffect(() => {
    setLoadingRequests(true);
    const q = query(
      collection(db, 'walletTransactions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => mapDocData<WalletTransaction>(doc));
      setRequests(txs);
      setLoadingRequests(false);
    }, (err) => {
      console.error("Wallet transactions snapshot error:", err);
      setLoadingRequests(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch/sync customers list
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const list = snap.docs.map(doc => {
        const data = doc.data();
        let points = Number(data.loyaltyPoints) || 0;
        return {
          id: doc.id,
          customerName: data.customerName || 'Gamer',
          email: data.email || '',
          whatsappNumber: data.whatsappNumber || '',
          loyaltyPoints: points
        } as CustomerProfile;
      });
      // Sort by balance descending
      setCustomers(list.sort((a, b) => b.loyaltyPoints - a.loyaltyPoints));
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchCustomers();
    }
  }, [activeTab]);

  const handleApprove = async (tx: WalletTransaction) => {
    if (processingTxId) return;
    setProcessingTxId(tx.id);
    try {
      await updateWalletTransactionStatus(tx.id, WalletTransactionStatus.APPROVED, 'Approved by Administrator');
      toast.success('Request Approved', {
        description: `Successfully added Rs. ${(tx.type === WalletTransactionType.MANUAL ? tx.amount * 0.000002 : tx.amount).toLocaleString()} to ${tx.customerName}'s wallet.`
      });
    } catch (err: any) {
      toast.error('Approval failed', { description: err.message });
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleOpenReject = (tx: WalletTransaction) => {
    setRejectingTx(tx);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingTx) return;
    if (!rejectReason.trim()) {
      toast.error('Reason required', { description: 'Please enter a rejection reason for the client.' });
      return;
    }

    setIsRejecting(true);
    try {
      await updateWalletTransactionStatus(rejectingTx.id, WalletTransactionStatus.REJECTED, rejectReason);
      toast.success('Request Rejected', {
        description: `Rejected Rs. ${rejectingTx.amount.toLocaleString()} top-up for ${rejectingTx.customerName}.`
      });
      setRejectingTx(null);
    } catch (err: any) {
      toast.error('Rejection failed', { description: err.message });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    const value = parseFloat(adjustAmount);
    if (isNaN(value) || value <= 0) {
      toast.error('Invalid amount', { description: 'Please enter a valid amount greater than 0.' });
      return;
    }

    const pointsValue = value / 0.000002;
    const finalAmount = adjustAction === 'add' ? pointsValue : -pointsValue;
    if (adjustAction === 'deduct' && selectedCustomer.loyaltyPoints < pointsValue) {
      toast.error('Deduction too high', {
        description: `${selectedCustomer.customerName} only has Rs. ${(selectedCustomer.loyaltyPoints * 0.000002).toLocaleString()} balance.`
      });
      return;
    }

    setIsAdjusting(true);
    try {
      await manuallyAdjustWallet(selectedCustomer.id, finalAmount, adjustReason || `Admin manual adjustment`);
      toast.success('Wallet updated!', {
        description: `Successfully ${adjustAction === 'add' ? 'added' : 'deducted'} LKR ${value.toLocaleString()} to customer's wallet.`
      });
      
      // Reset form & reload customer data
      setSelectedCustomer(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchCustomers();
    } catch (err: any) {
      toast.error('Adjustment failed', { description: err.message });
    } finally {
      setIsAdjusting(false);
    }
  };

  // Filters
  const filteredRequests = requests.filter(r => {
    if (requestFilter !== 'all' && r.status !== requestFilter) return false;
    
    const term = searchQuery.toLowerCase();
    return (
      r.customerName.toLowerCase().includes(term) ||
      r.customerPhone.includes(term) ||
      r.amount.toString().includes(term)
    );
  });

  const filteredCustomers = customers.filter(c => {
    const term = searchQuery.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.whatsappNumber.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-white/5 pb-px">
        <button
          onClick={() => { setActiveTab('requests'); setSearchQuery(''); }}
          className={`px-5 py-3 text-xs font-black uppercase tracking-widest relative transition-colors ${
            activeTab === 'requests'
              ? 'text-blue-600 dark:text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Top-up Requests ({requests.filter(r => r.status === 'pending').length} Pending)
        </button>
        <button
          onClick={() => { setActiveTab('balances'); setSearchQuery(''); }}
          className={`px-5 py-3 text-xs font-black uppercase tracking-widest relative transition-colors ${
            activeTab === 'balances'
              ? 'text-blue-600 dark:text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Customer Balances & adjustments
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5">
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder={activeTab === 'requests' ? "Search requests..." : "Search customers..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 outline-none font-bold text-xs text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>

        {activeTab === 'requests' && (
          <div className="flex bg-white dark:bg-[#141416] p-1.5 rounded-xl border border-gray-100 dark:border-white/5 select-none shrink-0">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setRequestFilter(status as any)}
                className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  requestFilter === status
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RENDER REQUESTS ACTIVE TAB */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-[#0d0d0f] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
          {loadingRequests ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 text-gray-400 uppercase font-bold tracking-widest text-xs">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span>Fetching ledger transactions...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-20 text-center space-y-4 text-gray-400">
              <Coins className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-750" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">No requests found</h4>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                  No top-up requests match the current status filter.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-bold font-sans">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 text-[9px] uppercase tracking-widest text-gray-400 select-none">
                    <th className="py-4 px-6 font-black">Customer Details</th>
                    <th className="py-4 px-4 font-black">Requested Amount</th>
                    <th className="py-4 px-4 font-black">Channel</th>
                    <th className="py-4 px-4 font-black">Status</th>
                    <th className="py-4 px-4 font-black">Proof</th>
                    <th className="py-4 px-6 text-right font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredRequests.map((tx) => {
                    const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '';

                    return (
                      <tr 
                        key={tx.id} 
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="py-4 px-6">
                          <p className="text-gray-900 dark:text-white font-extrabold text-sm">{tx.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{tx.customerPhone || 'No Phone'} • {date}</p>
                        </td>
                        <td className="py-4 px-4 font-mono font-extrabold text-gray-900 dark:text-white text-sm">
                          LKR {tx.type === WalletTransactionType.MANUAL ? (tx.amount * 0.000002).toLocaleString() : tx.amount.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 uppercase font-mono text-[10px] text-gray-500 dark:text-gray-400">
                          {tx.paymentMethod || 'manual'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            tx.status === WalletTransactionStatus.APPROVED 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : tx.status === WalletTransactionStatus.PENDING
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            {tx.status === WalletTransactionStatus.PENDING && <Clock className="w-2.5 h-2.5 shrink-0" />}
                            {tx.status === WalletTransactionStatus.APPROVED && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                            {tx.status === WalletTransactionStatus.REJECTED && <XCircle className="w-2.5 h-2.5 shrink-0" />}
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {tx.paymentProofUrl ? (
                            <button
                              onClick={() => setViewingProofUrl(tx.paymentProofUrl || null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-blue-500 rounded-lg text-[9px] uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 font-normal uppercase text-[9px] tracking-wider">No Screenshot</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            {tx.status === WalletTransactionStatus.PENDING && (
                              <>
                                <button
                                  onClick={() => handleApprove(tx)}
                                  disabled={processingTxId !== null}
                                  className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-md shadow-emerald-500/10"
                                >
                                  {processingTxId === tx.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleOpenReject(tx)}
                                  disabled={processingTxId !== null}
                                  className="h-8 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-md shadow-red-500/10"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            
                            {tx.status !== WalletTransactionStatus.PENDING && tx.adminNotes && (
                              <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={tx.adminNotes}>
                                <MessageSquare className="w-3 h-3 shrink-0" />
                                <span className="truncate">{tx.adminNotes}</span>
                              </div>
                            )}
                            
                            {tx.status !== WalletTransactionStatus.PENDING && !tx.adminNotes && (
                              <span className="text-gray-400 text-[10px] uppercase tracking-widest font-mono">Completed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RENDER BALANCES ACTIVE TAB */}
      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Customers list */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0d0d0f] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
            {loadingCustomers ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-4 text-gray-400 uppercase font-bold tracking-widest text-xs">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span>Syncing customers...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-20 text-center space-y-4 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto text-gray-350 dark:text-gray-700" />
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">No Customers Found</h4>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-bold font-sans">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 text-[9px] uppercase tracking-widest text-gray-400 select-none">
                      <th className="py-4 px-6 font-black">Customer</th>
                      <th className="py-4 px-4 font-black">Wallet Balance</th>
                      <th className="py-4 px-6 text-right font-black">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredCustomers.map((cust) => (
                      <tr 
                        key={cust.id} 
                        className={`hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors ${
                          selectedCustomer?.id === cust.id ? 'bg-blue-500/5 dark:bg-blue-500/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6">
                          <p className="text-gray-900 dark:text-white font-extrabold text-sm">{cust.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{cust.email || 'No email'} • {cust.whatsappNumber || 'No phone'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-mono font-extrabold text-sm text-gray-900 dark:text-white">
                            LKR {(cust.loyaltyPoints * 0.000002).toLocaleString()}
                          </p>
                          <p className="text-[9px] text-emerald-600 uppercase font-mono tracking-widest mt-0.5">{cust.loyaltyPoints.toLocaleString()} points</p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="h-8 px-4 border border-gray-100 dark:border-white/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Adjust Balance
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel: Adjustment panel */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0d0d0f] p-8 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
            <div className="flex items-center gap-3.5 border-b border-gray-100 dark:border-white/5 pb-4">
              <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-600">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Manual Adjustments</h3>
            </div>

            {selectedCustomer ? (
              <form onSubmit={handleManualAdjust} className="space-y-5 animate-in fade-in duration-300">
                <div className="bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/5 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Target customer</p>
                  <p className="text-gray-900 dark:text-white font-extrabold text-base">{selectedCustomer.customerName}</p>
                  <div className="flex justify-between items-center text-[11px] font-bold text-gray-500">
                    <span>Current balance:</span>
                    <div className="text-right">
                      <span className="block font-mono text-gray-950 dark:text-white font-black text-sm">LKR {(selectedCustomer.loyaltyPoints * 0.000002).toLocaleString()}</span>
                      <span className="block text-[9px] text-emerald-600 mt-0.5 uppercase tracking-widest">{selectedCustomer.loyaltyPoints.toLocaleString()} PTS</span>
                    </div>
                  </div>
                </div>

                {/* Acton Choice */}
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-0.5">
                    Select adjustment Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustAction('add')}
                      className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                        adjustAction === 'add'
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600'
                          : 'border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 hover:bg-gray-100/50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Funds</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustAction('deduct')}
                      className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                        adjustAction === 'deduct'
                          ? 'border-red-500 bg-red-500/5 text-red-600'
                          : 'border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 hover:bg-gray-100/50'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Deduct Funds</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-0.5">
                    Amount (LKR)
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      Rs.
                    </div>
                    <input
                      type="number"
                      required
                      min="1"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white outline-none font-bold text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Reason Notes */}
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-0.5">
                    Admin Reason Note (Sent to client)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Enter reason for manual adjustment (e.g., compensation, correction, refund, etc.)"
                    className="w-full p-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white outline-none font-bold text-xs text-gray-900 dark:text-white"
                  />
                </div>

                {/* Submit */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-150 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-white primary-gradient hover:opacity-95 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {isAdjusting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Adjust Balance</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6 space-y-3.5 text-gray-400 bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-100 dark:border-white/5">
                <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-750" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-250">No customer selected</h4>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                    Select a customer from the available list to make a manual fund adjustment.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* LIGHTBOX / SCREENSHOT PREVIEW MODAL */}
      <AnimatePresence>
        {viewingProofUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl w-full h-[85vh] bg-[#0d0d0f] rounded-2xl border border-white/5 overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center px-6 py-4 bg-white/[0.02] border-b border-white/5 select-none shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">inspecting proof receipt download</span>
                <button
                  onClick={() => setViewingProofUrl(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-6 flex items-center justify-center bg-black overflow-y-auto">
                <img src={viewingProofUrl} alt="Inspection payload" className="max-h-full max-w-full object-contain" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REJECT FORM MODAL */}
      <AnimatePresence>
        {rejectingTx && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-md w-full bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-2xl space-y-5"
            >
              <div>
                <h3 className="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white">Reject Top-up Request?</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  Customer {rejectingTx.customerName} for LKR {rejectingTx.amount.toLocaleString()}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-450 uppercase tracking-widest mb-2 select-none">
                    Reason for rejection (Sent to customer)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide clear reasons (e.g. Screenshot blurry, Bank transaction record not found under that ID, eZ cash code invalid, etc.)"
                    className="w-full p-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-red-500 focus:bg-white outline-none font-bold text-xs text-gray-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingTx(null)}
                    disabled={isRejecting}
                    className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-150 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmReject}
                    disabled={isRejecting}
                    className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 hover:opacity-95 shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {isRejecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>Confirm Reject</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
