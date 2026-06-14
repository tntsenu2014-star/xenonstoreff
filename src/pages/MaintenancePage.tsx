import React from 'react';
import { useSettings } from '../lib/SettingsContext';
import { ShieldAlert, MessageCircle, Facebook, Instagram, Hammer, ArrowRight } from 'lucide-react';
import WhatsAppIcon from '../components/WhatsAppIcon';

export default function MaintenancePage() {
  const settingsContext = useSettings();
  const settings = settingsContext?.settings;

  // Render a beautifully crafted, editorial-grade maintenance page
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Abstract Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[35%] h-[35%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10 space-y-8 px-4 sm:px-6 py-12 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
        {/* Animated Badge Ornament */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative h-16 w-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-2xl">
              <Hammer className="h-8 w-8 text-blue-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.25em] bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 inline-block leading-none">
            System Offline
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase sm:leading-none">
            Storefront Offline For Maintenance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            We are currently upgrading {settings?.siteName || 'our platform'} to present high-octane gaming top-ups. We will resume operations very soon!
          </p>
        </div>

        {/* Support Options section */}
        <div className="pt-6 border-t border-slate-800/80 space-y-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
            Need urgent assistance? Contact us:
          </p>
          
          <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
            {/* WhatsApp */}
            {settings?.whatsappNumber && (
              <a 
                href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-green-500/5 hover:bg-green-500/10 border border-green-500/10 text-green-400 hover:text-green-300 transition-all font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <WhatsAppIcon className="h-5 w-5" />
                  <span className="uppercase tracking-wider">WhatsApp Support</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </a>
            )}

            {/* Facebook */}
            {settings?.facebookUrl && (
              <a 
                href={settings.facebookUrl}
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-blue-400 hover:text-blue-300 transition-all font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Facebook className="h-5 w-5 text-blue-500" />
                  <span className="uppercase tracking-wider">Official Facebook</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </a>
            )}

            {/* Instagram */}
            {settings?.instagramUrl && (
              <a 
                href={settings.instagramUrl}
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 text-pink-400 hover:text-pink-300 transition-all font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  <span className="uppercase tracking-wider">Official Instagram</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Subtle footer */}
        <div className="pt-4 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} {settings?.siteName || 'Xenon Store'}. All rights reserved.
          </p>
          <a 
            href="/secure-portal/login" 
            className="inline-block mt-4 text-[9px] font-black text-slate-500 hover:text-slate-400 uppercase tracking-widest underline decoration-dotted transition-colors"
          >
            Staff Login Portal
          </a>
        </div>
      </div>
    </div>
  );
}
