import React, { useState, useMemo } from 'react';
import { Customer, EstimateBill, TableOrder, CustomerDuePayment } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  User, 
  DollarSign, 
  TrendingUp, 
  Award, 
  UserPlus, 
  ChevronRight, 
  CornerDownRight, 
  Receipt,
  Heart,
  Eye,
  Trash2,
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Check,
  Gift,
  Cake,
  Clock
} from 'lucide-react';
import { soundEffects } from './SoundUtility';

interface CrmViewProps {
  customers: Customer[];
  bills: EstimateBill[];
  orders?: TableOrder[];
  duePayments?: CustomerDuePayment[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'lifetimeSpend' | 'orderCount' | 'createdAt'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onViewBill: (bill: EstimateBill) => void;
  onImportCustomers: (importedList: Omit<Customer, 'id' | 'createdAt'>[]) => void;
  onSettleCustomerTab?: (customerPhone: string, paymentMethod?: string) => void;
  onRecordDuePayment?: (payment: CustomerDuePayment) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({
  customers,
  bills,
  orders = [],
  duePayments = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onViewBill,
  onImportCustomers,
  onSettleCustomerTab,
  onRecordDuePayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    customers.length > 0 ? customers[0].id : null
  );

  // CSV Import States
  const [showImport, setShowImport] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [previewList, setPreviewList] = useState<Omit<Customer, 'id' | 'createdAt'>[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload');
  const [bulkPasteText, setBulkPasteText] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [dob, setDob] = useState('');

  // Editing state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Normalization helper to compare phone numbers (remove spaces, symbols)
  const normalizePhone = (phoneStr: string) => {
    return phoneStr.replace(/\D/g, '');
  };

  // Find selected customer
  const selectedCustomer = useMemo(() => {
    const cur = customers.find(c => c.id === selectedCustomerId);
    if (cur) return cur;
    if (customers.length > 0) return customers[0];
    return null;
  }, [customers, selectedCustomerId]);

  // Calculations for static metrics
  const stats = useMemo(() => {
    const totalCount = customers.length;
    let totalSpend = 0;
    let totalTransactions = 0;
    let topSpenderName = 'N/A';
    let maxSpend = 0;

    customers.forEach(c => {
      // Calculate active aggregates based on linked bills dynamically for bulletproof accuracy
      const cleanCustPhone = normalizePhone(c.phone);
      const linkedBills = bills.filter(b => b.customerPhone && normalizePhone(b.customerPhone) === cleanCustPhone);
      const actualSpend = linkedBills.reduce((acc, b) => acc + b.grandTotal, 0);
      const actualCount = linkedBills.length;

      totalSpend += actualSpend;
      totalTransactions += actualCount;

      if (actualSpend > maxSpend) {
        maxSpend = actualSpend;
        topSpenderName = c.name;
      }
    });

    const averageLifetimeValue = totalCount > 0 ? Math.round(totalSpend / totalCount) : 0;

    return {
      totalCount,
      totalSpend,
      totalTransactions,
      averageLifetimeValue,
      topSpender: { name: topSpenderName, amount: maxSpend }
    };
  }, [customers, bills]);

  // Filter customers list
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.toLowerCase().trim();
    const qClean = normalizePhone(q);

    return customers.filter(c => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = normalizePhone(c.phone).includes(qClean) || c.phone.includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail;
    });
  }, [customers, searchTerm]);

  // Find linked invoices for selected customer
  const customerBills = useMemo(() => {
    if (!selectedCustomer) return [];
    const cleanPhone = normalizePhone(selectedCustomer.phone);
    return bills.filter(b => b.customerPhone && normalizePhone(b.customerPhone) === cleanPhone);
  }, [selectedCustomer, bills]);

