import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2, Mail, X, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../lib/UserContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useUser();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      login(data.token, data.user);
      navigate('/secure-portal');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px-136px)] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-gray-100 rounded-[2rem] sm:rounded-3xl p-6 sm:p-10 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gray-50 rounded-2xl mb-4">
            <img src="https://i.postimg.cc/L4QDxTxM/Chat-GPT-Image-Jun-13-2026-06-24-44-PM.png" alt="Logo" className="h-12 w-12 object-contain" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 font-sans">Admin Portal</h2>
          <p className="text-gray-500 font-medium mt-1 font-sans">Sign in to manage your diamond store.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold mb-6 flex items-center shadow-sm">
            <X className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-14 px-5 border-2 border-gray-100 rounded-2xl focus:border-blue-500 transition-all outline-none font-sans"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-14 px-5 border-2 border-gray-100 rounded-2xl focus:border-blue-500 transition-all outline-none font-sans"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin();
              }}
            />
          </div>
          
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="nova-btn group w-full h-14 text-white font-sans"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <Lock className="h-5 w-5" />
                <span>Sign In Securely</span>
                <span className="arrow-wrapper">
                  <span className="arrow"></span>
                </span>
              </>
            )}
          </button>
          
          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            Authorized access only. All actions are logged.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
