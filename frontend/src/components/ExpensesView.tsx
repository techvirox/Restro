import React, { useState, useMemo } from 'react';
import { 
  TrendingDown, Plus, Trash2, Calendar, Search, Filter, 
  Sparkles, DollarSign, Briefcase, FileText, CheckCircle, ArrowDownCircle,
  AlertCircle
} from 'lucide-react';
import { OperatingExpense } from '../types';
import { soundEffects } from './SoundUtility';

interface ExpensesViewProps {
  expenses: OperatingExpense[];
  onAddExpense: (description: string, category: any, amount: number, date: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  // Local state for search & filtering inside Expense Entry
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Expense Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Rent' | 'Salaries' | 'Utilities' | 'Supplies' | 'Marketing' | 'Maintenance' | 'Miscellaneous'>('Utilities');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Handle new entry submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddExpense(description.trim(), category, parsedAmount, date);
    soundEffects.playSuccessChime();
    
    // Clear form inputs
    setDescription('');
    setAmount('');
  };

  // Filter & Search Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchSearch = exp.description.toLowerCase().includes(search.toLowerCase()) || 
                          exp.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      return matchSearch && matchCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, categoryFilter]);

  // Totals calculations
  const totals = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return { totalAmount, categoryTotals };
  }, [filteredExpenses]);

  // Pre-defined list of categories
  const categoriesList = [
    { value: 'Rent', label: 'Rent & Lease', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    { value: 'Salaries', label: 'Staff Salaries', color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
    { value: 'Utilities', label: 'Utilities & Bills', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
    { value: 'Supplies', label: 'Operating Supplies', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    { value: 'Marketing', label: 'Marketing & Ads', color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
    { value: 'Maintenance', label: 'Maintenance & Repairs', color: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
    { value: 'Miscellaneous', label: 'Miscellaneous Outflows', color: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800' },
  ];

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100" id="expenses-direct-view">
      {/* Page Title Header banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/80 shadow-3xs" id="expenses-header-banner">
        <div>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-450">
            <TrendingDown className="w-5 h-5" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/40">Financial Outflows</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black mt-1 tracking-tight text-slate-900 dark:text-white">Operating Expense (OPEX) Entry</h1>
          <p className="text-xs text-slate-400 mt-0.5">Post and manage day-to-day indirect debits, salaries, utilities, and commercial overheads in real time.</p>
        </div>
        <div id="quick-metric-bubble" className="bg-[#fcfdfe] dark:bg-[#151720] border border-slate-150 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ArrowDownCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold leading-none">Total Outflow Selected</span>
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white block mt-1">₹{totals.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Main interactive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="expenses-content-grid">
        
        {/* Form Container: Post a New Expense */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-5" id="expenses-post-container">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Briefcase className="w-4.5 h-4.5 text-slate-400" />
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">Post Expense Outflow</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="expenses-interactive-entry-form">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Outflow Category</label>
              <select
                value={category}
                onChange={(e) => {
                  soundEffects.playTick();
                  setCategory(e.target.value as any);
                }}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                id="expense-view-cat-select"
              >
                <option value="Rent">Rent & Lease</option>
                <option value="Salaries">Staff Salaries</option>
                <option value="Utilities">Utilities (Gas, Electricity, Water)</option>
                <option value="Supplies">Operating Supplies</option>
                <option value="Marketing">Marketing & Ad Campaigns</option>
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Particulars / Description</label>
              <input
                type="text"
                placeholder="e.g., Gas cylinder replacement"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                id="expense-view-desc-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Debit Amount (₹)</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                  id="expense-view-amount-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-405 block">Debit Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="expense-view-date-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-mono uppercase font-black text-[11px] rounded-xl tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-xs"
              id="submit-expense-outflow-btn"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Post Outflow Entry</span>
            </button>
          </form>

          {/* Quick Category Summary breakdown inside form column */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2" id="expense-sidebar-category-payouts">
            <h4 className="text-[10px] font-mono uppercase font-black text-slate-400">Class Outflow Shares</h4>
            <div className="space-y-1.5 font-mono text-[10px]">
              {categoriesList.map((cat) => {
                const totalVal = totals.categoryTotals[cat.value] || 0;
                const percentage = totals.totalAmount > 0 ? (totalVal / totals.totalAmount) * 100 : 0;
                
                return (
                  <div key={cat.value} className="flex items-center justify-between py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                    <span className="truncate">{cat.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] text-slate-400">({percentage.toFixed(0)}%)</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">₹{totalVal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ledger & filter list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-4" id="expenses-ledger-container">
          {/* Header Controls for search & filter */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-slate-400" />
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">Outflow Debit Ledger</h2>
            </div>

            {/* Quick selectors */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Category Filter Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    soundEffects.playTick();
                    setCategoryFilter(e.target.value);
                  }}
                  className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-slate-600 dark:text-slate-300 font-sans cursor-pointer"
                  id="expense-view-ledger-filter"
                >
                  <option value="all">All Categories</option>
                  <option value="Rent">Rent & Lease</option>
                  <option value="Salaries">Staff Salaries</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Supplies">Operating Supplies</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search box input */}
          <div className="relative" id="expense-view-search-wrapper">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ledger particulars, comments, descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="expense-view-search-input"
            />
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs" id="expenses-view-ledger-table">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[9px] border-b border-slate-150 dark:border-slate-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Particulars / Details</th>
                  <th className="p-3 text-right">Debit Out (₹)</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp) => {
                    const catObj = categoriesList.find(c => c.value === exp.category) || { label: exp.category, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800' };
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="p-3 whitespace-nowrap text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${catObj.color}`}>
                            {catObj.label}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {exp.description}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-455 font-mono whitespace-nowrap">
                          ₹{exp.amount.toFixed(2)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.playTick();
                              onDeleteExpense(exp.id);
                            }}
                            className="p-1 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-all cursor-pointer border-none bg-transparent"
                            title="Remove operational outflow row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-slate-400 text-center italic font-sans text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                        <span>No expense outflows found matching search criteria in this ledger boundary.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
