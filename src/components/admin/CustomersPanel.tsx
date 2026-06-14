import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDocs } from '../../lib/firestore-compat';
import { PlusCircle, Search, Trash2, Ban, ShieldCheck, Heart, User, Sparkles, MessageCircle, Gamepad2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerProfile {
  id: string;
  customerName: string;
  email: string;
  whatsappNumber: string;
  playerId: string;
  isBanned: boolean;
  totalSpent: number;
  ordersCount: number;
  createdAt: number;
  loyaltyPoints?: number;
  photoURL?: string;
}

export default function CustomersPanel() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<Record<string, { count: number, total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  // Default mock seeds with Sri Lankan gamer contexts
  const defaultSeeds: CustomerProfile[] = [
    { id: 'cust_seed_1', customerName: 'Miyula Senu', email: 'tntsenu2014@gmail.com', whatsappNumber: '+94 77 888 9999', playerId: '21345678', isBanned: false, totalSpent: 24500, ordersCount: 8, createdAt: Date.now() - 600000 },
    { id: 'cust_seed_2', customerName: 'Surangi Silva', email: 'surangi@gmail.com', whatsappNumber: '+94 76 111 2222', playerId: '99128374', isBanned: false, totalSpent: 12450, ordersCount: 4, createdAt: Date.now() - 350000 },
    { id: 'cust_seed_3', customerName: 'Toxic Gamer LKR', email: 'toxicfreefire@gmail.com', whatsappNumber: '+94 71 444 8888', playerId: '44221199', isBanned: true, totalSpent: 0, ordersCount: 0, createdAt: Date.now() - 250000 },
    { id: 'cust_seed_4', customerName: 'Chamod Perera', email: 'chamod.demo@gmail.com', whatsappNumber: '+94 72 000 7777', playerId: '83726154', isBanned: false, totalSpent: 4800, ordersCount: 2, createdAt: Date.now() - 50000 },
  ];

  useEffect(() => {
    setLoading(true);
    try {
      // 1. Fetch real-time orders to compute accurate spending stats on the fly if needed
      const fetchOrdersSummary = async () => {
        try {
          const ordSnap = await getDocs(collection(db, 'orders'));
          const summary: Record<string, { count: number, total: number }> = {};
          ordSnap.forEach(d => {
            const data = d.data();
            const phone = data.customerPhone || '';
            const email = data.email || '';
            const key = phone || email;
            if (key) {
              if (!summary[key]) summary[key] = { count: 0, total: 0 };
              summary[key].count += 1;
              summary[key].total += Number(data.amount || 0);
            }
          });
          setOrdersSummary(summary);
        } catch (err) {
          console.warn("Could not load computed order counts:", err);
        }
      };

      fetchOrdersSummary();

      // 2. Fetch customers list
      const q = query(collection(db, 'customers'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as CustomerProfile));
          setCustomers(fetched.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setCustomers(defaultSeeds);
        }
        setLoading(false);
      }, (err) => {
        console.warn("Customers fallback storage active:", err);
        setCustomers(defaultSeeds);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const handleToggleBan = async (cust: CustomerProfile) => {
    const nextBanValue = !cust.isBanned;
    try {
      await updateDoc(doc(db, 'customers', cust.id), { isBanned: nextBanValue });
      toast.success(nextBanValue ? `Gamer banned successfully 🚫` : `Gamer unbanned successfully ✅`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer's profile? This action is irreversible.")) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
      toast.success("Profile deleted successfully");
    } catch (e) {
      toast.error("Failed to delete user profile");
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.whatsappNumber || '').includes(q) ||
      (c.playerId || '').includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Customer CRM List</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5 font-mono">View gamer profiles, track purchase volumes, and maintain ban lists.</p>
          </div>
          
          <div className="relative max-w-sm w-full font-sans">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, phone, etc..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <span className="text-xs text-gray-400 font-black tracking-wider uppercase">Syncing customers database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* Left table column */}
            <div className="lg:col-span-2 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 dark:bg-white/5 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                  <tr>
                    <th className="px-5 py-4">Gamer Profile</th>
                    <th className="px-5 py-4">Identities</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-right">Activity</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-sans">
                  {filteredCustomers.map((cust) => {
                    const rawSummary = ordersSummary[cust.whatsappNumber] || ordersSummary[cust.email] || {};
                    const dynamicCount = {
                      count: typeof rawSummary.count === 'number' ? rawSummary.count : (typeof cust.ordersCount === 'number' ? cust.ordersCount : 0),
                      total: typeof rawSummary.total === 'number' ? rawSummary.total : (typeof cust.totalSpent === 'number' ? cust.totalSpent : 0)
                    };
                    return (
                      <tr 
                        key={cust.id} 
                        className={`hover:bg-blue-50/20 dark:hover:bg-white/[0.01] transition-all whitespace-nowrap cursor-pointer ${
                          selectedCustomer?.id === cust.id ? 'bg-blue-50/40 dark:bg-blue-500/5 border-l-2 border-l-blue-600' : ''
                        }`}
                        onClick={() => setSelectedCustomer(cust)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-3">
                            {cust.photoURL ? (
                              <img 
                                src={cust.photoURL} 
                                alt="Avatar" 
                                className="h-9 w-9 rounded-xl object-cover ring-2 ring-blue-500/10 shrink-0" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cust.isBanned ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                                <User className="h-4.5 w-4.5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-900 dark:text-white truncate">{cust.customerName}</p>
                              <p className="text-[9px] text-gray-400 font-mono font-bold truncate">{cust.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold flex items-center">
                            <MessageCircle className="h-3 w-3 mr-1 text-green-500 shrink-0" />
                            {cust.whatsappNumber}
                          </p>
                          <p className="text-[9px] text-gray-400 font-black tracking-widest uppercase mt-0.5 flex items-center font-mono">
                            <Gamepad2 className="h-3 w-3 mr-1 text-blue-500 shrink-0" />
                            UID: {cust.playerId || 'N/A'}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            cust.isBanned 
                              ? 'bg-red-50 text-red-600 border-red-150' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-150'
                          }`}>
                            {cust.isBanned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className="text-xs font-black text-gray-900 dark:text-white font-mono">LKR {(dynamicCount.total || 0).toLocaleString()}</p>
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{(dynamicCount.count || 0)} Orders</span>
                            <span className="text-[9px] text-amber-500 font-black uppercase tracking-wider mt-0.5 font-mono">{(cust.loyaltyPoints || 0)} Points</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleBan(cust)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              cust.isBanned 
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-150 hover:bg-emerald-100' 
                                : 'text-red-600 bg-red-50 border-red-150 hover:bg-red-100'
                            }`}
                            title={cust.isBanned ? 'Unban User' : 'Ban User'}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(cust.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Delete gamer profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right details panel column */}
            <div className="bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 text-center flex flex-col justify-between">
              {selectedCustomer ? (
                <div className="space-y-6 text-left">
                  <div className="text-center pb-4 border-b border-gray-100 dark:border-white/5">
                    {selectedCustomer.photoURL ? (
                      <img 
                        src={selectedCustomer.photoURL} 
                        alt="Avatar" 
                        className="h-16 w-16 rounded-3xl object-cover mx-auto mb-3 border-2 border-blue-500/10 shadow-md shadow-gray-200/20 dark:shadow-none" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-3xl flex items-center justify-center text-2xl font-black mx-auto mb-3">
                        {selectedCustomer.customerName.charAt(0)}
                      </div>
                    )}
                    <h4 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{selectedCustomer.customerName}</h4>
                    <span className="text-[10px] text-gray-400 font-mono font-bold">{selectedCustomer.email}</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">WHATSAPP ROUTING</span>
                      <p className="text-xs font-black text-gray-800 dark:text-white mt-1 font-mono">{selectedCustomer.whatsappNumber}</p>
                    </div>

                    <div>
                      <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">FREE FIRE PLAYER UID</span>
                      <p className="text-xs font-black text-blue-600 mt-1 font-mono">{selectedCustomer.playerId || 'No UID Provided'}</p>
                    </div>

                    <div>
                      <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">SYSTEM PRIVILEGE STATUS</span>
                      <p className="text-xs font-black mt-1 uppercase tracking-wider flex items-center">
                        {selectedCustomer.isBanned ? (
                          <span className="text-red-500">🚫 RESTRICTED ACCESS (Banned)</span>
                        ) : (
                          <span className="text-emerald-500">✅ VALID CLIENT (VERIFIED)</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-400 uppercase font-black tracking-widest text-[8px] block">LOYALTY POINTS BALANCE</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-amber-500 font-mono">
                          {selectedCustomer.loyaltyPoints || 0} PTS
                        </span>
                        <button
                          onClick={async () => {
                            const input = prompt("Enter new loyalty points balance:", String(selectedCustomer.loyaltyPoints || 0));
                            if (input === null) return;
                            const newVal = Number(input);
                            if (isNaN(newVal) || newVal < 0) {
                              toast.error("Please enter a valid positive number");
                              return;
                            }
                            try {
                              // Update in customers collection
                              await updateDoc(doc(db, 'customers', selectedCustomer.id), { loyaltyPoints: newVal });
                              
                              // Also try to update relevant user doc in 'users' collection
                              try {
                                await updateDoc(doc(db, 'users', selectedCustomer.id), { loyaltyPoints: newVal });
                              } catch (e) {
                                // Ignore if user doesn't exist under this exact ID
                              }
                              
                              setSelectedCustomer(prev => prev ? { ...prev, loyaltyPoints: newVal } : null);
                              toast.success("Loyalty points updated successfully!");
                            } catch (e) {
                              toast.error("Failed to update points balance");
                            }
                          }}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white transition-all text-[9.5px] font-black uppercase tracking-wider font-sans"
                        >
                          Adjust
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/5 rounded-2xl">
                    <span className="text-[9px] text-gray-400 font-black tracking-wider uppercase block mb-1">CRM NOTE</span>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase italic">
                      Verify Player UID before delivering Diamond packages to prevent wrong credit transactions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="my-auto py-12">
                  <Sparkles className="h-10 w-10 text-blue-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">Inspect Gamer Profile</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto mt-1 uppercase leading-relaxed font-bold">Select a user rows from the left table to trigger deep CRM audit analysis.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
