import React, { useState, useMemo } from 'react';
import { EstimateBill, TableOrder, BillSeries } from '../types';
import { 
  Search, Receipt, Printer, FileText, Ban, Trash2, Tag, Percent, 
  ArrowUpRight, BarChart, Eye, X, Award, TrendingUp, ShoppingBag,
  Sliders, Settings2, PlusCircle, CheckCircle2, ListFilter, SlidersHorizontal,
  Bluetooth, RefreshCw, Usb
} from 'lucide-react';
import { soundEffects } from './SoundUtility';
import { printThermalBill, getPrinterConfig } from '../utils/printUtility';

interface BillingEstimatorProps {
  bills: EstimateBill[];
  onAddBillInvoice: (bill: EstimateBill) => void;
  onDeleteBill?: (billId: string) => void;
  billSeries?: BillSeries[];
  setBillSeries?: React.Dispatch<React.SetStateAction<BillSeries[]>>;
}

export const BillingEstimator: React.FC<BillingEstimatorProps> = ({
  bills,
  onAddBillInvoice,
  onDeleteBill,
  billSeries = [],
  setBillSeries = (() => {}) as React.Dispatch<React.SetStateAction<BillSeries[]>>
}) => {
  const [search, setSearch] = useState('');
  const [pairedBtName, setPairedBtName] = useState(() => {
    return localStorage.getItem('bitespeed_bluetooth_name') || '';
  });
  const [usbPath, setUsbPath] = useState(() => {
    return localStorage.getItem('bitespeed_usb_path') || '';
  });

  const handleBluetoothScan = async () => {
    soundEffects.playTick();
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert("Your browser does not support Web Bluetooth. Please use Google Chrome/Edge and ensure Bluetooth is turned on!");
      return;
    }
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '00001101-0000-1000-8000-00805f9b34fb', // Standard Serial Profile
          '000018f0-0000-1000-8000-00805f9b34fb'  // Standard Printer service
        ]
      });
      if (device) {
        const pickedName = device.name || 'MTP-II';
        setPairedBtName(pickedName);
        localStorage.setItem('bitespeed_bluetooth_name', pickedName);
        localStorage.setItem('bitespeed_printer_driver', 'bluetooth');
        alert(`Successfully linked bluetooth device: ${pickedName}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to find bluetooth device: ${err?.message || err}`);
    }
  };

  const handleUsbScan = async () => {
    soundEffects.playTick();
    const nav = navigator as any;
    if (!nav.usb) {
      alert("Your browser does not support WebUSB. Please use Google Chrome, Microsoft Edge, or Opera!");
      return;
    }
    try {
      const device = await nav.usb.requestDevice({ filters: [] });
      if (device) {
        const vid = device.vendorId.toString(16).padStart(4, '0');
        const pid = device.productId.toString(16).padStart(4, '0');
        const formattedPath = `${vid}:${pid}`;
        setUsbPath(formattedPath);
        localStorage.setItem('bitespeed_usb_path', formattedPath);
        localStorage.setItem('bitespeed_printer_driver', 'usb');
        alert(`Successfully linked USB device: ${device.productName || 'Thermal Printer'} (${formattedPath})`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to find USB device: ${err?.message || err}`);
    }
  };

  const triggerDirectPrint = (bill: EstimateBill, driver: 'bluetooth' | 'usb') => {
    soundEffects.playTick();
    const originalDriver = localStorage.getItem('bitespeed_printer_driver');
    localStorage.setItem('bitespeed_printer_driver', driver);
    const savedWidth = (localStorage.getItem('bitespeed_print_paper_size') as '80mm' | '58mm') || '80mm';
    printThermalBill(bill, false, savedWidth);
    if (originalDriver) {
      localStorage.setItem('bitespeed_printer_driver', originalDriver);
    } else {
      localStorage.removeItem('bitespeed_printer_driver');
    }
  };

  const [filterType, setFilterType] = useState<'all' | 'estimate' | 'invoice'>('all');
  const [selectedBill, setSelectedBill] = useState<EstimateBill | null>(null);
  const [viewingBill, setViewingBill] = useState<EstimateBill | null>(null);
  const [subTab, setSubTab] = useState<'transactions' | 'items'>('transactions');
  
  // Custom billing series and filters states
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>('all');
  const [showSeriesManager, setShowSeriesManager] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesPrefix, setNewSeriesPrefix] = useState('');
  const [newSeriesStartNum, setNewSeriesStartNum] = useState<number>(1001);
  const [newSeriesType, setNewSeriesType] = useState<'invoice' | 'estimate'>('invoice');

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchesSearch = 
        bill.billNumber.toLowerCase().includes(search.toLowerCase()) ||
        bill.customerName.toLowerCase().includes(search.toLowerCase()) ||
        bill.customerPhone.includes(search) ||
        bill.tableName.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = filterType === 'all' || bill.type === filterType;
      
      const matchesSeries = selectedSeriesFilter === 'all' || bill.billNumber.toLowerCase().startsWith(selectedSeriesFilter.toLowerCase());

      return matchesSearch && matchesType && matchesSeries;
    });
  }, [bills, search, filterType, selectedSeriesFilter]);

  const handleAddCustomSeries = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeriesName.trim() || !newSeriesPrefix.trim()) return;

    const prefixUpper = newSeriesPrefix.toUpperCase().trim();
    
    // Check if prefix already exists
    if (billSeries.some(s => s.prefix === prefixUpper)) {
      alert('This prefix is already in use by another billing series.');
      return;
    }

    const newS: BillSeries = {
      id: `ser-${Date.now()}`,
      name: newSeriesName.trim(),
      prefix: prefixUpper,
      startNumber: Number(newSeriesStartNum),
      nextNumber: Number(newSeriesStartNum),
      type: newSeriesType,
      isActive: false
    };

    soundEffects.playSuccessChime();
    setBillSeries(prev => [...prev, newS]);
    
    // reset form fields
    setNewSeriesName('');
    setNewSeriesPrefix('');
    setNewSeriesStartNum(1001);
  };

  const handleActivateSeries = (seriesId: string, seriesType: 'invoice' | 'estimate' | 'all') => {
    soundEffects.playTick();
    setBillSeries(prev => prev.map(s => {
      if (s.type === seriesType) {
        return { ...s, isActive: s.id === seriesId };
      }
      return s;
    }));
  };

  const handleUpdateSequence = (seriesId: string, newSeq: number) => {
    if (isNaN(newSeq) || newSeq < 1) return;
    setBillSeries(prev => prev.map(s => {
      if (s.id === seriesId) {
        return { ...s, nextNumber: newSeq };
      }
      return s;
    }));
  };

  const handleDeleteSeries = (seriesId: string) => {
    soundEffects.playTick();
    setBillSeries(prev => prev.filter(s => s.id !== seriesId));
  };

  // Total sales calculations from completed invoices only
  const stats = useMemo(() => {
    const invoices = bills.filter(b => b.type === 'invoice');
    const estimates = bills.filter(b => b.type === 'estimate');
    const totalSales = invoices.reduce((acc, current) => acc + current.grandTotal, 0);
    const estimateValue = estimates.reduce((acc, current) => acc + current.grandTotal, 0);

    return {
      salesCount: invoices.length,
      estimateCount: estimates.length,
      revenue: totalSales,
      avgOrderValue: invoices.length > 0 ? (totalSales / invoices.length) : 0,
      estimatedPipeline: estimateValue
    };
  }, [bills]);

  // Compute order-wise item quantity, rates, and revenues across dynamic filtered bills
  const orderWiseItems = useMemo(() => {
    const itemMap: Record<string, {
      name: string;
      quantity: number;
      price: number;
      totalRevenue: number;
      billsCount: number;
    }> = {};

    filteredBills.forEach(bill => {
      bill.items.forEach(item => {
        const key = item.name.trim();
        if (!itemMap[key]) {
          itemMap[key] = {
            name: item.name,
            quantity: 0,
            price: item.price,
            totalRevenue: 0,
            billsCount: 0
          };
        }
        itemMap[key].quantity += item.quantity;
        itemMap[key].totalRevenue += item.price * item.quantity;
        itemMap[key].billsCount += 1;
      });
    });

    return Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
  }, [filteredBills]);

  const totalFilteredSubtotal = useMemo(() => {
    return filteredBills.reduce((acc, bill) => acc + bill.subtotal, 0);
  }, [filteredBills]);

  const triggerThermalPrint = (bill: EstimateBill) => {
    soundEffects.playTick();
    setSelectedBill(bill);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div id="billing-ledger-panel" className="space-y-4">

      {/* Financial Analytics Summary widgets */}
      <div id="financial-ledger-stats-row" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div id="ledger-revenue" className="bg-[#f0f9f4] p-3 rounded-lg border border-emerald-100 text-[#1a1c23]">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Settled Revenue</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-black text-[#10b981] font-mono">₹{stats.revenue.toFixed(0)}</span>
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-0.5">{stats.salesCount} Settled Invoices</p>
        </div>
        
        <div id="ledger-estimates" className="bg-[#f5f6ff] p-3 rounded-lg border border-indigo-100 text-[#1a1c23]">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Estimates Pipeline</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-black text-[#5c6ac4] font-mono">₹{stats.estimatedPipeline.toFixed(0)}</span>
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-0.5">{stats.estimateCount} Quotations Created</p>
        </div>
        
        <div id="ledger-aot" className="bg-[#fafbfc] p-3 rounded-lg border border-gray-200 text-[#1a1c23]">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Avg Ticket Value</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-black text-slate-800 font-mono">₹{stats.avgOrderValue.toFixed(0)}</span>
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Average checkout value</p>
        </div>
        
        <div id="ledger-taxes" className="bg-[#fafbfc] p-3 rounded-lg border border-gray-200 text-[#1a1c23]">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Assessed GST</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-black text-amber-600 font-mono">
              ₹{(bills.reduce((acc, curr) => acc + curr.taxAmount, 0)).toFixed(0)}
            </span>
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Overall CGST + SGST</p>
        </div>
      </div>

      {/* Series Config Collapsible Panel */}
      <div id="invoice-series-dashboard-container" className="bg-slate-50 border border-slate-200/85 rounded-xl overflow-hidden p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings2 className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase font-sans">
              Invoice Series & Sequence Configs
            </h3>
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded-md font-mono">
              {billSeries.length} Series Stored
            </span>
          </div>
          <button
            id="toggle-series-manager-btn"
            onClick={() => { soundEffects.playTick(); setShowSeriesManager(!showSeriesManager); }}
            className="text-xs text-indigo-600 font-bold hover:text-indigo-800 cursor-pointer flex items-center space-x-1"
          >
            <span>{showSeriesManager ? 'Hide Controls ▴' : 'Configure Series ▾'}</span>
          </button>
        </div>

        {showSeriesManager && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 border-t border-slate-200/70 pt-3 animate-fade-in text-xs">
            {/* Left side: Series Table/List */}
            <div className="lg:col-span-2 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              <h4 className="font-bold text-[10.5px] uppercase tracking-wider text-slate-450 font-sans">Active Series Register</h4>
              <div className="space-y-1.5">
                {billSeries.map((series) => {
                  return (
                    <div 
                      key={series.id} 
                      className={`p-2.5 rounded-lg border bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all ${
                        series.isActive 
                          ? 'border-indigo-500 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            series.type === 'invoice' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            {series.type}
                          </span>
                          <span className="font-bold text-slate-800 text-[11px]">{series.name}</span>
                          {series.isActive && (
                            <span className="flex items-center text-[9px] font-semibold text-emerald-600 space-x-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>ACTIVE</span>
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10.5px] text-slate-500 flex items-center space-x-3">
                          <span>Prefix: <strong className="text-slate-800 font-black">{series.prefix}</strong></span>
                          <span>Next Serial: <strong className="text-slate-800 font-extrabold">{series.nextNumber}</strong></span>
                        </div>
                      </div>

                      {/* Series actions */}
                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-slate-450 font-sans">Next Seed:</span>
                          <input
                            type="number"
                            min="1"
                            value={series.nextNumber}
                            onChange={(e) => handleUpdateSequence(series.id, parseInt(e.target.value) || 1)}
                            className="w-16 bg-gray-50 border border-gray-200 px-1 py-0.5 rounded text-center font-mono font-bold text-[11px]"
                            title="Edit next sequence seed number"
                          />
                        </div>
                        {!series.isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivateSeries(series.id, series.type)}
                            className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-bold text-[10px] cursor-pointer shrink-0 transition-all"
                            title="Set as Active Sequence for payments"
                          >
                            ACTIVATE
                          </button>
                        )}
                        {/* Protect core general series from deletion */}
                        {series.id !== 'ser-1' && series.id !== 'ser-5' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSeries(series.id)}
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0 transition-all"
                            title="Remove custom series"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Add Custom Series Form */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-3xs space-y-2.5">
              <h4 className="font-bold text-[10.5px] uppercase tracking-wider text-slate-450 font-sans flex items-center gap-1.5 border-b border-gray-100 pb-1.5 mb-1">
                <PlusCircle className="w-3.5 h-3.5 text-indigo-500" />
                Create New Invoice Series
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-black font-sans mb-1">Series Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GST Local Dine-In, Quick Pay B2C"
                    value={newSeriesName}
                    onChange={(e) => setNewSeriesName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-[11px] font-sans font-bold focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-black font-sans mb-1">Prefix String</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-B2B-"
                      value={newSeriesPrefix}
                      onChange={(e) => setNewSeriesPrefix(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-[11px] font-mono font-bold focus:bg-white focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-black font-sans mb-1">Starting Number</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1001"
                      value={newSeriesStartNum}
                      onChange={(e) => setNewSeriesStartNum(parseInt(e.target.value) || 1001)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-[11px] font-mono font-bold focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-black font-sans mb-1">Series Scope Type</label>
                  <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-50 border border-slate-150 rounded-lg">
                    <button
                      type="button"
                      onClick={() => { soundEffects.playTick(); setNewSeriesType('invoice'); }}
                      className={`py-1 text-[10.5px] font-bold rounded-md transition-all ${
                        newSeriesType === 'invoice' 
                          ? 'bg-white text-emerald-700 shadow-3xs font-extrabold' 
                          : 'text-slate-500'
                      }`}
                    >
                      TAX INVOICE
                    </button>
                    <button
                      type="button"
                      onClick={() => { soundEffects.playTick(); setNewSeriesType('estimate'); }}
                      className={`py-1 text-[10.5px] font-bold rounded-md transition-all ${
                        newSeriesType === 'estimate' 
                          ? 'bg-white text-indigo-700 shadow-3xs font-extrabold' 
                          : 'text-slate-500'
                      }`}
                    >
                      ESTIMATE
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleAddCustomSeries(e)}
                  className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-1.5 rounded text-[11px] uppercase tracking-wider shadow-2xs transition-all cursor-pointer mt-1"
                >
                  Save & Register Series
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal scroll pills to FILTER the ledger list by invoice series */}
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-200/50">
          <ListFilter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 font-sans uppercase truncate select-none shrink-0 mr-1">
            Series Wise Filter:
          </span>
          <div className="flex-1 overflow-x-auto scrollbar-none flex items-center space-x-1.5 py-0.5">
            <button
              onClick={() => { soundEffects.playTick(); setSelectedSeriesFilter('all'); }}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shrink-0 transition-all cursor-pointer ${
                selectedSeriesFilter === 'all'
                  ? 'bg-indigo-600 text-white border-transparent shadow-3xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              All Series ({bills.length})
            </button>
            {billSeries.map((series) => {
              const matchedCount = bills.filter(b => b.billNumber.toLowerCase().startsWith(series.prefix.toLowerCase())).length;
              return (
                <button
                  key={series.id}
                  onClick={() => { soundEffects.playTick(); setSelectedSeriesFilter(series.prefix); }}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shrink-0 transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedSeriesFilter === series.prefix
                      ? 'bg-indigo-600 text-white border-transparent shadow-3xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-700 rounded px-1 flex items-center justify-center">
                    {series.prefix}
                  </span>
                  <span className="max-w-[120px] truncate">{series.name}</span>
                  <span className="opacity-60">({matchedCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>



      {/* Control bar */}
      <div id="estimator-ledger-filters" className="flex flex-col sm:flex-row gap-2.5 justify-between items-start sm:items-center bg-white border border-gray-200 p-3 rounded-xl shadow-xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-450" />
          <input
            id="ledger-search-input"
            type="text"
            placeholder="Search by Invoice, Table name, customer detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-semibold focus:bg-white focus:outline-none text-slate-800"
          />
        </div>

        {/* Filter type selector */}
        <div className="flex bg-gray-150 p-0.5 rounded-lg text-[11px] font-semibold self-stretch sm:self-auto select-none">
          <button
            id="bill-filter-all"
            onClick={() => { soundEffects.playTick(); setFilterType('all'); }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All Logs ({bills.length})
          </button>
          <button
            id="bill-filter-estimate"
            onClick={() => { soundEffects.playTick(); setFilterType('estimate'); }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${filterType === 'estimate' ? 'bg-[#5c6ac4] text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-705'}`}
          >
            Estimates Only ({bills.filter(b => b.type === 'estimate').length})
          </button>
          <button
            id="bill-filter-invoice"
            onClick={() => { soundEffects.playTick(); setFilterType('invoice'); }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${filterType === 'invoice' ? 'bg-[#10b981] text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-705'}`}
          >
            Settle Invoices ({bills.filter(b => b.type === 'invoice').length})
          </button>
        </div>
      </div>

      {/* Sub-tab selection */}
      <div id="sub-tab-selection-container" className="flex border-b border-gray-200 dark:border-slate-800 space-x-6 text-xs font-bold font-sans px-1 pt-1">
        <button
          id="btn-subtab-transactions"
          onClick={() => { soundEffects.playTick(); setSubTab('transactions'); }}
          className={`pb-2.5 transition-all outline-none border-b-2 cursor-pointer ${
            subTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500'
          }`}
        >
          📜 Transaction Slips ({filteredBills.length})
        </button>
        <button
          id="btn-subtab-items"
          onClick={() => { soundEffects.playTick(); setSubTab('items'); }}
          className={`pb-2.5 transition-all outline-none border-b-2 cursor-pointer ${
            subTab === 'items'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500'
          }`}
        >
          🍲 Order-wise Item Report ({orderWiseItems.length})
        </button>
      </div>

      {subTab === 'items' && (
        <div id="item-stats-summary-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-3.5 rounded-xl shadow-3xs flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/45 rounded-lg text-indigo-600 dark:text-indigo-455">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">Unique Dishes</p>
              <p className="text-base font-black text-slate-800 dark:text-white font-mono mt-0.5">{orderWiseItems.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-3.5 rounded-xl shadow-3xs flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/45 rounded-lg text-emerald-600 dark:text-emerald-450">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">Total Units Sold</p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-450 font-mono mt-0.5">
                {orderWiseItems.reduce((acc, x) => acc + x.quantity, 0)} units
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-3.5 rounded-xl shadow-3xs flex items-center space-x-3 col-span-2 lg:col-span-1">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/45 rounded-lg text-rose-600 dark:text-rose-450">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">Top Bestselling Dish</p>
              <p className="text-xs font-black text-rose-600 dark:text-rose-455 truncate mt-0.5">
                {orderWiseItems[0] ? `${orderWiseItems[0].name} (${orderWiseItems[0].quantity}x)` : 'None'}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-3.5 rounded-xl shadow-3xs flex items-center space-x-3 col-span-2 lg:col-span-1">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/45 rounded-lg text-amber-600 dark:text-amber-450">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">Aggregate Subtotal</p>
              <p className="text-base font-black text-amber-600 font-mono mt-0.5">₹{totalFilteredSubtotal.toFixed(0)}</p>
            </div>
          </div>
        </div>
      )}
      {subTab === 'transactions' ? (
        /* Ledger Table logs */
        <div id="billing-ledger-grid" className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto overflow-y-auto max-h-[220px]">
            <table className="w-full text-left border-collapse text-[9.5px] tracking-tight font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 font-bold uppercase tracking-wider text-[8px] sticky top-0 bg-opacity-95 backdrop-blur-3xs z-10">
                  <th className="px-2 py-1">Reference Code</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Timestamp</th>
                  <th className="px-2 py-1">Table / Order</th>
                  <th className="px-2 py-1">Customer Details</th>
                  <th className="px-2 py-1 text-right">Pre-Tax</th>
                  <th className="px-2 py-1 text-right font-black">Grand Total</th>
                  <th className="px-2 py-1 text-center">Receipt Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill) => {
                    return (
                      <tr id={`bill-row-${bill.id}`} key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-2 py-0.5 font-bold font-mono tracking-tight text-slate-800">
                          {bill.billNumber}
                        </td>
                        <td className="px-2 py-0.5 select-none text-[8px]">
                          {bill.type === 'estimate' ? (
                            <span className="px-1 py-0.25 rounded font-black bg-indigo-50 border border-indigo-100 text-indigo-700">ESTIMATE</span>
                          ) : (
                            <span className="px-1 py-0.25 rounded font-black bg-emerald-55/75 border border-emerald-100 text-emerald-700">INVOICE</span>
                          )}
                        </td>
                        <td className="px-2 py-0.5 text-slate-450 font-mono text-[8px]">
                          {new Date(bill.createdAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-0.5 text-slate-705 font-sans">
                          <div className="flex flex-col">
                            <span className="font-bold">{bill.tableName}</span>
                            <span className="text-[8px] text-slate-400 italic">Type: {bill.orderType}</span>
                          </div>
                        </td>
                        <td className="px-2 py-0.5 text-slate-800 font-sans">
                          {bill.customerName ? (
                            <div className="flex flex-col">
                              <span className="font-bold">{bill.customerName}</span>
                              <span className="text-[8.5px] text-slate-450 font-mono">{bill.customerPhone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic font-mono text-[8.5px]">Walk-in client</span>
                          )}
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono text-slate-600">
                          ₹{bill.subtotal.toFixed(0)}
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono font-black text-slate-900 text-[11px]">
                          ₹{bill.grandTotal.toFixed(0)}
                        </td>
                        <td className="px-2 py-0.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
 								id={`bill-view-trigger-${bill.id}`}
                              onClick={() => {
                                soundEffects.playTick();
                                setViewingBill(bill);
                              }}
                              className="px-1 py-0.5 rounded border border-gray-200 bg-slate-50 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-805 font-bold font-sans text-[8.5px] transition-all cursor-pointer inline-flex items-center space-x-0.5 h-5 shrink-0"
                              title="View Receipt Details"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span>VIEW</span>
                            </button>
                            <button
                              id={`bill-print-trigger-${bill.id}`}
                              onClick={() => triggerThermalPrint(bill)}
                              className="px-1 py-0.5 rounded border border-gray-200 bg-white hover:bg-slate-50 text-[#5c6ac4] hover:text-[#4f46e5] font-bold font-sans text-[8.5px] transition-all cursor-pointer inline-flex items-center space-x-0.5 h-5 shrink-0"
                              title="System Print (Browser Dialog)"
                            >
                              <Printer className="w-2.5 h-2.5" />
                              <span>SYS PRINT</span>
                            </button>
                            <button
                              id={`bill-bt-print-trigger-${bill.id}`}
                              onClick={() => triggerDirectPrint(bill, 'bluetooth')}
                              className="px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 font-bold font-sans text-[8.5px] transition-all cursor-pointer inline-flex items-center space-x-0.5 h-5 shrink-0"
                              title="Bluetooth Direct Print (Bypass Android System Print)"
                            >
                              <Bluetooth className="w-2.5 h-2.5" />
                              <span>BT PRINT</span>
                            </button>
                            <button
                              id={`bill-usb-print-trigger-${bill.id}`}
                              onClick={() => triggerDirectPrint(bill, 'usb')}
                              className="px-1.5 py-0.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 font-bold font-sans text-[8.5px] transition-all cursor-pointer inline-flex items-center space-x-0.5 h-5 shrink-0"
                              title="USB Direct Print"
                            >
                              <Usb className="w-2.5 h-2.5" />
                              <span>USB PRINT</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-2 py-4 text-center text-slate-405 font-mono py-6">
                      <Receipt className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                      <span className="text-[9px]">No financial bills or pro-formas found on this filter scope.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Order-wise items report table */
        <div id="order-wise-items-grid" className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-xs animate-fade-in">
          <div className="overflow-x-auto overflow-y-auto max-h-[220px]">
            <table className="w-full text-left border-collapse text-[9.5px] tracking-tight font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 font-bold uppercase tracking-wider text-[8px] sticky top-0 bg-opacity-95 backdrop-blur-3xs z-10">
                  <th className="px-2 py-1 w-8 text-center">Rank</th>
                  <th className="px-2 py-1">Dish / Menu Item</th>
                  <th className="px-2 py-1 text-right">Unit Rate</th>
                  <th className="px-2 py-1 text-center">Total Quantities Sold</th>
                  <th className="px-2 py-1 text-right">Pre-Tax Gross Sales</th>
                  <th className="px-2 py-1 text-center">Order Occurrences</th>
                  <th className="px-2 py-1 w-1/4">Revenue Share Index (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {orderWiseItems.length > 0 ? (
                  orderWiseItems.map((item, idx) => {
                    const percentage = totalFilteredSubtotal > 0 ? (item.totalRevenue / totalFilteredSubtotal) * 100 : 0;
                    return (
                      <tr id={`orderwise-row-${idx}`} key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-2 py-0.5 text-center text-slate-450 font-bold font-mono">
                          #{idx + 1}
                        </td>
                        <td className="px-2 py-0.5 font-semibold text-slate-805">
                          {item.name}
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono text-slate-600">
                          ₹{item.price.toFixed(0)}
                        </td>
                        <td className="px-2 py-0.5 text-center">
                          <span className="px-1 py-0.25 rounded-full font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[8px]">
                            {item.quantity} Qty
                          </span>
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono font-extrabold text-slate-900 text-[10px]">
                          ₹{item.totalRevenue.toFixed(0)}
                        </td>
                        <td className="px-2 py-0.5 text-center font-mono text-slate-400 text-[8px]">
                          {item.billsCount} times
                        </td>
                        <td className="px-2 py-0.5">
                          <div className="flex items-center space-x-1 w-full">
                            <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              ></div>
                            </div>
                            <span className="text-[8px] font-black text-slate-600 font-mono w-6 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-slate-400 font-mono py-6">
                      <Receipt className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                      <span className="text-[9px]">No items breakdown found on this filter scope.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden print payload that triggers on window.print when active */}
      {selectedBill && (
        <div id="hidden-print-section" className="hidden print:block fixed inset-0 z-50 bg-white text-slate-950 p-6 font-mono text-[11px] leading-relaxed max-w-[340px]">
          {/* Header */}
          {(() => {
            const printConf = getPrinterConfig();
            return (
              <div className="text-center space-y-1 mb-4">
                <h3 className="font-bold text-sm uppercase">{printConf.title}</h3>
                {printConf.address && <p className="text-[10px]">{printConf.address}</p>}
                <p className="text-[10px]">{printConf.gstin ? `GSTIN: ${printConf.gstin} • ` : ''}Tel: {printConf.contact}</p>
                <div className="border-t border-dashed border-slate-500 my-2"></div>
              </div>
            );
          })()}
            <h4 className="font-bold text-xs bg-slate-150 py-1 tracking-widest uppercase">
              {selectedBill.type === 'estimate' ? 'ESTIMATE SLIP (PRO-FORMA)' : 'FINAL TAX INVOICE'}
            </h4>
            <p className="text-[9px] text-slate-500">Ref: {selectedBill.billNumber}</p>

          {/* Details */}
          <div className="space-y-1 my-3 text-[10px]">
            <div className="flex justify-between">
              <span>DATE: {new Date(selectedBill.createdAt).toLocaleDateString()}</span>
              <span>TIME: {new Date(selectedBill.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TABLE: {selectedBill.tableName}</span>
              <span>MODE: {selectedBill.orderType}</span>
            </div>
            {selectedBill.customerName && (
              <div className="border-t border-dashed border-slate-350 pt-1 mt-1">
                <p>CUST: {selectedBill.customerName}</p>
                {selectedBill.customerPhone && <p>PHONE: {selectedBill.customerPhone}</p>}
              </div>
            )}
          </div>

          <div className="border-t border-b border-dashed border-slate-600 py-1.5 my-2 font-bold select-none">
            <div className="grid grid-cols-12 gap-1 text-[10px]">
              <span className="col-span-6 text-left">ITEM</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-2 text-right">RATE</span>
              <span className="col-span-2 text-right">TOTAL</span>
            </div>
          </div>

          <div className="space-y-2 border-b border-dashed border-black pb-2">
            {selectedBill.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-[10px] gap-1">
                <span className="col-span-6 text-left font-bold">{item.name}</span>
                <span className="col-span-2 text-center">{item.quantity}</span>
                <span className="col-span-2 text-right">₹{item.price}</span>
                <span className="col-span-2 text-right">₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 my-3 text-right text-[10px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{selectedBill.subtotal.toFixed(2)}</span>
            </div>
            {selectedBill.discountAmount > 0 && (
              <div className="flex justify-between">
                <span>Discount Applied:</span>
                <span>-₹{selectedBill.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>CGST ({(selectedBill.subtotal - selectedBill.discountAmount > 0 ? (selectedBill.taxAmount / (selectedBill.subtotal - selectedBill.discountAmount)) * 50 : 0).toFixed(1)}%):</span>
              <span>₹{(selectedBill.taxAmount / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST ({(selectedBill.subtotal - selectedBill.discountAmount > 0 ? (selectedBill.taxAmount / (selectedBill.subtotal - selectedBill.discountAmount)) * 50 : 0).toFixed(1)}%):</span>
              <span>₹{(selectedBill.taxAmount / 2).toFixed(2)}</span>
            </div>
            {selectedBill.deliveryCharge !== undefined && selectedBill.deliveryCharge > 0 && (
              <div className="flex justify-between font-bold text-slate-800">
                <span>Delivery Charge:</span>
                <span>₹{selectedBill.deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs border-t border-black pt-1">
              <span>NET GRAND TOTAL:</span>
              <span>₹{selectedBill.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center text-[9px] mt-6 font-bold space-y-1 block select-none">
            <p>THANK YOU FOR DINING WITH US!</p>
            <p className="font-normal text-slate-500">BiteSpeed Restaurant Management Suites</p>
          </div>
        </div>
      )}

      {/* On-Screen View Receipt Modal */}
      {viewingBill && (
        <div id="onscreen-bill-view-modal" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/40 shrink-0">
              <div className="space-y-0.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono tracking-wider ${viewingBill.type === 'estimate' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-400'}`}>
                  {viewingBill.type === 'estimate' ? 'PRO-FORMA ESTIMATE' : 'TAX INVOICE'}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white font-mono mt-1">
                  {viewingBill.billNumber}
                </h4>
              </div>
              <button
                id="close-bill-view-modal-btn"
                onClick={() => { soundEffects.playTick(); setViewingBill(null); }}
                className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-840 dark:text-slate-400 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Thermal Receipt Style Mockup) */}
            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-slate-800 dark:text-slate-200 scrollbar-none">
              {(() => {
                const printConf = getPrinterConfig();
                return (
                  <div className="text-center space-y-1">
                    <h3 className="font-extrabold text-base tracking-wide uppercase text-slate-900 dark:text-white">{printConf.title}</h3>
                    {printConf.address && <p className="text-[11px] text-gray-500 dark:text-slate-400 font-sans">{printConf.address}</p>}
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-sans">{printConf.gstin ? `GSTIN: ${printConf.gstin} • ` : ''}Tel: {printConf.contact}</p>
                  </div>
                );
              })()}

              <div className="border-t border-b border-dashed border-gray-300 dark:border-slate-700 py-2.5 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span>DATE: {new Date(viewingBill.createdAt).toLocaleDateString()}</span>
                  <span>TIME: {new Date(viewingBill.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span>TABLE: {viewingBill.tableName}</span>
                  <span className="uppercase">MODE: {viewingBill.orderType}</span>
                </div>
                {viewingBill.currentWaiter && (
                  <div className="text-[11px] font-sans">
                    CAPTAIN / WAITER: <span className="font-bold font-mono">{viewingBill.currentWaiter}</span>
                  </div>
                )}
                {viewingBill.customerName ? (
                  <div className="border-t border-dashed border-gray-200 dark:border-slate-800 pt-2 mt-1.5 font-sans">
                    <p className="text-[11px]">CUSTOMER: <span className="font-bold">{viewingBill.customerName}</span></p>
                    {viewingBill.customerPhone && <p className="text-[10px] text-gray-500 font-mono">PHONE: {viewingBill.customerPhone}</p>}
                  </div>
                ) : (
                  <div className="border-t border-dashed border-gray-200 dark:border-slate-800 pt-2 mt-1.5 font-sans">
                    <p className="text-[10px] text-gray-400 italic">Walk-in Customer</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-2 my-2">
                <div className="grid grid-cols-12 gap-1 font-bold text-slate-500 dark:text-slate-400 text-[11px] select-none">
                  <span className="col-span-6 text-left">ITEM</span>
                  <span className="col-span-2 text-center">QTY</span>
                  <span className="col-span-2 text-right">RATE</span>
                  <span className="col-span-2 text-right">TOTAL</span>
                </div>
                <div className="border-b border-dashed border-gray-200 dark:border-slate-800 my-1.5"></div>
                <div className="space-y-2">
                  {viewingBill.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1 text-[11px] items-start">
                      <div className="col-span-6 text-left">
                        <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                        {item.notes && <span className="text-[9px] text-amber-500 font-sans block">{item.notes}</span>}
                      </div>
                      <span className="col-span-2 text-center font-bold text-slate-700 dark:text-slate-350">{item.quantity}</span>
                      <span className="col-span-2 text-right text-slate-500 dark:text-slate-400">₹{item.price}</span>
                      <span className="col-span-2 text-right font-bold text-slate-900 dark:text-white">₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill totals arithmetic */}
              <div className="border-t border-dashed border-gray-300 dark:border-slate-705 pt-2 space-y-1.5 text-right text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-bold">₹{viewingBill.subtotal.toFixed(2)}</span>
                </div>
                {viewingBill.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500 dark:text-rose-400 font-bold">
                    <span>Discount Applied</span>
                    <span>-₹{viewingBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {viewingBill.serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Service Charge</span>
                    <span>₹{viewingBill.serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">CGST ({(viewingBill.subtotal - viewingBill.discountAmount > 0 ? (viewingBill.taxAmount / (viewingBill.subtotal - viewingBill.discountAmount)) * 50 : 0).toFixed(1)}%)</span>
                  <span>₹{(viewingBill.taxAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">SGST ({(viewingBill.subtotal - viewingBill.discountAmount > 0 ? (viewingBill.taxAmount / (viewingBill.subtotal - viewingBill.discountAmount)) * 50 : 0).toFixed(1)}%)</span>
                  <span>₹{(viewingBill.taxAmount / 2).toFixed(2)}</span>
                </div>
                {viewingBill.deliveryCharge !== undefined && viewingBill.deliveryCharge > 0 && (
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>Delivery Charge</span>
                    <span>₹{viewingBill.deliveryCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-dashed border-gray-300 dark:border-slate-705 pt-2 text-slate-900 dark:text-white">
                  <span>NET GRAND TOTAL</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">₹{viewingBill.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment details */}
              {viewingBill.paymentMethod && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-gray-150 dark:border-slate-800/80 rounded-xl text-center font-sans tracking-wide mt-3 shrink-0">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed">
                    Transaction settled via: <span className="font-bold text-indigo-600 dark:text-indigo-405 uppercase font-mono text-[10.5px]">{viewingBill.paymentMethod}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-150 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/40 shrink-0">
              <button
                id="close-bill-view-footer-btn"
                onClick={() => { soundEffects.playTick(); setViewingBill(null); }}
                className="px-4 py-2 border border-gray-200 dark:border-slate-750 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Close
              </button>
              <button
                id="print-sys-from-view-modal-btn"
                onClick={() => {
                  setViewingBill(null);
                  triggerThermalPrint(viewingBill);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>System Print</span>
              </button>
              <button
                id="print-bt-from-view-modal-btn"
                onClick={() => {
                  setViewingBill(null);
                  triggerDirectPrint(viewingBill, 'bluetooth');
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center space-x-1.5 border-none"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>Bluetooth Print</span>
              </button>
              <button
                id="print-usb-from-view-modal-btn"
                onClick={() => {
                  setViewingBill(null);
                  triggerDirectPrint(viewingBill, 'usb');
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center space-x-1.5 border-none"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>USB Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
