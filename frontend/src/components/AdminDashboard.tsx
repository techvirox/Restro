import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  CreditCard, 
  Check, 
  X, 
  LogOut, 
  Clock, 
  ShieldAlert, 
  AlertCircle, 
  Edit3, 
  Save, 
  Calendar,
  Layers,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  RotateCcw,
  MessageSquare,
  Plus,
  Send,
  Lock,
  Power,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';
import { ThemeSelector, ColorTheme } from './ThemeSelector';
import { SupportTicket } from '../types';

interface AdminDashboardProps {
  currentUser: any;
  onLogout: () => void;
  mode: 'light' | 'dark';
  colorTheme: ColorTheme;
  onModeChange: (mode: 'light' | 'dark') => void;
  onColorThemeChange: (theme: ColorTheme) => void;
}

interface Tenant {
  id: number;
  clinic_name: string;
  owner_phone: string;
  expiry_date: string;
  is_valid: boolean | number;
  address?: string;
  created_at: string;
  subscription_status: 'trial' | 'pending' | 'active' | 'expired';
  requested_plan_id?: string;
  requested_at?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
}

interface Plan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUser, 
  onLogout,
  mode,
  colorTheme,
  onModeChange,
  onColorThemeChange
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'requests' | 'plans' | 'tickets'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [prices, setPrices] = useState<{ [id: string]: string }>({});
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<{ [id: string]: boolean }>({});
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Custom Lock Message State
  const [lockNotice, setLockNotice] = useState<string>('');
  const [savingNotice, setSavingNotice] = useState<boolean>(false);

  // New Subscription Plan Form State
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanMonths, setNewPlanMonths] = useState(1);
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);

  // Ticket reply state
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantsData = await api.adminGetTenants();
      const plansData = await api.adminGetPlans();
      const ticketsData = await api.getSupportTickets();
      const lockRes = await api.getLockMessage();
      
      setTenants(tenantsData || []);
      setPlans(plansData || []);
      setSupportTickets(ticketsData || []);
      if (lockRes && lockRes.message) {
        setLockNotice(lockRes.message);
      }
      
      const pricesMap: { [id: string]: string } = {};
      if (plansData) {
        plansData.forEach((p: Plan) => {
          pricesMap[p.id] = String(p.price);
        });
      }
      setPrices(pricesMap);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleToggleTenantValid = async (tenantId: number, currentValid: boolean | number) => {
    const nextValid = !currentValid;
    setActionLoading(prev => ({ ...prev, [tenantId + '_valid']: true }));
    try {
      const res = await api.adminToggleTenantValid(tenantId, nextValid);
      if (res.success) {
        showFeedback(res.message || `Tenant account state updated.`, 'success');
        fetchData();
      } else {
        showFeedback(res.error || 'Failed to update tenant status.', 'error');
      }
    } catch (err: any) {
      showFeedback('Error toggling tenant account', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [tenantId + '_valid']: false }));
    }
  };

  const handleApprove = async (tenantId: number) => {
    setActionLoading(prev => ({ ...prev, [tenantId + '_approve']: true }));
    try {
      const res = await api.adminApproveSubscription(tenantId);
      if (res.success) {
        showFeedback(`Subscription request approved successfully!`, 'success');
        fetchData();
      } else {
        showFeedback(res.error || 'Failed to approve request.', 'error');
      }
    } catch (err: any) {
      showFeedback('Error processing approval', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [tenantId + '_approve']: false }));
    }
  };

  const handleSaveLockNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockNotice.trim()) return;
    setSavingNotice(true);
    try {
      const res = await api.adminSaveLockMessage(lockNotice.trim());
      if (res.success) {
        showFeedback('Custom expiration lock message saved!', 'success');
      } else {
        showFeedback(res.error || 'Failed to save lock notice.', 'error');
      }
    } catch (err: any) {
      showFeedback('Error saving custom lock message.', 'error');
    } finally {
      setSavingNotice(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanMonths || !newPlanPrice) return;
    setCreatingPlan(true);
    try {
      const res = await api.adminCreatePlan({
        name: newPlanName.trim(),
        duration_months: Number(newPlanMonths),
        price: Number(newPlanPrice)
      });
      if (res.success) {
        showFeedback('New subscription plan created successfully!', 'success');
        setNewPlanName('');
        setNewPlanPrice('');
        fetchData();
      } else {
        showFeedback(res.error || 'Failed to create plan.', 'error');
      }
    } catch (err: any) {
      showFeedback('Error creating subscription plan.', 'error');
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleSavePlanPrices = async () => {
    try {
      const updatedPlans = plans.map(p => ({
        id: p.id,
        price: Number(prices[p.id] || p.price)
      }));
      const res = await api.adminUpdatePlans(updatedPlans);
      if (res.success) {
        showFeedback('Subscription plan prices updated!', 'success');
        fetchData();
      } else {
        showFeedback(res.error || 'Failed to update plan prices.', 'error');
      }
    } catch (err: any) {
      showFeedback('Error updating plan prices', 'error');
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await api.adminReplySupportTicket(ticketId, replyText.trim(), 'resolved');
      if (res.success) {
        showFeedback('Support ticket reply sent and marked resolved!', 'success');
        setReplyingTicketId(null);
        setReplyText('');
        fetchData();
      } else {
        showFeedback(res.error || 'Failed to reply ticket.', 'error');
      }
    } catch (err: any) {
      showFeedback('Error replying ticket', 'error');
    }
  };

  const filteredTenants = tenants.filter(t => {
    const clinicNameStr = (t.clinic_name || '').toLowerCase();
    const ownerPhoneStr = (t.owner_phone || t.ownerPhone || '').toLowerCase();
    const ownerNameStr = (t.ownerName || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();

    const matchesSearch = 
      clinicNameStr.includes(searchLower) ||
      ownerPhoneStr.includes(searchLower) ||
      ownerNameStr.includes(searchLower);
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && (t.is_valid === true || t.is_valid === 1);
    if (statusFilter === 'disabled') return matchesSearch && (!t.is_valid || t.is_valid === 0);
    if (statusFilter === 'pending') return matchesSearch && t.subscription_status === 'pending';
    return matchesSearch;
  });

  const pendingRequests = tenants.filter(t => t.subscription_status === 'pending');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 select-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            System Control Panel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Super Administrator Portal for Tenant Licensing, Custom Messages & Support Desk
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeSelector 
            mode={mode}
            colorTheme={colorTheme}
            onModeChange={onModeChange}
            onColorThemeChange={onColorThemeChange}
          />
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mt-4 p-4 rounded-xl border text-xs font-bold ${feedback.type === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}>
          {feedback.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 my-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${activeTab === 'tenants' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          <Building className="w-4 h-4" />
          <span>All Tenants ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${activeTab === 'requests' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Activation Requests ({pendingRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          <Lock className="w-4 h-4" />
          <span>Plans & Custom Lock Notice</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${activeTab === 'tickets' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Support Desk ({supportTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length})</span>
        </button>
      </div>

      {/* ALL TENANTS TAB */}
      {activeTab === 'tenants' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-black uppercase text-white">Restaurant Tenant Accounts</h2>
              <p className="text-xs text-slate-400">
                Enable or Disable tenant accounts directly to control access to POS software.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="Search restaurant or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-800 bg-slate-900 text-white font-semibold outline-none"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white font-semibold outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="disabled">Disabled Accounts</option>
                <option value="pending">Pending Requests</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-3">ID</th>
                  <th className="p-3">Restaurant Name</th>
                  <th className="p-3">Owner Details</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Enable / Disable Control</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No restaurant tenants found.</td>
                  </tr>
                ) : (
                  filteredTenants.map(t => {
                    const isValid = t.is_valid === 1 || t.is_valid === true;
                    return (
                      <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-900/50">
                        <td className="p-3 font-mono text-slate-400">#{t.id}</td>
                        <td className="p-3 font-bold text-white text-sm">{t.clinic_name}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-200">{t.ownerName || 'Owner'}</div>
                          <div className="font-mono text-[11px] text-slate-400">{t.owner_phone}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {t.expiry_date ? new Date(t.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isValid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {isValid ? '● Active Work' : '🛑 Account Disabled'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            disabled={actionLoading[t.id + '_valid']}
                            onClick={() => handleToggleTenantValid(t.id, isValid)}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer border-none transition-all flex items-center space-x-1.5 ml-auto ${
                              isValid 
                                ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isValid ? 'Disable Account' : 'Enable Account'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTIVATION REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 animate-fadeIn">
          <h2 className="text-base font-black uppercase text-white">Pending Subscription Activation Requests</h2>
          {pendingRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No pending subscription requests right now.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                    <th className="p-3">RESTAURANT</th>
                    <th className="p-3">OWNER PHONE</th>
                    <th className="p-3">REQUESTED PLAN</th>
                    <th className="p-3">REQUESTED AT</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(t => (
                    <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-white">{t.clinic_name}</td>
                      <td className="p-3 font-mono">{t.owner_phone}</td>
                      <td className="p-3 font-bold text-indigo-400 uppercase">{t.requested_plan_id || 'Standard'}</td>
                      <td className="p-3 font-mono text-slate-400">{t.requested_at ? new Date(t.requested_at).toLocaleString() : 'Recently'}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          disabled={actionLoading[t.id + '_approve']}
                          onClick={() => handleApprove(t.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-md"
                        >
                          Approve Subscription
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PLANS & CUSTOM LOCK NOTICE TAB */}
      {activeTab === 'plans' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Custom Lock Notice Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-rose-400">
              <Lock className="w-5 h-5" />
              <h2 className="text-base font-black uppercase text-white">Custom Expiration / Lock Message Notice</h2>
            </div>
            <p className="text-xs text-slate-400">
              Type the custom message that will be shown to users when their subscription or trial has expired / account disabled.
            </p>

            <form onSubmit={handleSaveLockNotice} className="space-y-3">
              <textarea
                required
                rows={3}
                value={lockNotice}
                onChange={(e) => setLockNotice(e.target.value)}
                placeholder="e.g. Your subscription for Rio Restro POS has expired. Please contact Admin at +91 9999999999 to renew your access."
                className="w-full text-xs p-3 rounded-xl border border-slate-800 bg-slate-900 text-white font-semibold outline-none resize-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={savingNotice}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer border-none shadow-md disabled:opacity-50 text-xs"
              >
                <Save className="w-4 h-4" />
                <span>{savingNotice ? 'Saving Notice...' : 'Save Lock Notice Message'}</span>
              </button>
            </form>
          </div>

          {/* Subscription Plans Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Plan Form */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-black uppercase text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Create New Subscription Plan
              </h2>

              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Quarterly"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white font-semibold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Duration (Months) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newPlanMonths}
                      onChange={(e) => setNewPlanMonths(Number(e.target.value))}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white font-semibold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1499"
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white font-semibold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingPlan}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer border-none shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creatingPlan ? 'Creating...' : 'Create Subscription Plan'}</span>
                </button>
              </form>
            </div>

            {/* Active Plans List */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black uppercase text-white">Active Subscription Plans</h2>
                <button
                  type="button"
                  onClick={handleSavePlanPrices}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer border-none flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save Prices
                </button>
              </div>

              <div className="space-y-3">
                {plans.map(p => (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.duration_months} Month{p.duration_months > 1 ? 's' : ''} Access</span>
                    </div>

                    <div className="flex items-center space-x-1 text-xs">
                      <span className="text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={prices[p.id] !== undefined ? prices[p.id] : p.price}
                        onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })}
                        className="w-24 p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white font-mono text-xs font-bold text-right outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT DESK TAB */}
      {activeTab === 'tickets' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-2 text-white">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-black uppercase">Support Desk & User Complaints</h2>
          </div>

          {supportTickets.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              No support tickets or complaints submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {supportTickets.map(t => (
                <div key={t.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-white">{t.userName} ({t.userPhone || 'No Phone'})</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Category: {t.type} • {new Date(t.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {t.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900 p-3.5 rounded-xl border border-slate-800 leading-relaxed font-semibold">
                    {t.description}
                  </p>

                  {t.adminReply ? (
                    <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-indigo-400 block text-[10px] uppercase">Admin Resolution Reply:</span>
                      <p className="text-slate-200">{t.adminReply}</p>
                    </div>
                  ) : (
                    <div>
                      {replyingTicketId === t.id ? (
                        <div className="space-y-2 pt-2">
                          <textarea
                            rows={2}
                            placeholder="Type resolution reply for restaurant owner..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white font-semibold outline-none resize-none"
                          />
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleReplyTicket(t.id)}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl border-none cursor-pointer"
                            >
                              Send Reply & Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyingTicketId(null)}
                              className="px-4 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border-none cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTicketId(t.id);
                            setReplyText('');
                          }}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border-none cursor-pointer flex items-center space-x-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Reply to Complaint</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
