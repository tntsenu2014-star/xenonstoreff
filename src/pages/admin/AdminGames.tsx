import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Gamepad2, Loader2, Check, RefreshCw } from 'lucide-react';
import { Game } from '../../types';
import { getDBGames, addGame, updateGame, deleteGame } from '../../services/db';
import { GAMES } from '../../constants';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [comingSoon, setComingSoon] = useState(false);
  const [idLabel, setIdLabel] = useState('');
  const [idPlaceholder, setIdPlaceholder] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setIsLoading(true);
    const data = await getDBGames(false);
    setGames(data);
    setIsLoading(false);
  };

  const handleSyncDefaults = async () => {
    if (!window.confirm('Import all default games from the system? This will add any missing games to the database.')) return;
    
    setIsSyncing(true);
    try {
      let addedCount = 0;
      for (const defaultGame of GAMES) {
        // Check if game already exists in DB games list by name and tag
        const exists = games.some(g => g.name === defaultGame.name && g.tag === defaultGame.tag);
        if (!exists) {
          const { id, ...gameData } = defaultGame;
          await addGame({
            ...gameData,
            isActive: true
          } as any);
          addedCount++;
        }
      }
      toast.success(`Successfully synced ${addedCount} new games!`);
      loadGames();
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync default games');
    } finally {
      setIsSyncing(false);
    }
  };

  const openModal = (game: Game | null = null) => {
    setEditingGame(game);
    setName(game?.name || '');
    setImage(game?.image || '');
    setCategory(game?.category || '');
    setTag(game?.tag || '');
    setComingSoon(game?.comingSoon ?? false);
    setIdLabel(game?.idLabel || '');
    setIdPlaceholder(game?.idPlaceholder || '');
    setIsActive(game?.isActive ?? true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const gameData: any = { 
        name, 
        image,
        category,
        tag: comingSoon ? 'COMING SOON' : (tag || 'ACTIVE'),
        comingSoon,
        idLabel,
        idPlaceholder,
        isActive 
      };

      if (editingGame) {
        await updateGame(editingGame.id, gameData);
        toast.success("Game updated!");
      } else {
        await addGame(gameData);
        toast.success("Game added!");
      }
      setIsModalOpen(false);
      loadGames();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save game');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this game? This will not delete its packages, but they will be orphaned.')) return;
    try {
      await deleteGame(id);
      loadGames();
      toast.success("Game deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete game");
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50/50">
      <AdminSidebar />
      <div className="flex-grow p-4 md:p-8 overflow-x-hidden">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-4 mb-8 sm:mb-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase">Manage Games</h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Add, edit or set games as coming soon</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button 
                onClick={async () => {
                  if (!window.confirm('CRITICAL: Delete ALL games from the database? This cannot be undone.')) return;
                  setIsLoading(true);
                  try {
                    for (const game of games) {
                      await deleteGame(game.id);
                    }
                    toast.success('All games cleared from database');
                    loadGames();
                  } catch (err) {
                    toast.error('Failed to clear some games');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading || games.length === 0}
                className="bg-red-50 text-red-600 font-black px-6 py-4 sm:py-3 rounded-2xl flex items-center justify-center space-x-2 hover:bg-red-100 transition-all border border-red-100 shadow-sm w-full sm:w-auto disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
                <span>Clear Database</span>
              </button>
              <button 
                onClick={handleSyncDefaults}
                disabled={isSyncing}
                className="bg-white text-gray-700 font-black px-6 py-4 sm:py-3 rounded-2xl flex items-center justify-center space-x-2 hover:bg-gray-50 transition-all border border-gray-200 shadow-sm w-full sm:w-auto disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                <span>Sync Defaults</span>
              </button>
              <button 
                onClick={() => openModal()}
                className="bg-blue-600 text-white font-black px-6 py-4 sm:py-3 rounded-2xl flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 w-full sm:w-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Add New Game</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Game Info</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Type</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">LOADING GAMES...</p>
                      </td>
                    </tr>
                  ) : games.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <Gamepad2 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">NO GAMES FOUND</p>
                      </td>
                    </tr>
                  ) : (
                    games.map((game) => (
                      <tr key={game.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 shrink-0 shadow-sm relative">
                              <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
                              {games.filter(g => g.name === game.name).length > 1 && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-1 rounded-bl-lg animate-pulse">
                                  DUPLICATE
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 text-lg tracking-tight leading-tight flex items-center gap-2">
                                {game.name}
                                {games.filter(g => g.name === game.name).length > 1 && (
                                  <span className="text-red-500 text-[10px] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Name Duplicate</span>
                                )}
                              </div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{game.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            game.comingSoon ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
                          }`}>
                            {game.comingSoon ? 'Coming Soon' : 'Active Store'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            game.isActive ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
                          }`}>
                            {game.isActive ? 'Visible' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => openModal(game)}
                              className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(game.id)}
                              className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AnimatePresence>
            {isModalOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm mt-[64px] md:mt-0"
              >
                <div className="fixed inset-0" onClick={() => setIsModalOpen(false)}></div>
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative z-10"
                >
                  <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                     <h3 className="font-black text-gray-900 text-xl tracking-tight uppercase">
                       {editingGame ? 'Edit Game Config' : 'Register New Game'}
                     </h3>
                     <button 
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Game Display Name *</label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                          placeholder="e.g. Free Fire"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Category *</label>
                        <input 
                          type="text" 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                          placeholder="e.g. Action"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Tag (Optional)</label>
                        <input 
                          type="text" 
                          value={tag}
                          onChange={(e) => setTag(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                          placeholder="e.g. HOT"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Game Thumbnail URL *</label>
                        <input 
                          type="text" 
                          value={image}
                          onChange={(e) => setImage(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                          placeholder="Direct image URL"
                          required
                        />
                      </div>

                      {!comingSoon && (
                        <>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">ID Field Label</label>
                            <input 
                              type="text" 
                              value={idLabel}
                              onChange={(e) => setIdLabel(e.target.value)}
                              className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                              placeholder="e.g. Player ID"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">ID Placeholder</label>
                            <input 
                              type="text" 
                              value={idPlaceholder}
                              onChange={(e) => setIdPlaceholder(e.target.value)}
                              className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                              placeholder="e.g. Ex: 123456789"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <label className="flex items-center cursor-pointer group">
                        <div 
                          onClick={() => setComingSoon(!comingSoon)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${comingSoon ? 'bg-amber-600 border-amber-600' : 'border-gray-200 group-hover:border-gray-300'}`}
                        >
                          {comingSoon && <Check className="text-white h-4 w-4" />}
                        </div>
                        <span className="ml-3 text-sm font-black text-gray-700 uppercase tracking-tight">Mark as Coming Soon</span>
                      </label>

                      <label className="flex items-center cursor-pointer group">
                        <div 
                          onClick={() => setIsActive(!isActive)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isActive ? 'bg-emerald-600 border-emerald-600' : 'border-gray-200 group-hover:border-gray-300'}`}
                        >
                          {isActive && <Check className="text-white h-4 w-4" />}
                        </div>
                        <span className="ml-3 text-sm font-black text-gray-700 uppercase tracking-tight">Game is Visible to Public</span>
                      </label>
                    </div>

                    <div className="pt-6 flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 h-14 rounded-2xl font-black text-gray-400 bg-gray-50 hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                      >
                        Discard
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 h-14 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-100 uppercase tracking-widest text-xs"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <span>Deploy Changes</span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f9fafb;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
