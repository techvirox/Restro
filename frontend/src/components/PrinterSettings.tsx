import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Save, 
  RotateCcw, 
  Type, 
  MapPin, 
  Phone, 
  BadgePercent, 
  Barcode, 
  Check, 
  Sparkles, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { soundEffects } from './SoundUtility';
import { printThermalBill } from '../utils/printUtility';

export const PrinterSettings: React.FC = () => {
  // Form values backed by localStorage
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [gstin, setGstin] = useState('');
  const [footerBanner, setFooterBanner] = useState('');
  const [footerSub, setFooterSub] = useState('');
  
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [duplicateCopy, setDuplicateCopy] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showStamp, setShowStamp] = useState(true);

  // Printer selection driver state variables
  const [printerDriver, setPrinterDriver] = useState<'system' | 'usb' | 'bluetooth' | 'lan' | 'virtual' | 'laptop'>('system');
  const [printerIp, setPrinterIp] = useState('192.168.1.100');
  const [printerPort, setPrinterPort] = useState('9100');
  const [usbPath, setUsbPath] = useState('0416:5011');
  const [usbBaudRate, setUsbBaudRate] = useState('115200');
  const [bluetoothName, setBluetoothName] = useState('MTP-II');

  // Laptop custom parameters
  const [laptopPrinterName, setLaptopPrinterName] = useState('XP-80 Thermal Printer Queue');
  const [laptopSpoolerType, setLaptopSpoolerType] = useState('raw-websockets');
  const [triggerCashDrawer, setTriggerCashDrawer] = useState(false);
  const [autoCutPaper, setAutoCutPaper] = useState(true);

  // Load configuration on mount
  useEffect(() => {
    setTitle(localStorage.getItem('bitespeed_printer_title') || 'BITESPEED BISTRO');
    setAddress(localStorage.getItem('bitespeed_printer_address') || 'Highstreet Cyber Plaza, Sector-III');
    setContact(localStorage.getItem('bitespeed_printer_contact') || '+91 98765 43210');
    setGstin(localStorage.getItem('bitespeed_printer_gstin') || '27AAAAA1111A1Z0');
    setFooterBanner(localStorage.getItem('bitespeed_printer_footer_banner') || 'THANK YOU FOR PATRONISING US!');
    setFooterSub(localStorage.getItem('bitespeed_printer_footer_sub') || 'BiteSpeed Retail Softwares');
    
    const size = localStorage.getItem('bitespeed_print_paper_size') as '80mm' | '58mm' || '80mm';
    setPaperSize(size);
    
    setDuplicateCopy(localStorage.getItem('bitespeed_printer_duplicate_copy') === 'true');
    setShowBarcode(localStorage.getItem('bitespeed_printer_show_barcode') !== 'false');
    setShowStamp(localStorage.getItem('bitespeed_printer_show_stamp') !== 'false');

    // Load printer selection
    const driver = localStorage.getItem('bitespeed_printer_driver') as any || 'system';
    setPrinterDriver(driver);
    setPrinterIp(localStorage.getItem('bitespeed_printer_ip') || '192.168.1.100');
    setPrinterPort(localStorage.getItem('bitespeed_printer_port') || '9100');
    setUsbPath(localStorage.getItem('bitespeed_usb_path') || '0416:5011');
    setUsbBaudRate(localStorage.getItem('bitespeed_usb_baud') || '115200');
    setBluetoothName(localStorage.getItem('bitespeed_bluetooth_name') || 'MTP-II');

    // Load laptop settings
    setLaptopPrinterName(localStorage.getItem('bitespeed_laptop_printer_name') || 'XP-80 Thermal Printer Queue');
    setLaptopSpoolerType(localStorage.getItem('bitespeed_laptop_spooler_type') || 'raw-websockets');
    setTriggerCashDrawer(localStorage.getItem('bitespeed_laptop_cash_drawer') === 'true');
    setAutoCutPaper(localStorage.getItem('bitespeed_laptop_auto_cut') !== 'false');
  }, []);

  const handleSave = () => {
    soundEffects.playSuccessChime();
    
    localStorage.setItem('bitespeed_printer_title', title.trim());
    localStorage.setItem('bitespeed_printer_address', address.trim());
    localStorage.setItem('bitespeed_printer_contact', contact.trim());
    localStorage.setItem('bitespeed_printer_gstin', gstin.trim());
    localStorage.setItem('bitespeed_printer_footer_banner', footerBanner.trim());
    localStorage.setItem('bitespeed_printer_footer_sub', footerSub.trim());
    
    localStorage.setItem('bitespeed_print_paper_size', paperSize);
    localStorage.setItem('bitespeed_printer_duplicate_copy', duplicateCopy ? 'true' : 'false');
    localStorage.setItem('bitespeed_printer_show_barcode', showBarcode ? 'true' : 'false');
    localStorage.setItem('bitespeed_printer_show_stamp', showStamp ? 'true' : 'false');

    // Save printer driver values
    localStorage.setItem('bitespeed_printer_driver', printerDriver);
    localStorage.setItem('bitespeed_printer_ip', printerIp);
    localStorage.setItem('bitespeed_printer_port', printerPort);
    localStorage.setItem('bitespeed_usb_path', usbPath);
    localStorage.setItem('bitespeed_usb_baud', usbBaudRate);
    localStorage.setItem('bitespeed_bluetooth_name', bluetoothName);

    // Save laptop custom values
    localStorage.setItem('bitespeed_laptop_printer_name', laptopPrinterName);
    localStorage.setItem('bitespeed_laptop_spooler_type', laptopSpoolerType);
    localStorage.setItem('bitespeed_laptop_cash_drawer', triggerCashDrawer ? 'true' : 'false');
    localStorage.setItem('bitespeed_laptop_auto_cut', autoCutPaper ? 'true' : 'false');

    // Show quick alert
    alert('Printer configurations persisted successfully! Try executing a test print now.');
  };

  const handleRestoreDefaults = () => {
    if (confirm('Revert all receipt layouts back to original default settings?')) {
      soundEffects.playTick();
      
      setTitle('BITESPEED BISTRO');
      setAddress('Highstreet Cyber Plaza, Sector-III');
      setContact('+91 98765 43210');
      setGstin('27AAAAA1111A1Z0');
      setFooterBanner('THANK YOU FOR PATRONISING US!');
      setFooterSub('BiteSpeed Retail Softwares');
      setPaperSize('80mm');
      setDuplicateCopy(false);
      setShowBarcode(true);
      setShowStamp(true);
      setPrinterDriver('system');
      setPrinterIp('192.168.1.100');
      setPrinterPort('9100');
      setUsbPath('0416:5011');
      setUsbBaudRate('115200');
      setBluetoothName('MTP-II');
      setLaptopPrinterName('XP-80 Thermal Printer Queue');
      setLaptopSpoolerType('raw-websockets');
      setTriggerCashDrawer(false);
      setAutoCutPaper(true);

      localStorage.setItem('bitespeed_printer_title', 'BITESPEED BISTRO');
      localStorage.setItem('bitespeed_printer_address', 'Highstreet Cyber Plaza, Sector-III');
      localStorage.setItem('bitespeed_printer_contact', '+91 98765 43210');
      localStorage.setItem('bitespeed_printer_gstin', '27AAAAA1111A1Z0');
      localStorage.setItem('bitespeed_printer_footer_banner', 'THANK YOU FOR PATRONISING US!');
      localStorage.setItem('bitespeed_printer_footer_sub', 'BiteSpeed Retail Softwares');
      localStorage.setItem('bitespeed_print_paper_size', '80mm');
      localStorage.setItem('bitespeed_printer_duplicate_copy', 'false');
      localStorage.setItem('bitespeed_printer_show_barcode', 'true');
      localStorage.setItem('bitespeed_printer_show_stamp', 'true');
      localStorage.setItem('bitespeed_printer_driver', 'system');
      localStorage.setItem('bitespeed_printer_ip', '192.168.1.100');
      localStorage.setItem('bitespeed_printer_port', '9100');
      localStorage.setItem('bitespeed_usb_path', '0416:5011');
      localStorage.setItem('bitespeed_usb_baud', '115200');
      localStorage.setItem('bitespeed_bluetooth_name', 'MTP-II');
      localStorage.setItem('bitespeed_laptop_printer_name', 'XP-80 Thermal Printer Queue');
      localStorage.setItem('bitespeed_laptop_spooler_type', 'raw-websockets');
      localStorage.setItem('bitespeed_laptop_cash_drawer', 'false');
      localStorage.setItem('bitespeed_laptop_auto_cut', 'true');
    }
  };

  const handleTestPrint = () => {
    soundEffects.playSuccessChime();
    
    // First save the current screen values to local storage so the printed slip reflects current screen state
    localStorage.setItem('bitespeed_printer_title', title.trim());
    localStorage.setItem('bitespeed_printer_address', address.trim());
    localStorage.setItem('bitespeed_printer_contact', contact.trim());
    localStorage.setItem('bitespeed_printer_gstin', gstin.trim());
    localStorage.setItem('bitespeed_printer_footer_banner', footerBanner.trim());
    localStorage.setItem('bitespeed_printer_footer_sub', footerSub.trim());
    localStorage.setItem('bitespeed_print_paper_size', paperSize);
    localStorage.setItem('bitespeed_printer_duplicate_copy', duplicateCopy ? 'true' : 'false');
    localStorage.setItem('bitespeed_printer_show_barcode', showBarcode ? 'true' : 'false');
    localStorage.setItem('bitespeed_printer_show_stamp', showStamp ? 'true' : 'false');
    localStorage.setItem('bitespeed_printer_driver', printerDriver);
    localStorage.setItem('bitespeed_printer_ip', printerIp);
    localStorage.setItem('bitespeed_printer_port', printerPort);
    localStorage.setItem('bitespeed_usb_path', usbPath);
    localStorage.setItem('bitespeed_usb_baud', usbBaudRate);
    localStorage.setItem('bitespeed_bluetooth_name', bluetoothName);
    localStorage.setItem('bitespeed_laptop_printer_name', laptopPrinterName);
    localStorage.setItem('bitespeed_laptop_spooler_type', laptopSpoolerType);
    localStorage.setItem('bitespeed_laptop_cash_drawer', triggerCashDrawer ? 'true' : 'false');
    localStorage.setItem('bitespeed_laptop_auto_cut', autoCutPaper ? 'true' : 'false');

    const sampleBill = {
      id: "sample-bill-uuid-101",
      orderId: "sample-order-uuid-101",
      billNumber: "INV-TEST-0007",
      type: "invoice" as const,
      customerName: "Rahul Sharma (Merchant Test)",
      customerPhone: "+91 98450 12345",
      tableName: "Table Premium 4",
      orderType: "dine-in",
      items: [
        { menuItemId: "ti-sample-1", name: "Premium Butter Chicken Masala", price: 380, quantity: 2, sentToKitchenQty: 2 },
        { menuItemId: "ti-sample-2", name: "Garlic Butter Naan Flatbread", price: 60, quantity: 4, sentToKitchenQty: 4 },
        { menuItemId: "ti-sample-3", name: "Spiced Masala Shikanji Soda", price: 110, quantity: 3, sentToKitchenQty: 3 }
      ],
      subtotal: 1330,
      discountAmount: 80,
      taxAmount: 62.50,
      serviceChargeAmount: 0,
      deliveryCharge: 0,
      grandTotal: 1312.50,
      createdAt: new Date().toISOString(),
      paymentMethod: "UPI Settle",
      currentWaiter: "Captain Sharma"
    };

    printThermalBill(sampleBill, duplicateCopy, paperSize);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-12">
      
      {/* LEFT COLUMN: Input Configuration Fields (8 columns) */}
      <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
        
        {/* Header Title describing the function */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Thermal Printer Layout Controls</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Customize shop descriptors and layout toggles for physical print commands
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition cursor-pointer border-none"
              title="Reset configuration values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm transition hover:shadow-md cursor-pointer border-none"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>

        {/* Section 0: Select Printer & Interface connection */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded bg-indigo-500 inline-block text-indigo-500"></span>
            <span>Selected Connection & Printer Hardware</span>
          </h3>
          
          <div className="p-4 bg-slate-55 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-4 shadow-3xs">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span>Active Printer Driver / Connection Interface</span>
              </label>
              <select
                value={printerDriver}
                onChange={(e) => {
                  soundEffects.playTick();
                  setPrinterDriver(e.target.value as any);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-950 dark:text-white outline-none focus:border-indigo-500 cursor-pointer font-sans"
              >
                <option value="system">🖨️ System Default Print Dialog (Direct Browser / AirPrint)</option>
                <option value="laptop">💻 Laptop / Desktop Native Spooler Queue (Epson/XP-80/POS)</option>
                <option value="usb">🔌 USB Raw Port connection (POS-80/POS-58)</option>
                <option value="bluetooth">📶 Bluetooth Wireless Thermal Printer (MTP-II / PT-210)</option>
                <option value="lan">🌐 Network LAN / WiFi IP Printer (Raw TCP Port 9100)</option>
                <option value="virtual">💾 Virtual Digital PDF Receipt / Drive Cloud</option>
              </select>
              <p className="text-[10.5px] text-slate-450 dark:text-slate-500 leading-normal pl-0.5">
                {printerDriver === 'system' && "Fires native system driver dialog, fully styled to perfectly auto-align inside physical printable ranges."}
                {printerDriver === 'laptop' && "Connects directly with your Windows/Mac/Linux laptop print queues, spoolers, or companion system routing agents."}
                {printerDriver === 'usb' && "Enables raw character commands directly over native USB COM interfaces/baud pipelines."}
                {printerDriver === 'bluetooth' && "Tunnels raw print streams straight to wireless hand-held bluetooth POS hardware chips."}
                {printerDriver === 'lan' && "Triggers real-time socket packets directly to your kitchen and receipt printers on the network."}
                {printerDriver === 'virtual' && "Generates responsive, paperless digital thermal slips ready for remote SMS text, WhatsApp, or email."}
              </p>
            </div>

            {/* Laptop/Desktop device printer dynamic form */}
            {printerDriver === 'laptop' && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850/60 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Laptop/Desktop Printer Queue Name</span>
                    <input
                      type="text"
                      value={laptopPrinterName}
                      onChange={(e) => setLaptopPrinterName(e.target.value)}
                      placeholder="e.g. POS-80, Epson TM-T82, XP-80"
                      className="w-full bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[9.5px] text-slate-400 self-center">Presets:</span>
                      {['XP-80 Printer', 'EPSON TM-T82', 'POS-80 series', 'PDF Writer'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            soundEffects.playTick();
                            setLaptopPrinterName(preset);
                          }}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-350 rounded text-[9.5px] border-none cursor-pointer font-sans font-medium"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Laptop Connection Pipeline Protocol</span>
                    <select
                      value={laptopSpoolerType}
                      onChange={(e) => setLaptopSpoolerType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-950 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="raw-websockets">🔌 Localhost WebSocket Loopback Service (Port 8080)</option>
                      <option value="driver-queue">🖨️ OS Print Spooler Driver Queuing (Web Driver Direct)</option>
                      <option value="raw-hid">🛡️ Direct Client WebHID Access (Laptop USB port bypass)</option>
                      <option value="virtual-com">⚡ Virtual COM Serial Pipeline Emulator (Laptop Serial Mode)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Autocut Receipt Slip</span>
                      <p className="text-[10px] text-slate-455 dark:text-slate-480">Toggles ESC/POS GS V 0 cut code at footer.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoCutPaper}
                        onChange={(e) => {
                          soundEffects.playTick();
                          setAutoCutPaper(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-605 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Trigger Cash Drawer</span>
                      <p className="text-[10px] text-slate-455 dark:text-slate-480 font-sans">Pulse pin-2,5 solenoid trigger codes.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={triggerCashDrawer}
                        onChange={(e) => {
                          soundEffects.playTick();
                          setTriggerCashDrawer(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-605 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* LAN Configuration Dynamic Form */}
            {printerDriver === 'lan' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-850/60 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Network Host IP Address</span>
                  <input
                    type="text"
                    value={printerIp}
                    onChange={(e) => setPrinterIp(e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                    className="w-full bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Raw TCP Port</span>
                  <input
                    type="text"
                    value={printerPort}
                    onChange={(e) => setPrinterPort(e.target.value)}
                    placeholder="e.g. 9100"
                    className="w-full bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            )}

            {/* USB Dynamic Form */}
            {printerDriver === 'usb' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-850/60 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="space-y-1.5 font-sans">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">USB VID:PID Address</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={usbPath}
                      onChange={(e) => setUsbPath(e.target.value)}
                      placeholder="e.g. 0416:5011"
                      className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={async () => {
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
                      }}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                    >
                      Scan USB
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Interface pipeline Speed</span>
                  <select
                    value={usbBaudRate}
                    onChange={(e) => setUsbBaudRate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="9600">9600 bps Standard</option>
                    <option value="19200">19200 bps Speed</option>
                    <option value="38400">38400 bps High</option>
                    <option value="115200">115200 bps Ultra (Recommended)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Bluetooth Dynamic Form */}
            {printerDriver === 'bluetooth' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-850/60 animate-in fade-in slide-in-from-top-1 duration-150">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-sans">Identified Bluetooth Name</span>
                <div className="flex gap-2 font-sans">
                  <input
                    type="text"
                    value={bluetoothName}
                    onChange={(e) => setBluetoothName(e.target.value)}
                    placeholder="e.g. MTP-II / PT-210 / POS-58"
                    className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={async () => {
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
                    }}
                    className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                  >
                    Locate Devices
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Header/Shop Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded bg-indigo-500 inline-block"></span>
            <span>Receipt Header branding</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Type className="w-3 h-3 text-slate-400" />
                <span>Restaurant Name</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. BITESPEED BISTRO"
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Address line</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Highstreet Cyber Plaza, Sector-III"
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>Contact / Hotline</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. Ph: +91 98765 43210"
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BadgePercent className="w-3 h-3 text-slate-400" />
                <span>GSTIN Tax Number</span>
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 27AAAAA1111A1Z0"
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Footers */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded bg-indigo-500 inline-block"></span>
            <span>Receipt Footer templates</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Thank-You Message (Bold)
              </label>
              <input
                type="text"
                value={footerBanner}
                onChange={(e) => setFooterBanner(e.target.value)}
                placeholder="THANK YOU FOR PATRONISING US!"
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Small Credits Line
              </label>
              <input
                type="text"
                value={footerSub}
                onChange={(e) => setFooterSub(e.target.value)}
                placeholder="BiteSpeed Retail Softwares"
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Hardware Print Settings */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded bg-indigo-500 inline-block"></span>
            <span>General settings & hardware flags</span>
          </h3>

          <div className="space-y-4">
            {/* Paper Size Selector buttons */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Default Receipt Width</h4>
                  <p className="text-[10px] text-slate-400">Specify your thermal roll dimension</p>
                </div>
                
                <div className="inline-flex rounded-xl p-0.5 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-850 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setPaperSize('80mm');
                    }}
                    className={`px-4 py-2 rounded-lg transition ${
                      paperSize === '80mm'
                        ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    80mm Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setPaperSize('58mm');
                    }}
                    className={`px-4 py-2 rounded-lg transition ${
                      paperSize === '58mm'
                        ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    58mm Receipt
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <label className="flex items-start gap-2.5 p-3.5 bg-slate-55 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/30 border border-slate-150 dark:border-slate-850/60 rounded-xl cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={duplicateCopy}
                  onChange={(e) => {
                    soundEffects.playTick();
                    setDuplicateCopy(e.target.checked);
                  }}
                  className="mt-0.5 accent-indigo-650 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="block text-[11px] font-bold text-slate-755 dark:text-slate-200">Merchant Duplicate</span>
                  <span className="block text-[9px] text-slate-400">Append supervisor copy</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3.5 bg-slate-55 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/30 border border-slate-150 dark:border-slate-850/60 rounded-xl cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => {
                    soundEffects.playTick();
                    setShowBarcode(e.target.checked);
                  }}
                  className="mt-0.5 accent-indigo-650 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="block text-[11px] font-bold text-slate-755 dark:text-slate-200">Barcode Strip</span>
                  <span className="block text-[9px] text-slate-400">Print system barcode at bottom</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3.5 bg-slate-55 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/30 border border-slate-150 dark:border-slate-850/60 rounded-xl cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={showStamp}
                  onChange={(e) => {
                    soundEffects.playTick();
                    setShowStamp(e.target.checked);
                  }}
                  className="mt-0.5 accent-indigo-650 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="block text-[11px] font-bold text-slate-755 dark:text-slate-200">Payment Stamp</span>
                  <span className="block text-[9px] text-slate-400">Show paid transaction marker</span>
                </div>
              </label>

            </div>
          </div>
        </div>

        {/* Real life test click */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 dark:text-slate-500 max-w-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Connect a thermal printer through raw system printing channels or local USB network drivers.</span>
          </div>

          <button
            type="button"
            onClick={handleTestPrint}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm transition hover:shadow-md cursor-pointer border-none"
          >
            <Printer className="w-4 h-4" />
            <span>Real Test Print</span>
          </button>
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive Live Slip Mock (5 columns) */}
      <div className="xl:col-span-5 flex flex-col items-center justify-start space-y-4">
        
        {/* Title marker */}
        <div className="text-center">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Real-time Layout Preview</span>
          </h4>
          <span className="text-[10px] text-slate-400 italic font-medium">Auto-scales to simulated {paperSize} width</span>
        </div>

        {/* Paper Container Mockup */}
        <div 
          className={`bg-[#fffff8] dark:bg-white text-slate-900 border border-amber-100 shadow-xl transition-all duration-350 p-4 font-mono select-none relative rounded-md overflow-hidden ${
            paperSize === '58mm' ? 'w-[235px] text-[8.5px]' : 'w-[305px] text-[10px]'
          }`}
          style={{ letterSpacing: '0.2px' }}
        >
          {/* Header */}
          <div className="text-center space-y-0.5">
            <h3 className={`font-bold uppercase tracking-tight ${paperSize === '58mm' ? 'text-xs' : 'text-sm'}`}>
              {title || 'BITESPEED BISTRO'}
            </h3>
            <p className={`${paperSize === '58mm' ? 'text-[7px]' : 'text-[8.5px]'} text-slate-700 whitespace-normal`}>
              {address || 'Highstreet Cyber Plaza, Sector-III'}
            </p>
            <p className={`${paperSize === '58mm' ? 'text-[7px]' : 'text-[8.5px]'} text-slate-700`}>
              GSTIN: {gstin || '27AAAAA1111A1Z0'} • Ph: {contact || '+91 98765 43210'}
            </p>
          </div>

          <div className="my-2 border-t border-dashed border-slate-950"></div>

          {/* Settle title */}
          <div className="bg-slate-100 py-1 text-center font-bold tracking-wider text-[9.5px]">
            TAX INVOICE / CASH BILL
          </div>

          <div className="my-2 leading-relaxed">
            <div><b>Bill Number:</b> INV-PREVIEW-001</div>
            <div><b>Date & Time:</b> 12/Jun/2026 14:35</div>
            <div className="flex justify-between">
              <span><b>Table:</b> Table A2</span>
              <span><b>Mode:</b> DINE-IN</span>
            </div>
            <div className="flex justify-between">
              <span><b>Captain:</b> Captain Vikram</span>
              <span><b>Collect:</b> UPI SETTLE</span>
            </div>
            <div className="border-t border-dashed border-slate-300 mt-1 pt-1">
              <div><b>Guest:</b> John Doe (Merchant Test)</div>
              <div><b>Phone:</b> +91 99999 88888</div>
            </div>
          </div>

          {/* Items Header */}
          <table className="w-full text-left my-2 border-collapse">
            <thead>
              <tr className="border-t border-b border-dashed border-slate-950 font-bold">
                <th className="py-1">ITEM</th>
                <th className="py-1 text-center">QTY</th>
                <th className="py-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1"><b>Spicy Garlic Chilli Noodles</b></td>
                <td className="py-1 text-center">2</td>
                <td className="py-1 text-right">₹580</td>
              </tr>
              <tr>
                <td className="py-1"><b>Mint Mojito cooler</b></td>
                <td className="py-1 text-center">1</td>
                <td className="py-1 text-right">₹140</td>
              </tr>
              <tr>
                <td className="py-1"><b>Chocolate Lava Sizzling Cake</b></td>
                <td className="py-1 text-center">1</td>
                <td className="py-1 text-right">₹220</td>
              </tr>
            </tbody>
          </table>

          {/* Pricing Math */}
          <div className="space-y-0.5 border-t border-dashed border-slate-950 pt-1.5 text-right">
            <div className="flex justify-between">
              <span>Cart Subtotal:</span>
              <span>₹940.00</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-bold">
              <span>Discount Applied:</span>
              <span>-₹40.00</span>
            </div>
            <div className="flex justify-between">
              <span>SGST (2.5%):</span>
              <span>₹22.50</span>
            </div>
            <div className="flex justify-between">
              <span>CGST (2.5%):</span>
              <span>₹22.50</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-950 pt-1 text-[11px]">
              <span>PAID OUT TOTAL:</span>
              <span>₹945.00</span>
            </div>
          </div>

          {/* Optional Stamp */}
          {showStamp && (
            <div className="my-3 py-1 text-center font-bold tracking-widest text-emerald-800 uppercase rounded bg-emerald-50 border border-double border-emerald-800 text-[10px]">
              ★★ TRANS PAID & ARCHIVED ★★
            </div>
          )}

          {/* Optional Barcode */}
          {showBarcode && (
            <div className="text-center my-2 select-none">
              <div className="bg-[repeating-linear-gradient(90deg,#000,#000_2px,#fff_2px,#fff_5px)] h-5 w-32 mx-auto"></div>
              <span className="text-[7.5px] text-slate-500 mt-1 block">SYSTEM-ID-INV-PREVIEW-001</span>
            </div>
          )}

          {/* Footers */}
          <div className="text-center font-bold mt-3 leading-tight whitespace-normal">
            {footerBanner || 'THANK YOU FOR PATRONISING US!'}<br />
            <span className="text-[7.5px] font-normal text-slate-600 block mt-1">
              {footerSub || 'BiteSpeed Retail Softwares'}
            </span>
          </div>

          {/* Duplicate Slip Render */}
          {duplicateCopy && (
            <div className="mt-4 pt-3 border-t border-dashed border-slate-950 opacity-80">
              <div className="text-center font-bold border border-slate-800 py-1 mb-2 text-[9px]">
                ★★ INTERNAL DUPLICATE REC ★★
              </div>
              <div className="text-[7.5px] space-y-0.5 leading-relaxed">
                <div><b>Invoice Id:</b> INV-PREVIEW-001</div>
                <div><b>Closed At:</b> 12/Jun/2026 14:35</div>
                <div><b>Guest Cover:</b> Table A2</div>
                <div><b>Subtotal:</b> ₹940.00</div>
                <div><b>Discount:</b> -₹40.00</div>
                <div><b>Tax Amt:</b> ₹45.00</div>
                <div><b>TOTAL RECEIVED:</b> ₹945.00</div>
              </div>
            </div>
          )}

          {/* Tear strip guideline */}
          <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0)_60%,#e2e8f0_62%)] bg-[length:6px_6px] repeat-x"></div>
        </div>

      </div>

    </div>
  );
};
