import React, { useState, useEffect, useRef } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Loader2, Gem } from 'lucide-react';
import { Package, Game } from '../../types';
import { getPackages, addPackage, updatePackage, deletePackage, getDBGames } from '../../services/db';
import { GAMES } from '../../constants';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AdminPackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [dbGames, setDbGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  
  // Combine games for display
  const allGames = [...GAMES, ...dbGames];
  const uniqueGames = Array.from(new Map(allGames.map(item => [item.id, item])).values());
  
  // Form state
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState(uniqueGames[0]?.id || '');
  const [diamonds, setDiamonds] = useState(0);
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image Upload State
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const uploadImageFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", { description: "Image size must be less than 2MB." });
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `packages/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setImageUrl(downloadURL);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      console.error("Failed to upload image:", err);
      toast.error("Upload failed", { description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [pkgs, gms] = await Promise.all([
        getPackages(false),
        getDBGames(false)
      ]);
      setPackages(pkgs);
      setDbGames(gms);
    } catch (err: any) {
      console.error(err);
      try {
        const parsed = JSON.parse(err.message);
        setError(parsed.error || "Permission denied");
      } catch {
        setError("Failed to fetch packages. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  const openModal = (pkg: Package | null = null) => {
    setEditingPackage(pkg);
    setName(pkg?.name || '');
    setGameId(pkg?.gameId || (uniqueGames[0]?.id || ''));
    setDiamonds(pkg?.diamonds || 0);
    setPrice(pkg?.price || 0);
    setImageUrl(pkg?.imageUrl || '');
    setIsActive(pkg?.isActive ?? true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const pkgData: any = { 
        name, 
        gameId,
        diamonds, 
        price: Number(price), 
        imageUrl,
        isActive, 
        createdAt: Date.now() 
      };
      if (editingPackage) {
        await updatePackage(editingPackage.id, pkgData);
      } else {
        await addPackage(pkgData);
      }
      setIsModalOpen(false);
      fetchData();
      toast.success(editingPackage ? "Package updated!" : "Package added!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error saving package");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        await deletePackage(id);
        fetchData();
        toast.success("Package deleted");
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Error deleting package");
      }
    }
  };

  return (
    <div className="admin-portal flex flex-col md:flex-row min-h-screen bg-gray-50/50">
      <AdminSidebar />
      <div className="flex-grow p-4 md:p-8 overflow-x-hidden">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900">Manage Packages</h1>
            <p className="text-sm text-gray-500 font-medium">Add, edit or disable diamond packages.</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-sans"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Package
          </button>
        </header>


        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-600 font-sans">
             <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center mr-4">
               <ImageIcon className="h-5 w-5 text-red-600" />
             </div>
             <div>
               <p className="font-bold text-sm">Error Loading Packages</p>
               <p className="text-xs opacity-80">{error}</p>
             </div>
             <button 
              onClick={() => fetchData()}
              className="ml-auto px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors"
             >
               Retry
             </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 md:p-20">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Fetching data...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 font-sans">Preview</th>
                      <th className="px-8 py-5 font-sans">Package</th>
                      <th className="px-8 py-5 font-sans text-center">Diamonds</th>
                      <th className="px-8 py-5 font-sans">Price</th>
                      <th className="px-8 py-5 font-sans text-center">Status</th>
                      <th className="px-8 py-5 text-right font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="group hover:bg-blue-50/50 transition-colors whitespace-nowrap">
                        <td className="px-8 py-5">
                          <div className="bg-white border border-gray-100 h-14 w-14 rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                            {pkg.imageUrl ? (
                              <img 
                                src={pkg.imageUrl} 
                                alt={pkg.name} 
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-contain p-1" 
                              />
                            ) : (
                              <Gem className="h-6 w-6 text-gray-200" />
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-black text-gray-900 font-sans text-lg tracking-tight">{pkg.name}</div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] bg-gray-100 text-gray-500 font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                              {uniqueGames.find(g => g.id === pkg.gameId)?.name || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ID: {pkg.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black ring-1 ring-blue-100 italic">
                            {pkg.diamonds}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-black text-gray-900 tracking-tighter text-lg font-sans">
                          <span className="text-xs text-gray-400 font-bold mr-1 italic">LKR</span>
                          {(pkg.price || 0).toLocaleString()}
                        </td>
                        <td className="px-8 py-5 text-center border-emerald-50">
                          <button 
                            onClick={async () => {
                              try {
                                await updatePackage(pkg.id, { ...pkg, isActive: !pkg.isActive });
                                toast.success(`Package ${!pkg.isActive ? 'active' : 'disabled'}`);
                                fetchData();
                              } catch (err) {
                                toast.error("Toggle failed");
                              }
                            }}
                            className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                            pkg.isActive 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                            {pkg.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right space-x-1">
                          <button 
                            onClick={() => openModal(pkg)}
                            className="inline-flex p-3 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-sm transition-all"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(pkg.id)}
                            className="inline-flex p-3 rounded-xl text-gray-400 hover:text-red-600 hover:bg-white hover:shadow-sm transition-all"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Grid View */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 font-sans relative hover:shadow-md transition-all">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="bg-gray-50 border border-gray-100 h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                        {pkg.imageUrl ? (
                          <img src={pkg.imageUrl} alt={pkg.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          <Gem className="h-4 w-4 text-gray-200" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-gray-900 tracking-tight text-sm break-words">{pkg.name}</h3>
                        <p className="text-[9px] bg-gray-100 text-gray-500 font-black px-2 py-0.5 rounded uppercase tracking-tighter inline-block mt-0.5">
                          {uniqueGames.find(g => g.id === pkg.gameId)?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await updatePackage(pkg.id, { ...pkg, isActive: !pkg.isActive });
                          toast.success(`Package ${!pkg.isActive ? 'active' : 'disabled'}`);
                          fetchData();
                        } catch (err) {
                          toast.error("Toggle failed");
                        }
                      }}
                      className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
                      pkg.isActive 
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                      {pkg.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-1">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Diamonds</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black ring-1 ring-blue-100 italic">
                        {pkg.diamonds}
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Price</p>
                      <p className="font-black text-gray-900 tracking-tighter text-sm">
                        <span className="text-[10px] text-gray-400 font-bold mr-1 italic">LKR</span>
                        {pkg.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    <button 
                      onClick={() => openModal(pkg)}
                      className="flex-1 inline-flex items-center justify-center py-2 rounded-lg bg-gray-50 text-gray-600 font-bold text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(pkg.id)}
                      className="flex-1 inline-flex items-center justify-center py-2 rounded-lg bg-gray-50 text-gray-600 font-bold text-xs hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-8 shadow-2xl"
            >
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">
                  {editingPackage ? 'Edit Package' : 'New Package'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
             </div>
             
             <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Target Game</label>
                 <select 
                   value={gameId}
                   onChange={(e) => setGameId(e.target.value)}
                   className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                   required
                 >
                   {uniqueGames.filter(g => !g.comingSoon).map(game => (
                     <option key={game.id} value={game.id}>{game.name}</option>
                   ))}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Package Name</label>
                 <input 
                   type="text" 
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                   placeholder="Weekly Membership"
                   required
                 />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Package Image / Icon</label>
                  
                  {/* Hidden file input */}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {/* Upload Drop Zone */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragActive 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-gray-200 hover:border-blue-400 bg-gray-50/50 hover:bg-gray-50'
                    }`}
                  >
                    {isUploading ? (
                      <div className="py-2 flex flex-col items-center">
                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
                        <span className="text-xs font-bold text-blue-600">Uploading image...</span>
                      </div>
                    ) : imageUrl ? (
                      <div className="flex items-center space-x-4 w-full">
                        <div className="h-16 w-16 bg-white border border-gray-100 rounded-xl flex items-center justify-center p-1 shrink-0 shadow-sm">
                          <img src={imageUrl} alt="Package" className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-bold text-gray-900 truncate">Image uploaded successfully</p>
                          <p className="text-[10px] text-gray-500 truncate">{imageUrl}</p>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                            className="text-[10px] font-black text-rose-600 mt-1 hover:underline"
                          >
                            Remove Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-gray-700">Click or drag & drop to upload image</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Supports PNG, JPG, JPEG up to 2MB</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Or Use Custom URL</span>
                    </div>
                    <input 
                      type="url" 
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full h-11 px-4 mt-1 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                      placeholder="https://example.com/image.png"
                    />
                  </div>
                </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Diamonds</label>
                   <input 
                     type="number" 
                     value={diamonds}
                     onChange={(e) => setDiamonds(Number(e.target.value))}
                     className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="100"
                     required
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Price (LKR)</label>
                   <input 
                     type="number" 
                     value={price}
                     onChange={(e) => setPrice(Number(e.target.value))}
                     className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="15000"
                     required
                   />
                 </div>
               </div>
               
               <div className="flex items-center py-2">
                 <input 
                  type="checkbox" 
                  id="is_active" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                 />
                 <label htmlFor="is_active" className="ml-2 text-sm font-bold text-gray-700">Set as Active</label>
               </div>

               <div className="pt-4 flex space-x-3">
                 <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-sm font-bold rounded-xl text-gray-600 hover:bg-gray-50 bg-white transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 text-sm font-bold rounded-xl text-white hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center"
                 >
                   {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Package'}
                 </button>
               </div>
             </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
