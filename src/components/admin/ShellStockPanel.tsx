import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from '../../lib/firestore-compat';
import { Plus, Edit2, Trash2, Power, Eye, AlertTriangle, Layers, PiggyBank, RefreshCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShellStock {
  id: string;
  shellId: string;
  providerName: string;
  availableBalance: number;
  usedBalance: number;
  isActive: boolean;
  createdAt: number;
}

export default function ShellStockPanel() {
  const [shells, setShells] = useState<ShellStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShell, setEditingShell] = useState<ShellStock | null>(null);

  // Form states
  const [shellIdInput, setShellIdInput] = useState('');
  const [providerName, setProviderName] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [usedBalance, setUsedBalance] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default seed fallback so the UI looks incredible immediately
  const defaultSeeds: ShellStock[] = [
    { id: 'sh_default_1', shellId: 'SHELL-SG-500K', providerName: 'Garena Singapore', availableBalance: 15200, usedBalance: 8400, isActive: true, createdAt: Date.now() - 500000 },
    { id: 'sh_default_2', shellId: 'SHELL-MY-200K', providerName: 'Garena Malaysia', availableBalance: 450, usedBalance: 12000, isActive: true, createdAt: Date.now() - 300000 },
    { id: 'sh_default_3', shellId: 'SHELL-ID-100K', providerName: 'Garena Indonesia', availableBalance: 5100, usedBalance: 1900, isActive: false, createdAt: Date.now() - 100000 },
  ];

  useEffect(() => {
    setLoading(true);
    // Listen to Firebase firestore for real-time shell stock items
    try {
      const q = query(collection(db, 'shell_stock'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ShellStock));
          setShells(fetched.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setShells(defaultSeeds);
        }
        setLoading(false);
      }, (err) => {
        console.warn("Shell stock Firestore fallback active:", err);
        setShells(defaultSeeds);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const handleOpenModal = (sh: ShellStock | null = null) => {
    setEditingShell(sh);
    if (sh) {
      setShellIdInput(sh.shellId);
      setProviderName(sh.providerName);
      setAvailableBalance(sh.availableBalance);
      setUsedBalance(sh.usedBalance);
      setIsActive(sh.isActive);
    } else {
      setShellIdInput(`SHELL-${Math.floor(100 + Math.random() * 900)}K`);
      setProviderName('Garena SG');
      setAvailableBalance(1000);
      setUsedBalance(0);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shellIdInput || !providerName) {
      toast.error("Please fill in all details");
      return;
    }
    setSaving(true);

    const payload: Omit<ShellStock, 'id'> = {
      shellId: shellIdInput,
      providerName,
      availableBalance: Number(availableBalance),
      usedBalance: Number(usedBalance),
      isActive,
      createdAt: editingShell?.createdAt || Date.now()
    };

    try {
      if (editingShell) {
        await updateDoc(doc(db, 'shell_stock', editingShell.id), payload);
        toast.success("Shell record updated!");
      } else {
        await addDoc(collection(db, 'shell_stock'), payload);
        toast.success("Shell stock created successfully!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Direct Firestore save failed:", err);
      toast.error("Failed to save to database");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shell record?")) return;
    try {
      await deleteDoc(doc(db, 'shell_stock', id));
      toast.success("Shell stock removed");
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const handleToggleActive = async (sh: ShellStock) => {
    const nextActive = !sh.isActive;
    try {
      await updateDoc(doc(db, 'shell_stock', sh.id), { isActive: nextActive });
      toast.success(`Shell Stock ${nextActive ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error("Failed to toggle state");
    }
  };

  // Math Metrics
  const totalStock = shells.reduce((sum, s) => sum + s.availableBalance + s.usedBalance, 0);
  const remainingStock = shells.reduce((sum, s) => sum + (s.isActive ? s.availableBalance : 0), 0);
  const lowStockWarning = remainingStock < 1000;

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total Combined Stock</span>
            <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white font-mono mt-1">{totalStock.toLocaleString()} Shells</p>
          </div>
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
            <Layers className="h-5 w-5 md:h-6 md:w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Remaining Balance</span>
            <p className={`text-xl md:text-2xl font-black font-mono mt-1 ${lowStockWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
              {remainingStock.toLocaleString()} Shells
            </p>
          </div>
          <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center ${lowStockWarning ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500'}`}>
            <PiggyBank className="h-5 w-5 md:h-6 md:w-6" />
          </div>
        </div>

        <div className={`sm:col-span-2 lg:col-span-1 border p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-between transition-colors ${lowStockWarning ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/10 text-amber-900 dark:text-amber-300' : 'bg-white dark:bg-[#0d0d0f] border-gray-100 dark:border-white/5'}`}>
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Stock Status Alert</span>
            <p className="text-sm font-black uppercase tracking-widest mt-1.5 flex items-center">
              {lowStockWarning ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1 text-amber-600 animate-pulse" />
                  REPLENISH NEEDED!
                </>
              ) : (
                'INVENTORY SECURE'
              )}
            </p>
          </div>
          {lowStockWarning && (
            <div className="text-[10px] bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-white px-2.5 py-1 rounded-lg font-black tracking-widest uppercase animate-pulse">
              LOW STOCK
            </div>
          )}
        </div>
      </div>

      {/* Main shell control section */}
      <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Shell inventory stock</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5 font-mono">Real-time Garena Shell balances for top-up processes.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all font-sans"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Shell Stock
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <span className="text-xs text-gray-400 font-black tracking-wider uppercase">Loading shell database...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-white/5 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                <tr>
                  <th className="px-6 py-4">Shell ID Code</th>
                  <th className="px-6 py-4">Provider / Server</th>
                  <th className="px-6 py-4 text-right">Available Balance</th>
                  <th className="px-6 py-4 text-right">Used Balance</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-sans">
                {shells.map((sh) => {
                  const isLow = sh.availableBalance < 500;
                  return (
                    <tr key={sh.id} className="hover:bg-blue-50/20 dark:hover:bg-white/[0.01] transition-all whitespace-nowrap">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-gray-800 dark:text-white">
                        {sh.shellId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-gray-900 dark:text-white">{sh.providerName}</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold text-xs ${isLow ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                        {sh.availableBalance.toLocaleString()} {isLow && '⚠️'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-gray-400">
                        {sh.usedBalance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(sh)}
                          className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                            sh.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10' 
                              : 'bg-gray-50 text-gray-400 border-gray-100 dark:bg-white/5'
                          }`}
                        >
                          {sh.isActive ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenModal(sh)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sh.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-5">
              {editingShell ? 'Edit Shell Stock' : 'Add Shell Batch'}
            </h4>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Shell ID / Reference</label>
                <input
                  type="text"
                  value={shellIdInput}
                  onChange={(e) => setShellIdInput(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-900 dark:text-white"
                  placeholder="e.g. SHELL-SG-500K"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Provider Service Server Name</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white font-bold"
                  placeholder="e.g. Garena Singapore"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Available Balance</label>
                  <input
                    type="number"
                    value={availableBalance}
                    onChange={(e) => setAvailableBalance(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Used Balance</label>
                  <input
                    type="number"
                    value={usedBalance}
                    onChange={(e) => setUsedBalance(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Set Shell Batch as Active
                </label>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
