import React, { useState } from 'react';
import { Table, TableOrder, KOT } from '../types';
import { Users, Clock, Receipt, ChefHat, Trash2, Edit2, Plus, X, Wrench, Save, QrCode, BellDot } from 'lucide-react';
import { motion } from 'motion/react';
import { soundEffects } from './SoundUtility';
import { TableBarcodeAssistant } from './TableBarcodeAssistant';

interface TableViewProps {
  tables: Table[];
  orders: TableOrder[];
  kots: KOT[];
  onSelectTable: (table: Table) => void;
  onQuickOrder: (type: 'takeaway' | 'delivery') => void;
  onAddTable?: (table: Omit<Table, 'status' | 'activeOrderId'>) => void;
  onUpdateTable?: (table: Table) => void;
  onDeleteTable?: (id: string) => void;
  tenantId?: string | number;
}

export const TableView: React.FC<TableViewProps> = ({
  tables,
  orders,
  kots,
  onSelectTable,
  onQuickOrder,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  tenantId
}) => {
  // Seating Designer Modes & Forms
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'vacant' | 'ordering' | 'kot_pending' | 'billed'>('all');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [newWaiter, setNewWaiter] = useState('');

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState(4);
  const [editWaiter, setEditWaiter] = useState('');

  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) {
      alert("Please specify a table identifier / name (e.g. Table 15)");
      return;
    }
    soundEffects.playSuccessChime();
    if (onAddTable) {
      onAddTable({
        id: `table-${Date.now()}`,
        name: newTableName.trim(),
        capacity: newCapacity,
        currentWaiter: newWaiter.trim() || undefined
      });
    }
    setNewTableName('');
    setNewCapacity(4);
    setNewWaiter('');
  };

  const handleUpdateTableSubmit = (originalTable: Table) => {
    if (!editName.trim()) {
      alert("Please specify a table identifier / name!");
      return;
    }
    soundEffects.playSuccessChime();
    if (onUpdateTable) {
      onUpdateTable({
        ...originalTable,
        name: editName.trim(),
        capacity: editCapacity,
        currentWaiter: editWaiter.trim() || undefined
      });
    }
    setEditingTableId(null);
  };
  // Helpers
  const getTableOrder = (tableId: string) => orders.find(o => o.tableId === tableId && o.status !== 'completed');
  const getTableKots = (tableId: string) => kots.filter(k => k.tableId === tableId && k.status !== 'completed');

  const getStatusBadge = (table: Table) => {
    switch (table.status) {
      case 'vacant':
        return <span className="px-1.5 py-0.25 rounded text-[8.5px] uppercase font-bold bg-[#ecfdf5] text-emerald-600 border border-emerald-200">Free</span>;
      case 'ordering':
        return <span className="px-1.5 py-0.25 rounded text-[8.5px] uppercase font-bold bg-[#fef2f2] text-red-600 border border-red-200 animate-pulse">Ordering</span>;
      case 'kot_pending': {
        const tableKots = kots.filter(k => k.tableId === table.id && k.status !== 'cancelled');
        const hasReady = tableKots.some(k => k.items.some(it => it.status === 'ready'));
        const hasCooking = tableKots.some(k => k.status === 'pending' && k.items.some(it => it.status === 'cooking'));
        
        if (hasReady) {
          return <span className="px-1.5 py-0.25 rounded text-[8.5px] uppercase font-bold bg-amber-100 text-amber-700 border border-amber-300 animate-pulse">Ready 🔔</span>;
        }
        if (hasCooking) {
          return <span className="px-1.5 py-0.25 rounded text-[8.5px] uppercase font-bold bg-[#f5f3ff] text-indigo-600 border border-indigo-200">Cooking</span>;
        }
        return <span className="px-1.5 py-0.25 rounded text-[8.5px] uppercase font-bold bg-blue-50 text-blue-600 border border-blue-200">Served</span>;
      }
      case 'billed':
        return <span className="px-1.5 py-0.25 rounded text-[8.5px] uppercase font-bold bg-[#fffbeb] text-amber-600 border border-amber-200">Billed</span>;
    }
  };

  const getStatusBorder = (table: Table) => {
    switch (table.status) {
      case 'vacant': 
        return 'border-2 border-emerald-500/60 dark:border-emerald-500/40 bg-white dark:bg-slate-900 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 relative shadow-xs transition-all duration-200';
      case 'ordering': 
        return 'border border-rose-500/40 ring-2 ring-rose-500/10 bg-rose-50/10 dark:bg-rose-950/10 relative shadow-xs hover:shadow transition-all';
      case 'kot_pending': {
        const tableKots = kots.filter(k => k.tableId === table.id && k.status !== 'cancelled');
        const hasReady = tableKots.some(k => k.items.some(it => it.status === 'ready'));
        const hasCooking = tableKots.some(k => k.status === 'pending' && k.items.some(it => it.status === 'cooking'));
        if (hasReady) {
          return 'border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 relative shadow-sm hover:shadow transition-all animate-pulse';
        }
        if (hasCooking) {
          return 'border border-indigo-500/40 dark:border-indigo-500/35 ring-2 ring-indigo-500/10 bg-white dark:bg-slate-900 relative shadow-xs hover:shadow transition-all';
        }
        return 'border-2 border-sky-500/60 dark:border-sky-500/40 bg-sky-500/5 dark:bg-sky-950/10 relative shadow-xs hover:shadow transition-all';
      }
      case 'billed': 
        return 'border-2 border-amber-500/60 dark:border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/10 relative shadow-xs hover:shadow transition-all';
    }
  };

  // Quick stats
  const vacantCount = tables.filter(t => t.status === 'vacant').length;
  const runningCount = tables.filter(t => t.status !== 'vacant').length;
  const billedCount = tables.filter(t => t.status === 'billed').length;
  const orderingCount = tables.filter(t => t.status === 'ordering').length;
  const cookingCount = tables.filter(t => t.status === 'kot_pending').length;

  const filteredTables = tables.filter(table => {
    const isVirtualTakeaway = table.id.startsWith('takeaway-') || table.id.startsWith('delivery-') || table.name.toLowerCase().includes('takeaway') || table.name.toLowerCase().includes('delivery');
    if (isVirtualTakeaway && table.status === 'vacant') {
      return false; // Automatically remove vacant takeaway tables from the seating grid
    }
    if (statusFilter === 'all') return true;
    return table.status === statusFilter;
  });

  return (
    <div id="table-view-section" className="space-y-6">
      {/* Quick Statistics Banner */}
      <div id="status-stats-grid" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div id="stat-all-tables" className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total Tables</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{tables.length}</span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">{tables.reduce((acc, t) => acc + t.capacity, 0)} Pax</span>
          </div>
        </div>
        <div id="stat-vacant-tables" className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Vacant Tables</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-405 tracking-tight">{vacantCount}</span>
            <span className="text-[10px] text-emerald-500 font-bold uppercase">Ready</span>
          </div>
        </div>
        <div id="stat-active-tables" className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Active Seating</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{runningCount}</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase">Dining</span>
          </div>
        </div>
        <div id="stat-unsettled-bills" className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Unpaid Bills</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-black text-amber-500 dark:text-amber-400 tracking-tight">{billedCount}</span>
            <span className="text-[10px] text-amber-500 font-bold uppercase">Billed</span>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div id="quick-order-shortcuts" className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-mono uppercase text-slate-400 dark:text-slate-500 mr-2">Counter Sales & Scan Tools:</label>
        <button
          id="btn-quick-takeaway"
          onClick={() => { soundEffects.playTick(); onQuickOrder('takeaway'); }}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
        >
          <Receipt className="w-4 h-4" />
          <span>New Takeaway</span>
        </button>
        <button
          id="btn-quick-delivery"
          onClick={() => { soundEffects.playTick(); onQuickOrder('delivery'); }}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
        >
          <ChefHat className="w-4 h-4" />
          <span>New Delivery Order</span>
        </button>
        
        {/* Table Barcode Scan Feature */}
        <button
          id="btn-table-barcode-scan"
          type="button"
          onClick={() => { soundEffects.playTick(); setShowBarcodeScanner(!showBarcodeScanner); }}
          className={`flex items-center space-x-2 text-sm px-4 py-2 rounded-lg font-bold shadow-sm transition-all cursor-pointer ${
            showBarcodeScanner 
              ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>{showBarcodeScanner ? 'Hide Barcode Hub (पैनल छुपाएं)' : 'Table Barcode/QR Hub (बारकोड स्कैन)'}</span>
        </button>
      </div>

      {showBarcodeScanner && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-250">
          <TableBarcodeAssistant
            tables={tables}
            onSelectTable={onSelectTable}
            onClose={() => { soundEffects.playTick(); setShowBarcodeScanner(false); }}
            tenantId={tenantId}
          />
        </div>
      )}

      {/* Tables Grid Layout */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-150 pb-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold tracking-wider font-mono uppercase text-slate-500 dark:text-slate-400">MAIN FLOOR SEATING</h2>
            <button
              id="btn-toggle-layout-edit"
              onClick={() => {
                soundEffects.playTick();
                setIsEditingLayout(!isEditingLayout);
                setEditingTableId(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                isEditingLayout
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>{isEditingLayout ? 'Exit Seating Designer' : 'Configure Seating & Tables'}</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 mr-1.5 inline-block"></span> Vacant</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5 inline-block animate-pulse"></span> Ordering</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-indigo-405 mr-1.5 inline-block"></span> Cook Active</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 inline-block"></span> Billed</span>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div id="table-status-filter-chips" className="flex flex-wrap items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-150 dark:border-slate-800/60 shadow-3xs">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider px-2 font-mono">Status Filter:</span>
          
          <button
            type="button"
            id="filter-chip-all"
            onClick={() => { soundEffects.playTick(); setStatusFilter('all'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-650 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-655 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 dark:hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600"></span>
            <span>All ({tables.length})</span>
          </button>

          <button
            type="button"
            id="filter-chip-vacant"
            onClick={() => { soundEffects.playTick(); setStatusFilter('vacant'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'vacant'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-655 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 dark:hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"></span>
            <span>Vacant ({vacantCount})</span>
          </button>

          <button
            type="button"
            id="filter-chip-ordering"
            onClick={() => { soundEffects.playTick(); setStatusFilter('ordering'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ordering'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-655 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 dark:hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-450 animate-pulse"></span>
            <span>Ordering ({orderingCount})</span>
          </button>

          <button
            type="button"
            id="filter-chip-kot-pending"
            onClick={() => { soundEffects.playTick(); setStatusFilter('kot_pending'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'kot_pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-655 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 dark:hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-405"></span>
            <span>KOT Pending ({cookingCount})</span>
          </button>

          <button
            type="button"
            id="filter-chip-billed"
            onClick={() => { soundEffects.playTick(); setStatusFilter('billed'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'billed'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-655 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 dark:hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Billed ({billedCount})</span>
          </button>
        </div>

        {isEditingLayout && (
          <form onSubmit={handleAddTableSubmit} id="add-table-builder-panel" className="bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl space-y-3 mb-5 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Create New Seating Table</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Fill params and press Enter / submit to append</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Table Name / ID</label>
                <input
                  type="text"
                  placeholder="e.g. Table 15, Cabin B"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-905 dark:text-white outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pax Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  placeholder="4"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-905 dark:text-white outline-none font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Default Waiter (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh, Priya"
                  value={newWaiter}
                  onChange={(e) => setNewWaiter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-905 dark:text-white outline-none"
                />
              </div>
              <button
                type="submit"
                id="btn-save-new-table"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs p-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 shadow-sm h-[38px] uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Save Seating</span>
              </button>
            </div>
          </form>
        )}

        {filteredTables.length === 0 ? (
          <div id="filter-empty-state" className="text-center py-12 bg-slate-50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400 font-medium">No tables currently match the "{statusFilter}" status filter.</p>
            <button
              type="button"
              onClick={() => { soundEffects.playTick(); setStatusFilter('all'); }}
              className="mt-2 text-[10px] uppercase tracking-wider bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded font-bold transition-all cursor-pointer"
            >
              Show All Tables
            </button>
          </div>
        ) : (
          <div id="tables-grid" className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2 pb-6">
            {filteredTables.map((table) => {
            const activeOrder = getTableOrder(table.id);
            const activeKots = getTableKots(table.id);
            const totalSpend = activeOrder ? activeOrder.grandTotal : 0;
            const itemCounts = activeOrder ? activeOrder.items.reduce((acc, it) => acc + it.quantity, 0) : 0;
            const hasReadyItems = activeKots.some(k => k.items.some(it => it.status === 'ready'));

            // Render inline editable card
            if (isEditingLayout && editingTableId === table.id) {
              return (
                <div
                  key={table.id}
                  className="p-1.5 bg-white dark:bg-slate-900 border-2 border-indigo-600 rounded-lg flex flex-col justify-between h-[96px] w-full max-w-[140px] space-y-1 animate-fadeIn shadow-xs"
                >
                  <div className="space-y-0.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.25 text-[10px] font-bold outline-none text-slate-900 dark:text-white h-5"
                      placeholder="Table name"
                    />
                    <div className="flex gap-0.5">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="1"
                          value={editCapacity}
                          onChange={(e) => setEditCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.25 text-[9.5px] outline-none text-slate-900 dark:text-white font-mono h-4.5"
                          title="Seats"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editWaiter}
                          placeholder="Waiter"
                          onChange={(e) => setEditWaiter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.25 text-[9px] outline-none text-slate-900 dark:text-white h-4.5"
                          title="Waiter"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-0.5 pt-0.5 border-t border-slate-100 dark:border-slate-850">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTableId(null);
                        soundEffects.playTick();
                      }}
                      className="py-0.25 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 text-[8.5px] font-bold rounded border border-slate-200 dark:border-slate-700 cursor-pointer flex-1 text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTableSubmit(table)}
                      className="py-0.25 bg-indigo-600 hover:bg-indigo-500 text-white text-[8.5px] font-extrabold rounded cursor-pointer flex-1 text-center"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <motion.div
                id={`table-card-${table.id}`}
                key={table.id}
                whileHover={{ y: isEditingLayout ? 0 : -1, scale: isEditingLayout ? 1 : 1.01 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  if (isEditingLayout) {
                    soundEffects.playTick();
                    setEditingTableId(table.id);
                    setEditName(table.name);
                    setEditCapacity(table.capacity);
                    setEditWaiter(table.currentWaiter || '');
                  } else {
                    soundEffects.playTick();
                    onSelectTable(table);
                  }
                }}
                className={`p-2 rounded-lg cursor-pointer flex flex-col justify-between h-[96px] w-full max-w-[140px] select-none ${getStatusBorder(table)}`}
              >
                {/* Header */}
                <div className="flex justify-between items-start w-full">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[9px] font-bold text-gray-400 tracking-wider font-mono uppercase truncate">{table.name}</h3>
                    <div className="text-[12px] font-black text-slate-850 dark:text-white tracking-tight mt-0.5">
                      {table.id.startsWith('takeaway-') || table.name.toLowerCase().includes('takeaway')
                        ? '🛍️ Takeaway'
                        : table.id.startsWith('delivery-') || table.name.toLowerCase().includes('delivery')
                        ? '🛵 Delivery'
                        : `${table.capacity} Pax`}
                    </div>
                  </div>
                  {isEditingLayout ? (
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playTick();
                          setEditingTableId(table.id);
                          setEditName(table.name);
                          setEditCapacity(table.capacity);
                          setEditWaiter(table.currentWaiter || '');
                        }}
                        className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded transition-all cursor-pointer bg-white dark:bg-slate-900 shrink-0"
                        title="Edit Seating"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (table.status !== 'vacant') {
                            alert("Cannot delete an active seating table. Please complete or cancel orders on this table first!");
                            return;
                          }
                          if (confirm(`Are you sure you want to delete ${table.name}?`)) {
                            soundEffects.playTick();
                            if (onDeleteTable) onDeleteTable(table.id);
                          }
                        }}
                        disabled={table.status !== 'vacant'}
                        className={`p-0.5 border rounded transition-all cursor-pointer shrink-0 ${
                          table.status !== 'vacant'
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-350'
                            : 'hover:bg-rose-50 text-rose-600 border-rose-200 bg-white dark:bg-slate-900 dark:hover:bg-rose-955'
                        }`}
                        title="Delete Table"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    getStatusBadge(table)
                  )}
                </div>

                {/* Main section */}
                <div className="my-0.5 min-h-[14px] flex items-center">
                  {activeOrder ? (
                    <div className="space-y-0.5 w-full">
                      <div className="flex items-center text-[9.5px] font-medium text-slate-655">
                        <Receipt className="w-2.5 h-2.5 mr-0.5 text-slate-400 shrink-0" />
                        <span>{itemCounts} items ordered</span>
                      </div>
                      {hasReadyItems && (
                        <div className="flex items-center text-[8.5px] font-extrabold text-amber-600 dark:text-amber-450 animate-pulse bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 rounded border border-amber-200 mt-1">
                          <BellDot className="w-2.5 h-2.5 mr-1 shrink-0" />
                          <span>Food Ready!</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium italic">
                      {isEditingLayout ? 'Click to configure' : 'Ready'}
                    </span>
                  )}
                </div>

                {/* Footer section */}
                <div className="border-t border-gray-100 pt-1 flex justify-between items-center mt-auto w-full text-[9px]">
                  {activeOrder ? (
                    <>
                      <div className="flex items-center text-rose-600 font-bold text-[8.5px]">
                        <Clock className="w-3 h-3 mr-0.5 text-rose-500 shrink-0 animate-pulse" />
                        <span>
                          {Math.round((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000)}m
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-indigo-600 font-mono">
                        ₹{totalSpend.toFixed(0)}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="text-[8px] text-gray-450 uppercase font-black tracking-tighter">Vacant</div>
                      <span className="text-[8px] font-bold uppercase text-emerald-600 bg-emerald-50 border border-emerald-250 px-1 py-0.25 rounded">
                        {isEditingLayout ? 'Configure' : 'Open'}
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
