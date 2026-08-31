import React, { useState, useEffect } from 'react';
import { KOT, KOTItem } from '../types';
import { Clock, Check, Coffee, Play, ChefHat, BellDot, CheckCircle2, Eye, Filter, Printer, Search, X, Usb } from 'lucide-react';
import { soundEffects } from './SoundUtility';
import { printThermalKot } from '../utils/printUtility';

interface KotViewProps {
  kots: KOT[];
  onUpdateKOTItemStatus: (kotId: string, itemId: string, status: KOTItem['status']) => void;
  onUpdateKOTStatus: (kotId: string, status: KOT['status']) => void;
}

export const KotView: React.FC<KotViewProps> = ({
  kots,
  onUpdateKOTItemStatus,
  onUpdateKOTStatus,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(Date.now());

  // Keep timers ticking accurately on KDS monitor
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTimeText = (createdAtStr: string) => {
    const elapsedMs = now - new Date(createdAtStr).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 1) return 'Just now';
    return `${mins}m ago`;
  };

  const getUrgencyColor = (createdAtStr: string) => {
    const elapsedMs = now - new Date(createdAtStr).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    if (mins > 15) return 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900 animate-pulse';
    if (mins > 8) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900';
    return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
  };

  const filteredKots = kots.filter(kot => {
    // 1. Status Filter
    if (filter !== 'all' && kot.status !== filter) {
      return false;
    }

    // 2. Search Term Filter (Matches Table Name, KOT #, Dish Name, Waiter)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchTable = (kot.tableName || '').toLowerCase().includes(q);
      const matchKotNum = (kot.kotNumber || '').toLowerCase().includes(q);
      const matchToken = (kot as any).tokenNumber != null ? String((kot as any).tokenNumber).includes(q) : false;
      const matchWaiter = (kot.waiterName || '').toLowerCase().includes(q);
      const matchItems = Array.isArray(kot.items) && kot.items.some(item => (item?.name || '').toLowerCase().includes(q));

      return matchTable || matchKotNum || matchToken || matchWaiter || matchItems;
    }

    return true;
  });

  const handleMarkAllServed = (kot: KOT) => {
    soundEffects.playReadyPing();
    kot.items.forEach(item => {
      onUpdateKOTItemStatus(kot.id, item.id, 'served');
    });
    onUpdateKOTStatus(kot.id, 'completed');
  };

  return (
    <div id="kitchen-display-system-workspace" className="space-y-6">
      
      {/* Header bar and search/filter selection */}
      <div id="kds-header-block" className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-4 rounded-xl gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-wider font-mono">LIVE KITCHEN MONITOR (KDS)</h2>
            <p className="text-[11px] text-slate-400 font-mono">Real-time order tickets and kitchen dispatching</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* KOT Search Filter Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search table, item, KOT #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs pl-9 pr-8 py-2 rounded-lg outline-none focus:border-indigo-500 font-mono placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter modes */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg text-xs font-mono shrink-0">
            <button
              id="kds-filter-pending"
              onClick={() => { soundEffects.playTick(); setFilter('pending'); }}
              className={`px-3 py-1.5 rounded-md transition-all ${filter === 'pending' ? 'bg-indigo-600 font-bold text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Active ({kots.filter(k => k.status === 'pending').length})
            </button>
            <button
              id="kds-filter-completed"
              onClick={() => { soundEffects.playTick(); setFilter('completed'); }}
              className={`px-3 py-1.5 rounded-md transition-all ${filter === 'completed' ? 'bg-indigo-600 font-bold text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Served ({kots.filter(k => k.status === 'completed').length})
            </button>
            <button
              id="kds-filter-all"
              onClick={() => { soundEffects.playTick(); setFilter('all'); }}
              className={`px-3 py-1.5 rounded-md transition-all ${filter === 'all' ? 'bg-indigo-600 font-bold text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              All ({kots.length})
            </button>
          </div>
        </div>
      </div>

      {/* KOTS Card Display list */}
      <div id="kds-tickets-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKots.length > 0 ? (
          filteredKots.map((kot) => {
            const elapsedMins = Math.floor((now - new Date(kot.createdAt).getTime()) / 60000);
            
            return (
              <div
                id={`kot-card-${kot.id}`}
                key={kot.id}
                className={`rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col justify-between transition-all ${getUrgencyColor(kot.createdAt)}`}
              >
                {/* Card Title Header */}
                <div className="p-4 border-b border-dashed border-slate-200 dark:border-slate-800/60 bg-slate-50/55 dark:bg-slate-900/60 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight text-[13px]">{kot.tableName}</span>
                      <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                        {kot.kotNumber}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-400 font-mono text-[10px] mt-1 space-x-2">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {getElapsedTimeText(kot.createdAt)}
                      </span>
                      {elapsedMins > 15 && (
                        <span className="bg-red-500 text-white font-bold text-[9px] px-1 rounded animate-pulse">DELAYED</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <button
                      id={`kot-print-bt-${kot.id}`}
                      onClick={() => {
                        soundEffects.playTick();
                        const paperSize = (localStorage.getItem('bitespeed_print_paper_size') as '80mm' | '58mm') || '58mm';
                        localStorage.setItem('bitespeed_printer_driver', 'bluetooth');
                        printThermalKot(kot, paperSize);
                      }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono px-2 py-1.5 rounded-lg flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
                      title="Print KOT Slip to Bluetooth Thermal Printer"
                    >
                      <Printer className="w-3 h-3 text-indigo-400" />
                      <span>BT Print</span>
                    </button>
                    <button
                      id={`kot-print-usb-${kot.id}`}
                      onClick={() => {
                        soundEffects.playTick();
                        const paperSize = (localStorage.getItem('bitespeed_print_paper_size') as '80mm' | '58mm') || '58mm';
                        localStorage.setItem('bitespeed_printer_driver', 'usb');
                        printThermalKot(kot, paperSize);
                      }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono px-2 py-1.5 rounded-lg flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
                      title="Print KOT Slip to USB Thermal Printer"
                    >
                      <Usb className="w-3 h-3 text-emerald-400" />
                      <span>USB Print</span>
                    </button>
                    {kot.status === 'pending' && (
                      <button
                        id={`kot-serve-all-${kot.id}`}
                        onClick={() => handleMarkAllServed(kot)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready All</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items collection list details */}
                <div id={`kot-items-wrapper-${kot.id}`} className="p-4 flex-1 space-y-3.5">
                  {kot.items.map((item) => {
                    return (
                      <div
                        id={`kot-item-row-${item.id}`}
                        key={item.id}
                        className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5 last:border-0"
                      >
                        <div className="flex-1 mr-2">
                          <div className="flex items-baseline space-x-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                              {item.quantity} x {item.name}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-[10px] font-mono text-red-600 dark:text-red-400 italic font-bold bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded inline-block mt-1">
                              ⚠️ "{item.notes}"
                            </p>
                          )}
                        </div>

                        {/* Indiv Action button based on state */}
                        <div className="flex items-center space-x-1">
                          {item.status === 'cooking' ? (
                            <button
                              id={`kot-item-ready-${item.id}`}
                              onClick={() => {
                                soundEffects.playReadyPing();
                                onUpdateKOTItemStatus(kot.id, item.id, 'ready');
                              }}
                              className="p-1 px-2.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold font-mono uppercase flex items-center space-x-1 transition-colors"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Mark Ready</span>
                            </button>
                          ) : item.status === 'ready' ? (
                            <button
                              id={`kot-item-serve-${item.id}`}
                              onClick={() => {
                                soundEffects.playTick();
                                onUpdateKOTItemStatus(kot.id, item.id, 'served');
                              }}
                              className="p-1 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold font-mono uppercase flex items-center space-x-1 transition-colors"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Mark Served</span>
                            </button>
                          ) : (
                            <span className="text-[10px] uppercase font-bold font-mono text-slate-400 flex items-center bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Served
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status bar */}
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800/80 flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>ORDER REF: #{kot.id.slice(-4)}</span>
                  <span className="capitalize font-bold text-slate-500">{kot.status === 'pending' ? '🍳 ACTIVE PREP' : '✅ LOGGED DONE'}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div id="kds-monitor-vacant-placeholder" className="col-span-full py-24 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <ChefHat className="w-14 h-14 text-slate-350 dark:text-slate-700 mx-auto mb-3 animate-bounce" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono">KITCHEN BOARD VACANT</h3>
            <p className="text-xs text-slate-550 dark:text-slate-450 mt-1 max-w-xs mx-auto">No live orders are placed. Table-bound orders or counter sales will stream here automatically.</p>
          </div>
        )}
      </div>

    </div>
  );
};
