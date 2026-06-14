import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from '../../lib/firestore-compat';
import { Plus, Edit2, Trash2, Phone, Power, CheckCircle2, MessageSquare, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppStock {
  id: string;
  phoneNumber: string;
  providerName: string;
  isActive: boolean;
  assignedOrders: number;
  createdAt: number;
}

export default function WhatsAppStockPanel() {
  const [numbers, setNumbers] = useState<WhatsAppStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppStock | null>(null);

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [providerName, setProviderName] = useState('');
  const [assignedOrders, setAssignedOrders] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initial seed fallback
  const defaultSeeds: WhatsAppStock[] = [
    { id: 'wa_seed_1', phoneNumber: '+94 77 123 4567', providerName: 'Xenon Store Main Support', isActive: true, assignedOrders: 14, createdAt: Date.now() - 400000 },
    { id: 'wa_seed_2', phoneNumber: '+94 76 987 6543', providerName: 'Instant Top Up Desk #2', isActive: true, assignedOrders: 25, createdAt: Date.now() - 250000 },
    { id: 'wa_seed_3', phoneNumber: '+94 71 555 4444', providerName: 'Night Shift Agent', isActive: false, assignedOrders: 0, createdAt: Date.now() - 100000 },
  ];

  useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, 'whatsapp_stock'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as WhatsAppStock));
          setNumbers(fetched.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setNumbers(defaultSeeds);
        }
        setLoading(false);
      }, (err) => {
        console.warn("WhatsApp stock fallback storage active:", err);
        setNumbers(defaultSeeds);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const handleOpenModal = (wa: WhatsAppStock | null = null) => {
    setEditingNumber(wa);
    if (wa) {
      setPhoneNumber(wa.phoneNumber);
      setProviderName(wa.providerName);
      setAssignedOrders(wa.assignedOrders);
      setIsActive(wa.isActive);
    } else {
      setPhoneNumber('+94 ');
      setProviderName('Desk Assistant');
      setAssignedOrders(0);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !providerName) {
      toast.error("Please fill in Phone and Name");
      return;
    }
    setSaving(true);

    const payload: Omit<WhatsAppStock, 'id'> = {
      phoneNumber,
      providerName,
      assignedOrders: Number(assignedOrders),
      isActive,
      createdAt: editingNumber?.createdAt || Date.now()
    };

    try {
      if (editingNumber) {
        await updateDoc(doc(db, 'whatsapp_stock', editingNumber.id), payload);
        toast.success("WhatsApp routing number updated!");
      } else {
        await addDoc(collection(db, 'whatsapp_stock'), payload);
        toast.success("WhatsApp Router added successfully!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Direct Firestore WhatsApp save failed:", err);
      toast.error("Failed to save to database");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this WhatsApp stock gateway?")) return;
    try {
      await deleteDoc(doc(db, 'whatsapp_stock', id));
      toast.success("WhatsApp Stock deleted");
    } catch (e) {
      toast.error("Failed to delete stock");
    }
  };

  const handleToggleActive = async (wa: WhatsAppStock) => {
    const nextActive = !wa.isActive;
    try {
      await updateDoc(doc(db, 'whatsapp_stock', wa.id), { isActive: nextActive });
      toast.success(`WhatsApp desk ${nextActive ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error("Failed to toggle state");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">WhatsApp Stock system</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5 font-mono">Configure phone numbers running customer order dispatch streams.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center shadow-lg shadow-green-500/20 transition-all font-sans"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Number
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-green-600 animate-spin mb-3" />
            <span className="text-xs text-gray-400 font-black tracking-wider uppercase">Loading WhatsApp Desks...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            {numbers.map((wa) => (
              <div 
                key={wa.id}
                className={`p-6 bg-gray-50/50 dark:bg-white/[0.01] border hover:border-green-500/30 rounded-[2rem] transition-all relative overflow-hidden group ${
                  !wa.isActive ? 'opacity-70 grayscale' : ''
                }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
                <div className="flex items-start justify-between relative z-10 mb-4">
                  <div className={`p-3 rounded-2xl ${wa.isActive ? 'bg-green-50 text-green-600 dark:bg-green-500/10' : 'bg-gray-100 text-gray-400 dark:bg-white/5'} flex items-center justify-center`}>
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleToggleActive(wa)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        wa.isActive 
                          ? 'text-green-600 bg-green-50 border-green-100 dark:bg-green-500/10 hover:bg-green-100' 
                          : 'text-gray-400 bg-gray-100 border-gray-200 dark:bg-white/5 hover:bg-gray-200'
                      }`}
                      title={wa.isActive ? 'Disable desk' : 'Enable desk'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(wa)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(wa.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-black px-2.5 py-0.5 rounded-md uppercase tracking-tight font-mono">
                    {wa.providerName}
                  </span>
                  <p className="text-lg font-black text-gray-900 dark:text-white mt-2 font-mono tracking-tight">{wa.phoneNumber}</p>
                  
                  <div className="flex items-center justify-between mt-4 border-t border-gray-100 dark:border-white/5 pt-3.5 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Assigned Queue</span>
                    <span className="font-black text-gray-800 dark:text-green-400 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 px-2.5 py-1 rounded-lg">
                      {wa.assignedOrders} Orders
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {numbers.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No WhatsApp stock gateways configured.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-5">
              {editingNumber ? 'Modify WhatsApp Desk' : 'Register Operator'}
            </h4>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone Number (with Country Code)</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-900 dark:text-white font-mono"
                  placeholder="+94 77 XXXXXXX"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Operator Provider Name</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white font-bold"
                  placeholder="e.g. Desk Agent Miyula"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Simulated Pending Orders</label>
                <input
                  type="number"
                  value={assignedOrders}
                  onChange={(e) => setAssignedOrders(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="waActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="waActiveToggle" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Set Operator desk Active
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
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all flex items-center justify-center"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