  // Computed actual dynamic stats for selected customer
  const selectedCustomerActualStats = useMemo(() => {
    if (!selectedCustomer) return { spend: 0, count: 0, totalBilled: 0, totalPaid: 0, totalDue: 0, paymentHistory: [] as CustomerDuePayment[] };
    const cleanPhone = normalizePhone(selectedCustomer.phone);
    const linkedBills = bills.filter(b => b.customerPhone && normalizePhone(b.customerPhone) === cleanPhone);
    const openOrders = orders.filter(o => {
      const pClean = normalizePhone(o.customerPhone || '');
      return pClean === cleanPhone && (o.paymentMethod === 'due' || o.isCustomerTab) && o.tabStatus !== 'settled';
    });

    const billedAmount = linkedBills.reduce((acc, b) => acc + b.grandTotal, 0) + openOrders.reduce((acc, o) => acc + o.grandTotal, 0);
    const customerPayments = duePayments.filter(p => p.customerId === selectedCustomer.id || normalizePhone(p.customerPhone) === cleanPhone);
    const paidFromBills = linkedBills.filter(b => b.paymentMethod !== 'DUE' && b.paymentMethod !== 'due').reduce((acc, b) => acc + b.grandTotal, 0);
    const paidFromDuePayments = customerPayments.reduce((acc, p) => acc + p.amountPaid, 0);
    const paidAmount = paidFromBills + paidFromDuePayments;
    const dueAmount = Math.max(0, billedAmount - paidAmount);

    return {
      spend: billedAmount,
      count: linkedBills.length + openOrders.length,
      totalBilled: Math.round(billedAmount),
      totalPaid: Math.round(paidAmount),
      totalDue: Math.round(dueAmount),
      paymentHistory: customerPayments
    };
  }, [selectedCustomer, bills, orders, duePayments]);

