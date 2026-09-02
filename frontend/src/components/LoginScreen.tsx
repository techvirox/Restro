// src/components/LoginScreen.tsx
import React, { useState } from 'react';
import { Shield, Sparkles, User, Key, ArrowRight, ChefHat, LayoutGrid, Home, Phone, Building2, MapPin, Mail, Award, Lock } from 'lucide-react';
import { api } from '../services/api';

type Mode = 'login' | 'register_owner';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string | number; name: string; phone: string; role: 'owner' | 'waiter' | 'kot' | 'admin'; tenantId: string | number; isDemo: boolean }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  
  // Login Form States
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Owner Registration States
  const [clinicName, setClinicName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [address, setAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-fill and bypass for sandbox demo
  const handleDemoLogin = (role: 'owner' | 'waiter' | 'kot') => {
    setError('');
    const demoUser = {
      id: `demo-${role}-${Date.now()}`,
      name: role === 'owner' ? 'Demo Owner (Amit)' : role === 'waiter' ? 'Demo Waiter (Rajesh)' : 'Demo Kitchen Staff',
      phone: role === 'owner' ? '9876543210' : role === 'waiter' ? '9876543215' : '9876543219',
      role,
      tenantId: 'demo',
      isDemo: true
    };
    onLoginSuccess(demoUser);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!phone) {
      setError('Please enter your mobile number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        phone: phone.trim(),
        password: password.trim()
      });

      if (res.success && res.user) {
        setSuccess('Logged in successfully!');
        if (res.user.tenantId) {
          api.setTenantId(res.user.tenantId);
        }
        onLoginSuccess({
          ...res.user,
          isDemo: false
        });
      } else {
        setError(res.error || 'Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication server offline. Make sure the Node server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!clinicName || !adminName || !regPhone || !regPassword || !regEmail) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerOwner({
        phone: regPhone.trim(),
        password: regPassword.trim(),
        name: adminName.trim(),
        email: regEmail.trim(),
        clinicName: clinicName.trim(),
        address: address.trim()
      });

      if (res.success && res.user) {
        setSuccess('Registration successful! Please log in to start your 5-day free trial.');
        setPhone(regPhone.trim());
        setPassword(regPassword.trim()); // Pre-fill password so they can log in immediately
        setMode('login');
      } else {
        setError(res.error || 'Owner registration failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not connect to the registration server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 mesh-bg-light dark:mesh-bg py-12 px-4 sm:px-6 lg:px-8 font-sans select-none relative overflow-hidden transition-colors duration-300">
      
      {/* Abstract Glowing Accent Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 glass-card p-8 rounded-3xl shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)] border border-slate-200 dark:border-slate-800/80 transition-all duration-500 hover:shadow-[0_0_60px_-10px_rgba(99,102,241,0.25)] dark:hover:shadow-[0_0_60px_-10px_rgba(99,102,241,0.35)] hover:border-slate-300 dark:hover:border-slate-700/50 z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img src="/techvirox_logo.jpg" alt="Logo" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-[0_4px_20px_rgba(99,102,241,0.2)] border border-slate-200 dark:border-slate-800" />
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-indigo-200 dark:via-indigo-100 dark:to-violet-300 bg-clip-text text-transparent">
            TechVirox Restro POS
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
            Multi-Tenant Restaurant POS & Kitchen Display System
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border border-slate-200 dark:border-slate-800/80 p-1 bg-slate-100/60 dark:bg-slate-950/80 rounded-2xl select-none gap-1 shadow-inner">
          <button
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)]'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900/40'
            }`}
          >
            Log In
          </button>
          
          <button
            onClick={() => { setMode('register_owner'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              mode === 'register_owner'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)]'
                : 'text-slate-555 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900/40'
            }`}
          >
            Register Owner
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-350 text-xs rounded-xl font-semibold leading-relaxed animate-fadeIn shadow-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-355 text-xs rounded-xl font-semibold leading-relaxed animate-fadeIn shadow-sm">
            {success}
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <div className="space-y-6 animate-fadeIn">
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block pl-1">Mobile Number</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter registered phone number"
                    className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-10 pr-3 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-all duration-300 glow-input"
                  />
                  <User className="absolute left-3.5 top-4.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block pl-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-10 pr-3 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-all duration-300 glow-input"
                  />
                  <Key className="absolute left-3.5 top-4.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center group cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 glow-btn"
              >
                {loading ? 'Verifying Account...' : 'Access POS Panel'}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        )}

        {/* 2. REGISTRATION MODE */}
        {mode === 'register_owner' && (
          <form onSubmit={handleOwnerRegisterSubmit} className="space-y-4 animate-fadeIn">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed shadow-sm">
              <span className="font-bold block mb-1 text-indigo-600 dark:text-indigo-200 uppercase tracking-wide flex items-center">
                <Shield className="w-3.5 h-3.5 mr-1 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                Register Restaurant Owner
              </span>
              Your account license will be linked to the PerfectCRM server. Ensure you have valid activation codes.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block pl-1">Restaurant Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Rio Restro Bistro"
                    className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 rounded-xl py-3 pl-9 pr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:border-indigo-500 transition-all duration-300 glow-input"
                  />
                  <Building2 className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-555 dark:text-slate-400 uppercase tracking-wider block pl-1">Owner Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 rounded-xl py-3 pl-9 pr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:border-indigo-500 transition-all duration-300 glow-input"
                  />
                  <User className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-555 dark:text-slate-400 uppercase block pl-1">Mobile Phone *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="Login mobile"
                    className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 rounded-xl py-3 pl-9 pr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:border-indigo-500 transition-all duration-300 glow-input font-mono"
                  />
                  <Phone className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-555 dark:text-slate-400 uppercase block pl-1">Password *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Set Password"
                    className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 rounded-xl py-3 pl-9 pr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:border-indigo-500 transition-all duration-300 glow-input font-mono"
                  />
                  <Lock className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-555 dark:text-slate-400 uppercase block pl-1">Email Address *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="owner@riorestro.com"
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 rounded-xl py-3 pl-9 pr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:border-indigo-500 transition-all duration-300 glow-input"
                />
                <Mail className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-555 dark:text-slate-400 uppercase block pl-1">Address</label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Salt Lake City, Sector V"
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 rounded-xl py-3 pl-9 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-50/50 dark:focus:bg-slate-950/80 focus:border-indigo-500 transition-all duration-300 glow-input"
                />
                <MapPin className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center group cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-500/10 glow-btn"
            >
              {loading ? 'Registering Account...' : 'Create Owner Account'}
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
