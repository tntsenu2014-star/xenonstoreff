import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from '../../lib/firestore-compat';
import { Save, Globe, EyeOff, Layout, Heart, ShieldAlert, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../lib/SettingsContext';
import { clearSettingsCache } from '../../services/db';

interface StoreSettings {
  storeName: string;
  storeLogo: string;
  storeBanner: string;
  whatsappNumber: string;
  facebookLink: string;
  instagramLink: string;
  maintenanceMode: boolean;
}

export default function StoreSettingsPanel() {
  const settingsContext = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: 'Xenon Store',
    storeLogo: 'https://i.postimg.cc/L4QDxTxM/Chat-GPT-Image-Jun-13-2026-06-24-44-PM.png',
    storeBanner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200',
    whatsappNumber: '+94771234567',
    facebookLink: 'https://facebook.com/xenonstore',
    instagramLink: 'https://instagram.com/xenonstore',
    maintenanceMode: false
  });

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const docRefWebsite = doc(db, 'settings', 'website');
        const docRefConfig = doc(db, 'settings', 'config');
        
        const [snapWeb, snapConfig] = await Promise.all([
          getDoc(docRefWebsite),
          getDoc(docRefConfig)
        ]);

        let loadedSettings: Partial<StoreSettings> = {};

        if (snapWeb.exists()) {
          loadedSettings = { ...snapWeb.data() };
        }

        if (snapConfig.exists()) {
          const configData = snapConfig.data();
          loadedSettings = {
            ...loadedSettings,
            storeName: configData.siteName || loadedSettings.storeName || 'Xenon Store',
            storeLogo: configData.logoUrl || loadedSettings.storeLogo || 'https://i.postimg.cc/L4QDxTxM/Chat-GPT-Image-Jun-13-2026-06-24-44-PM.png',
            storeBanner: configData.heroBannerUrl || loadedSettings.storeBanner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200',
            whatsappNumber: configData.whatsappNumber || loadedSettings.whatsappNumber || '+94771234567',
            facebookLink: configData.facebookUrl || loadedSettings.facebookLink || 'https://facebook.com/xenonstore',
            instagramLink: configData.instagramUrl || loadedSettings.instagramLink || 'https://instagram.com/xenonstore',
            maintenanceMode: configData.isMaintenanceMode !== undefined ? configData.isMaintenanceMode : (loadedSettings.maintenanceMode || false)
          };
        }

        if (Object.keys(loadedSettings).length > 0) {
          setSettings(prev => ({ ...prev, ...loadedSettings }));
        } else {
          // fallback to localStorage cache
          const stored = localStorage.getItem('r4d_website_settings');
          if (stored) {
            setSettings(JSON.parse(stored));
          } else {
            localStorage.setItem('r4d_website_settings', JSON.stringify(settings));
          }
        }
      } catch (err) {
        console.warn("Could not retrieve official website settings, falling back to cache:", err);
        const stored = localStorage.getItem('r4d_website_settings');
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Save to settings/website
      await setDoc(doc(db, 'settings', 'website'), settings);
      localStorage.setItem('r4d_website_settings', JSON.stringify(settings));

      // 2. Also save/sync to settings/config to update storefront client portal dynamically!
      try {
        const configRef = doc(db, 'settings', 'config');
        const configSnap = await getDoc(configRef);
        const currentConfig = configSnap.exists() ? configSnap.data() : {};
        
        const updatedConfig = {
          ...currentConfig,
          siteName: settings.storeName,
          logoUrl: settings.storeLogo,
          heroBannerUrl: settings.storeBanner,
          whatsappNumber: settings.whatsappNumber,
          facebookUrl: settings.facebookLink,
          instagramUrl: settings.instagramLink,
          isMaintenanceMode: settings.maintenanceMode,
          id: 'config' // enforce id
        };
        await setDoc(configRef, updatedConfig);
      } catch (confErr) {
        console.warn("Could not synchronize config document inside firestore:", confErr);
      }

      // 3. Clear/Invalidate settings caches across context & localStorage immediately
      clearSettingsCache();
      localStorage.removeItem('gr4d_cache_settings');
      localStorage.removeItem('settings');

      if (settingsContext?.refreshSettings) {
        await settingsContext.refreshSettings();
      }

      toast.success("Website configuration successfully saved in database & synced!");
    } catch (err) {
      console.warn("Direct settings save failed, updating cache:", err);
      localStorage.setItem('r4d_website_settings', JSON.stringify(settings));
      toast.success("Saved to local workspace memory.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest font-mono">Loading settings schema...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Settings left block */}
        <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-gray-50">
            <Globe className="h-5 w-5 text-blue-600" />
            <h4 className="text-base font-black text-gray-905 uppercase tracking-tight">Main Brand Customization</h4>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Store Platform Name</label>
            <input 
              type="text" 
              name="storeName"
              value={settings.storeName}
              onChange={handleChange}
              className="w-full h-11 px-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Store Brand URL Logo (PNG)</label>
            <input 
              type="text" 
              name="storeLogo"
              value={settings.storeLogo}
              onChange={handleChange}
              className="w-full h-11 px-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Store Hero Banner Image (URL)</label>
            <input 
              type="text" 
              name="storeBanner"
              value={settings.storeBanner}
              onChange={handleChange}
              className="w-full h-11 px-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        {/* Social Links & Maintenance Mode block */}
        <div className="bg-white dark:bg-[#0d0d0f] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
              <LinkIcon className="h-5 w-5 text-green-600" />
              <h4 className="text-base font-black text-gray-905 uppercase tracking-tight">Support Contacts & Handles</h4>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Primary WhatsApp support Phone</label>
              <input 
                type="text" 
                name="whatsappNumber"
                value={settings.whatsappNumber}
                onChange={handleChange}
                className="w-full h-11 px-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Official Facebook Page url</label>
              <input 
                type="text" 
                name="facebookLink"
                value={settings.facebookLink}
                onChange={handleChange}
                className="w-full h-11 px-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Official Instagram Feed url</label>
              <input 
                type="text" 
                name="instagramLink"
                value={settings.instagramLink}
                onChange={handleChange}
                className="w-full h-11 px-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-tight block">SYSTEM MAINTENANCE MODE</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Lock the storefront client portal instantly</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="maintenanceMode"
                checked={settings.maintenanceMode}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      {settings.maintenanceMode && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center text-red-800 text-xs gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="font-bold uppercase tracking-wide">
            WARNING: Maintenance mode is currently toggled active. Standard non-administrative clients will receive a locked out landing screen.
          </p>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <button 
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-850 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center shadow-lg transition-all"
        >
          {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          Commit Website Settings
        </button>
      </div>
    </form>
  );
}
