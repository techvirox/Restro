// src/components/SubscriptionOverlay.tsx
import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, LogOut, Check, CreditCard, ShieldAlert, BadgeCheck, CheckCircle2, Circle } from 'lucide-react';
import { api } from '../services/api';

interface SubscriptionOverlayProps {
  currentUser: any;
  onLogout: () => void;
  onRefreshStatus: () => void;
}

interface Plan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
}

export const SubscriptionOverlay: React.FC<SubscriptionOverlayProps> = ({ 
  currentUser, 
  onLogout, 
  onRefreshStatus 
}) => {
  const [plans, setPlans] = useState<Plan[]>([
    { id: 'plan_1_month', name: 'Lite Plan', duration_months: 1, price: 499 },
    { id: 'plan_2_month', name: 'Starter Plan', duration_months: 2, price: 899 },
    { id: 'plan_6_month', name: 'Professional Plan', duration_months: 6, price: 2499 },
    { id: 'plan_12_month', name: 'Enterprise Plan', duration_months: 12, price: 4499 }
  ]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_6_month');
  const [loading, setLoading] = useState<boolean>(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending'>('none');
  const [message, setMessage] = useState<string>('');
  const [customLockNotice, setCustomLockNotice] = useState<string>('');

  const tenant = currentUser.tenant;
  const status = tenant?.subscriptionStatus || 'trial';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.adminGetPlans();
        if (response && response.length > 0) {
          setPlans(response);
        }
        const lockRes = await api.getLockMessage();
        if (lockRes && lockRes.message) {
          setCustomLockNotice(lockRes.message);
        }
      } catch (err) {
        console.error('Error fetching plans in overlay:', err);
      }
    };
    fetchData();
    if (status === 'pending') {
      setRequestStatus('pending');
    }
  }, [status]);

  const handleRequestSubmit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.requestSubscription({ planId: selectedPlanId });
      if (res.success) {
        setRequestStatus('pending');
        setMessage('Subscription request submitted! Waiting for Admin verification.');
        onRefreshStatus();
      } else {
        setMessage(res.error || 'Failed to submit subscription request.');
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Server error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getPlanFeatures = (planId: string) => {
    switch (planId) {
      case 'plan_1_month':
        return ['1 Active POS Terminal', 'Basic Billing Operations', 'Daily Sales Report', 'Local JSON DB Backup'];
      case 'plan_2_month':
        return ['2 Active POS Terminals', 'Billing + Kitchen Queue Sync', 'Weekly Sales Reports', '2 Staff Members Accounts'];
      case 'plan_6_month':
        return ['Unlimited POS Terminals', 'Billing, KOT and Kitchen Queue Sync', 'Advanced Reports & CRM', 'Unlimited Staff Members', 'Priority Support'];
      case 'plan_12_month':
        return ['Everything in Professional', 'Custom GST Billing Invoice Settings', 'Free Multi-Device Remote Setup', 'Dedicated 24/7 Phone Support', '15% Extra Annual Discount Applied'];
      default:
        return ['Restaurant POS Access', 'Billing Sync'];
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden select-none">
      
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-8 backdrop-blur-xl hover:shadow-indigo-500/5 transition-all duration-500">
        
        {/* Step-by-Step Activation Progress Path */}
        <div className="flex items-center justify-center max-w-lg mx-auto gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-500">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Select Plan</span>
          </div>
          <div className="h-0.5 w-10 bg-indigo-500/30"></div>
          
          <div className={`flex items-center gap-1.5 ${requestStatus === 'pending' ? 'text-amber-400' : 'text-slate-550'}`}>
            {requestStatus === 'pending' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            <span>Verification</span>
          </div>
          <div className={`h-0.5 w-10 ${requestStatus === 'pending' ? 'bg-amber-500/30' : 'bg-slate-800'}`}></div>
          
          <div className="flex items-center gap-1.5 text-slate-600">
            <Circle className="w-4 h-4" />
            <span>Activation</span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 p-0.5 shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-indigo-400">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-indigo-200 to-violet-200 bg-clip-text text-transparent">
              Access Blocked
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Your account access for restaurant <strong className="text-indigo-400 font-bold">{tenant?.clinicName || 'Rio Restro'}</strong> is currently locked.
            </p>
            {customLockNotice && (
              <div className="mt-3 p-3.5 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded-xl max-w-xl mx-auto leading-relaxed font-semibold">
                📢 {customLockNotice}
              </div>
            )}
          </div>
        </div>

        {/* Message Panel Alert */}
        {message && (
          <div className="p-4 bg-indigo-950/20 border border-indigo-850/40 text-indigo-300 text-xs rounded-2xl text-center leading-relaxed font-semibold">
            {message}
          </div>
        )}

        {/* Content Section */}
        {requestStatus === 'pending' ? (
          <div className="bg-slate-950/40 border border-slate-850 p-10 rounded-3xl text-center space-y-6 max-w-lg mx-auto shadow-inner">
            <div className="relative mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-200">System Admin Reviewing Request</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                We've submitted your requested subscription plan. Once the system administrator reviews and accepts your request, your panel will automatically unlock.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-2">
              <button
                onClick={onRefreshStatus}
                className="py-3 px-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-Check Status
              </button>
              
              <button
                onClick={onLogout}
                className="py-3 px-6 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            
            {/* Left Side: Plan Cards Grid */}
            <div className="lg:col-span-3 space-y-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 pl-1">
                Select Pricing Plan
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between h-36 relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-gradient-to-br from-indigo-950/20 to-indigo-900/10 border-indigo-550 shadow-lg' 
                          : 'bg-slate-950/30 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      {/* Active glow corner overlay */}
                      {isSelected && (
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-lg"></div>
                      )}
                      
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                          isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-500'
                        }`}>
                          {plan.name}
                        </span>
                        
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                          isSelected 
                            ? 'bg-indigo-500 border-indigo-400 text-white' 
                            : 'border-slate-750'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Starting at</div>
                        <div className="flex items-baseline text-white">
                          <span className="text-2xl font-black tracking-tight">₹{plan.price}</span>
                          <span className="text-[10px] text-slate-500 font-medium ml-1">/ {plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Featured details for selected plan */}
            <div className="lg:col-span-2 bg-slate-950/60 border border-slate-850 rounded-3xl p-6 space-y-6">
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 block">Features Included</span>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  {plans.find(p => p.id === selectedPlanId)?.name} Configuration
                </h4>
              </div>

              <ul className="space-y-3">
                {getPlanFeatures(selectedPlanId).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                    <BadgeCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-slate-850">
                <button
                  onClick={handleRequestSubmit}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-550/20 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  {loading ? 'Requesting Activation...' : 'Request Activation Plan'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        {!requestStatus && (
          <div className="text-center pt-4 border-t border-slate-850 flex justify-center gap-4">
            <button
              onClick={onLogout}
              className="py-2.5 px-6 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
