import React, { useState, useEffect } from 'react';
import { Shield, ScrollText, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { getSettings } from '../services/db';
import { Settings } from '../types';

export default function TermsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleContact = () => {
    if (settings?.whatsappNumber) {
      window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`, '_blank');
    }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#070708] pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-500/10 mb-6 text-blue-600">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tightest mb-4 italic uppercase">
            Terms & <span className="text-blue-600">Conditions</span>
          </h1>
          <p className="text-gray-500 font-medium">Last updated: June 14, 2026</p>
        </motion.div>

        <div className="space-y-12">
          {/* Section 1 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-white/[0.02] rounded-[3rem] p-8 sm:p-12 border border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                <ScrollText className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">1. Acceptance of Terms</h2>
            </div>
            <div className="prose prose-blue dark:prose-invert max-w-none text-gray-500 font-medium leading-relaxed">
              <p>
                By accessing and using Xenon Store, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.
              </p>
              <p>
                We reserve the right to update or change these terms at any time without prior notice. Your continued use of our services following any changes constitutes your acceptance of the updated terms.
              </p>
            </div>
          </motion.section>

          {/* Section 2 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-white/[0.02] rounded-[3rem] p-8 sm:p-12 border border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">2. Refund & Cancellation</h2>
            </div>
            <div className="prose prose-blue dark:prose-invert max-w-none text-gray-500 font-medium leading-relaxed">
              <p>
                Due to the nature of digital goods and game credits (Diamond top-ups, FF IDs, etc.), all successful transactions are <strong>FINAL and NON-REFUNDABLE</strong>.
              </p>
              <ul className="space-y-4 list-none p-0">
                <li className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                  <span>Refunds will only be considered if a technical error on our side prevents a successful delivery of the purchased product.</span>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                  <span>It is your responsibility to provide the correct Player ID or details. Incorrect details provided by the customer are not eligible for a refund.</span>
                </li>
              </ul>
            </div>
          </motion.section>

          {/* Section 3 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-white/[0.02] rounded-[3rem] p-8 sm:p-12 border border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-600/20">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">3. Proper Use of Service</h2>
            </div>
            <div className="prose prose-blue dark:prose-invert max-w-none text-gray-500 font-medium leading-relaxed">
              <p>
                Users are strictly prohibited from using our services for any fraudulent activities, money laundering, or illegal transactions.
              </p>
              <p>
                We collaborate with game developers and follow their official policies. Any attempt to exploit gaming systems using our platform will result in a permanent ban without refund.
              </p>
            </div>
          </motion.section>

          {/* Section 4 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-white/[0.02] rounded-[3rem] p-8 sm:p-12 border border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-600/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">4. Account Security & Privacy</h2>
            </div>
            <div className="prose prose-blue dark:prose-invert max-w-none text-gray-500 font-medium leading-relaxed">
              <p>
                We take your privacy seriously. Any personal information or player IDs provided to us will be used solely for the purpose of fulfilling your order. We do not sell or share your information with third parties.
              </p>
              <p>
                For account purchases or sales, you are responsible for securing your account credentials immediately after the transaction is completed. We hold no liability for lost or compromised accounts after successful delivery.
              </p>
            </div>
          </motion.section>

          {/* Section 5 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-white/[0.02] rounded-[3rem] p-8 sm:p-12 border border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-600/20">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">5. Delivery Timeframes & Delays</h2>
            </div>
            <div className="prose prose-blue dark:prose-invert max-w-none text-gray-500 font-medium leading-relaxed">
              <p>
                While most digital top-ups and services are processed instantly or within a few minutes, some transactions may experience delays due to server maintenance, network issues, or high order volumes.
              </p>
              <p>
                In such cases, please allow up to 24 hours for delivery. We appreciate your patience and will keep you informed of any major disruptions affecting top-ups across supported platforms.
              </p>
            </div>
          </motion.section>

          {/* Section 6 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-white/[0.02] rounded-[3rem] p-8 sm:p-12 border border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                <ScrollText className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">6. Intellectual Property & Disputes</h2>
            </div>
            <div className="prose prose-blue dark:prose-invert max-w-none text-gray-500 font-medium leading-relaxed">
              <p>
                All content, trademarks, logos, and graphics on this platform related to Xenon Store are our property. Materials directly related to specific games remain the intellectual property of their respective publishers and developers.
              </p>
              <p>
                In the event of a dispute, we encourage you to contact our support team first to seek an amicable resolution. We reserve the right to suspend accounts attempting to perform chargebacks without prior communication.
              </p>
            </div>
          </motion.section>

          {/* Contact Support */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="bg-blue-600 rounded-[3rem] p-12 text-center text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors" />
            <div className="relative z-10">
              <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-6">Need Clarification?</h3>
              <p className="text-blue-100 font-medium mb-8 max-w-lg mx-auto">
                If you have any questions regarding our terms, please feel free to reach out to our dedicated support team.
              </p>
              <button 
                onClick={handleContact}
                className="h-14 px-12 bg-white text-blue-600 font-black rounded-2xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Contact Support
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