  // Active open running daily tab orders for selected customer
  const activeOpenTabOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const cleanPhone = normalizePhone(selectedCustomer.phone);
    return orders.filter(o => {
      const pClean = normalizePhone(o.customerPhone || '');
      return pClean === cleanPhone && (o.paymentMethod === 'due' || o.isCustomerTab) && o.tabStatus !== 'settled';
    });
  }, [selectedCustomer, orders]);

  const openTabTotal = useMemo(() => {
    return activeOpenTabOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  }, [activeOpenTabOrders]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCSVFile(e.target.files[0]);
    }
  };

  const handleCSVFile = (file: File) => {
    setImportError(null);
    setPreviewList([]);
    setDuplicateCount(0);
    
    if (!file.name.endsWith('.csv')) {
      setImportError('Invalid format. Please upload or drag a valid CSV text sheet (.csv).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setImportError('No content found inside the file.');
          return;
        }

        const rows: string[][] = [];
        const lines = text.split(/\r?\n/);
        
        for (let r = 0; r < lines.length; r++) {
          const line = lines[r];
          if (!line.trim()) continue;
          
          const columns: string[] = [];
          let currentField = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              columns.push(currentField.trim());
              currentField = '';
            } else {
              currentField += char;
            }
          }
          columns.push(currentField.trim());
          rows.push(columns);
        }

        if (rows.length < 2) {
          setImportError('The provided CSV must contain headers and at least one custom data row.');
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        
        let nameIdx = headers.findIndex(h => h.includes('name'));
        let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('mobile') || h.includes('cell'));
        let emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
        let dobIdx = headers.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('born') || h.includes('date'));
        let notesIdx = headers.findIndex(h => h.includes('note') || h.includes('pref') || h.includes('allergy') || h.includes('desc'));
        let spendIdx = headers.findIndex(h => h.includes('spend') || h.includes('amount') || h.includes('total') || h.includes('sale'));
        let countIdx = headers.findIndex(h => h.includes('count') || h.includes('visit') || h.includes('order') || h.includes('ticket'));

        // Direct indexes fallback if phone column isn't recognizable by label
        if (phoneIdx === -1) {
          nameIdx = 0;
          phoneIdx = 1;
          emailIdx = 2;
          dobIdx = 3;
          notesIdx = 4;
          spendIdx = 5;
          countIdx = 6;
        }

        const parsedCustomers: Omit<Customer, 'id' | 'createdAt'>[] = [];
        let duplicates = 0;

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (row.length === 0 || (row.length === 1 && !row[0])) continue;

          const rawName = nameIdx !== -1 && nameIdx < row.length ? row[nameIdx] : '';
          const rawPhone = phoneIdx !== -1 && phoneIdx < row.length ? row[phoneIdx] : '';
          const rawEmail = emailIdx !== -1 && emailIdx < row.length ? row[emailIdx] : '';
          const rawDob = dobIdx !== -1 && dobIdx < row.length ? row[dobIdx] : '';
          const rawNotes = notesIdx !== -1 && notesIdx < row.length ? row[notesIdx] : '';
          const rawSpend = spendIdx !== -1 && spendIdx < row.length ? row[spendIdx] : '0';
          const rawCount = countIdx !== -1 && countIdx < row.length ? row[countIdx] : '0';

          const cleanPhone = rawPhone.replace(/\D/g, '');
          if (!cleanPhone) continue; // Skip entries without valid phone coordinates

          const cleanName = rawName.replace(/^["']|["']$/g, '').trim() || 'Imported Guest';
          const cleanEmail = rawEmail.replace(/^["']|["']$/g, '').trim() || undefined;
          const cleanDob = rawDob.replace(/^["']|["']$/g, '').trim() || undefined;
          const cleanNotes = rawNotes.replace(/^["']|["']$/g, '').trim() || undefined;
          
          const parsedSpend = parseFloat(rawSpend.replace(/[^\d.]/g, '')) || 0;
          const parsedCount = parseInt(rawCount.replace(/\D/g, ''), 10) || 0;

          // Compute duplicate detection against master list
          const alreadyExists = customers.some(c => c.phone.replace(/\D/g, '') === cleanPhone);
          if (alreadyExists) {
            duplicates++;
          }

          parsedCustomers.push({
            name: cleanName,
            phone: rawPhone.trim(),
            email: cleanEmail,
            dob: cleanDob,
            notes: cleanNotes,
            lifetimeSpend: parsedSpend,
            orderCount: parsedCount
          });
        }

        if (parsedCustomers.length === 0) {
          setImportError('No valid customer records could be read. Make sure a phone column is populated.');
          return;
        }

        soundEffects.playSuccessChime();
        setPreviewList(parsedCustomers);
        setDuplicateCount(duplicates);

      } catch (err) {
        console.error('Error parsing uploaded CSV', err);
        setImportError('An error occurred during sheet extraction. Check your file syntax.');
      }
    };
    reader.readAsText(file);
  };

  const handleBulkPasteParse = () => {
    setImportError(null);
    setPreviewList([]);
    setDuplicateCount(0);

    if (!bulkPasteText.trim()) {
      setImportError('Please paste some text into the box to begin.');
      return;
    }

    const lines = bulkPasteText.split('\n');
    const parsedCustomers: Omit<Customer, 'id' | 'createdAt'>[] = [];
    let duplicates = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Handle CSV headers skip (if they copy-paste headers by mistake)
      if (trimmed.toLowerCase().includes('phone') && (trimmed.toLowerCase().includes('name') || trimmed.toLowerCase().includes('dob'))) {
        return;
      }

      // Detect separator: tab first, then comma, then semicolon, then pipeline
      let separator = ',';
      if (trimmed.includes('\t')) separator = '\t';
      else if (trimmed.includes(';')) separator = ';';
      else if (trimmed.includes('|')) separator = '|';

      const parts = trimmed.split(separator).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0) return;

      // Expected order: Name, Phone (Required), Email (Optional), DOB (Optional), Notes (Optional)
      const nameVal = parts[0] ? parts[0] : 'Imported Guest';
      const phoneVal = parts[1] ? parts[1] : '';
      const emailVal = parts[2] ? parts[2] : undefined;
      const dobVal = parts[3] ? parts[3] : undefined;
      const notesVal = parts[4] ? parts[4] : undefined;

      const cleanPhone = phoneVal.replace(/\D/g, '');
      if (!cleanPhone) return; // Skip if no valid phone coordinate

      const alreadyExists = customers.some(c => c.phone.replace(/\D/g, '') === cleanPhone);
      if (alreadyExists) {
        duplicates++;
      }

      parsedCustomers.push({
        name: nameVal,
        phone: phoneVal,
        email: emailVal || undefined,
        dob: dobVal || undefined,
        notes: notesVal || undefined,
        lifetimeSpend: 0,
        orderCount: 0
      });
    });

    if (parsedCustomers.length === 0) {
      setImportError('No valid contacts found. Make sure to supply Name & Contact Phone (separated by commas/tabs). Example: "Vikram Mehta, 9876543210, vikram@mehta.co, 1990-05-12"');
      return;
    }

    soundEffects.playSuccessChime();
    setPreviewList(parsedCustomers);
    setDuplicateCount(duplicates);
  };

  const handleCommitImport = () => {
    if (previewList.length === 0) return;
    onImportCustomers(previewList);
    soundEffects.playSuccessChime();
    
    // Cleanup state
    setShowImport(false);
    setPreviewList([]);
    setDuplicateCount(0);
    setBulkPasteText('');
  };

  const downloadSampleTemplate = () => {
    const csvContent = 
      "Name,Phone,Email,DOB,Notes,Spend,Visits\n" +
      "Karan Sharma,+91 98765 43210,karan@gmail.com,1990-05-12,Prefers spicy starters,803,1\n" +
      "Ananya Roy,+91 91234 56789,ananya@yahoo.com,1995-10-24,Mildly sweetened desserts,869.4,1\n" +
      "Rajesh Malhotra,+91 99887 76655,rajesh@malhotra.co,1985-01-30,VIP Corporate Partner,2450,4";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bitespeed_crm_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundEffects.playSuccessChime();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    soundEffects.playSuccessChime();

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        dob: dob || undefined
      });
      setEditingCustomer(null);
    } else {
      onAddCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        dob: dob || undefined
      });
    }

    // Reset Form
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setDob('');
    setIsAdding(false);
  };

  const handleStartEdit = (cust: Customer) => {
    soundEffects.playTick();
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setNotes(cust.notes || '');
    setDob(cust.dob || '');
    setIsAdding(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm("Are you sure you want to remove this customer record? Lifetime totals and linked accounts tracking will be reset.")) {
      soundEffects.playTick();
      onDeleteCustomer(id);
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null);
      }
    }
  };

  return (
    <div id="crm-workspace" className="space-y-6">
      
      {/* 1. Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Total CRM Guests</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white font-sans">{stats.totalCount}</h3>
            <p className="text-[9px] text-slate-400">Registered member profiles</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-650 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Total CRM Spend</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white font-mono">₹{stats.totalSpend.toFixed(0)}</h3>
            <p className="text-[9px] text-emerald-600 font-bold">Linked to guest records</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-650 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Avg. Life Spend</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white font-mono">₹{stats.averageLifetimeValue}</h3>
            <p className="text-[9px] text-slate-400">Per registered user account</p>
          </div>
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-650 dark:text-teal-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Top Spender Account</span>
            <h3 className="text-base font-black text-slate-800 dark:text-white truncate max-w-[150px] font-sans">{stats.topSpender.name}</h3>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">Spend: ₹{stats.topSpender.amount.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. Primary layout splitter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Directory list (5 cols span) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col shadow-xs min-h-[500px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-sans flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                Guest Registry Directory
              </h3>
              <p className="text-[10px] text-slate-400">Browse and search registered repeat guests</p>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setShowImport(prev => !prev);
                  if (isAdding) setIsAdding(false);
                }}
                className={`px-2 py-1 text-[10px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-all uppercase border ${
                  showImport 
                    ? 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' 
                    : 'text-indigo-650 bg-indigo-55 border-indigo-200 hover:bg-indigo-100/70 dark:bg-slate-800'
                }`}
              >
                {showImport ? <X className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                {showImport ? 'Close' : 'Import CSV'}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setEditingCustomer(null);
                  setName('');
                  setPhone('');
                  setEmail('');
                  setNotes('');
                  setDob('');
                  setIsAdding(prev => !prev);
                  if (showImport) setShowImport(false);
                }}
                className={`px-3 py-1.5 text-[10.5px] font-black rounded-lg flex items-center gap-1 cursor-pointer transition-all uppercase shadow-xs border-none ${
                  isAdding 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-emerald-600 hover:bg-emerald-600/90 text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
                id="crm-register-new-guest-btn"
              >
                {isAdding ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {isAdding ? 'Close Form' : '+ Add Customer'}
              </button>
            </div>
          </div>

          {/* Conditional panel for CSV Import */}
          {showImport && (
            <div className="mb-4 p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    📂 Import Guest Records (Bulk)
                  </h4>
                  <p className="text-[9.5px] text-slate-450">Bulk upload or paste with duplicate prevention</p>
                </div>
                
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-2 py-0.5 text-[8.5px] font-bold text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-250 dark:bg-slate-900 rounded cursor-pointer transition flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  Get Template CSV
                </button>
              </div>

              {/* Import Mode Tab Selector */}
              <div className="flex border-b border-indigo-100 dark:border-indigo-900 gap-1" id="bulk-import-tabs">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setImportMode('upload');
                    setImportError(null);
                    setPreviewList([]);
                  }}
                  className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase transition-all rounded-t-lg -mb-px border-b-2 cursor-pointer ${
                    importMode === 'upload'
                      ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900/50'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  📁 Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setImportMode('paste');
                    setImportError(null);
                    setPreviewList([]);
                  }}
                  className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase transition-all rounded-t-lg -mb-px border-b-2 cursor-pointer ${
                    importMode === 'paste'
                      ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900/50'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  📝 Paste Bulk Text
                </button>
              </div>

              {previewList.length === 0 ? (
                importMode === 'upload' ? (
                  /* DRAG AND DROP ZONE */
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer relative ${
                      dragActive 
                        ? 'border-indigo-500 bg-indigo-100/50' 
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:border-indigo-400'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 mx-auto text-indigo-500/80 mb-2" />
                    <p className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200">
                      Drag and drop your CRM CSV list here, or click to browse
                    </p>
                    <p className="text-[9px] text-slate-450 mt-1 max-w-xs mx-auto leading-relaxed">
                      Automatically aligns headers: Name, Phone (Required), Email, DOB, Notes, Spend, Visits. Same phone matches are safely merged.
                    </p>
                  </div>
                ) : (
                  /* PASTE BOX ZONE */
                  <div className="space-y-3" id="bulk-paste-interface">
                    <div className="text-[9.5px] text-slate-450 leading-relaxed font-sans bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                      <strong>Format requirement (one guest per line):</strong><br />
                      <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[9px]">Name, Phone, Email (Optional), DOB (Optional), Notes (Optional)</code><br />
                      Example: <code className="text-slate-500 dark:text-slate-400 font-mono text-[9px]">Vikram Mehta, 9876543210, vikram@mehta.co, 1990-05-12, Prefers non-veg snacks</code>
                    </div>
                    <textarea
                      placeholder="Paste columns or comma separated text lines here..."
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      className="w-full h-32 text-xs font-mono p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-550 focus:outline-none placeholder-slate-400 text-slate-850 dark:text-slate-100 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleBulkPasteParse}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-mono uppercase font-black text-[10px] rounded-lg tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-3xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Parse Pasted Text Lines</span>
                    </button>
                  </div>
                )
              ) : (
                /* PREVIEW & PROCESS CONTAINER */
                <div className="space-y-3.5">
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Valid entries found:</span>
                      <strong className="font-mono text-slate-800 dark:text-white">{previewList.length} rows</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Duplicate contacts to merge:</span>
                      <strong className="font-mono text-amber-650 dark:text-amber-400">{duplicateCount} matches</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-1.5">
                      <span className="text-slate-500 font-medium">New accounts to create:</span>
                      <strong className="font-mono text-emerald-600">{previewList.length - duplicateCount} rows</strong>
                    </div>
                  </div>

                  {/* Micro list of preview elements */}
                  <div className="max-h-28 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-lg p-1.5 bg-slate-50 dark:bg-slate-950 space-y-1">
                    {previewList.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[9px] text-slate-500 font-mono bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-slate-100 dark:border-slate-850">
                        <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                          <span className="font-bold font-sans text-slate-705 dark:text-slate-200 truncate">{item.name}</span>
                          {item.dob && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded-sm shrink-0 font-sans">🎂 {item.dob}</span>}
                        </div>
                        <span>{item.phone}</span>
                        <span className="text-emerald-500 font-bold shrink-0">₹{item.lifetimeSpend || 0}</span>
                      </div>
                    ))}
                    {previewList.length > 5 && (
                      <div className="text-center font-bold text-[8.5px] text-slate-450 py-1">
                        + {previewList.length - 5} more records...
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-1.5 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setPreviewList([]);
                        setDuplicateCount(0);
                      }}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-transparent hover:bg-slate-105 dark:hover:bg-slate-800 rounded text-[10px] font-bold cursor-pointer transition-all border-none"
                    >
                      Clear Preview
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCommitImport}
                      className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm hover:shadow border-none"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Merge {previewList.length} Guests
                    </button>
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400 rounded-lg text-[10px] flex items-center gap-1.5 border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold">{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* Conditional form for adding/editing */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="mb-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                {editingCustomer ? '✏️ Edit Customer Profile' : '👤 Register New Member Profile'}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Guest Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Mehta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs outline-none text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs font-mono outline-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. vikram@mehta.co"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs outline-none text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs outline-none text-slate-800 dark:text-white cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">CRM Notes & Allergies (Optional)</label>
                <textarea
                  placeholder="e.g. Vegetarian, allergen sensitivity, regular customer discount 10%"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs outline-none text-slate-800 dark:text-white h-12 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2.5 py-1 text-slate-500 bg-transparent hover:bg-slate-100 rounded text-[10px] font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                >
                  {editingCustomer ? 'Update Profile' : 'Save Registry'}
                </button>
              </div>
            </form>
          )}

          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, contact phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none text-slate-800 dark:text-white focus:bg-white"
            />
          </div>

          {/* Highly visible permanent Quick Add New Customer link */}
          <div className="mb-3.5 p-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold font-sans">
                Want to register a new guest?
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEffects.playTick();
                setEditingCustomer(null);
                if (searchTerm && !/\d/.test(searchTerm)) {
                  setName(searchTerm.trim());
                  setPhone('');
                } else if (searchTerm && /\d/.test(searchTerm)) {
                  setPhone(searchTerm.replace(/[^\d+]/g, ''));
                  setName('');
                } else {
                  setName('');
                  setPhone('');
                }
                setEmail('');
                setNotes('');
                setDob('');
                setIsAdding(true);
                if (showImport) setShowImport(false);
              }}
              className="px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all border-none"
            >
              <UserPlus className="w-3 h-3 text-white" />
              <span>Register Guest</span>
            </button>
          </div>

          {/* Customers list roll */}
          <div className="flex-1 overflow-y-auto max-h-[440px] space-y-1.5 pr-0.5">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4">
                <Users className="w-8 h-8 mx-auto text-slate-350 mb-2" />
                <p className="text-xs font-bold">No registered customers found</p>
                <p className="text-[10px] text-slate-400 mt-1 mb-4">Start registering guests or process billing checkouts to populate CRM data.</p>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setEditingCustomer(null);
                    if (searchTerm && !/\d/.test(searchTerm)) {
                      setName(searchTerm.trim());
                      setPhone('');
                    } else if (searchTerm && /\d/.test(searchTerm)) {
                      setPhone(searchTerm.replace(/[^\d+]/g, ''));
                      setName('');
                    } else {
                      setName('');
                      setPhone('');
                    }
                    setEmail('');
                    setNotes('');
                    setDob('');
                    setIsAdding(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border-none"
                >
                  + Add Customer Manually
                </button>
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSel = selectedCustomerId === cust.id;
                
                // Fetch dynamic real-time values based on bills
                const cleanPhone = normalizePhone(cust.phone);
                const guestBills = bills.filter(b => b.customerPhone && normalizePhone(b.customerPhone) === cleanPhone);
                const actualSpend = guestBills.reduce((acc, b) => acc + b.grandTotal, 0);
                const actualCount = guestBills.length;

                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      soundEffects.playTick();
                      setSelectedCustomerId(cust.id);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSel
                        ? 'bg-indigo-50 border-indigo-250 dark:bg-indigo-950/40 dark:border-indigo-900 ring-1 ring-indigo-200 dark:ring-transparent'
                        : 'bg-white hover:bg-slate-55 border-slate-105 dark:bg-slate-900 dark:border-slate-850 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="space-y-0.5 truncate max-w-[80%]">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[11.5px] font-black truncate ${isSel ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {cust.name}
                        </span>
                        {actualCount > 2 && (
                          <span className="text-[8px] bg-indigo-600 text-white font-mono px-1 rounded-sm flex items-center gap-0.5 uppercase tracking-wider scale-90">
                            ⭐ Repeat
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-450 font-mono">
                        <Phone className="w-3 h-3 scale-90 text-slate-400 shrink-0" />
                        <span className="font-bold">{cust.phone}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-mono font-black text-slate-700 dark:text-slate-350">
                        ₹{actualSpend.toFixed(0)}
                      </p>
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest">
                        {actualCount} {actualCount === 1 ? 'ticket' : 'tickets'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Guest Detailed File (7 cols span) */}
        <div className="lg:col-span-7 space-y-4">
          
          {selectedCustomer ? (
            <>
              {/* Profile Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                
                {/* Visual Accent Background Pattern */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-bl-full pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 rounded-2xl shrink-0 font-bold select-none text-base">
                      {selectedCustomer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white font-sans">{selectedCustomer.name}</h2>
                        <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-450 py-0.5 px-1.5 rounded uppercase">
                          CRM-P-{selectedCustomer.id.slice(-4)}
                        </span>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-extrabold">{selectedCustomer.phone}</span>
                        </div>
                        {selectedCustomer.email && (
                          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold">{selectedCustomer.email}</span>
                          </div>
                        )}
                        {selectedCustomer.dob && (
                          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                            <Gift className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-455 shrink-0" />
                            <span>
                              Birthday: <strong className="font-mono">{new Date(selectedCustomer.dob).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                              {(() => {
                                try {
                                  const birthDate = new Date(selectedCustomer.dob);
                                  const today = new Date();
                                  let age = today.getFullYear() - birthDate.getFullYear();
                                  const m = today.getMonth() - birthDate.getMonth();
                                  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                    age--;
                                  }
                                  return ` (Age: ${age} years)`;
                                } catch {
                                  return '';
                                }
                              })()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-slate-450">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Registered: <strong className="font-mono">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</strong></span>
                        </div>
                        {(() => {
                          if (!selectedCustomer.dob) return null;
                          try {
                            const today = new Date();
                            const dobDate = new Date(selectedCustomer.dob);
                            const isBday = today.getDate() === dobDate.getDate() && today.getMonth() === dobDate.getMonth();
                            if (isBday) {
                              return (
                                <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl text-[10px] font-black tracking-wide uppercase shadow-3xs animate-bounce md:animate-pulse">
                                  <Cake className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                                  <span>🎂 Happy Birthday Today! 🎉 Give Special Deal!</span>
                                </div>
                              );
                            }
                          } catch {
                            return null;
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-stretch gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(selectedCustomer)}
                      className="px-3 py-1 font-bold text-[10px] uppercase text-indigo-650 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-white rounded-lg cursor-pointer transition-all border border-slate-105"
                    >
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(selectedCustomer.id)}
                      className="px-3 py-1 font-bold text-[10px] uppercase text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-950/40 dark:text-rose-400 rounded-lg cursor-pointer transition-all border border-rose-105"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mb-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="block text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Total Orders</span>
                    <span className="text-base font-black text-slate-800 dark:text-white font-mono">{selectedCustomerActualStats.count}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="block text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Total Billed</span>
                    <span className="text-base font-black text-slate-800 dark:text-white font-mono">₹{selectedCustomerActualStats.totalBilled}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                    <span className="block text-[8.5px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Total Paid</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">₹{selectedCustomerActualStats.totalPaid}</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                    <span className="block text-[8.5px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">Outstanding Due</span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">₹{selectedCustomerActualStats.totalDue}</span>
                  </div>
                </div>

                {/* Profile notes */}
                <div className="bg-amber-50/40 dark:bg-slate-950/50 p-3 rounded-xl border border-amber-100 dark:border-slate-850">
                  <span className="text-[8.5px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Heart className="w-3.5 h-3.5 fill-amber-450 text-amber-500 scale-90" />
                    BiteSpeed Guest Preferences & CRM Notes
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-350 italic">
                    {selectedCustomer.notes || 'No custom preferences, menu dislikes, or allergens recorded yet. Double-click "Edit Profile" above to record guest specifications.'}
                  </p>
                </div>

              </div>

              {/* Active Daily Running Tab ("Khata") */}
              {activeOpenTabOrders.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-red-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-3 shadow-md animate-fadeInUp">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 dark:border-amber-800/60 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                        <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-amber-200 uppercase tracking-tight flex items-center gap-1.5">
                          Active Daily Running Tab (Khata Due)
                        </h3>
                        <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300">
                          {activeOpenTabOrders.length} open {activeOpenTabOrders.length === 1 ? 'order' : 'orders'} placed today without final bill printing
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Pending Due</span>
                      <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">₹{openTabTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Orders Breakdown */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeOpenTabOrders.map((ord, idx) => (
                      <div key={ord.id} className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-amber-200/60 dark:border-slate-800 text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-100">
                            <span className="text-amber-600 font-mono text-[10px]">#{idx + 1}</span>
                            <span>{ord.tableName}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {ord.items.map(it => `${it.name} (x${it.quantity})`).join(', ')}
                          </p>
                        </div>
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">₹{ord.grandTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Settlement Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Settle consolidates all items into <strong>1 Final Thermal Invoice Receipt</strong>.
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSettleCustomerTab && selectedCustomer) {
                          onSettleCustomerTab(selectedCustomer.phone, 'cash');
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:scale-102 transition-transform flex items-center justify-center space-x-1.5 border-none"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Settle & Print Final Bill (₹{openTabTotal.toFixed(0)})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Transactions Timeline */}
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white font-sans flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      Historical Order Ledger ({selectedCustomerActualStats.count})
                    </h3>
                    <p className="text-[10px] text-slate-400">Chronological transaction archives linked to phone: {selectedCustomer.phone}</p>
                  </div>
                </div>

                {customerBills.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">No transactions recorded yet</h4>
                    <p className="text-[9.5px] text-slate-400 px-6 max-w-sm mx-auto mt-1 leading-normal">
                      When finalizing checkouts in the POS terminal, ensure the Guest phone is entered as <strong className="font-mono text-indigo-600">{selectedCustomer.phone}</strong>. History maps in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {customerBills.map(bill => (
                      <div
                        key={bill.id}
                        className="p-3 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-950 border border-slate-105 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-indigo-650 dark:text-indigo-400">
                              {bill.billNumber}
                            </span>
                            <span className="text-[8.5px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 uppercase px-1 rounded">
                              {bill.orderType}
                            </span>
                            <span className="text-[9.5px] text-slate-500 font-mono">
                              {new Date(bill.createdAt).toLocaleDateString()} at {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-sans mt-0.5">
                            <span className="font-semibold text-slate-650">Table: {bill.tableName}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]" title={bill.items.map(it => `${it.name} x${it.quantity}`).join(', ')}>
                              {bill.items.map(it => `${it.name} (x${it.quantity})`).join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <p className="text-xs font-mono font-extrabold text-slate-800 dark:text-white">
                              ₹{bill.grandTotal.toFixed(0)}
                            </p>
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                              Settled via {bill.paymentMethod?.toUpperCase() || 'CASH'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.playSuccessChime();
                              onViewBill(bill);
                            }}
                            className="p-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-650 dark:text-indigo-405 border border-slate-200 dark:border-slate-700 rounded-lg shrink-0 cursor-pointer transition-all flex items-center space-x-1 hover:shadow-3xs text-[9.5px] font-extrabold uppercase"
                            title="Re-open printed slip or receipt for settlement lookup"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 py-16 px-4 text-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h2 className="text-sm font-bold text-slate-705 dark:text-slate-350">No Guest File Selected</h2>
              <p className="text-xs text-slate-450 max-w-sm mt-1 mb-4">
                Select any guest profile from the list directory to review their lifetime spends, recorded allergic preferences, and complete transactional timeline ledger.
              </p>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setEditingCustomer(null);
                  setName('');
                  setPhone('');
                  setEmail('');
                  setNotes('');
                  setDob('');
                  setIsAdding(true);
                  if (showImport) setShowImport(false);
                }}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white hover:shadow-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all uppercase text-[11px] font-mono font-black border-none"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Guest Profile Manually</span>
              </button>
            </div>
          )}

        </div>
        
      </div>

    </div>
  );
};
