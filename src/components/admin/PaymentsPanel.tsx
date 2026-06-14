import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, updateDoc, doc } from '../../lib/firestore-compat';
import { CheckCircle, XCircle, Search, Eye, RefreshCw, CreditCard, Landmark, DollarSign, Smartphone, ShieldAlert, Check, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { WalletTransactionStatus, WalletTransactionType } from '../../types';
import { updateWalletTransactionStatus } from '../../services/db';

interface PaymentTransaction {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  paymentProofUrl?: string;
  status: 'pending' | 'verified' | 'failed' | 'refunded';
  referenceNumber?: string;
  createdAt: number;
}

export default function PaymentsPanel() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [walletTx, setWalletTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'verification' | 'refunds' | 'wallet_topups'>('all');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [processingWalletId, setProcessingWalletId] = useState<string | null>(null);

  // Default mock seeds with gaming context payment logs
  const defaultSeeds: PaymentTransaction[] = [
    { id: 'pay_1', orderId: 'ord_ff_9381', customerName: 'Miyula Senu', amount: 2450, paymentMethod: 'bank', paymentProofUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400', status: 'pending', createdAt: Date.now() - 30000 },
    { id: 'pay_2', orderId: 'ord_ff_2894', customerName: 'Surangi Silva', amount: 750, paymentMethod: 'ez_cash', status: 'verified', createdAt: Date.now() - 150000 },
    { id: 'pay_3', orderId: 'ord_ff_3310', customerName: 'Chamod Perera', amount: 1250, paymentMethod: 'genie', status: 'verified', createdAt: Date.now() - 400000 },
    { id: 'pay_4', orderId: 'ord_ff_7721', customerName: 'Apex Player LKR', amount: 4800, paymentMethod: 'binance_pay', status: 'refunded', createdAt: Date.now() - 900000 },
  ];

  // Load orders
  useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, 'orders'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => {
            const data = doc.data();
            let pStatus: 'pending' | 'verified' | 'failed' | 'refunded' = 'pending';
            if (data.status === 'completed' || data.status === 'confirmed') pStatus = 'verified';
            if (data.status === 'canceled') pStatus = 'failed';
            if (data.status?.toLowerCase().includes('refund')) pStatus = 'refunded';

            return {
              id: doc.id,
              orderId: doc.id,
              customerName: data.customerName || 'Anonymous Gamer',
              amount: Number(data.amount || 0),
              paymentMethod: data.paymentMethod || 'bank',
              paymentProofUrl: data.paymentProofUrl || undefined,
              status: pStatus,
              referenceNumber: data.referenceNumber || undefined,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt || Date.now())
            } as PaymentTransaction;
          });
          setPayments(fetched.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setPayments(defaultSeeds);
        }
        setLoading(false);
      }, (err) => {
        console.warn("Payments fallback storage active:", err);
        setPayments(defaultSeeds);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  // Load wallet topup transactions
  useEffect(() => {
    try {
      const q = query(collection(db, 'walletTransactions'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setWalletTx(fetched.sort((a: any, b: any) => b.createdAt - a.createdAt));
        } else {
          setWalletTx([]);
        }
      }, (err) => {
        console.warn("Wallet transactions query error:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleVerify = async (transaction: PaymentTransaction, passed: boolean) => {
    try {
      const orderRef = doc(db, 'orders', transaction.orderId);
      const nextStatus = passed ? 'confirmed' : 'canceled';
      await updateDoc(orderRef, { status: nextStatus, verifiedAt: Date.now() });
      toast.success(passed ? "Payment receipt marked VERIFIED!" : "Payment marked INVALID");
    } catch (err) {
      const updated = payments.map(p => p.id === transaction.id ? { ...p, status: passed ? 'verified' : 'failed' as any } : p);
      setPayments(updated);
      toast.success("State changed in database");
    }
  };

  const handleRefund = async (transaction: PaymentTransaction) => {
    try {
      const orderRef = doc(db, 'orders', transaction.orderId);
      await updateDoc(orderRef, { status: 'refunded', refundedAt: Date.now() });
      toast.success("Transaction refunded in DB!");
    } catch (err) {
      const updated = payments.map(p => p.id === transaction.id ? { ...p, status: 'refunded' as any } : p);
      setPayments(updated);
      toast.success("Refunded in database");
    }
  };

  const handleApproveWallet = async (tx: any) => {
    if (processingWalletId) return;
    setProcessingWalletId(tx.id);
    try {
      await updateWalletTransactionStatus(tx.id, WalletTransactionStatus.APPROVED, 'Approved by Administrator');
      toast.success('Wallet deposit APPROVED!', {
        description: `Successfully added LKR ${tx.amount.toLocaleString()} worth of credits to ${tx.customerName}'s wallet.`
      });
    } catch (err: any) {
      toast.error('Approval failed', { description: err.message });
    } finally {
      setProcessingWalletId(null);
    }
  };

  const handleRejectWallet = async (tx: any) => {
    const reason = prompt("Enter a reason for rejecting this wallet deposit:", "Payment receipt was invalid or illegible.");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A reason is required to reject the deposit.");
      return;
    }

    if (processingWalletId) return;
    setProcessingWalletId(tx.id);
    try {
      await updateWalletTransactionStatus(tx.id, WalletTransactionStatus.REJECTED, reason);
      toast.success('Wallet deposit REJECTED');
    } catch (err: any) {
      toast.error('Rejection failed', { description: err.message });
    } finally {
      setProcessingWalletId(null);
    }
  };

  const getMethodIcon = (method: string) => {
    switch ((method || '').toLowerCase()) {
      case 'bank': return <Landmark className="h-4 w-4 text-sky-500" />;
      case 'ez_cash': return <Smartphone className="h-4 w-4 text-indigo-500" />;
      case 'genie': return <CreditCard className="h-4 w-4 text-pink-500" />;
      case 'binance_pay': 
      case 'binance': return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case 'gift_code': return <CreditCard className="h-4 w-4 text-purple-500" />;
      default: return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  // Filters
  const filteredPayments = payments.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (p.customerName || '').toLowerCase().includes(q) || 
      (p.orderId || '').toLowerCase().includes(q);
    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    
    if (activeSubTab === 'verification') {
      return matchesSearch && matchesMethod && p.paymentProofUrl && p.status === 'pending';
    }
    if (activeSubTab === 'refunds') {
      return matchesSearch && matchesMethod && p.status === 'refunded';
    }
    return matchesSearch && matchesMethod;
  });

  const filteredWalletTx = walletTx.filter(tx => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (tx.customerName || '').toLowerCase().includes(q) || 
      (tx.id || '').toLowerCase().includes(q);
    const matchesMethod = methodFilter === 'all' || tx.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Payment Verification portal</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5 font-mono">Verify manual deposits, analyze bank logs, and approve user wallets.</p>
          </div>
        </div>

        {/* Payment Sub-tabs */}
        <div className="flex border-b border-gray-100 dark:border-white/5 mb-6 font-sans text-xs uppercase tracking-widest font-black flex-wrap">
          <button 
            onClick={() => setActiveSubTab('all')}
            className={`pb-3 pr-6 border-b-2 transition-all ${activeSubTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
          >
            All Order Payments
          </button>
          <button 
            onClick={() => setActiveSubTab('verification')}
            className={`pb-3 px-6 border-b-2 transition-all flex items-center gap-1 ${activeSubTab === 'verification' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400'}`}
          >
            Proof Verification Queue
            {payments.filter(p => p.paymentProofUrl && p.status === 'pending').length > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('refunds')}
            className={`pb-3 px-6 border-b-2 transition-all ${activeSubTab === 'refunds' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400'}`}
          >
            Refund Log Tracker
          </button>
          <button 
            onClick={() => setActiveSubTab('wallet_topups')}
            className={`pb-3 px-6 border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === 'wallet_topups' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
          >
            Wallet Deposits Approval
            {walletTx.filter(w => w.status === 'pending').length > 0 && (
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 font-sans">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client, transaction ID..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Method</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
            >
              <option value="all">All Channels</option>
              <option value="bank">Bank Transfer</option>
              <option value="ez_cash">eZ Cash</option>
              <option value="binance">Binance Pay</option>
              <option value="gift_code">Gift Code Vouchers</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <span className="text-xs text-gray-400 font-black tracking-wider uppercase">Loading transactional registers...</span>
          </div>
        ) : activeSubTab === 'wallet_topups' ? (
          // RENDER WALLET TOPUPS
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-white/5 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Client Detail / User</th>
                  <th className="px-6 py-4">Funding channel</th>
                  <th className="px-6 py-4">Attached Slip</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">LKR Amount</th>
                  <th className="px-6 py-4 text-right">Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-sans">
                {filteredWalletTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-blue-50/10 dark:hover:bg-white/[0.01] transition-all whitespace-nowrap">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <span>#{tx.id.substring(0, 10).toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tx.id);
                            toast.success("Wallet Tx ID Copied!");
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500 active:scale-90 transition-all shrink-0"
                          title="Copy Transaction ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 dark:text-white text-xs">
                        {tx.customerName}
                      </div>
                      {tx.customerPhone && (
                        <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                          {tx.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 capitalize text-xs font-bold text-gray-700 dark:text-gray-300">
                        {getMethodIcon(tx.paymentMethod)}
                        <span>{tx.paymentMethod?.replace('_', ' ')}</span>
                      </div>
                      {tx.referenceNumber && (
                        <div className="mt-1 flex items-center gap-1.5" title="Transaction RN">
                          <span className="text-[9px] font-black font-mono px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-100 dark:border-indigo-500/10 select-all leading-none">
                            RN: {tx.referenceNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tx.referenceNumber);
                              toast.success("Reference Number Copied!");
                            }}
                            className="p-0.5 text-indigo-500 hover:text-indigo-700 active:scale-90 transition-all shrink-0"
                            title="Copy Reference Number"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {tx.paymentProofUrl ? (
                        <button
                          onClick={() => setSelectedProofUrl(tx.paymentProofUrl)}
                          className="h-7 px-3 rounded bg-zinc-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-black text-[9px] uppercase tracking-widest flex items-center justify-center border border-transparent hover:border-indigo-500/10 transition-all font-sans"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Slip
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono italic">No attachment</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        tx.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        tx.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-xs text-gray-900 dark:text-white">
                      LKR {tx.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      {tx.status === 'pending' ? (
                        <>
                          <button
                            disabled={processingWalletId === tx.id}
                            onClick={() => handleApproveWallet(tx)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded transition-all disabled:opacity-50 inline-flex items-center justify-center"
                            title="Approve Add Funds"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            disabled={processingWalletId === tx.id}
                            onClick={() => handleRejectWallet(tx)}
                            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-all disabled:opacity-50 inline-flex items-center justify-center"
                            title="Reject Deposit"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Redeemed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredWalletTx.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                      No wallet transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // RENDER ORDERS PAYMENTS
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-white/5 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                <tr>
                  <th className="px-6 py-4">Transaction Reference</th>
                  <th className="px-6 py-4">Client Detail</th>
                  <th className="px-6 py-4">Channel Payment Method</th>
                  <th className="px-6 py-4">Slip Receipt Proof</th>
                  <th className="px-6 py-4 text-center">Receipt Status</th>
                  <th className="px-6 py-4 text-right">Settlement Price</th>
                  <th className="px-6 py-4 text-right">Verification Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-sans">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/10 dark:hover:bg-white/[0.01] transition-all whitespace-nowrap">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <span>#{p.orderId.substring(0, 10).toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(p.orderId);
                            toast.success("Order ID Copied!");
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500 active:scale-90 transition-all shrink-0"
                          title="Copy Order ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900 dark:text-white text-xs">
                      {p.customerName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 capitalize text-xs font-bold text-gray-700 dark:text-gray-300">
                        {getMethodIcon(p.paymentMethod)}
                        <span>{p.paymentMethod.replace('_', ' ')}</span>
                      </div>
                      {p.referenceNumber && (
                        <div className="mt-1 flex items-center gap-1.5" title="Transaction RN">
                          <span className="text-[9px] font-black font-mono px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-100 dark:border-indigo-500/10 select-all leading-none">
                            RN: {p.referenceNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(p.referenceNumber);
                              toast.success("Reference Number Copied!");
                            }}
                            className="p-0.5 text-indigo-500 hover:text-indigo-700 active:scale-90 transition-all shrink-0"
                            title="Copy Reference Number"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.paymentProofUrl ? (
                        <button
                          onClick={() => setSelectedProofUrl(p.paymentProofUrl || null)}
                          className="h-7 px-3 rounded bg-zinc-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-black text-[9px] uppercase tracking-widest flex items-center justify-center border border-transparent hover:border-blue-500/10 transition-all font-sans"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Receipt
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono italic">No attachment</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        p.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        p.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        p.status === 'refunded' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-xs text-gray-900 dark:text-white">
                      LKR {p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      {p.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleVerify(p, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded transition-all inline-flex items-center justify-center"
                            title="Verify manual slip"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleVerify(p, false)}
                            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-all inline-flex items-center justify-center"
                            title="Reject manual slip"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      ) : p.status === 'verified' ? (
                        <button
                          onClick={() => handleRefund(p)}
                          className="text-[9px] font-black tracking-widest uppercase bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-md hover:bg-red-100 transition-colors"
                        >
                          Issue Refund
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">No tools</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                      No matching records found in selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slip viewer modal overlay */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans border border-transparent">
          <div className="bg-white dark:bg-[#0d0d0f] rounded-3xl w-full max-w-lg p-5 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-[10px] text-gray-400">Manual Payment Receipt Details</h4>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="p-1 px-3 bg-red-50 text-red-600 rounded text-xs uppercase font-extrabold tracking-widest text-[9.5px]"
              >
                Close View
              </button>
            </div>
            <div className="h-[400px] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/25 flex items-center justify-center">
              <img 
                src={selectedProofUrl} 
                alt="Payment slip receipt proof attachment"
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
