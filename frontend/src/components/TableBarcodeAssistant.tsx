import React, { useState, useEffect, useRef } from 'react';
import { Table } from '../types';
import { 
  Camera, QrCode, ScanLine, Printer, CheckCircle, Search, 
  Sparkles, BookOpen, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { soundEffects } from './SoundUtility';
import { Html5Qrcode } from 'html5-qrcode';

interface TableBarcodeAssistantProps {
  tables: Table[];
  onSelectTable: (table: Table) => void;
  onClose?: () => void;
  tenantId?: string | number;
}

export const TableBarcodeAssistant: React.FC<TableBarcodeAssistantProps> = ({
  tables,
  onSelectTable,
  onClose,
  tenantId
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'scanner' | 'generator'>('scanner');
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedTableInfo, setScannedTableInfo] = useState<Table | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Generate deterministic pseudo-barcode lines for any string
  const getBarcodeSvgLines = (text: string) => {
    // Determine static thick/thin sequence based on characters
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pattern = (hash % 2 === 0) 
      ? "110010101110" + "101100110110" + "110010101110"
      : "101011001110" + "110110110010" + "101011001110";
    
    const lines: React.ReactNode[] = [];
    let curX = 10;
    
    // Repeat to fill barcode safety margins
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < pattern.length; j++) {
        const isThick = pattern[j] === '1';
        lines.push(
          <rect 
            key={`${i}-${j}`} 
            x={curX} 
            y={5} 
            width={isThick ? 2.5 : 1.0} 
            height={50} 
            fill="currentColor" 
          />
        );
        curX += isThick ? 3.5 : 1.5;
      }
    }
    return { lines, totalWidth: curX + 10 };
  };

  const getBarcodeSvgHtml = (text: string) => {
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pattern = (hash % 2 === 0) 
      ? "110010101110" + "101100110110" + "110010101110"
      : "101011001110" + "110110110010" + "101011001110";
    
    let htmlLines = '';
    let curX = 10;
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < pattern.length; j++) {
        const isThick = pattern[j] === '1';
        const w = isThick ? 2.5 : 1.0;
        htmlLines += `<rect x="${curX}" y="5" width="${w}" height="50" fill="#000" />`;
        curX += isThick ? 3.5 : 1.5;
      }
    }
    return htmlLines;
  };

  // Generate deterministic QR Code pattern visuals as standard vector grid
  const getQrCodePattern = (text: string) => {
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const size = 15; // 15x15 pixel block QR simulator
    const grid: boolean[][] = [];
    
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        // Find pattern zones (QR corner squares)
        const isCornerFinder = 
          (r < 4 && c < 4) || // Top Left
          (r < 4 && c >= size - 4) || // Top Right
          (r >= size - 4 && c < 4); // Bottom Left
        
        if (isCornerFinder) {
          // Inner hollow box logic
          const ring = (r === 0 || r === 3 || c === 0 || c === 3) ||
                       (r === 0 || r === 3 || c === size - 1 || c === size - 4) ||
                       (r === size - 1 || r === size - 4 || c === 0 || c === 3);
          const center = (r === 1 && c === 1) || (r === 2 && c === 2) || (r === 1 && c === 2) || (r === 2 && c === 1) ||
                         (r === 1 && c === size - 2) || (r === 2 && c === size - 3) || (r === 1 && c === size - 3) || (r === 2 && c === size - 2) ||
                         (r === size - 2 && c === 1) || (r === size - 3 && c === 2) || (r === size - 2 && c === 2) || (r === size - 3 && c === 1);
          row.push(ring || center);
        } else {
          // Mock data bits based on deterministic value
          const rand = Math.sin(hash + r * 17 + c * 23);
          row.push(rand > 0.1);
        }
      }
      grid.push(row);
    }
    return grid;
  };

  // Start Live Webcam Scanning using real-time html5-qrcode
  const startCamera = async () => {
    setScannerError(null);
    soundEffects.playTick();
    setIsCameraActive(true);
    setScannedTableInfo(null);

    // Wait 200ms for scanner mount point `#reader` to render in DOM
    setTimeout(() => {
      try {
        const qrScanner = new Html5Qrcode("reader");
        html5QrCodeRef.current = qrScanner;

        const qrCodeSuccessCallback = (decodedText: string) => {
          processScannedCode(decodedText);
          stopCamera();
        };

        const config = { 
          fps: 15, 
          qrbox: (width: number, height: number) => {
            const minDim = Math.min(width, height);
            const boxSize = Math.floor(minDim * 0.7);
            return {
              width: boxSize,
              height: boxSize
            };
          }
        };

        qrScanner.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          () => {} // Silent scan frame iteration errors
        ).catch((err: any) => {
          console.error("Camera start failed via html5-qrcode:", err);
          setScannerError(
            `कैमरा शुरू करने में समस्या आई: ${err.message || err}. ℹ️ कृपया ऐप को ऊपर दाईं ओर "Open in new tab" बटन दबाकर नए टैब में खोलें, या नीचे दिए गए Simulation बटनों का उपयोग करें!`
          );
          setIsCameraActive(false);
        });
      } catch (err: any) {
        console.error("Html5Qrcode initialization error:", err);
        setScannerError(`कैमरा इनिशियलाइज़ेशन एरर: ${err.message || err}`);
        setIsCameraActive(false);
      }
    }, 200);
  };

  // Stop Webcam scanner stream gracefully
  const stopCamera = () => {
    setIsCameraActive(false);
    if (html5QrCodeRef.current) {
      const scanner = html5QrCodeRef.current;
      if (scanner.isScanning) {
        scanner.stop()
          .then(() => {
            html5QrCodeRef.current = null;
          })
          .catch(err => {
            console.error('Failed to stop html5Qrcode scanning stream:', err);
            html5QrCodeRef.current = null;
          });
      } else {
        html5QrCodeRef.current = null;
      }
    }
  };

  // Turn off camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        if (scanner.isScanning) {
          scanner.stop().catch(err => console.log('Cleanup error:', err));
        }
      }
    };
  }, []);

  // Process text-based barcode wedge reading (simulated/manual entry)
  const handleWedgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScannedCode(manualBarcode);
  };

  const processScannedCode = (code: string) => {
    let cleanCode = code.trim();
    
    // If the input is a URL, parse the table query parameter
    if (cleanCode.includes('?')) {
      try {
        const queryParams = new URLSearchParams(cleanCode.split('?')[1]);
        const tableParam = queryParams.get('table');
        if (tableParam) {
          cleanCode = tableParam;
        }
      } catch (err) {
        console.error("Failed to parse URL query param", err);
      }
    }

    const cleaned = cleanCode.toLowerCase().replace(/[-_:\s]/g, '');
    if (!cleaned) return;

    // Resolve which table matches barcode
    const decodedTable = tables.find(t => {
      const dbIdClean = t.id.toLowerCase().replace(/[-_:\s]/g, '');
      const dbNameClean = t.name.toLowerCase().replace(/[-_:\s]/g, '');
      
      // Match by exact ID, stripped ID, exact Name, or name/code overlapping
      const isIdMatch = dbIdClean === cleaned || `bitespeed${dbIdClean}` === cleaned;
      const isNameMatch = dbNameClean === cleaned || 
                          cleaned.includes(dbNameClean) || 
                          dbNameClean.includes(cleaned);
      return isIdMatch || isNameMatch;
    });

    if (decodedTable) {
      soundEffects.playSuccessChime();
      setScannedTableInfo(decodedTable);
      setManualBarcode('');
      
      // Auto redirect to active ordering after brief visual confirmation
      setTimeout(() => {
        onSelectTable(decodedTable);
        if (onClose) onClose();
      }, 1200);
    } else {
      soundEffects.playTick();
      alert(`Invalid Scan [${code}]: कोई भी टेबल इस QR/बारकोड से मेल नहीं खाती है। (No table matches this scan!)`);
    }
  };

  // Filter tables in generator
  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div id="table-barcode-assistant-panel" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-4 text-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 px-2 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-mono text-[9px] font-extrabold uppercase tracking-widest">
                AUTOMATION HUB
              </span>
              <span className="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-ping"></span>
            </div>
            <h2 className="text-sm font-black font-sans uppercase tracking-wide flex items-center gap-1.5 mt-1">
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Table Barcode Scan & Order (QR/बारकोड सेवा)</span>
            </h2>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed font-sans">
              स्कैनर से आर्डर लें या ग्राहकों के लिए हर टेबल का डिजिटल मेनू QR/बारकोड प्रिंट करें।
            </p>
          </div>
          {onClose && (
            <button 
              type="button" 
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg text-xs"
            >
              ✕ Close
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2.5 mt-4 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => { soundEffects.playTick(); setActiveSubTab('scanner'); stopCamera(); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'scanner' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-350 hover:text-white hover:bg-white/5'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Table Barcode Scanner (स्कैनर)</span>
          </button>
          <button
            type="button"
            onClick={() => { soundEffects.playTick(); setActiveSubTab('generator'); stopCamera(); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'generator' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-350 hover:text-white hover:bg-white/5'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>QR & Barcode Cards (प्रिंटर)</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 md:p-5">
        
        {/* TAB 1: SCANNER INTERFACE */}
        {activeSubTab === 'scanner' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Left side: Interactive webcam scan pane (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              <div className="aspect-video w-full bg-slate-950 rounded-xl relative overflow-hidden border-2 border-slate-800 flex flex-col items-center justify-center text-white font-sans max-h-[220px]">
                
                {isCameraActive ? (
                  <>
                    {/* Real Video Stream from html5-qrcode */}
                    <div id="reader" className="absolute inset-0 w-full h-full text-xs" style={{ overflow: 'hidden' }} />

                    {/* Sweep Scanning Laser Line overlay */}
                    <div className="absolute inset-x-5 h-[2px] bg-red-405 shadow-[0_0_10px_#818cf8] animate-[bounce_2s_infinite] z-10 pointer-events-none"></div>
                    
                    {/* Reticle Focus guidelines */}
                    <div className="absolute inset-6 border border-indigo-500/20 rounded flex items-center justify-center pointer-events-none z-10">
                      <div className="w-48 h-24 border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center relative">
                        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400 -mt-[2px] -ml-[2px]"></span>
                        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400 -mt-[2px] -mr-[2px]"></span>
                        <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400 -mb-[2px] -ml-[2px]"></span>
                        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400 -mb-[2px] -mr-[2px]"></span>
                        <p className="text-[8px] font-mono tracking-widest text-indigo-400 font-bold bg-slate-950/70 p-1 rounded">SCANNING FOR QR/BARCODE...</p>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => { soundEffects.playTick(); stopCamera(); }}
                      className="absolute bottom-2.5 right-2.5 bg-rose-600/90 hover:bg-rose-650 text-white font-bold text-[9px] px-2 py-1 rounded shadow cursor-pointer z-20"
                    >
                      Turn Off WebCam
                    </button>
                  </>
                ) : (
                  <div className="text-center p-3.5 space-y-2.5">
                    <Camera className="w-8 h-8 mx-auto text-indigo-400" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold">Use Live System WebCam Scanner</p>
                      <p className="text-[9px] text-slate-400 leading-normal max-w-[200px] mx-auto">
                        आपके कंप्यूटर, टेबलेट या स्मार्टफोन के कैमरे से बारकोड तुरंत स्कैन करने के लिए चालू करें।
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-lg shadow-sm font-sans flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin duration-3000" />
                      <span>Start Camera Scanner</span>
                    </button>
                  </div>
                )}
              </div>

              {scannerError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-2 text-[10.5px] text-amber-700 dark:text-amber-400 font-sans">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{scannerError}</p>
                </div>
              )}

              {/* Status Settle Success animation alert card */}
              {scannedTableInfo && (
                <div className="p-3.5 bg-emerald-55 bg-opacity-10 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1.5 animate-bounce">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <p className="text-xs font-black font-sans uppercase">BARCODE LOOKUP SUCCESSFUL!</p>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Table Match: <span className="font-bold text-slate-800 dark:text-slate-100">{scannedTableInfo.name}</span> ({scannedTableInfo.capacity} Pax). Launching client session & KOT order taker terminal...
                  </p>
                </div>
              )}
            </div>

            {/* Right side: Hardware Scanner simulators + Wedge input (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Manual Barcode input (Keyboard Wedge reader simulator) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl space-y-3 font-sans">
                <div className="flex items-center space-x-1.5">
                  <span className="p-1 rounded bg-indigo-55 bg-opacity-10 text-indigo-605">
                    <ScanLine className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400">Manual Entry / Wedge Simulator</span>
                </div>
                
                <form onSubmit={handleWedgeSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Type barcode (e.g. Table 2, table-1 or codes)"
                    className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-650 hover:bg-indigo-505 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs px-3.5 rounded-lg cursor-pointer flex items-center justify-center uppercase shrink-0"
                  >
                    Scan Wedge
                  </button>
                </form>
                <p className="text-[9px] text-slate-400 font-sans leading-normal">
                  💡 *Tip: Physical Laser Barcode readers wedge characters directly into text inputs, acts as instant scanner trigger.*
                </p>
              </div>

              {/* Instant Simulator Scanner Clicks */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850/60 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Instant Scanning Simulator (एक क्लिक में स्कैन करें)</span>
                  </h3>
                  <span className="text-[8.5px] bg-indigo-55 bg-opacity-10 text-indigo-600 dark:text-indigo-400 font-semibold px-1.5 py-0.5 rounded font-mono uppercase">Quick test</span>
                </div>

                <p className="text-[10px] text-slate-455 font-sans leading-normal">
                  वेबकैम या कीबोर्ड की ज़रूरत नहीं! नीचे दिए गए किसी भी टेबल के 'Simulate Scan' बटन पर क्लिक करके आर्डर टेकर तुरंत खोलें।
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {tables.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        processScannedCode(t.name);
                      }}
                      className="bg-white hover:bg-indigo-55 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-indigo-305 p-1.5 py-2 rounded-lg text-[10.5px] font-bold text-slate-750 dark:text-slate-205 transition text-left cursor-pointer flex flex-col justify-between align-start"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-mono text-slate-400">{t.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          t.status === 'vacant' ? 'bg-emerald-500' : 'bg-indigo-405'
                        }`} />
                      </div>
                      <span className="text-[11px] text-indigo-650 dark:text-indigo-400 block mt-1">Simulate Scan ⚡</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: PRINTABLE QR / BARCODERS GENERATOR GRID */}
        {activeSubTab === 'generator' && (
          <div className="space-y-4">
            
            {/* Search Filter Header */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter tables by name..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 p-1.5 text-xs outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playSuccessChime();
                  window.print();
                }}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer uppercase"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print All Selected Cards</span>
              </button>
            </div>

            {/* Print Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[380px] overflow-y-auto pr-1">
              {filteredTables.map(t => {
                const bText = `BITESPEED-TABLE-${t.id.toUpperCase()}`;
                
                let qrUrl = `https://ais-pre-az7ihk2cfek5bkttv63buh-196017344090.asia-east1.run.app?table=${encodeURIComponent(t.id)}&tenantId=${encodeURIComponent(String(tenantId || ''))}`;
                try {
                  if (typeof window !== 'undefined' && window.location) {
                    qrUrl = `${window.location.origin}${window.location.pathname}?table=${encodeURIComponent(t.id)}&tenantId=${encodeURIComponent(String(tenantId || ''))}`;
                  }
                } catch (e) {
                  console.warn("Iframe blocked window.location read:", e);
                }

                const { lines: bLines, totalWidth: bWidth } = getBarcodeSvgLines(bText);
                const qrBlocks = getQrCodePattern(qrUrl);
                
                return (
                  <div 
                    key={t.id} 
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between space-y-4 hover:border-indigo-400/45 transition shadow-xs group"
                  >
                    
                    {/* Standee Sticker Header Card */}
                    <div className="text-center pb-2 border-b border-dashed border-slate-150 dark:border-slate-850">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider font-sans uppercase">
                        {t.name}
                      </h4>
                      <p className="text-[8.5px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest mt-0.5">
                        SCAN TO ORDER MENU
                      </p>
                    </div>

                    {/* QR Code Grid Element */}
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-md relative group cursor-pointer transition transform hover:scale-105 duration-200">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} 
                          alt={`QR Code for ${t.name}`}
                          className="w-28 h-28 object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[9px] text-center text-indigo-600 dark:text-indigo-400 font-sans font-black mt-1.5 max-w-[150px]">
                        📱 कैमरे से स्कैन करें (Scan with Phone Camera)
                      </p>
                    </div>

                    {/* Laser CODE Barcode Graphic */}
                    <div className="text-center font-mono space-y-1">
                      <div className="flex justify-center text-slate-800 dark:text-slate-300">
                        <svg className="h-10 w-full" viewBox={`0 0 ${bWidth} 60`} preserveAspectRatio="none">
                          {bLines}
                        </svg>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 block tracking-widest">
                        {bText}
                      </span>
                    </div>

                    {/* Actions panel */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex gap-2 justify-between items-center text-[9px]">
                      <span className="text-slate-450 font-sans font-medium">Pax limit: {t.capacity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playSuccessChime();
                          try {
                            // Print individual card fallback
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                <head>
                                  <title>Print Card - ${t.name}</title>
                                  <style>
                                    body { font-family: sans-serif; text-align: center; padding: 40px; color: #000; }
                                    .card { border: 3px double #000; padding: 30px; display: inline-block; width: 280px; }
                                    .title { font-size: 24px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
                                    .subtitle { font-size: 11px; letter-spacing: 2px; color: #555; margin-bottom: 20px; font-weight: bold; }
                                    .box { background: #fff; border: 1px solid #000; display: inline-block; padding: 10px; margin-bottom: 15px; }
                                    .barcode-text { font-family: monospace; font-size: 9px; margin-top: 5px; color: #666; letter-spacing: 1px; }
                                    .footer { font-size: 11px; margin-top: 20px; font-weight: bold; }
                                  </style>
                                </head>
                                <body>
                                  <div class="card">
                                    <div class="title">${t.name}</div>
                                    <div class="subtitle">BITESPEED DIGITAL MENU QR</div>
                                    <div class="box" style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">
                                      <img 
                                        src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}" 
                                        alt="QR Code"
                                        width="150" 
                                        height="150"
                                        style="display: block; margin: 0 auto; border-radius: 4px;"
                                        referrerpolicy="no-referrer"
                                      />
                                    </div>
                                    <div style="font-size: 10.5px; font-weight: bold; margin-bottom: 15px; color: #4f46e5;">👉 SCAN WITH YOUR PHONE TO ORDER DIRECTLY</div>
                                    <div style="font-size: 8px; font-mono: monospace; word-break: break-all; margin-bottom: 15px; color: #555;">${qrUrl}</div>
                                    <div>
                                      <svg width="220" height="45" viewBox="0 0 ${bWidth} 60" preserveAspectRatio="none">
                                        <!-- Direct SVG print vector output -->
                                        ${getBarcodeSvgHtml(bText)}
                                      </svg>
                                      <div class="barcode-text">${bText}</div>
                                    </div>
                                    <div class="footer">THANK YOU FOR PATRONISING US!</div>
                                  </div>
                                  <script>window.onload = function() { window.print(); }</script>
                                </body>
                                </html>
                              `);
                              printWindow.document.close();
                            } else {
                              alert("Popup/Window blocker has stopped printing. Please open the app in a new browser tab to print cards.");
                            }
                          } catch (err) {
                            console.error("Window open error inside iframe sandbox:", err);
                            alert("इस सैंडबॉक्स आईफ्रेम में प्रिंट विंडो खोलना प्रतिबंधित है। कृपया पूरी तरह प्रिंट करने के लिए ऐप को 'Open in New Tab' करके इस्तेमाल करें!");
                          }
                        }}
                        className="p-1 px-2 text-indigo-650 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800 border border-indigo-150 dark:border-indigo-950 font-bold rounded cursor-pointer transition hover:scale-101 shrink-0"
                      >
                        Print Card
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredTables.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                कोई भी टेबल सर्च से मेल नहीं खाती (No tables match filter).
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
