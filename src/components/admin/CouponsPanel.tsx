import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query } from '../../lib/firestore-compat';
import { Plus, Trash2, Ticket, Check, Calendar, PlusCircle, Loader2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GiftCode {
  id: string;
  code: string;
  amount: number;
  isRedeemed: boolean;
  redeemedBy?: string | null;
  redeemedByName?: string | null;
  redeemedAt?: number | null;
  createdAt: number;
}

export default function CouponsPanel() {
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>('500');
  const [manualCode, setManualCode] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Standard random gift code generator pattern: XENON-XXXX-XXXX-XXXX-XXXX
  const generateRandomGiftCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `XENON-${segment()}-${segment()}-${segment()}-${segment()}`;
  };

  const handleOpenCreateModal = () => {
    setManualCode(generateRandomGiftCode());
    setIsModalOpen(true);
  };

  useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, 'giftCodes'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as GiftCode));
        setGiftCodes(fetched.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      }, (err) => {
        console.warn("GiftCodes stream error fallback:", err);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast.error("Please provide a valid LKR amount");
      return;
    }

    let finalCode = manualCode.toUpperCase().trim();
    if (!finalCode) {
      finalCode = generateRandomGiftCode();
    }

    if (!finalCode.startsWith('XENON-')) {
      toast.error("Gift codes must start with 'XENON-'");
      return;
    }

    setSaving(true);

    const payload: Omit<GiftCode, 'id'> = {
      code: finalCode,
      amount: finalAmount,
      isRedeemed: false,
      redeemedBy: null,
      redeemedByName: null,
      redeemedAt: null,
      createdAt: Date.now()
    };

    try {
      // Check if code already exists in our active list
      const codeExists = giftCodes.some(gc => gc.code === finalCode);
      if (codeExists) {
        toast.error("This gift code already exists in the system.");
        setSaving(false);
        return;
      }

      await addDoc(collection(db, 'giftCodes'), payload);
      toast.success("Gift code successfully created!");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Firestore gift code save failed:", err);
      toast.error("Failed to add gift code to database");
    } finally {
      setSaving(false);
      setManualCode('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gift code?")) return;
    try {
      await deleteDoc(doc(db, 'giftCodes', id));
      toast.success("Gift code deleted successfully");
    } catch (e) {
      toast.error("Failed to delete gift code");
    }
  };

  const handleCopy = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Gift Code (Vouchers) Engine</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5 font-mono">Create top-up wallet vouchers for bank transfer players on WhatsApp.</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all shadow-md font-sans"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Create Gift Code
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <span className="text-xs text-gray-400 font-black tracking-wider uppercase">Querying active codes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
            {giftCodes.map((gc) => (
              <div 
                key={gc.id}
                className={`border border-dashed rounded-[2rem] p-5 relative overflow-hidden group transition-all ${
                  gc.isRedeemed 
                    ? 'border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/[0.01] opacity-75' 
                    : 'border-blue-500/30 bg-blue-50/10 dark:bg-blue-500/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${gc.isRedeemed ? 'bg-gray-100 text-gray-400 dark:bg-white/5' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10'}`}>
                    <Ticket className="h-4 w-4" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-wider transition-all ${
                      gc.isRedeemed
                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {gc.isRedeemed ? 'Redeemed' : 'Ready'}
                    </span>
                    <button
                      onClick={() => handleDelete(gc.id)}
                      className="p-1 px-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded"
                      title="Delete code"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-md font-black text-gray-900 dark:text-white font-mono uppercase tracking-wide break-all">
                      {gc.code}
                    </span>
                    <button
                      onClick={() => handleCopy(gc.code, gc.id)}
                      className="p-1 shrink-0 text-gray-400 hover:text-blue-500 rounded bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                      title="Copy code to clipboard"
                    >
                      {copiedCodeId === gc.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="text-md font-black text-blue-600 dark:text-blue-400">
                    LKR {gc.amount.toLocaleString()} Wallet Cash
                  </p>
                </div>

                <div className="border-t border-dashed border-gray-200 dark:border-white/10 mt-4 pt-4 text-[10px] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 uppercase font-bold tracking-widest text-[8px]">GENERATED ON</span>
                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                      {new Date(gc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {gc.isRedeemed ? (
                    <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-lg space-y-1 text-gray-600 dark:text-gray-400 mt-1">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase text-gray-450 tracking-wider">
                        <span>REDEEMED BY</span>
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      </div>
                      <div className="font-black text-gray-950 dark:text-white text-[11px] truncate">
                        {gc.redeemedByName || 'Gamer Profile'}
                      </div>
                      <div className="text-[9px] font-mono">
                        {gc.redeemedAt ? new Date(gc.redeemedAt).toLocaleString() : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between mt-1 text-xs text-slate-400 font-bold uppercase tracking-widest text-[8.5px]">
                      <span>STATUS</span>
                      <span className="text-emerald-500 font-extrabold">READY FOR REDEEM</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {giftCodes.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <Ticket className="h-8 w-8 text-gray-300 mx-auto mb-2 animate-bounce" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No gift codes currently created in the system.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gift Code Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-5">
              Create Pre-Approved Voucher
            </h4>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Value (LKR Amount)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rs.</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-950 dark:text-white font-bold"
                    placeholder="Enter top-up amount"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Voucher Code</label>
                  <button
                    type="button"
                    onClick={() => setManualCode(generateRandomGiftCode())}
                    className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600"
                  >
                    Randomize Code
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-black uppercase text-gray-900 dark:text-white font-mono tracking-wider"
                  placeholder="XENON-XXXX-XXXX-XXXX-XXXX"
                />
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
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
