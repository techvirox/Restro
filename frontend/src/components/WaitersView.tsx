import React, { useState, useMemo, useEffect } from 'react';
import { Table, EstimateBill, TableOrder } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Star, 
  Coins, 
  UserCheck, 
  TrendingUp, 
  Award, 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle,
  ShoppingBag,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { soundEffects } from './SoundUtility';
import { api } from '../services/api';

export interface Waiter {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  commissionRate: number; // e.g. 5%
  rating: number; // e.g., 4.5
  joiningDate: string;
}

interface WaitersViewProps {
  waiters: Waiter[];
  tables: Table[];
  bills: EstimateBill[];
  orders: TableOrder[];
  onAddWaiter: (waiter: Omit<Waiter, 'id'>) => void;
  onUpdateWaiter: (waiter: Waiter) => void;
  onDeleteWaiter: (id: string) => void;
  isDemo?: boolean;
}

export const WaitersView: React.FC<WaitersViewProps> = ({
  waiters,
  tables,
  bills,
  orders,
  onAddWaiter,
  onUpdateWaiter,
  onDeleteWaiter,
  isDemo = true
}) => {
  // Local Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionRate, setCommissionRate] = useState(4);
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  
  // Login credentials and role states
  const [staffRole, setStaffRole] = useState<'waiter' | 'kot'>('waiter');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);

  const fetchStaffList = async () => {
    if (!isDemo) {
      try {
        const staff = await api.getStaff();
        setStaffList(staff);
      } catch (err) {
        console.error("Error fetching staff list:", err);
      }
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, [isDemo, waiters]);

  // Submit Add form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      alert("Please specify a valid Staff Name!");
      return;
    }
    if (!phone.trim()) {
      alert("Please specify a valid Phone Number!");
      return;
    }
    
    soundEffects.playSuccessChime();

    if (!isDemo) {
      // Sync login details with backend first
      if (!password.trim()) {
        setFormError("Password is required for setting up staff login credentials.");
        return;
      }
      try {
        await api.addStaff({
          phone: phone.trim(),
          password: password.trim(),
          name: name.trim(),
          role: staffRole
        });
        
        if (staffRole === 'waiter') {
          onAddWaiter({
            name: name.trim(),
            phone: phone.trim(),
            commissionRate: Number(commissionRate) || 0,
            rating: Number(rating) || 5,
            status: 'active',
            joiningDate: new Date().toISOString().split('T')[0]
          });
        } else {
          // If kitchen staff, just refresh the listing directly
          fetchStaffList();
        }
      } catch (err: any) {
        console.error(err);
        setFormError(err.response?.data?.error || "Failed to create staff member credentials.");
        return;
      }
    } else {
      // Demo Mode local simulation
      if (staffRole === 'waiter') {
        onAddWaiter({
          name: name.trim(),
          phone: phone.trim() || 'N/A',
          commissionRate: Number(commissionRate) || 0,
          rating: Number(rating) || 5,
          status: 'active',
          joiningDate: new Date().toISOString().split('T')[0]
        });
      }
    }

    setName('');
    setPhone('');
    setPassword('');
    setCommissionRate(4);
    setRating(5);
    setStaffRole('waiter');
    setIsAdding(false);
  };

  // Submit Edit form
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingId) return;
    soundEffects.playSuccessChime();
    onUpdateWaiter({
      id: editingId,
      name: name.trim(),
      phone: phone.trim() || 'N/A',
      commissionRate: Number(commissionRate) || 0,
      rating: Number(rating) || 5,
      status,
      joiningDate: waiters.find(w => w.id === editingId)?.joiningDate || new Date().toISOString().split('T')[0]
    });
    setName('');
    setPhone('');
    setCommissionRate(4);
    setRating(5);
    setEditingId(null);
  };

  // Click edit button
  const startEdit = (waiter: Waiter) => {
    soundEffects.playTick();
    setEditingId(waiter.id);
    setName(waiter.name);
    setPhone(waiter.phone);
    setCommissionRate(waiter.commissionRate);
    setRating(waiter.rating);
    setStatus(waiter.status);
    setIsAdding(false);
  };

  // Compute dynamic performance metrics for all waiters
  const waiterStats = useMemo(() => {
    const stats: { 
      [waiterName: string]: { 
        ordersCount: number; 
        salesVolume: number; 
        commissionEarned: number; 
        activeTables: string[];
      } 
    } = {};

    // Initialize stats with stored waiters
    waiters.forEach(w => {
      stats[w.name] = {
        ordersCount: 0,
        salesVolume: 0,
        commissionEarned: 0,
        activeTables: []
      };
    });

    // Calculate completed stats from bills
    bills.forEach(b => {
      if (b.type === 'invoice') {
        const nameKey = b.currentWaiter || 'Self';
        if (!stats[nameKey]) {
          stats[nameKey] = { ordersCount: 0, salesVolume: 0, commissionEarned: 0, activeTables: [] };
        }
        stats[nameKey].ordersCount += 1;
        stats[nameKey].salesVolume += b.grandTotal;

        // Calculate commission
        const matchingWaiter = waiters.find(w => w.name === nameKey);
        const commPercent = matchingWaiter ? matchingWaiter.commissionRate : 0;
        stats[nameKey].commissionEarned += (b.grandTotal * commPercent) / 100;
      }
    });

    // Add active assigned tables
    tables.forEach(t => {
      const isOccupied = t.activeOrderId || t.status !== 'vacant';
      if (isOccupied && t.currentWaiter) {
        const nameKey = t.currentWaiter;
        if (!stats[nameKey]) {
          stats[nameKey] = { ordersCount: 0, salesVolume: 0, commissionEarned: 0, activeTables: [] };
        }
        stats[nameKey].activeTables.push(t.name);
      }
    });

    return stats;
  }, [waiters, bills, tables]);

  const displayStaffList = useMemo(() => {
    if (isDemo) {
      return waiters.map(w => ({
        id: w.id,
        name: w.name,
        phone: w.phone,
        role: 'waiter' as const,
        status: w.status,
        commissionRate: w.commissionRate,
        rating: w.rating,
        joiningDate: w.joiningDate,
        rawObj: w
      }));
    }

    // Database mode: merge waiters (commission specs) and kitchen staff
    return staffList.map(s => {
      const matchingWaiter = waiters.find(w => w.phone === s.phone);
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        role: s.role as 'waiter' | 'kot',
        status: matchingWaiter ? matchingWaiter.status : 'active' as const,
        commissionRate: matchingWaiter ? matchingWaiter.commissionRate : 0,
        rating: matchingWaiter ? matchingWaiter.rating : 5,
        joiningDate: matchingWaiter ? matchingWaiter.joiningDate : s.created_at?.split('T')[0] || '',
        rawObj: matchingWaiter || s
      };
    });
  }, [isDemo, waiters, staffList]);

  // Overall statistics summaries
  const totals = useMemo(() => {
    let totalComm = 0;
    let totalAssignedSales = 0;
    let activeStaffCount = displayStaffList.filter(w => w.status === 'active').length;

    Object.values(waiterStats).forEach((s: any) => {
      totalComm += s.commissionEarned;
      totalAssignedSales += s.salesVolume;
    });

    return { totalComm, totalAssignedSales, activeStaffCount };
  }, [waiterStats, displayStaffList]);

  const handleDeleteStaff = async (phone: string, id: string, role: string) => {
    if (confirm(`Confirm deletion of this staff member?`)) {
      soundEffects.playTick();
      if (!isDemo) {
        try {
          await api.deleteStaff(phone);
          if (role === 'waiter') {
            onDeleteWaiter(id);
          } else {
            fetchStaffList();
          }
        } catch (err) {
          console.error("Error deleting staff:", err);
          alert("Failed to delete staff member.");
        }
      } else {
        if (role === 'waiter') {
          onDeleteWaiter(id);
        }
      }
    }
  };

  return (
    <div id="waiter-module-container" className="space-y-6">
      
      {/* 3 Overview dynamic tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Roster Size</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">{totals.activeStaffCount} Active</h3>
            <p className="text-[9px] text-slate-400 font-sans">Total {displayStaffList.length} registered staff</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Attributed Sales</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">₹{totals.totalAssignedSales.toLocaleString()}</h3>
            <p className="text-[9px] text-emerald-500 font-sans font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Tracked via billing slips
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Projected Commission</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">₹{Math.round(totals.totalComm).toLocaleString()}</h3>
            <p className="text-[9px] text-indigo-500 font-sans font-semibold">Total payout calculated</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Roster Listing / Form (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Waiters Roster Management</h3>
                <p className="text-[10px] text-slate-400">Add waitstaff names to enable POS assignment and calculate commissions</p>
              </div>
              
              {!isAdding && !editingId && (
                <button
                  onClick={() => {
                    soundEffects.playTick();
                    setIsAdding(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Waiter</span>
                </button>
              )}
            </div>

            {/* Quick Registration Form */}
            {(isAdding || editingId) && (
              <form onSubmit={isAdding ? handleAddSubmit : handleEditSubmit} className="bg-slate-50 dark:bg-slate-950/40 border border-indigo-100 dark:border-slate-800/80 p-4 rounded-xl space-y-3 mb-5 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    {isAdding ? 'Register New Staff Member' : 'Modify Captain Details'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setIsAdding(false);
                      setEditingId(null);
                      setFormError('');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                {formError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-rose-300 text-[10px] rounded-lg font-bold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Staff Name (As shown on bill)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white rounded-lg outline-none font-sans"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number (Login ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white rounded-lg outline-none font-mono"
                      required
                    />
                  </div>
                  {isAdding && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Staff Role</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as 'waiter' | 'kot')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white rounded-lg outline-none"
                      >
                        <option value="waiter">Waiter / Captain</option>
                        <option value="kot">Kitchen / KOT User</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {isAdding && !isDemo && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Login Password</label>
                      <input
                        type="password"
                        placeholder="Choose login password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white rounded-lg outline-none font-mono"
                        required
                      />
                    </div>
                  )}

                  {staffRole === 'waiter' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Comm. Commission %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={commissionRate}
                          onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white rounded-lg outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Performance Rating</label>
                        <select
                          value={rating}
                          onChange={(e) => setRating(parseFloat(e.target.value) || 5)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white rounded-lg outline-none"
                        >
                          <option value="5">5.0 Star (Excellent)</option>
                          <option value="4.5">4.5 Star (Very Good)</option>
                          <option value="4">4.0 Star (Good)</option>
                          <option value="3.5">3.5 Star (Satisfactory)</option>
                          <option value="3">3.0 Star (Fair)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {!isAdding && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Roster Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white rounded-lg outline-none"
                      >
                        <option value="active">Active Duty</option>
                        <option value="inactive">On Leave / Inactive</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setIsAdding(false);
                      setEditingId(null);
                      setFormError('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {isAdding ? 'Register Captain' : 'Apply Updates'}
                  </button>
                </div>
              </form>
            )}

            {/* List Table of Waiters */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10.5px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-405 uppercase text-[9px] font-mono tracking-wider">
                    <th className="py-1.5">Staff Name</th>
                    <th className="py-1.55">Role</th>
                    <th className="py-1.55">Phone</th>
                    <th className="py-1.55">Comm %</th>
                    <th className="py-1.55">Rating</th>
                    <th className="py-1.55">Status</th>
                    <th className="py-1.55">Commission Earned</th>
                    <th className="py-1.55 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {displayStaffList.map((w) => {
                    const stats = waiterStats[w.name] || { ordersCount: 0, salesVolume: 0, commissionEarned: 0, activeTables: [] };
                    
                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="py-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950/30 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-[9px] font-black">
                              {w.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span>{w.name}</span>
                              <span className="block text-[8px] text-slate-400 font-normal">Since: {w.joiningDate || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 text-slate-500 font-mono capitalize">
                          {w.role === 'kot' ? 'Kitchen (KOT)' : 'Waiter'}
                        </td>
                        <td className="py-1.5 text-slate-500 font-mono">{w.phone}</td>
                        <td className="py-1.5 text-slate-600 font-mono font-bold">
                          {w.role === 'kot' ? '—' : `${w.commissionRate}%`}
                        </td>
                        <td className="py-1.5">
                          {w.role === 'kot' ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className="flex items-center space-x-0.5 text-amber-500 font-mono font-bold">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{w.rating}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-1.5">
                          {w.status === 'active' ? (
                            <span className="inline-flex items-center space-x-0.5 py-0.5 px-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 text-[8.5px] font-bold">
                              <CheckCircle className="w-2.5 h-2.5" />
                              <span>Duty</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-0.5 py-0.5 px-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-150 text-[8.5px] font-bold">
                              <XCircle className="w-2.5 h-2.5" />
                              <span>Leave</span>
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 font-mono font-bold text-slate-800 dark:text-white">
                          {w.role === 'kot' ? '—' : `₹${Math.round(stats.commissionEarned).toLocaleString()}`}
                        </td>
                        <td className="py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            {w.role !== 'kot' && (
                              <button
                                type="button"
                                onClick={() => startEdit(w.rawObj)}
                                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded cursor-pointer"
                                title="Modify Captain"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(w.phone, w.id, w.role)}
                              className="p-0.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 dark:border-slate-800 rounded cursor-pointer"
                              title="Remove Staff"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Active Captain Tables Realtime Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2.5">Live On-Duty Table Assignments</h3>
            <p className="text-[10px] text-slate-400 mb-4">See who is currently tending to which active customer tables</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayStaffList.filter(w => w.status === 'active' && w.role === 'waiter').map((w) => {
                const stats = waiterStats[w.name] || { ordersCount: 0, salesVolume: 0, commissionEarned: 0, activeTables: [] };
                
                return (
                  <div key={w.id} className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-150 dark:border-slate-850">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 dark:text-white text-xs block">{w.name}</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                        {stats.activeTables.length} Tables
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {stats.activeTables.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic block">No active tables assigned right now</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {stats.activeTables.map((tName, i) => (
                            <span key={i} className="text-[9.5px] bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-bold border border-amber-150 dark:border-amber-900 px-2 py-0.5 rounded-md flex items-center space-x-1">
                              <LayoutGrid className="w-2.5 h-2.5" />
                              <span>{tName}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Leaderboards & Analytics (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Captain sales board */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Duty Leaderboard</h3>
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-bounce cursor-pointer" />
            </div>

            {/* Sorted by volume */}
            <div className="space-y-3.5">
              {(() => {
                const list = displayStaffList.filter(w => w.role === 'waiter').map(w => {
                  const s = waiterStats[w.name] || { ordersCount: 0, salesVolume: 0, commissionEarned: 0, activeTables: [] };
                  return { name: w.name, sales: s.salesVolume, orders: s.ordersCount };
                }).sort((a,b) => b.sales - a.sales);

                const maxSales = Math.max(...list.map(l => l.sales), 1);

                return list.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-slate-400 w-3">{index + 1}.</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{item.sales.toLocaleString()}</span>
                        <span className="block text-[8.5px] text-slate-400">{item.orders} slips</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${(item.sales / maxSales) * 100}%` }} 
                        className="h-full bg-indigo-600 rounded-full"
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Settle Distribution Payments ledger bar chart mockup */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Calculated Payouts</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Commissions are accrued dynamically based on settled invoices only. No pro-forma or draft orders are added to calculations.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-850 pt-2">
              {displayStaffList.filter(w => w.role === 'waiter').map(w => {
                const s = waiterStats[w.name] || { ordersCount: 0, salesVolume: 0, commissionEarned: 0, activeTables: [] };
                return (
                  <div key={w.id} className="py-2.5 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{w.name}</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">Rate: {w.commissionRate}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#1a1c23] dark:text-white">₹{Math.round(s.commissionEarned)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
