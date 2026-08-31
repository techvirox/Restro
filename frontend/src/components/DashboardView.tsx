import React, { useMemo, useState } from 'react';
import { MenuItem, Table, TableOrder, KOT, EstimateBill } from '../types';
import { 
  DollarSign, 
  Users, 
  ChefHat, 
  Receipt, 
  ShoppingCart, 
  TrendingUp, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  TrendingDown,
  Sparkles,
  CreditCard,
  Building,
  Bike
} from 'lucide-react';
import { soundEffects } from './SoundUtility';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface DashboardViewProps {
  tables: Table[];
  orders: TableOrder[];
  kots: KOT[];
  bills: EstimateBill[];
  menu: MenuItem[];
  onSelectTab: (tab: 'dashboard' | 'tables' | 'kitchen' | 'billing' | 'settings' | 'calculator' | 'reports' | 'waiters') => void;
  onQuickOrder: (type: 'takeaway' | 'delivery') => void;
  onSelectTable: (table: Table) => void;
  inventoryThreshold: number;
  setInventoryThreshold: (value: number) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tables,
  orders,
  kots,
  bills,
  menu,
  onSelectTab,
  onQuickOrder,
  onSelectTable,
  inventoryThreshold,
  setInventoryThreshold,
  onUpdateMenuItem
}) => {
  // 1. Calculations
  const statistics = useMemo(() => {
    const totalSales = bills
      .filter(b => b.type === 'invoice')
      .reduce((sum, b) => sum + b.grandTotal, 0);

    const activeTablesCount = tables.filter(t => t.activeOrderId || t.status !== 'vacant').length;
    const occupancyRate = tables.length > 0 ? Math.round((activeTablesCount / tables.length) * 100) : 0;
    
    // Active orders total estimated draft amount
    const activeOrdersAmount = orders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Filter non-completed, non-cancelled KOTs
    const activeKotsCount = kots.filter(k => k.status !== 'completed' && k.status !== 'cancelled').length;

    // Payment methods division
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    
    bills.forEach(b => {
      if (b.type === 'invoice') {
        if (b.paymentMethod === 'cash') cashSales += b.grandTotal;
        else if (b.paymentMethod === 'upi') upiSales += b.grandTotal;
        else if (b.paymentMethod === 'card') cardSales += b.grandTotal;
      }
    });

    // Count item sales for dynamic metrics
    const itemSalesCount: { [key: string]: { qty: number; name: string; image?: string; price: number } } = {};
    bills.forEach(b => {
      b.items.forEach(it => {
        const itemId = it.menuItemId || (it as any).id || '';
        if (!itemSalesCount[itemId]) {
          const menuItem = menu.find(m => m.id === itemId);
          itemSalesCount[itemId] = { 
            qty: 0, 
            name: it.name, 
            image: menuItem?.image, 
            price: it.price 
          };
        }
        itemSalesCount[itemId].qty += it.quantity;
      });
    });

    const popularItems = Object.values(itemSalesCount)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Kitchen queue items
    const kitchenQueueItems: Array<{ dishName: string; qty: number; status: string; kotNumber: string; table: string }> = [];
    kots.filter(k => k.status !== 'completed' && k.status !== 'cancelled').slice(0, 5).forEach(kot => {
      kot.items.forEach(it => {
        if (it.status !== 'ready' && it.status !== 'served' && it.status !== 'cancelled') {
          kitchenQueueItems.push({
            dishName: it.name,
            qty: it.quantity,
            status: it.status,
            kotNumber: kot.kotNumber,
            table: kot.tableName
          });
        }
      });
    });

    // Unavailable Items Counter
    const outOfStockCount = menu.filter(m => !m.available).length;

    return {
      totalSales,
      activeTablesCount,
      occupancyRate,
      activeOrdersAmount,
      activeKotsCount,
      cashSales,
      upiSales,
      cardSales,
      popularItems,
      kitchenQueueItems,
      outOfStockCount
    };
  }, [tables, orders, kots, bills, menu]);

  // Inventory Tracker States and Memo calculations
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'low' | 'all'>('low');

  const lowStockItems = useMemo(() => {
    return menu.filter(item => (item.stockQuantity ?? 15) < inventoryThreshold);
  }, [menu, inventoryThreshold]);

  const filteredInventoryItems = useMemo(() => {
    const targetItems = inventoryFilter === 'low' ? lowStockItems : menu;
    if (!inventorySearch.trim()) return targetItems;
    const q = inventorySearch.toLowerCase().trim();
    return targetItems.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.code.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q)
    );
  }, [menu, lowStockItems, inventoryFilter, inventorySearch]);

  // Aggregate weekly sales metrics (last 7 days including today)
  const lastSevenDaysRevenue = useMemo(() => {
    const trendMap: Record<string, number> = {};
    const days: string[] = [];
    const dateLabels: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toDateString();
      const displayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      days.push(dateString);
      dateLabels.push(displayLabel);
      trendMap[dateString] = 0;
    }

    bills.forEach(bill => {
      if (bill.type === 'invoice') {
        const bDate = new Date(bill.createdAt);
        const bDateString = bDate.toDateString();
        if (trendMap[bDateString] !== undefined) {
          trendMap[bDateString] += bill.grandTotal;
        }
      }
    });

    return days.map((day, idx) => ({
      date: dateLabels[idx],
      revenue: parseFloat(trendMap[day].toFixed(2)),
    }));
  }, [bills]);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div id="central-dashboard-view" className="space-y-4 sm:space-y-6">
      
      {/* Dynamic Warm Greeting Banner */}
      <div className="relative p-5 sm:p-6 lg:p-7 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/80 dark:via-slate-900 dark:to-violet-950/60 rounded-2xl text-slate-800 dark:text-white border border-indigo-100/60 dark:border-indigo-800/25 overflow-hidden shadow-[0_1px_4px_rgba(99,102,241,0.06)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/6 to-violet-500/4 dark:from-indigo-500/12 dark:to-violet-500/8 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/5 dark:bg-teal-400/8 rounded-full blur-3xl -ml-12 -mb-12"></div>
        
        <div className="relative flex flex-col gap-4">
          {/* Header text */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-indigo-500/15 border border-indigo-100/60 dark:border-indigo-500/20 text-[10px] uppercase font-mono tracking-wider w-fit text-indigo-600 dark:text-indigo-300 font-bold backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span>Command Center</span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 dark:from-white dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent">
              Kitchen & Billing Real-time Status
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl hidden sm:block leading-relaxed">
              Track seating, prepare dishes, issue estimates, and settle customer tickets — all in one seamless workspace.
            </p>
          </div>

          {/* Quick Counter Sale Action Block */}
          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 bg-white/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/30 shadow-sm backdrop-blur-sm">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase font-bold shrink-0 tracking-wider">Quick Sale:</span>
            <div className="flex gap-2 flex-1">
              <button
                id="quick-sale-takeaway-btn"
                onClick={() => {
                  soundEffects.playSuccessChime();
                  onQuickOrder('takeaway');
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.97] text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200/60 dark:shadow-indigo-900/40"
              >
                <Building className="w-3.5 h-3.5" />
                <span>+ Takeaway</span>
              </button>
              <button
                id="quick-sale-delivery-btn"
                onClick={() => {
                  soundEffects.playSuccessChime();
                  onQuickOrder('delivery');
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/90 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200/60 dark:border-slate-600/30 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.97] backdrop-blur-sm"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>+ Delivery</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Numerical Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Today's Revenue */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden metric-accent-indigo stat-card-shine transition-all duration-300 hover:shadow-md hover:border-indigo-200/60 dark:hover:border-indigo-800/30">
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Today's Revenue</span>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono truncate">₹{statistics.totalSales.toLocaleString()}</h3>
            <span className="text-[9px] text-emerald-500 font-mono font-bold hidden xs:flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Steady sales
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-950/50 dark:to-indigo-900/30 border border-indigo-100/80 dark:border-indigo-800/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <DollarSign className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Card 2: Active Seating occupancy */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden metric-accent-teal stat-card-shine transition-all duration-300 hover:shadow-md hover:border-teal-200/60 dark:hover:border-teal-800/30">
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Table Occupancy</span>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">{statistics.activeTablesCount}/{tables.length}</h3>
            <span className="text-[9px] text-teal-500 dark:text-teal-400 font-mono font-bold hidden xs:block">
              {statistics.occupancyRate}% occupied
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/60 dark:from-teal-950/50 dark:to-teal-900/30 border border-teal-100/80 dark:border-teal-800/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Card 3: Pending KOT queue */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden metric-accent-amber stat-card-shine transition-all duration-300 hover:shadow-md hover:border-amber-200/60 dark:hover:border-amber-800/30">
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Kitchen Tickets</span>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">{statistics.activeKotsCount} <span className="text-sm font-bold text-slate-400">Pending</span></h3>
            <span className="text-[9px] text-amber-500 font-mono font-bold hidden xs:block">
              {statistics.kitchenQueueItems.length} preparing
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/50 dark:to-amber-900/30 border border-amber-100/80 dark:border-amber-800/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ChefHat className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Card 4: Bills settled today */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden metric-accent-emerald stat-card-shine transition-all duration-300 hover:shadow-md hover:border-emerald-200/60 dark:hover:border-emerald-800/30">
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Settle Invoices</span>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">{bills.length} <span className="text-sm font-bold text-slate-400">Slips</span></h3>
            <span className="text-[9px] text-emerald-500 font-mono font-bold hidden xs:block">
              No errors
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-100/80 dark:border-emerald-800/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Receipt className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
        </div>

      </div>

      {/* Main double column contents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

        {/* Col 1: Floor quick monitoring list (8 cols span) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">

          {/* Daily Sales Trend Chart Card */}
          <div id="daily-sales-trend-chart-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Daily Sales Trend (Last 7 Days)</span>
                </h3>
                <p className="text-[10px] text-slate-400">Interactive line visualization of weekly sales velocity and peak metrics</p>
              </div>
              <div className="text-[10px] font-mono font-bold bg-indigo-55 bg-opacity-10 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-405 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                7-Day Total: ₹{lastSevenDaysRevenue.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
              </div>
            </div>

            <div className="w-full h-64 pr-2 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={lastSevenDaysRevenue}
                  margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                    dx={-4}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '11px',
                      fontFamily: 'Inter, sans-serif',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                    }}
                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'medium' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                    dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Seating Layout Quick Bento */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Live Table Seating Overview</h3>
                <p className="text-[10px] text-slate-400">Click occupied/ordering tab below to start billing quickly</p>
              </div>
              <button 
                onClick={() => {
                  soundEffects.playTick();
                  onSelectTab('tables');
                }}
                className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold transition-all"
              >
                <span>Full Floor Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Micro grid of tables */}
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {tables.slice(0, 8).map((table) => {
                const isOccupied = table.activeOrderId || table.status !== 'vacant';
                
                // Color mapping
                let statusBg = 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850 hover:border-slate-300';
                let tagColor = 'bg-slate-100 dark:bg-slate-800 text-slate-500';
                let tagLabel = 'Vacant';

                if (table.status === 'ordering') {
                  statusBg = 'bg-amber-50/70 border-amber-200 hover:border-amber-400';
                  tagColor = 'bg-amber-100 text-amber-700 font-bold';
                  tagLabel = 'Adding';
                } else if (table.status === 'kot_pending') {
                  statusBg = 'bg-indigo-50/70 border-indigo-200 hover:border-indigo-400';
                  tagColor = 'bg-indigo-100 text-indigo-700 font-bold';
                  tagLabel = 'KOT Fired';
                } else if (table.status === 'billed') {
                  statusBg = 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400';
                  tagColor = 'bg-emerald-100 text-emerald-700 font-bold';
                  tagLabel = 'Estimated';
                }

                return (
                  <div
                    key={table.id}
                    onClick={() => {
                      soundEffects.playTick();
                      onSelectTable(table);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${statusBg} relative group`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                        {table.name}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase scale-90 ${tagColor}`}>
                        {tagLabel}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isOccupied ? (table.currentWaiter || 'Customer Active') : `${table.capacity} Seater`}
                      </span>
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 group-hover:underline font-bold">
                        Open POS ↗
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kitchen Monitoring Board */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Live Kitchen Queue Status</h3>
                <p className="text-[10px] text-slate-400">Preparation status of active dishes inside kitchen</p>
              </div>
              <button 
                onClick={() => {
                  soundEffects.playTick();
                  onSelectTab('kitchen');
                }}
                className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold transition-all"
              >
                <span>Live Kitchen Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {statistics.kitchenQueueItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 rounded-xl text-center border border-slate-150 dark:border-slate-850">
                <ChefHat className="w-8 h-8 text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Kitchen Fire is Vacant</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Select empty tables or place takeaway orders to trigger KOTs.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {statistics.kitchenQueueItems.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.dishName} <span className="text-indigo-600 font-mono">x{item.qty}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {item.table} • ticket {item.kotNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[9px] border border-amber-150 dark:border-amber-900 px-2 py-0.5 rounded-lg font-bold uppercase">
                        <Clock className="w-3 h-3 animate-spin duration-3000" />
                        <span>{item.status === 'ordered' ? 'Preparing' : item.status}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Inventory Watchlist & Stock Tracker */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-850">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block"></span>
                  <span>Live Menu Stock & Low-Stock Alerts</span>
                </h3>
                <p className="text-[10px] text-slate-400">Keep track of ingredient portions and adjust alert threshold levels</p>
              </div>

              {/* Threshold control */}
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                <span className="text-[9px] font-bold text-slate-400 font-mono">ALERT THRESHOLD:</span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setInventoryThreshold(Math.max(1, inventoryThreshold - 1));
                    }}
                    className="w-5 h-5 rounded bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-white cursor-pointer hover:bg-slate-100"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-black text-indigo-650 dark:text-indigo-400 font-mono w-5 text-center">{inventoryThreshold}</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setInventoryThreshold(inventoryThreshold + 1);
                    }}
                    className="w-5 h-5 rounded bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-white cursor-pointer hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Filter buttons & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setInventoryFilter('low');
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    inventoryFilter === 'low'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
                  }`}
                >
                  ⚠️ Critical Alerts ({lowStockItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setInventoryFilter('all');
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    inventoryFilter === 'all'
                      ? 'bg-slate-805 text-white dark:bg-slate-700 shadow-xs'
                      : 'bg-slate-100 text-slate-655 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
                  }`}
                >
                  All Menu Items ({menu.length})
                </button>
              </div>

              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search dish name/code..."
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg py-1 px-2.5 text-[10px] w-full sm:w-44 outline-none text-slate-800 dark:text-white"
              />
            </div>

            {/* List/Grid of items */}
            {filteredInventoryItems.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                <div className="text-2xl mb-1.5 font-sans">🎉</div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  {inventoryFilter === 'low' ? 'No stock-level alert warnings!' : 'No matching dish found'}
                </h4>
                <p className="text-[9px] text-slate-400 max-w-xs mx-auto mt-0.5">
                  {inventoryFilter === 'low' 
                    ? `All available recipes are well-stocked above ${inventoryThreshold} portions. Dynamic warnings appear if stock drops below.` 
                    : 'Try checking your search characters or categories.'}
                </p>
                {inventoryFilter === 'low' && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setInventoryFilter('all');
                    }}
                    className="mt-3 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer inline-block"
                  >
                    View All Current Stock
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredInventoryItems.map((item) => {
                  const stock = item.stockQuantity ?? 15;
                  const isLow = stock < inventoryThreshold;
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isLow
                          ? 'bg-rose-50/70 dark:bg-rose-955/25 border-rose-300 dark:border-rose-900 shadow-xs ring-1 ring-rose-200 dark:ring-transparent'
                          : 'bg-slate-50/30 border-slate-100 dark:bg-slate-950/20 dark:border-slate-850 hover:bg-slate-50/50'
                      } flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className={`font-extrabold text-[11px] truncate ${isLow ? 'text-rose-700 dark:text-rose-405 font-black' : 'text-slate-800 dark:text-slate-100'}`}>
                            {item.name}
                          </span>
                          <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-slate-205/60 dark:bg-slate-800 text-slate-500 break-keep">
                            {item.code}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-mono uppercase">{item.category}</span>
                          {isLow ? (
                            <span className="text-[8px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wide flex items-center gap-0.5 animate-pulse">
                              ⚠️ Low Stock
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-wide">
                              Stable Stock
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-150/40 dark:border-slate-850 flex items-center justify-between">
                        <span className={`text-[11px] font-mono font-extrabold ${isLow ? 'text-rose-700 dark:text-rose-405' : 'text-slate-700 dark:text-slate-300'}`}>
                          Stock: {stock}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playSuccessChime();
                            onUpdateMenuItem({
                              ...item,
                              stockQuantity: stock + 10
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer transition-all ${
                            isLow 
                              ? 'bg-rose-600 text-white hover:bg-rose-700' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          title="Click to quickly replenish stock by +10"
                        >
                          +10 Refill
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Col 2: Side panels (4 cols span) - Popular Dishes & Stock alerts */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">

          {/* Settle Distribution Payments ledger bar chart mockup */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Finance Split Today</h3>
            
            <div className="space-y-4">
              
              {/* Payment Stack Horizontal graph */}
              <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded-full flex overflow-hidden">
                {(() => {
                  const total = statistics.cashSales + statistics.upiSales + statistics.cardSales || 1;
                  const cashPercent = (statistics.cashSales / total) * 100;
                  const upiPercent = (statistics.upiSales / total) * 100;
                  const cardPercent = (statistics.cardSales / total) * 100;

                  return (
                    <>
                      {statistics.cashSales > 0 && <div style={{ width: `${cashPercent}%` }} className="bg-emerald-500 hover:opacity-90 transition-all cursor-help" title={`Cash: ₹${statistics.cashSales}`} />}
                      {statistics.upiSales > 0 && <div style={{ width: `${upiPercent}%` }} className="bg-indigo-500 hover:opacity-90 transition-all cursor-help" title={`UPI: ₹${statistics.upiSales}`} />}
                      {statistics.cardSales > 0 && <div style={{ width: `${cardPercent}%` }} className="bg-amber-500 hover:opacity-90 transition-all cursor-help" title={`Card: ₹${statistics.cardSales}`} />}
                    </>
                  );
                })()}
              </div>

              {/* Legend detailed breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">CASH</span>
                  <p className="font-mono text-[10px] font-black text-slate-800 dark:text-white">₹{statistics.cashSales}</p>
                </div>
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase">UPI</span>
                  <p className="font-mono text-[10px] font-black text-slate-800 dark:text-white">₹{statistics.upiSales}</p>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-100 dark:border-amber-900">
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block uppercase">CARD</span>
                  <p className="font-mono text-[10px] font-black text-slate-800 dark:text-white">₹{statistics.cardSales}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Popular dishes side card panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Top-Selling Culinary Dishes</h3>
              <span className="text-[9px] uppercase font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">Bestsellers</span>
            </div>

            {statistics.popularItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="text-xs">No customer orders recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statistics.popularItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/30 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          <ChefHat className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">₹{item.price}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {item.qty} units
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Warnings panel (Unavailable/Sold Out dishes) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Checklist</h3>
              {statistics.outOfStockCount > 0 ? (
                <span className="flex items-center space-x-1 py-0.5 px-2 bg-amber-500/15 border border-amber-500/20 text-amber-600 text-[9px] rounded-full font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{statistics.outOfStockCount} Warning</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 py-0.5 px-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 text-[9px] rounded-full font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>All Loaded</span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-sans text-slate-600 dark:text-slate-350 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850">
                <span>Sold Out Culinary Dishes:</span>
                <span className="font-bold text-slate-800 dark:text-white">{statistics.outOfStockCount}</span>
              </div>
              <div 
                onClick={() => {
                  soundEffects.playTick();
                  onSelectTab('settings');
                }}
                className="group flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-350 dark:hover:text-indigo-400 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-105 hover:border-slate-250 cursor-pointer transition-all"
              >
                <span>Add new item to menu:</span>
                <span className="group-hover:translate-x-0.5 transition-transform"><Plus className="w-3.5 h-3.5" /></span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
