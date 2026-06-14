import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from '../../lib/firestore-compat';
import { Shield, Users, Check, X, ShieldAlert, Plus, Power, KeySquare, Key, Command, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminStaff {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Manager' | 'Support Staff';
  permissions: {
    products: boolean;
    orders: boolean;
    payments: boolean;
    shells: boolean;
    coupons: boolean;
    settings: boolean;
    reports: boolean;
    administration: boolean;
  };
  isActive: boolean;
  createdAt: number;
}

export default function PermissionsPanel() {
  const [staffList, setStaffList] = useState<AdminStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminStaff | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Manager' | 'Support Staff'>('Support Staff');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Permissions checkboxes state
  const [permissions, setPermissions] = useState({
    products: true,
    orders: true,
    payments: false,
    shells: false,
    coupons: false,
    settings: false,
    reports: true,
    administration: false
  });

  const defaultSeeds: AdminStaff[] = [
    { 
      id: 'staff_1', 
      email: 'gamingremo2010@gmail.com', 
      name: 'Xenon Store Primary', 
      role: 'Admin', 
      permissions: { products: true, orders: true, payments: true, shells: true, coupons: true, settings: true, reports: true, administration: true }, 
      isActive: true, 
      createdAt: Date.now() - 50000 
    },
    { 
      id: 'staff_2', 
      email: 'manager.demo@gmail.com', 
      name: 'Sahan Perera', 
      role: 'Manager', 
      permissions: { products: true, orders: true, payments: true, shells: true, coupons: true, settings: false, reports: true, administration: false }, 
      isActive: true, 
      createdAt: Date.now() - 30000 
    },
    { 
      id: 'staff_3', 
      email: 'bloovalk@gmail.com', 
      name: 'Sanju Support', 
      role: 'Support Staff', 
      permissions: { products: false, orders: true, payments: false, shells: true, coupons: false, settings: false, reports: false, administration: false }, 
      isActive: true, 
      createdAt: Date.now() - 10000 
    }
  ];

  useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, 'admins'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as AdminStaff));
          setStaffList(fetched.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setStaffList(defaultSeeds);
        }
        setLoading(false);
      }, (err) => {
        console.warn("Staff Firebase fallback active:", err);
        setStaffList(defaultSeeds);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const handleRoleChange = (selectedRole: 'Admin' | 'Manager' | 'Support Staff') => {
    setRole(selectedRole);
    // Autofill permissions preset based on chosen role for quick user experience
    if (selectedRole === 'Admin') {
      setPermissions({ products: true, orders: true, payments: true, shells: true, coupons: true, settings: true, reports: true, administration: true });
    } else if (selectedRole === 'Manager') {
      setPermissions({ products: true, orders: true, payments: true, shells: true, coupons: true, settings: false, reports: true, administration: false });
    } else {
      setPermissions({ products: false, orders: true, payments: false, shells: true, coupons: false, settings: false, reports: false, administration: false });
    }
  };

  const handleOpenModal = (staff: AdminStaff | null = null) => {
    setEditingStaff(staff);
    if (staff) {
      setName(staff.name);
      setEmail(staff.email);
      setRole(staff.role);
      setIsActive(staff.isActive);
      setPermissions(staff.permissions);
    } else {
      setName('');
      setEmail('');
      setRole('Support Staff');
      setIsActive(true);
      setPermissions({ products: false, orders: true, payments: false, shells: true, coupons: false, settings: false, reports: false, administration: false });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Please fill out complete profile data");
      return;
    }
    setSaving(true);

    const payload: Omit<AdminStaff, 'id'> = {
      name,
      email,
      role,
      permissions,
      isActive,
      createdAt: editingStaff?.createdAt || Date.now()
    };

    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'admins', editingStaff.id), payload);
        toast.success("Role permissions updated successfully!");
      } else {
        await addDoc(collection(db, 'admins'), payload);
        toast.success("New staff credential registered in schema!");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Direct Firestore admins save failed:", err);
      toast.error("Failed to save to database");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, staffName: string) => {
    if (id === 'staff_1') {
      toast.error("Cannot revoke main administrator root access.");
      return;
    }
    if (!confirm(`Are you sure you want to revoke system clearance for ${staffName}?`)) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
      toast.success("Access privileges deleted!");
    } catch (e) {
      toast.error("Failed to delete staff privileges");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Staff Roles & permissions matrix</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5 font-mono">Set staff scopes, modify database read/write permissions, and register operators.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all font-sans"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Staff Member
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <span className="text-xs text-gray-400 font-black tracking-wider uppercase">Aligning permissions indexes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
            {staffList.map((staff) => (
              <div 
                key={staff.id}
                className="bg-gray-50/50 dark:bg-white/[0.01] border hover:border-blue-500/30 rounded-[2rem] p-6 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 flex items-center justify-center">
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-black text-gray-900 dark:text-white">{staff.role}</span>
                    </div>

                    <button
                      onClick={() => handleDelete(staff.id, staff.name)}
                      className="p-1 px-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                      title="Revoke clearances"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="pb-3 border-b border-gray-100 dark:border-white/5">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white">{staff.name}</h4>
                    <span className="text-[10px] text-gray-400 font-mono font-bold">{staff.email}</span>
                  </div>

                  <div className="py-4 space-y-2">
                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-2">PERMISSIONS GRANTED</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      {Object.entries(staff.permissions).map(([permName, value]) => (
                        <div key={permName} className="flex items-center space-x-1 capitalize">
                          {value ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-red-500/60" />
                          )}
                          <span className={`${value ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400/80 line-through'}`}>{permName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenModal(staff)}
                  className="w-full py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 font-black text-[9px] uppercase tracking-widest mt-4 hover:border-blue-500/40 transition-colors"
                >
                  Adjust Scope Clearances
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
            <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-5">
              Adjust clearing permissions
            </h4>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Staff full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-900 dark:text-white"
                    placeholder="Sahan Perera"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Staff login Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white font-mono"
                    placeholder="email@gamingr4d.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Access Authorization Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Admin', 'Manager', 'Support Staff'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`h-10 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border ${
                        role === r 
                          ? 'bg-blue-600 text-white border-transparent' 
                          : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Permissions Matrix</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(permissions).map((key) => {
                    const permKey = key as keyof typeof permissions;
                    return (
                      <label 
                        key={permKey}
                        className="flex items-center space-x-2 bg-gray-50 dark:bg-white/5 p-3.5 rounded-xl border border-gray-100 dark:border-white/5 cursor-pointer hover:border-blue-500/25 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={permissions[permKey]}
                          onChange={(e) => setPermissions(prev => ({ ...prev, [permKey]: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-[10px] capitalize font-black text-gray-700 dark:text-gray-300">{permKey}</span>
                      </label>
                    );
                  })}
                </div>
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
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Clearance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
