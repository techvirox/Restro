import React, { useState, useEffect } from 'react';
import { EstimateBill } from '../types';
import { 
  CheckCircle, 
  Printer, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  Sparkles, 
  X, 
  FileText, 
  Share2, 
  ArrowRight,
  TrendingUp,
  Sliders,
  DollarSign,
  Bluetooth,
  Usb,
  Settings,
  RefreshCw
} from 'lucide-react';
import { soundEffects } from './SoundUtility';
import { printThermalBill, getPrinterConfig } from '../utils/printUtility';

interface ThermalSettlementModalProps {
  bill: EstimateBill | null;
  onClose: () => void;
}

export const ThermalSettlementModal: React.FC<ThermalSettlementModalProps> = ({
  bill,
  onClose
}) => {
  const [autoPrint, setAutoPrint] = useState(true);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [duplicateSlip, setDuplicateSlip] = useState(false);
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>(() => {
    const saved = localStorage.getItem('bitespeed_print_paper_size');
    return (saved === '58mm' || saved === '80mm') ? saved : '80mm';
  });

  const [printerDriver, setPrinterDriver] = useState<'system' | 'usb' | 'bluetooth' | 'lan' | 'virtual' | 'laptop'>(() => {
    return (localStorage.getItem('bitespeed_printer_driver') as any) || 'system';
  });
  const [usbPath, setUsbPath] = useState(() => localStorage.getItem('bitespeed_usb_path') || '0416:5011');
  const [bluetoothName, setBluetoothName] = useState(() => localStorage.getItem('bitespeed_bluetooth_name') || 'MTP-II');
  const [showConfig, setShowConfig] = useState(true);

  // Dynamic Restaurant & Tax configurations
  const [restName, setRestName] = useState(() => getPrinterConfig().title);
  const [restAddress, setRestAddress] = useState(() => getPrinterConfig().address);
  const [restGstin, setRestGstin] = useState(() => getPrinterConfig().gstin);
  const [restContact, setRestContact] = useState(() => getPrinterConfig().contact);

  useEffect(() => {
    const config = getPrinterConfig();
    if (config.title) setRestName(config.title);
    if (config.address) setRestAddress(config.address);
    if (config.gstin) setRestGstin(config.gstin);
    if (config.contact) setRestContact(config.contact);
  }, [bill]);

  const handleRestNameChange = (val: string) => {
    setRestName(val);
    localStorage.setItem('bitespeed_printer_title', val);
  };

  const handleRestAddressChange = (val: string) => {
    setRestAddress(val);
    localStorage.setItem('bitespeed_printer_address', val);
  };

  const handleRestGstinChange = (val: string) => {
    setRestGstin(val);
    localStorage.setItem('bitespeed_printer_gstin', val);
  };

  const handleRestContactChange = (val: string) => {
    setRestContact(val);
    localStorage.setItem('bitespeed_printer_contact', val);
  };

  const changePaperSize = (size: '80mm' | '58mm') => {
    soundEffects.playTick();
    setPaperSize(size);
    localStorage.setItem('bitespeed_print_paper_size', size);
  };

  const changePrinterDriver = (driver: 'system' | 'usb' | 'bluetooth') => {
    soundEffects.playTick();
    setPrinterDriver(driver);
    localStorage.setItem('bitespeed_printer_driver', driver);
  };

  const handleBluetoothScan = async () => {
    soundEffects.playTick();
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert("आपका ब्राउज़र Web Bluetooth का समर्थन नहीं करता है। कृपया Google Chrome/Edge का उपयोग करें और सुनिश्चित करें कि ब्लूटूथ चालू है!");
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
        setBluetoothName(pickedName);
        localStorage.setItem('bitespeed_bluetooth_name', pickedName);
        alert(`सफलतापूर्वक कनेक्ट किया गया ब्लूटूथ डिवाइस: ${pickedName}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`ब्लूटूथ डिवाइस खोजने में विफल: ${err?.message || err}`);
    }
  };

  const handleUsbScan = async () => {
    soundEffects.playTick();
    const nav = navigator as any;
    if (!nav.usb) {
      alert("आपका ब्राउज़र WebUSB का समर्थन नहीं करता है। कृपया Google Chrome, Microsoft Edge या Opera का उपयोग करें!");
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
        alert(`सफलतापूर्वक कनेक्ट किया गया: ${device.productName || 'Thermal Printer'} (${formattedPath})`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`USB डिवाइस खोजने में विफल: ${err?.message || err}`);
    }
  };
  
  // Clean up states or trigger printing on mount
  useEffect(() => {
    if (bill) {
      soundEffects.playSuccessChime();
      
      const savedWidth = localStorage.getItem('bitespeed_print_paper_size') as '80mm' | '58mm' || '80mm';

      if (autoPrint) {
        const timer = setTimeout(() => {
          printThermalBill(bill, duplicateSlip, savedWidth);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [bill, autoPrint, duplicateSlip]);

  if (!bill) return null;

  const taxableBase = bill.subtotal - bill.discountAmount;
  const effectiveGstRate = taxableBase > 0 ? (bill.taxAmount / taxableBase) * 100 : 0;
  const halfRateText = `${(effectiveGstRate / 2).toFixed(1)}%`;

  const config = getPrinterConfig();

  const handlePrint = () => {
    soundEffects.playTick();
    if (restName) localStorage.setItem('bitespeed_printer_title', restName.trim());
    if (restAddress) localStorage.setItem('bitespeed_printer_address', restAddress.trim());
    if (restGstin) localStorage.setItem('bitespeed_printer_gstin', restGstin.trim());
    if (restContact) localStorage.setItem('bitespeed_printer_contact', restContact.trim());

    printThermalBill(bill, duplicateSlip || config.duplicateCopy, paperSize);
  };

  const handleShare = () => {
    soundEffects.playTick();
    try {
      const shareText = `*BiteSpeed Bistro Receipt*\nBill No: ${bill.billNumber}\nTable: ${bill.tableName}\nTotal: ₹${bill.grandTotal}\nThank you!`;
      navigator.clipboard.writeText(shareText);
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    } catch (err) {
      console.warn('Share error', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn"
      id="thermal-modal-overlay"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row border border-slate-200 dark:border-slate-800 overflow-hidden pr-0 max-h-[90vh]">
        
        {/* Left Interactive & Management Panel (Responsive padding) */}
        <div className="flex-1 p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
          
          {/* Header State */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-bold uppercase font-mono tracking-widest bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">Transaction Settled</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white font-sans leading-tight">
              Bill Settled & Table Vacated!
            </h2>
            <p className="text-xs text-slate-400">
              The order for <span className="font-bold text-slate-600 dark:text-slate-300">{bill.tableName}</span> is archived. A finalized tax invoice has been generated for accounts reconciliation.
            </p>
          </div>

          {/* Quick Details Widgets */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Invoice Code</span>
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">{bill.billNumber}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Total Paid Amt</span>
              <span className="text-xs font-black font-mono text-emerald-600">₹{bill.grandTotal.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Collector Method</span>
              <span className="text-xs font-bold uppercase font-sans text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> {bill.paymentMethod || 'CASH'}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
            {/* Quick Guest Card */}
            {bill.customerName && bill.customerName !== 'Walk-in' && bill.customerName !== 'Loyal Guest' && (
              <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-slate-800 rounded-xl space-y-1 font-sans">
                <div className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Guest CRM Record</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 flex justify-between items-center">
                  <span className="font-bold">{bill.customerName}</span>
                  {bill.customerPhone && <span className="font-mono text-slate-400">{bill.customerPhone}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handlePrint}
              className="w-full bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer hover:shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice ({paperSize} Thermal Copy)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShare}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedStatus ? 'Copied' : 'Share Text'}</span>
              </button>

              <button
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-xs"
              >
                <span>Done & Vacate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Photorealistic Virtual Slip Preview */}
        <div className="w-full md:w-[360px] bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-start border-l border-slate-200 dark:border-slate-800 overflow-y-auto shrink-0 select-none">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center block">
            📟 LIVE {paperSize.toUpperCase()} SLIP PREVIEW
          </label>

          {typeof window !== 'undefined' && localStorage.getItem('bitespeed_printer_driver') === 'laptop' && (
            <div className="mb-3 px-3 py-1 bg-indigo-50 border border-indigo-150 dark:bg-indigo-950/20 dark:border-indigo-900 rounded-xl text-[9px] text-indigo-700 dark:text-indigo-400 font-bold font-mono tracking-wide text-center uppercase flex items-center justify-center gap-1 shadow-3xs animate-in zoom-in-95 duration-150">
              <span className="animate-pulse text-indigo-550">●</span>
              <span>Laptop Spooler:</span>
              <span className="text-slate-800 dark:text-slate-100 font-extrabold">{localStorage.getItem('bitespeed_laptop_printer_name') || 'XP-80 Printer'}</span>
            </div>
          )}

          {/* Paper roll representation with simulated edge shadows */}
          <div 
            id="virtual-receipt-preview"
            className={`bg-white text-slate-950 leading-relaxed shadow-lg border border-slate-300 relative rounded-sm transition-all duration-300 ${
              paperSize === '58mm' ? 'w-[220px] text-[9px] p-3' : 'w-[280px] text-[11px] p-5'
            }`}
          >
            {/* Top jagged cut edge effect */}
            <div className="absolute -top-1 left-0 right-0 h-1.5 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0)_60%,#e2e8f0_62%)] bg-[length:6px_6px] repeat-x"></div>

            {/* Header copy */}
            <div className="text-center space-y-1 mb-3">
              <h3 className={`font-bold uppercase tracking-tight ${paperSize === '58mm' ? 'text-xs' : 'text-sm'}`}>{restName || getPrinterConfig().title}</h3>
              {(restAddress || getPrinterConfig().address) && (
                <p className={`${paperSize === '58mm' ? 'text-[7.5px]' : 'text-[9px]'} text-slate-600`}>{restAddress || getPrinterConfig().address}</p>
              )}
              <p className={`${paperSize === '58mm' ? 'text-[7.5px]' : 'text-[9px]'} text-slate-600`}>
                {(restGstin || getPrinterConfig().gstin) ? `GSTIN: ${restGstin || getPrinterConfig().gstin} • ` : ''}Tel: {restContact || getPrinterConfig().contact}
              </p>
              <div className="border-t border-dashed border-slate-400 my-1.5"></div>
              <h4 className={`font-bold bg-slate-100 py-0.5 tracking-wider uppercase ${paperSize === '58mm' ? 'text-[8.5px]' : 'text-[10px]'}`}>
                TAX INVOICE / CASH BILL
              </h4>
              <p className={`${paperSize === '58mm' ? 'text-[8px]' : 'text-[9px]'} text-slate-500`}>Invoice: {bill.billNumber}</p>
            </div>

            {/* Order stats metadata */}
            <div className={`space-y-0.5 my-2.5 ${paperSize === '58mm' ? 'text-[8px]' : 'text-[9.5px]'}`}>
              <div className="flex justify-between">
                <span>DATE: {new Date(bill.createdAt).toLocaleDateString()}</span>
                <span>TIME: {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>TABLE: {bill.tableName}</span>
                <span>MODE: {bill.orderType.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>CAPTAIN: {bill.currentWaiter || 'SELF'}</span>
                <span>TERMINAL: #01</span>
              </div>
              
              {bill.customerName && (
                <div className="border-t border-dashed border-slate-300 pt-1 mt-1 text-slate-600">
                  <p className="truncate">CUST: {bill.customerName}</p>
                  {bill.customerPhone && <p>CONTACT: {bill.customerPhone}</p>}
                </div>
              )}
            </div>

            {/* Table Items List */}
            <div className="border-t border-b border-dashed border-slate-600 py-1.5 my-2.5 font-bold">
              <div className={`grid grid-cols-12 gap-1 ${paperSize === '58mm' ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
                <span className="col-span-6 text-left">ITEM</span>
                <span className="col-span-2 text-center">QTY</span>
                <span className="col-span-2 text-right">RATE</span>
                <span className="col-span-2 text-right">TOTAL</span>
              </div>
            </div>

            <div className="space-y-1 border-b border-dashed border-slate-400 pb-2 font-mono">
              {bill.items.map((it, idx) => (
                <div key={idx} className={`grid grid-cols-12 gap-1 items-start ${paperSize === '58mm' ? 'text-[8px]' : 'text-[9.5px]'}`}>
                  <span className="col-span-6 text-left font-bold">{it.name}</span>
                  <span className="col-span-2 text-center">{it.quantity}</span>
                  <span className="col-span-2 text-right">₹{it.price}</span>
                  <span className="col-span-2 text-right">₹{(it.price * it.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* Calculations breakdown */}
            <div className={`space-y-0.5 my-2 px-1 text-right ${paperSize === '58mm' ? 'text-[8px]' : 'text-[9.5px]'}`}>
              <div className="flex justify-between">
                <span>Cart Subtotal:</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>
              
              {bill.discountAmount > 0 && (
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Discount Applied:</span>
                  <span>-₹{bill.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>SGST ({halfRateText}):</span>
                <span>₹{(bill.taxAmount / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST ({halfRateText}):</span>
                <span>₹{(bill.taxAmount / 2).toFixed(2)}</span>
              </div>

              {bill.deliveryCharge !== undefined && bill.deliveryCharge > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>₹{bill.deliveryCharge.toFixed(2)}</span>
                </div>
              )}

              <div className={`flex justify-between font-bold border-t border-black pt-1.5 mt-1 text-slate-900 ${paperSize === '58mm' ? 'text-[10px]' : 'text-xs'}`}>
                <span>PAID TOTAL:</span>
                <span>₹{bill.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment stamp indicator overlay */}
            {config.showStamp && (
              <div className={`my-3 py-1.5 border border-slate-400 text-center font-bold tracking-widest text-emerald-800 uppercase rounded bg-emerald-50 border-double ${paperSize === '58mm' ? 'text-[8.5px] py-1' : 'text-[10px]'}`}>
                ★★ PAID Settle ({bill.paymentMethod || 'CASH'}) ★★
              </div>
            )}

            {/* Simulated Barcode */}
            {config.showBarcode && (
              <div className="flex flex-col items-center justify-center space-y-1 py-1 text-slate-800">
                <div className={`bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_2px,#ffffff_2px,#ffffff_4px)] ${paperSize === '58mm' ? 'h-4 w-28' : 'h-6 w-36'}`}></div>
                <span className="text-[8px] tracking-tight">{bill.billNumber}-SECURE</span>
              </div>
            )}

            <div className={`text-center mt-3.5 font-bold space-y-0.5 text-slate-600 ${paperSize === '58mm' ? 'text-[7.5px]' : 'text-[8.5px]'}`}>
              <p>{config.footerBanner}</p>
              <p className="font-normal text-[7.5px] text-slate-400">{config.footerSub}</p>
            </div>

            {/* Simulated tear guidelines on bottom of page */}
            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0)_60%,#e2e8f0_62%)] bg-[length:6px_6px] repeat-x"></div>
          </div>
        </div>

      </div>

      {/* Actual Hidden print section - strictly targetted during window.print! */}
      <div id="hidden-print-section" className="hidden print:block fixed inset-0 z-50 bg-white text-slate-950 p-4 font-mono text-[10.5px] leading-relaxed max-w-[310px]">
        {/* Receipt Copy 1 */}
        <div className="text-center space-y-0.5 mb-3">
          <h3 className="font-bold text-xs uppercase">{restName}</h3>
          <p className="text-[8px]">{restAddress}</p>
          <p className="text-[8px]">GSTIN: {restGstin}</p>
          <div className="border-t border-dashed border-black my-1"></div>
          <h4 className="font-bold text-[9px] uppercase tracking-wider bg-slate-100 py-0.5">
            FINAL TAX INVOICE
          </h4>
          <p className="text-[8px]">Rep: {bill.billNumber}</p>
        </div>

        <div className="space-y-0.5 my-2 text-[9px]">
          <div className="flex justify-between">
            <span>DATE: {new Date(bill.createdAt).toLocaleDateString()}</span>
            <span>TIME: {new Date(bill.createdAt).toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>TABLE: {bill.tableName}</span>
            <span>MODE: {bill.orderType.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>CAPTAIN: {bill.currentWaiter || 'SELF'}</span>
            <span>METHOD: {bill.paymentMethod || 'CASH'}</span>
          </div>
          {bill.customerName && (
            <div className="border-t border-dashed border-black pt-0.5 mt-0.5">
              <p>CUSTOMER: {bill.customerName} ({bill.customerPhone})</p>
            </div>
          )}
        </div>

        <div className="border-t border-b border-dashed border-black py-1 my-1.5 font-bold">
          <div className="grid grid-cols-12 gap-0.5 text-[8.5px]">
            <span className="col-span-6 text-left">ITEM</span>
            <span className="col-span-2 text-center">QTY</span>
            <span className="col-span-2 text-right">RATE</span>
            <span className="col-span-2 text-right">TOTAL</span>
          </div>
        </div>

        <div className="space-y-1 border-b border-dashed border-black pb-1.5">
          {bill.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-0.5 text-[8.5px]">
              <span className="col-span-6 text-left font-bold">{it.name}</span>
              <span className="col-span-2 text-center">{it.quantity}</span>
              <span className="col-span-2 text-right">₹{it.price}</span>
              <span className="col-span-2 text-right">₹{(it.price * it.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-0.5 my-2 text-right text-[8.5px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount Applied:</span>
              <span>-₹{bill.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>SGST ({halfRateText}):</span>
            <span>₹{(bill.taxAmount / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST ({halfRateText}):</span>
            <span>₹{(bill.taxAmount / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-[9px] border-t border-black pt-1">
            <span>GRAND NET TOTAL:</span>
            <span>₹{bill.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="my-2 border border-black text-center font-bold text-[8px] py-1 bg-slate-50 uppercase tracking-widest">
          ★★★ TRANSACT PAID ★★★
        </div>

        <div className="text-center text-[8px] mt-4 font-bold">
          <p>THANK YOU FOR DINING WITH US!</p>
          <p className="font-normal text-[7px]">BiteSpeed Restaurant Suites</p>
        </div>

        {/* Duplicate copy if box is checked */}
        {duplicateSlip && (
          <div className="mt-8 pt-8 border-t-2 border-dashed border-black">
            <div className="text-center space-y-0.5 mb-3">
              <h3 className="font-bold text-xs uppercase">{restName}</h3>
              <span className="text-[7.5px] border border-black px-1.5 uppercase font-bold tracking-widest">★★ AUDITOR DUPLICATE COPY ★★</span>
              <p className="text-[8px] mt-1">Invoice: {bill.billNumber}</p>
            </div>
            
            <div className="space-y-0.5 my-2 text-[9px]">
              <div className="flex justify-between">
                <span>DATE: {new Date(bill.createdAt).toLocaleDateString()}</span>
                <span>TABLE: {bill.tableName}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>GRAND TOTAL: ₹{bill.grandTotal.toFixed(2)}</span>
                <span>{bill.paymentMethod || 'CASH'}</span>
              </div>
              <p className="text-left text-[8px]">CAPTAIN: {bill.currentWaiter || 'SELF'}</p>
            </div>
            
            <div className="border-t border-dashed border-black pt-1 mt-4 text-center text-[7.5px]">
              * Secure terminal backup. Do not serve as customer invoice *
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
