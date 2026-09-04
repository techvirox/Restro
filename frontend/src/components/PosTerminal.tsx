import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MenuItem, Table, TableOrder, OrderItem, KOT, KOTItem, Customer, EstimateBill } from '../types';
import { 
  Plus, Minus, Search, Trash2, ShieldAlert, BadgePercent, 
  Receipt, ShoppingCart, UserCheck, CheckSquare, Printer, ArrowLeft, RotateCcw, AlertTriangle, Coins, Filter,
  UserPlus, Bluetooth, BellDot, Usb, Clock
} from 'lucide-react';
import { soundEffects } from './SoundUtility';
import { printThermalBill, printThermalKot, getPrinterConfig, connectBluetoothPrinterSession } from '../utils/printUtility';

interface PosTerminalProps {
  table: Table;
  menu: MenuItem[];
  activeOrder: TableOrder | null;
  onSaveOrder: (order: TableOrder) => void;
  onFireKOT: (kot: KOT) => void;
  onBack: () => void;
  onCompleteBilling: (order: TableOrder, paymentMethod: 'cash' | 'card' | 'upi' | 'due') => void;
  waitersList?: string[];
  customers?: Customer[];
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'lifetimeSpend' | 'orderCount' | 'createdAt'>) => void;
  isGuest?: boolean;
  kots?: KOT[];
  onUpdateKOTItemStatus?: (kotId: string, itemId: string, status: KOTItem['status']) => void;
  onSaveBill?: (bill: EstimateBill) => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  table,
  menu,
  activeOrder,
  onSaveOrder,
  onFireKOT,
  onBack,
  onCompleteBilling,
  waitersList,
  customers = [],
  onAddCustomer,
  isGuest = false,
  kots = [],
  onUpdateKOTItemStatus,
  onSaveBill
}) => {
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);
  // Mobile Tab switcher (menu vs cart) for small screens
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  // POS States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterVegOnly, setFilterVegOnly] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [paperSizeSetting, setPaperSizeSetting] = useState<'80mm' | '58mm'>(() => {
    return (localStorage.getItem('bitespeed_print_paper_size') as '80mm' | '58mm') || '58mm';
  });
  const [autoPrintKot, setAutoPrintKot] = useState<boolean>(() => {
    return localStorage.getItem('bitespeed_auto_print_kot') !== 'false';
  });
  const [printerNotConnectedModal, setPrinterNotConnectedModal] = useState(false);

  useEffect(() => {
    const handleNotConn = () => setPrinterNotConnectedModal(true);
    window.addEventListener('printer-not-connected', handleNotConn);
    return () => window.removeEventListener('printer-not-connected', handleNotConn);
  }, []);

  const [waiter, setWaiter] = useState(table.currentWaiter || 'Self');
  const [cart, setCart] = useState<OrderItem[]>([]);
  
  // Billing States
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [taxRate, setTaxRate] = useState(5); // Default 5% GST
  const [serviceChargeRate, setServiceChargeRate] = useState(0); // Default 0% Service Charge
  const [deliveryCharge, setDeliveryCharge] = useState(0); // Delivery charge at billing time
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Quick Customer Add Modal States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustDob, setNewCustDob] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  const isCustomerSelected = useMemo(() => {
    const name = customerName.trim();
    const phone = customerPhone.trim();
    return name !== '' && 
           name.toLowerCase() !== 'walk-in guest' && 
           name.toLowerCase() !== 'walk-in' && 
           phone !== '';
  }, [customerName, customerPhone]);

  const handleAddNewCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    if (onAddCustomer) {
      onAddCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim() || undefined,
        dob: newCustDob || undefined,
        notes: newCustNotes.trim() || undefined
      });
    }

    setCustomerName(newCustName.trim());
    setCustomerPhone(newCustPhone.trim());
    
    // Reset Form
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustDob('');
    setNewCustNotes('');
    setShowAddCustomerModal(false);
    
    soundEffects.playSuccessChime();
  };

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'due'>('cash');

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

  const handleThermalPrint = (driver: 'bluetooth' | 'usb') => {
    soundEffects.playTick();
    
    if (printType === 'invoice') {
      handleSettleOrder('cash');
      setPrintModalVisible(false);
      return;
    }
    const effectiveWaiterName = waiter !== 'Self' ? waiter : (activeOrder?.currentWaiter || table.currentWaiter || 'Counter Staff');

    const billPayload: EstimateBill = {
      id: activeOrder?.id || `ord-${table.id}-${Date.now().toString().slice(-4)}`,
      orderId: activeOrder?.id || `ord-${table.id}-${Date.now().toString().slice(-4)}`,
      billNumber: printType === 'estimate' 
        ? `EST-${Date.now().toString().slice(-6)}` 
        : `INV-${Date.now().toString().slice(-6)}`,
      type: printType,
      customerName: customerName.trim() || 'Walk-in Guest',
      customerPhone: customerPhone.trim(),
      tableName: table.name,
      orderType: table.id.startsWith('takeaway') ? 'takeaway' : table.id.startsWith('delivery') ? 'delivery' : 'dine-in',
      items: cart,
      subtotal,
      discountAmount,
      taxAmount,
      serviceChargeAmount,
      deliveryCharge: table.id.startsWith('delivery') || activeOrder?.orderType === 'delivery' ? deliveryCharge : 0,
      grandTotal,
      createdAt: activeOrder?.createdAt || new Date().toISOString(),
      paymentMethod: 'UPI Settle',
      currentWaiter: effectiveWaiterName
    };

    // Auto connection print direct
    const originalDriver = localStorage.getItem('bitespeed_printer_driver');
    localStorage.setItem('bitespeed_printer_driver', driver);
    
    printThermalBill(billPayload, false, paperSizeSetting);
    
    if (originalDriver) {
      localStorage.setItem('bitespeed_printer_driver', originalDriver);
    } else {
      localStorage.removeItem('bitespeed_printer_driver');
    }
  };

  // CRM Lookup overlay states
  const [showLookupResults, setShowLookupResults] = useState(false);

  // Normalize phone number helper
  const cleanDigits = (n: string) => n.replace(/\D/g, '');

  const matchingCustomers = useMemo(() => {
    const nameQ = customerName.toLowerCase().trim();
    const phoneQ = cleanDigits(customerPhone);
    if (!nameQ && !phoneQ) return [];

    return customers.filter(c => {
      const matchName = nameQ && c.name.toLowerCase().includes(nameQ);
      const matchPhone = phoneQ && cleanDigits(c.phone).includes(phoneQ);
      return matchName || matchPhone;
    });
  }, [customers, customerName, customerPhone]);

  const registeredGuestBadge = useMemo(() => {
    if (!customerPhone.trim()) return null;
    const phoneDigits = cleanDigits(customerPhone);
    const match = customers.find(c => cleanDigits(c.phone) === phoneDigits || cleanDigits(c.phone).endsWith(phoneDigits));
    if (match) {
      return `${match.name.split(' ')[0]} - Spend: ₹${match.lifetimeSpend.toFixed(0)}`;
    }
    return null;
  }, [customers, customerPhone]);

  // Cash Change Calculator States
  const [cashReceived, setCashReceived] = useState('');
  const [changeAmount, setChangeAmount] = useState<number | null>(null);

  // Print Preview Dialog States
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [printType, setPrintType] = useState<'estimate' | 'invoice'>('estimate');

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(menu.map(item => item.category)))];
  }, [menu]);

  // Cart persistence storage key per table
  const storageKey = `techvirox_cart_${table.id}`;

  // Load existing order if available or fallback to cached draft cart
  useEffect(() => {
    const isDel = table.id.startsWith('delivery') || activeOrder?.orderType === 'delivery';
    if (activeOrder && activeOrder.items && activeOrder.items.length > 0) {
      setCart(activeOrder.items);
      try {
        localStorage.setItem(storageKey, JSON.stringify(activeOrder.items));
      } catch (e) {}
      setDiscountValue(activeOrder.discountValue);
      setDiscountType(activeOrder.discountType);
      setTaxRate(activeOrder.taxRate);
      setServiceChargeRate(activeOrder.serviceChargeRate);
      setDeliveryCharge(activeOrder.deliveryCharge !== undefined ? activeOrder.deliveryCharge : (isDel ? 40 : 0));
      setWaiter(activeOrder.currentWaiter || table.currentWaiter || 'Self');
      setCustomerName(activeOrder.customerName || '');
      setCustomerPhone(activeOrder.customerPhone || '');
    } else {
      let cachedCart: OrderItem[] = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          cachedCart = JSON.parse(saved);
        }
      } catch (e) {}

      setCart(cachedCart);
      setDiscountValue(0);
      setDiscountType('percentage');
      setTaxRate(5);
      setServiceChargeRate(0);
      setDeliveryCharge(isDel ? 40 : 0);
      setWaiter(table.currentWaiter || 'Self');
      setCustomerName('');
      setCustomerPhone('');
    }
    setCashReceived('');
    setChangeAmount(null);
  }, [activeOrder, table.id]);

  // Sync cart updates to localStorage automatically
  useEffect(() => {
    try {
      if (cart && cart.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(cart));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {}
  }, [cart, storageKey]);

  // Handle Quick Keyboard entry or Shortcode
  const handleShortcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Direct Match shortcode
    const query = searchQuery.trim().toUpperCase();
    const matchedItem = menu.find(item => item.code.toUpperCase() === query || item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (matchedItem && matchedItem.available) {
      handleAddToCart(matchedItem);
      setSearchQuery('');
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    soundEffects.playTick();
    setCart(prevCart => {
      const existing = prevCart.find(i => i.menuItemId === item.id);
      if (existing) {
        return prevCart.map(i => 
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prevCart, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, sentToKitchenQty: 0, notes: '', gstRate: item.gstRate !== undefined ? item.gstRate : 5 }];
      }
    });
  };

  const handleRemoveFromCart = (itemId: string, force = false) => {
    soundEffects.playTick();
    setCart(prevCart => {
      const existing = prevCart.find(i => i.menuItemId === itemId);
      if (!existing) return prevCart;

      // Restrict decrementing below sentToKitchen quantities unless forced/cancelled
      if (existing.quantity <= existing.sentToKitchenQty && !force) {
        alert("Cannot reduce quantity below what's already sent to the Kitchen/KOT. Please cancel or replace via Kitchen Order views instead.");
        return prevCart;
      }

      if (existing.quantity === 1 || force) {
        return prevCart.filter(i => i.menuItemId !== itemId);
      }

      return prevCart.map(i => 
        i.menuItemId === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart(prevCart => prevCart.map(i => 
      i.menuItemId === itemId ? { ...i, notes } : i
    ));
  };

  // Math Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }, [subtotal, discountValue, discountType]);

  const taxAmount = useMemo(() => {
    if (subtotal <= 0) return 0;
    const discountFraction = Math.max(0, (subtotal - discountAmount) / subtotal);
    return cart.reduce((acc, item) => {
      const itemGst = item.gstRate !== undefined ? item.gstRate : 5;
      const itemSubtotal = item.price * item.quantity;
      const itemTaxableBase = itemSubtotal * discountFraction;
      return acc + (itemTaxableBase * itemGst) / 100;
    }, 0);
  }, [cart, subtotal, discountAmount]);

  const serviceChargeAmount = useMemo(() => {
    const taxableBase = Math.max(0, subtotal - discountAmount);
    return (taxableBase * serviceChargeRate) / 100;
  }, [subtotal, discountAmount, serviceChargeRate]);

  const isDelivery = useMemo(() => {
    return table.id.startsWith('delivery') || activeOrder?.orderType === 'delivery';
  }, [table, activeOrder]);

  const grandTotal = useMemo(() => {
    const base = subtotal - discountAmount;
    const deliveryCost = isDelivery ? deliveryCharge : 0;
    return Math.max(0, base + taxAmount + serviceChargeAmount + deliveryCost);
  }, [subtotal, discountAmount, taxAmount, serviceChargeAmount, isDelivery, deliveryCharge]);

  const tableKots = useMemo(() => {
    return kots.filter(k => k.tableId === table.id && (activeOrder?.kotIds || []).includes(k.id));
  }, [kots, table.id, activeOrder]);

  // Listen to cash received input
  useEffect(() => {
    const cash = parseFloat(cashReceived);
    if (!isNaN(cash) && cash >= grandTotal) {
      setChangeAmount(cash - grandTotal);
    } else {
      setChangeAmount(null);
    }
  }, [cashReceived, grandTotal]);

  const filteredMenuItems = useMemo(() => {
    return menu.filter(item => {
      const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
      const textMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const vegMatch = filterVegOnly === 'all' || 
                        (filterVegOnly === 'veg' && item.type === 'veg') ||
                        (filterVegOnly === 'non-veg' && item.type === 'non-veg');

      return categoryMatch && textMatch && vegMatch;
    });
  }, [menu, searchQuery, selectedCategory, filterVegOnly]);

  // Draft Save Order
  const handleSaveDraft = (statusOverride?: TableOrder['status']) => {
    if (cart.length === 0) {
      alert("Cart is empty! Select dishes to place an order.");
      return null;
    }

    const orderObj: TableOrder = {
      id: activeOrder?.id || `ord-${table.id}-${Date.now().toString().slice(-4)}`,
      tableId: table.id,
      tableName: table.name,
      orderType: table.id.startsWith('takeaway') ? 'takeaway' : table.id.startsWith('delivery') ? 'delivery' : 'dine-in',
      items: cart,
      kotIds: activeOrder?.kotIds || [],
      subtotal,
      discountValue,
      discountType,
      taxRate,
      serviceChargeRate,
      deliveryCharge: isDelivery ? deliveryCharge : 0,
      grandTotal,
      status: statusOverride || activeOrder?.status || 'active',
      customerName,
      customerPhone,
      createdAt: activeOrder?.createdAt || new Date().toISOString(),
      currentWaiter: waiter !== 'Self' ? waiter : (activeOrder?.currentWaiter || table.currentWaiter || 'Counter Staff')
    };
    
    onSaveOrder(orderObj);
    return orderObj;
  };

  // Kitchen Order Ticket Fire
  const handleFireKOTClick = () => {
    // Collect items that are NOT fully sent to the kitchen yet
    const itemsToFire = cart.filter(item => item.quantity > item.sentToKitchenQty);

    if (itemsToFire.length === 0) {
      alert("All items in this order have already been sent to the kitchen! Add more items first.");
      return;
    }

    const orderObj = handleSaveDraft();
    if (!orderObj) return;

    soundEffects.playSuccessChime();

    const effectiveWaiterName = waiter !== 'Self' ? waiter : (activeOrder?.currentWaiter || table.currentWaiter || 'Counter Staff');

    // Create KOT items
    const kotItems: KOTItem[] = itemsToFire.map(item => ({
      id: `ki-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity - item.sentToKitchenQty,
      notes: item.notes,
      status: 'cooking'
    }));

    const kotNumber = `KOT #${100 + Math.floor(Math.random() * 900)}`;

    const newKOT: KOT = {
      id: `kot-${Date.now()}`,
      kotNumber,
      tableId: table.id,
      tableName: table.name,
      waiterName: effectiveWaiterName,
      createdAt: new Date().toISOString(),
      items: kotItems,
      status: 'pending'
    };

    // Update cart state: mark fired quantities as sent
    const updatedCart = cart.map(item => ({
      ...item,
      sentToKitchenQty: item.quantity
    }));

    setCart(updatedCart);

    // Save order payload with updated KOT links
    const updatedOrder: TableOrder = {
      ...orderObj,
      items: updatedCart,
      kotIds: [...orderObj.kotIds, newKOT.id],
      status: 'active'
    };

    onSaveOrder(updatedOrder);
    onFireKOT(newKOT);

    // Auto print KOT thermal slip over Bluetooth / USB / System print
    printThermalKot(newKOT, paperSizeSetting);

    if (isGuest) {
      setOrderPlacedSuccess(true);
    }
  };

  const hasUnsentItems = useMemo(() => {
    return cart.some(item => item.quantity > item.sentToKitchenQty);
  }, [cart]);

  // Payment Settlements
  const handleSettleOrder = (method: 'cash' | 'card' | 'upi' | 'due'): boolean => {
    if (cart.length === 0) return false;
    if (hasUnsentItems) {
      if(!confirm("There are unsent items in the cart that haven't been sent to KOT/Kitchen yet. Close the bill anyway?")) {
        return false;
      }
    }

    const orderObj = handleSaveDraft('completed');
    if (!orderObj) return false;

    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}

    onCompleteBilling(orderObj, method);
    return true;
  };

  const printSlip = () => {
    soundEffects.playTick();
    if (printType === 'invoice') {
      handleSettleOrder(selectedPaymentMethod);
      setPrintModalVisible(false);
      return;
    }
    window.print();
  };

  const handleWhatsAppShare = () => {
    soundEffects.playTick();
    const itemsText = cart.map(item => `${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(0)}`).join('\n');
    const summaryText = `*${getPrinterConfig().title}*\n` +
      `Bill No: ${activeOrder?.id ? `DRAFT-${activeOrder.id.slice(-4)}` : `NEW-${Date.now().toString().slice(-4)}`}\n` +
      `-------------------------\n` +
      `${itemsText}\n` +
      `-------------------------\n` +
      `Subtotal: ₹${subtotal.toFixed(2)}\n` +
      (discountAmount > 0 ? `Discount: -₹${discountAmount.toFixed(2)}\n` : '') +
      `Tax: ₹${taxAmount.toFixed(2)}\n` +
      `Grand Total: ₹${grandTotal.toFixed(2)}\n\n` +
      `Thank you for patronising us!`;
      
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const waUrl = `https://api.whatsapp.com/send?${waPhone ? `phone=${waPhone}&` : ''}text=${encodeURIComponent(summaryText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div id="pos-terminal-workspace" className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-5 lg:h-full lg:max-h-[85vh] font-sans">
      {isGuest ? (
        <div id="pos-terminal-header" className="lg:col-span-12 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20">
              <ShoppingCart className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide font-sans text-white">
                {table.name} Ordering Portal
              </h2>
              <p className="text-[10.5px] text-slate-300 font-sans">
                Browse our delicious menu, customize instructions, and place your order directly.
              </p>
            </div>
          </div>
          <div className="flex items-center text-[10.5px] font-bold font-mono bg-white/15 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 inline-block animate-pulse"></span>
            Table Connected
          </div>
        </div>
      ) : (
        <div id="pos-terminal-header" className="lg:col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-gray-200 p-3 sm:p-4 rounded-xl gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              id="back-to-floor-layout"
              onClick={onBack}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#1a1c23] uppercase tracking-tight">
                {table.name} POS Terminal
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Order: {activeOrder?.id || 'New Draft Case'} • Status: <span className="font-bold text-indigo-650 uppercase">{activeOrder?.status || 'Active Cart'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Waiter Select */}
            <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="waiter-selector"
                value={waiter}
                onChange={(e) => {
                  setWaiter(e.target.value);
                  soundEffects.playTick();
                }}
                className="text-xs font-bold font-sans bg-transparent outline-none border-none text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="Self">Self Counter</option>
                {waitersList && waitersList.length > 0 ? (
                  waitersList.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))
                ) : (
                  <>
                    <option value="Rajesh M.">Rajesh M.</option>
                    <option value="Sonia K.">Sonia K.</option>
                    <option value="Amit Verma">Amit Verma</option>
                    <option value="Vikram Singh">Vikram Singh</option>
                  </>
                )}
              </select>
            </div>

            {/* Customer Metadata fields with CRM lookup */}
            <div 
              className="relative flex items-center gap-1.5"
              onMouseLeave={() => setShowLookupResults(false)}
            >
              <input
                id="customer-name-input"
                type="text"
                placeholder="Cust. Name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setShowLookupResults(true);
                }}
                onFocus={() => setShowLookupResults(true)}
                className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none bg-white text-slate-800 w-[85px] focus:border-indigo-500 transition-all font-semibold font-sans"
              />
              <input
                id="customer-phone-input"
                type="text"
                placeholder="Cust. Phone"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setShowLookupResults(true);
                }}
                onFocus={() => setShowLookupResults(true)}
                className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none bg-white text-slate-800 w-[95px] focus:border-indigo-500 transition-all font-semibold font-sans font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setShowAddCustomerModal(true);
                }}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                title="Add New Customer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Quick manual registry option inside POS billing interface */}
              {onAddCustomer && customerName.trim() && customerPhone.trim() && !registeredGuestBadge && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playSuccessChime();
                    onAddCustomer({
                      name: customerName.trim(),
                      phone: customerPhone.trim(),
                      notes: "Manually registered from Table Check-Out Billing panel"
                    });
                  }}
                  className="p-1 px-1.5 bg-indigo-55 bg-opacity-10 text-indigo-650 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-750 border border-indigo-150 rounded-lg cursor-pointer transition-all flex items-center gap-0.5 text-[9.5px] font-extrabold uppercase shrink-0"
                  title="Save Guest manually to database CRM list"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-650" />
                  <span>+ CRM</span>
                </button>
              )}

              {/* CRM Autocomplete Popover */}
              {showLookupResults && matchingCustomers.length > 0 && (
                <div 
                  id="crm-pos-lookup-box" 
                  className="absolute left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg w-64 py-1.5 z-55 max-h-48 overflow-y-auto text-left"
                >
                  <div className="px-2 pb-1 bg-white flex items-center justify-between text-[8px] text-slate-400 uppercase font-black tracking-wider">
                    <span>Guest Registry Match ({matchingCustomers.length})</span>
                    <button 
                      type="button" 
                      onClick={() => setShowLookupResults(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer text-[9px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  {matchingCustomers.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        soundEffects.playSuccessChime();
                        setCustomerName(cust.name);
                        setCustomerPhone(cust.phone);
                        setShowLookupResults(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 flex flex-col border-b border-slate-50 last:border-0 transition cursor-pointer"
                    >
                      <span className="text-[10px] font-black text-slate-800 block leading-tight">{cust.name}</span>
                      <span className="text-[8.5px] text-slate-450 font-mono flex items-center justify-between w-full mt-0.5">
                        <span>{cust.phone}</span>
                        <span className="text-indigo-650 dark:text-indigo-500 font-extrabold font-sans">₹{cust.lifetimeSpend.toFixed(0)} ({cust.orderCount} visits)</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Micro display badge if visitor is registered repeat */}
              {registeredGuestBadge && (
                <div id="repeat-guest-badge" className="absolute -top-4.5 left-1 bg-indigo-650 text-white rounded px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 pointer-events-none whitespace-nowrap shadow-3xs">
                  ⭐ {registeredGuestBadge}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Bar — only visible on small screens */}
      <div id="pos-mobile-tab-bar" className="flex lg:hidden rounded-xl overflow-hidden border border-gray-200 bg-gray-100 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileTab === 'menu'
              ? 'bg-white shadow-sm text-indigo-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 Menu Catalog
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
            mobileTab === 'cart'
              ? 'bg-white shadow-sm text-indigo-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🛒 Cart & Checkout
          {cart.length > 0 && (
            <span className="absolute top-1 right-3 w-4 h-4 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* LEFT: Menu list catalog browse */}
      <div id="catalog-category-browse-panel" className={`lg:col-span-7 flex flex-col bg-white border border-gray-250 rounded-xl p-4 overflow-hidden shadow-xs lg:h-full ${
        mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
      }`}>
        
        {/* Search bar & Type Filters */}
        <div id="catalog-controls-container" className="flex flex-col sm:flex-row gap-2.5 mb-3.5">
          <form onSubmit={handleShortcodeSearch} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              id="menu-search-or-shortcut-input"
              type="text"
              placeholder="Search dishes or type code (e.g. PBM, CCF) + Enter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition-all font-sans"
            />
          </form>

          {/* Veg/Non-Veg Filter Segmented Control */}
          <div className="flex bg-gray-150 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-center">
            <button
              id="filter-all-type"
              type="button"
              onClick={() => { soundEffects.playTick(); setFilterVegOnly('all'); }}
              className={`px-3 py-1 rounded-md transition-all ${filterVegOnly === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-450 hover:text-slate-600 cursor-pointer'}`}
            >
              All Types
            </button>
            <button
              id="filter-veg-type"
              type="button"
              onClick={() => { soundEffects.playTick(); setFilterVegOnly('veg'); }}
              className={`px-3 py-1 rounded-md transition-all ${filterVegOnly === 'veg' ? 'bg-emerald-500 text-white shadow-xs font-bold' : 'text-emerald-600 hover:text-emerald-700 cursor-pointer'}`}
            >
              Veg
            </button>
            <button
              id="filter-nonveg-type"
              type="button"
              onClick={() => { soundEffects.playTick(); setFilterVegOnly('non-veg'); }}
              className={`px-3 py-1 rounded-md transition-all ${filterVegOnly === 'non-veg' ? 'bg-red-500 text-white shadow-xs font-bold' : 'text-red-600 hover:text-red-700 cursor-pointer'}`}
            >
              Non-Veg
            </button>
          </div>
        </div>

        {/* Categories Tab Bar */}
        <div id="category-scroller-track" className="flex items-center space-x-1 border-b border-gray-150 pb-2.5 mb-3.5 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              id={`cat-tab-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              key={cat}
              onClick={() => {
                soundEffects.playTick();
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1 rounded-lg uppercase font-mono text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === cat ? 'bg-[#1a1c23] text-white shadow-xs' : 'bg-gray-100 text-slate-505 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dishes list grid container */}
        <div id="dishes-catalog-scrollable" className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3" style={{minHeight: '50vh', maxHeight: 'calc(100vh - 320px)'}}>

          {filteredMenuItems.length > 0 ? (
            filteredMenuItems.map((item) => {
              const inCartItem = cart.find(i => i.menuItemId === item.id);
              const inCartQty = inCartItem ? inCartItem.quantity : 0;

              return (
                <div
                  id={`dish-card-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    if (item.available) handleAddToCart(item);
                  }}
                  className={`relative p-2.5 rounded-lg border border-gray-200 transition-all flex flex-col justify-between h-[110px] cursor-pointer select-none ${!item.available ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white hover:border-indigo-400 hover:shadow-xs'}`}
                >
                  <div className="flex justify-between items-start gap-2 h-full min-h-0 w-full">
                    <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'veg' ? 'bg-emerald-500' : item.type === 'non-veg' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                          <span className="text-[9px] uppercase font-mono font-bold text-gray-400 bg-gray-50 px-1 rounded border border-gray-150">{item.code}</span>
                        </div>
                        <h4 className="font-bold text-[11px] text-slate-800 line-clamp-2 mt-1 leading-tight tracking-tight">
                          {item.name}
                        </h4>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs font-black text-slate-900 font-mono">₹{item.price}</span>
                        
                        {inCartQty > 0 ? (
                          <div className="flex items-center space-x-1 bg-[#1a1c23] text-white px-1.5 py-0.5 rounded-lg text-xs" onClick={(e) => e.stopPropagation()}>
                            <button
                              id={`dish-card-dec-${item.id}`}
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="hover:text-red-400 font-bold px-1 py-0.5 animate-none cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold px-0.5 text-[10px]">{inCartQty}</span>
                            <button
                              id={`dish-card-inc-${item.id}`}
                              onClick={() => handleAddToCart(item)}
                              className="hover:text-emerald-400 font-bold px-1 py-0.5 animate-none cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-150 hover:bg-gray-200 text-slate-600 transition-colors">
                            <Plus className="w-3 h-3 animate-none" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Show culinary image on grid item card if available */}
                    {item.image && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-100 shrink-0 self-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div id="no-matching-dishes" className="col-span-full py-12 text-center">
              <AlertTriangle className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-xs font-mono">No dishes found matching selection.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Order Cart & Checkout controller */}
      <div id="pos-billing-cart-panel" className={`lg:col-span-5 flex flex-col bg-white border border-gray-250 rounded-xl overflow-hidden shadow-xs lg:h-full ${
        mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
      }`}>
        
        {/* Active Order details panel title */}
        <div className="p-4 border-b border-gray-150 bg-gray-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Order</span>
            <span className="text-base font-extrabold text-indigo-900 uppercase tracking-tight">{table.name}</span>
          </div>
          <div className="bg-red-100 text-red-650 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
          </div>
        </div>

        {/* Selected Dishes Scroller */}
        <div id="cart-items-scrollable" className="flex-1 overflow-y-auto p-3 space-y-2" style={{maxHeight: 'calc(100vh - 420px)', minHeight: '200px'}}>
          {cart.length > 0 ? (
            cart.map((item) => {
              const unsentQty = item.quantity - item.sentToKitchenQty;
              const menuItem = menu.find(m => m.id === item.menuItemId);
              return (
                <div id={`cart-row-${item.menuItemId}`} key={item.menuItemId} className="border-b border-gray-100 dark:border-slate-800 pb-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    {menuItem?.image && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <img 
                          src={menuItem.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-baseline space-x-1 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                        {item.sentToKitchenQty > 0 && (
                          <span className="text-[9px] font-bold text-indigo-650 bg-indigo-50 px-1 hover:opacity-90 rounded">
                            Sent {item.sentToKitchenQty}
                          </span>
                        )}
                        {unsentQty > 0 && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 animate-pulse rounded">
                            Prep {unsentQty}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">₹{item.price} each • Sub: ₹{(item.price * item.quantity).toFixed(0)} • GST: {item.gstRate !== undefined ? item.gstRate : 5}%</p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-mono scale-95 shrink-0">
                        <button
                          id={`cart-dec-btn-${item.menuItemId}`}
                          onClick={() => handleRemoveFromCart(item.menuItemId)}
                          className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-1.5 py-0.5 font-bold text-slate-800">{item.quantity}</span>
                        <button
                          id={`cart-inc-btn-${item.menuItemId}`}
                          onClick={() => {
                            soundEffects.playTick();
                            setCart(prev => prev.map(i => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i));
                          }}
                          className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        id={`cart-delete-item-${item.menuItemId}`}
                        onClick={() => handleRemoveFromCart(item.menuItemId, true)}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* prep instruction input */}
                  <input
                    id={`cart-item-notes-${item.menuItemId}`}
                    type="text"
                    placeholder="Instructions (e.g. 'less oil', 'no onion')"
                    value={item.notes || ''}
                    onChange={(e) => updateItemNotes(item.menuItemId, e.target.value)}
                    className="w-full text-[10px] font-mono px-1.5 py-0.5 mt-1 border border-gray-150 bg-gray-50 text-slate-600 rounded outline-none"
                  />
                </div>
              );
            })
          ) : (
            <div id="cart-is-empty-placeholder" className="h-full flex flex-col justify-center items-center py-10 opacity-70 border border-dashed border-gray-150 rounded-lg">
              <ShoppingCart className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-[11px] text-slate-400 font-mono text-center">Cart is completely vacant.<br />Tap menu items to add.</p>
            </div>
          )}
        </div>

        {/* Fired KOTs List Panel */}
        {tableKots.length > 0 && (
          <div className="border-t border-gray-150 p-3 bg-indigo-50/30 dark:bg-indigo-955 bg-opacity-25 space-y-2">
            <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider block font-mono">Live Kitchen Prep Tracker</span>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {tableKots.map(kot => (
                <div key={kot.id} className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 rounded-lg p-2 text-xs space-y-1">
                  <div className="flex justify-between items-center border-b border-dashed border-indigo-50 dark:border-indigo-950 pb-1">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">{kot.kotNumber}</span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {Math.round((Date.now() - new Date(kot.createdAt).getTime()) / 60000)}m ago
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {kot.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-[11px]">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.quantity} x {item.name}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {item.status === 'cooking' ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                              Cooking
                            </span>
                          ) : item.status === 'ready' ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/60 animate-pulse">
                                Ready 🔔
                              </span>
                              {!isGuest && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEffects.playTick();
                                    onUpdateKOTItemStatus?.(kot.id, item.id, 'served');
                                  }}
                                  className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                >
                                  Serve
                                </button>
                              )}
                            </div>
                          ) : item.status === 'served' ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-slate-50 text-slate-400 border border-slate-200 dark:bg-slate-850 dark:border-slate-800">
                              Served
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-rose-50 text-rose-500 border border-rose-100">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Taxes, Discounts, & Adjustments */}
        {!isGuest && (
          <div id="discounts-taxes-panel" className="border-t border-gray-150 pt-2 space-y-1.5 bg-gray-50 p-3 rounded-lg mb-2">
            {/* Discount Segment Row */}
            <div className="flex items-center justify-between text-xs font-mono gap-1.5">
              <span className="text-gray-500 font-bold capitalize flex items-center">
                <BadgePercent className="w-3.5 h-3.5 mr-1 text-teal-600" /> Discount (Off)
              </span>
              <div className="flex items-center space-x-1.5">
                <select
                  id="discount-type-selector"
                  value={discountType}
                  onChange={(e) => {
                    soundEffects.playTick();
                    setDiscountType(e.target.value as 'percentage' | 'fixed');
                    setDiscountValue(0);
                  }}
                  className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px]"
                >
                  <option value="percentage">% Percent</option>
                  <option value="fixed">Fixed ₹</option>
                </select>
                <input
                  id="discount-value-input"
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : subtotal}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-14 bg-white border border-gray-200 text-right px-1.5 py-0.5 rounded text-[11px] font-bold font-mono"
                />
              </div>
            </div>

            {/* Tax Rates adjustments */}
            <div className="flex items-center justify-between text-xs font-mono gap-1.5">
              <span className="text-gray-500 font-bold">CGST + SGST Tax Rate</span>
              <div className="flex items-center space-x-1">
                <input
                  id="tax-rate-input"
                  type="number"
                  min="0"
                  max="30"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-10 bg-white border border-gray-200 text-right px-1 py-0.5 rounded text-[11px] font-bold font-mono"
                />
                <span>%</span>
              </div>
            </div>

            {/* Service Charge adjustments */}
            <div className="flex items-center justify-between text-xs font-mono gap-1.5">
              <span className="text-gray-500 font-bold">Service Charge / Packaging</span>
              <div className="flex items-center space-x-1">
                <input
                  id="service-charge-input"
                  type="number"
                  min="0"
                  max="20"
                  value={serviceChargeRate}
                  onChange={(e) => setServiceChargeRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-10 bg-white border border-gray-200 text-right px-1 py-0.5 rounded text-[11px] font-bold font-mono"
                />
                <span>%</span>
              </div>
            </div>

            {/* Delivery Charge adjustment (only shown for delivery orders) */}
            {isDelivery && (
              <div id="delivery-charge-adjustment-row" className="flex items-center justify-between text-xs font-mono gap-1.5 p-1 bg-amber-50 rounded border border-amber-100">
                <span className="text-amber-800 font-bold flex items-center">
                  🚲 Delivery Charge
                </span>
                <div className="flex items-center space-x-1">
                  <span>₹</span>
                  <input
                    id="delivery-charge-input"
                    type="number"
                    min="0"
                    max="500"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-14 bg-white border border-amber-200 text-right px-1.5 py-0.5 rounded text-[11px] font-bold font-mono outline-none focus:ring-1 focus:ring-amber-405"
                    placeholder="40"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Receipt Totals Summary block */}
        <div id="receipt-summary-block" className="space-y-1 pb-3 px-1">
          <div className="flex justify-between text-xs font-mono text-gray-500">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs font-sans text-indigo-600 font-bold">
              <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'}):</span>
              <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-mono text-gray-500">
            <span>GST ({taxRate}%):</span>
            <span>₹{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-mono text-gray-500">
            <span>Svc Charge ({serviceChargeRate}%):</span>
            <span>₹{serviceChargeAmount.toFixed(2)}</span>
          </div>
          {isDelivery && deliveryCharge > 0 && (
            <div className="flex justify-between text-xs font-mono text-amber-700 font-bold">
              <span>Delivery Charge:</span>
              <span>₹{deliveryCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold font-sans border-t border-gray-200 pt-2 text-[#1a1c23]">
            <span>Grand Total:</span>
            <span className="text-xl font-black text-[#5c6ac4] font-mono">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Change Calculator Drawer */}
        {!isGuest && (
          <div className="bg-[#f0f2f5] p-2 rounded-lg border border-gray-200 mb-3 text-xs font-mono select-none">
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-bold flex items-center text-gray-500">
                <Coins className="w-3.5 h-3.5 mr-1 text-amber-500 shrink-0" /> Change Calc
              </span>
              <div className="flex items-center space-x-1.5">
                <input
                  id="cash-received-calc-input"
                  type="number"
                  placeholder="Cash ₹"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-20 bg-white border border-gray-200 px-1 py-0.5 text-right font-bold text-[11px] rounded outline-none"
                />
                {changeAmount !== null && (
                  <span className="text-[10px] bg-indigo-100 text-[#4f46e5] px-1.5 py-0.5 rounded font-bold shrink-0">
                    Ret: ₹{changeAmount.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {isGuest ? (
          <div className="flex flex-col gap-2 mt-auto p-2">
            <button
              id="btn-guest-place-order"
              type="button"
              onClick={handleFireKOTClick}
              disabled={cart.length === 0 || !hasUnsentItems}
              className={`flex items-center justify-center space-x-2 py-4.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer ${
                cart.length === 0 || !hasUnsentItems
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.01] hover:shadow-lg shadow-emerald-200'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{hasUnsentItems ? 'Place Order (ऑर्डर भेजें)' : 'Order is Cooking'}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 mt-auto">
            {/* Paper Size Quick Selection Bar */}
            <div className="flex items-center justify-between bg-[#f8fafc] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs select-none">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-indigo-600" /> Paper Size:
              </span>
              <div className="flex space-x-1 bg-slate-200/60 p-0.5 rounded-md border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setPaperSizeSetting('58mm');
                    localStorage.setItem('bitespeed_print_paper_size', '58mm');
                  }}
                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded cursor-pointer transition-all ${
                    paperSizeSetting === '58mm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  58 mm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setPaperSizeSetting('80mm');
                    localStorage.setItem('bitespeed_print_paper_size', '80mm');
                  }}
                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded cursor-pointer transition-all ${
                    paperSizeSetting === '80mm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  80 mm
                </button>
              </div>
            </div>

            <div id="pos-billing-actions-grid" className="grid grid-cols-2 gap-2">
              {/* Send KOT Button */}
              <button
                id="btn-fire-kot"
                type="button"
                onClick={handleFireKOTClick}
                disabled={cart.length === 0}
                className={`flex items-center justify-center space-x-1 py-2.5 rounded-xl border font-bold text-xs uppercase cursor-pointer transition-all ${
                  cart.length === 0 
                    ? 'opacity-40 bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                    : hasUnsentItems 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-xs' 
                    : 'bg-gray-100 border-gray-200 text-slate-500'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>{hasUnsentItems ? 'Print KOT' : 'KOT Fired'}</span>
              </button>

              {/* 1-Click Direct Thermal Print */}
              <button
                id="checkout-direct-print"
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  if (cart.length === 0) return;
                  const orderObj = handleSaveDraft('billed');
                  if (orderObj) {
                    const effectiveWaiterName = waiter !== 'Self' ? waiter : (activeOrder?.currentWaiter || table.currentWaiter || 'Counter Staff');
                    const billPayload: EstimateBill = {
                      id: orderObj.id,
                      orderId: orderObj.id,
                      billNumber: `INV-${Date.now().toString().slice(-6)}`,
                      type: 'invoice',
                      customerName: customerName.trim() || 'Walk-in Guest',
                      customerPhone: customerPhone.trim(),
                      tableName: table.name,
                      orderType: table.id.startsWith('takeaway') ? 'takeaway' : table.id.startsWith('delivery') ? 'delivery' : 'dine-in',
                      items: cart,
                      subtotal,
                      discountAmount,
                      taxAmount,
                      serviceChargeAmount,
                      deliveryCharge: isDelivery ? deliveryCharge : 0,
                      grandTotal,
                      createdAt: orderObj.createdAt || new Date().toISOString(),
                      paymentMethod: selectedPaymentMethod.toUpperCase(),
                      currentWaiter: effectiveWaiterName
                    };
                    if (onSaveBill) {
                      onSaveBill(billPayload);
                    }
                    printThermalBill(billPayload, false, paperSizeSetting, () => {
                      setPrinterNotConnectedModal(true);
                    });
                  }
                }}
                disabled={cart.length === 0}
                className="flex items-center justify-center space-x-1 py-2.5 rounded-xl border border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              {/* Due & Vacate (If Customer Selected) */}
              <button
                id="checkout-due-vacate"
                type="button"
                disabled={cart.length === 0 || !isCustomerSelected}
                onClick={() => {
                  soundEffects.playTick();
                  if (cart.length === 0) return;
                  if (hasUnsentItems) {
                    handleFireKOTClick();
                  }
                  const isSettled = handleSettleOrder('due');
                  if (isSettled) {
                    onBack();
                  }
                }}
                className={`flex items-center justify-center space-x-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border ${
                  !isCustomerSelected || cart.length === 0
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                    : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-sm'
                }`}
                title={!isCustomerSelected ? 'Select registered customer to enable Due Billing' : 'Save Due to CRM & Vacate Table'}
              >
                <Clock className="w-4 h-4" />
                <span>Due & Vacate</span>
              </button>

              {/* Done & Vacate Table */}
              <button
                id="checkout-settle-vacate"
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  if (cart.length === 0) return;
                  const isSettled = handleSettleOrder(selectedPaymentMethod);
                  if (isSettled) {
                    onBack();
                  }
                }}
                disabled={cart.length === 0}
                className="flex items-center justify-center space-x-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-md transition-all cursor-pointer border-none"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Done & Vacate</span>
              </button>

              <button
                id="btn-cancel-seat"
                type="button"
                onClick={onBack}
                className="col-span-2 text-center py-1 text-[11px] text-gray-400 hover:text-red-500 font-bold transition-all cursor-pointer"
              >
                Dismiss Terminal View
              </button>
            </div>
        </div>
      )}
    </div>

      {/* Dynamic Thermal Bill Receipt Mockup Modal (Print Estimate / Invoice View) */}
      {printModalVisible && (
        <div id="receipt-print-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
          <div id="thermal-paper-mockup" className="bg-white text-slate-900 rounded-xl p-5 max-w-[380px] w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Heading (Not Printed) */}
            <div id="modal-heading-controls" className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 mb-3 gap-2 print:hidden">
              <div className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-500">
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>SLIP SIMULATOR</span>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                <div id="thermal-printtype-toggle-group" className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setPrintType('estimate');
                    }}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${printType === 'estimate' ? 'bg-white shadow-xs text-indigo-750 font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Estimate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setPrintType('invoice');
                    }}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${printType === 'invoice' ? 'bg-white shadow-xs text-indigo-750 font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Invoice
                  </button>
                </div>
                <button
                  id="close-print-modal"
                  onClick={() => setPrintModalVisible(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-xs bg-slate-100 px-2 py-1 rounded-md border border-slate-250 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Simulated Thermal Receipt Panel */}
            <div id="printable-receipt-card" className="flex-1 overflow-y-auto pr-1 bg-white border border-slate-100 shadow-inner p-4 font-mono text-xs text-slate-800 flex flex-col justify-between whitespace-pre-wrap leading-relaxed">
              
              {/* Receipt Content for Window Printing */}
              <div id="printable-slip-body" className="print:block">
                
                {/* Header */}
                {(() => {
                  const printConf = getPrinterConfig();
                  return (
                    <div className="text-center space-y-1 mb-4">
                      {printConf.profilePic && (
                        <div className="flex justify-center mb-1.5">
                          <img src={printConf.profilePic} alt="Logo" className="max-h-10 max-w-[100px] object-contain grayscale" />
                        </div>
                      )}
                      <h3 className="font-bold text-base uppercase tracking-wider text-slate-950">{printConf.title}</h3>
                      {printConf.address && <p className="text-[10px] text-slate-500">{printConf.address}</p>}
                      <p className="text-[10px] text-slate-500">{printConf.gstin ? `GSTIN: ${printConf.gstin} • ` : ''}Tel: {printConf.contact}</p>
                      {printConf.foodLicenseNo && (
                        <p className="text-[10px] text-slate-500 font-bold">FSSAI Lic No: {printConf.foodLicenseNo}</p>
                      )}
                      <div className="border-t border-dashed border-slate-350 my-2"></div>
                    </div>
                  );
                })()}
                
                <h4 className="font-bold text-sm bg-neutral-100 dark:bg-neutral-100 text-neutral-900 py-1 tracking-widest">
                  {printType === 'estimate' ? 'ESTIMATE SLIP (PRO-FORMA)' : 'FINAL TAX INVOICE'}
                </h4>
                <p className="text-[9px] text-slate-500">No: {printType === 'estimate' ? `EST-${Date.now().toString().slice(-6)}` : `INV-${Date.now().toString().slice(-6)}`}</p>

                {/* Meta details */}
                <div className="space-y-1 my-3 text-[10px]">
                  <div className="flex justify-between">
                    <span>DATE: {new Date().toLocaleDateString()}</span>
                    <span>TIME: {new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase">TYPE: {table.id.includes('takeaway') ? 'TAKEAWAY' : table.id.includes('delivery') ? 'DELIVERY' : 'DINE IN'}</span>
                    <span className="font-bold">TABLE: {table.name}</span>
                  </div>
                  {waiter && (
                    <div className="flex justify-between">
                      <span>STATION WAITER: {waiter}</span>
                    </div>
                  )}
                  {customerName && (
                    <div className="border-t border-dashed border-slate-200 pt-1 mt-1">
                      <p>CUST: {customerName}</p>
                      {customerPhone && <p>PHONE: {customerPhone}</p>}
                    </div>
                  )}
                </div>

                {/* Items grid border */}
                <div className="border-t border-b border-dashed border-slate-600 py-1.5 my-2">
                  <div className="grid grid-cols-12 font-bold text-[10px] gap-1">
                    <span className="col-span-6 text-left">ITEM</span>
                    <span className="col-span-2 text-center">QTY</span>
                    <span className="col-span-2 text-right">RATE</span>
                    <span className="col-span-2 text-right">TOTAL</span>
                  </div>
                </div>

                {/* cart loop */}
                <div className="space-y-2 border-b border-dashed border-slate-600 pb-2">
                  {cart.map((item) => (
                    <div key={item.menuItemId} className="grid grid-cols-12 text-[10px] gap-1 tracking-tight text-neutral-900">
                      <div className="col-span-6 text-left flex flex-col font-bold">
                        <span>{item.name}</span>
                        <span className="text-[8px] font-normal text-slate-400 font-mono">GST: {item.gstRate !== undefined ? item.gstRate : 5}%</span>
                        {item.notes && <span className="text-[8px] italic text-slate-500 font-normal">*{item.notes}</span>}
                      </div>
                      <span className="col-span-2 text-center">{item.quantity}</span>
                      <span className="col-span-2 text-right">₹{item.price}</span>
                      <span className="col-span-2 text-right">₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="space-y-1.5 my-3 text-[10px] text-right">
                  <div className="flex justify-between">
                    <span>Cart Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-teal-700">
                      <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'}):</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>CGST ({(subtotal - discountAmount > 0 ? (taxAmount / (subtotal - discountAmount)) * 50 : 0).toFixed(1)}%):</span>
                    <span>₹{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST ({(subtotal - discountAmount > 0 ? (taxAmount / (subtotal - discountAmount)) * 50 : 0).toFixed(1)}%):</span>
                    <span>₹{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Svc Charge ({serviceChargeRate}%):</span>
                    <span>₹{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                  {isDelivery && deliveryCharge > 0 && (
                    <div className="flex justify-between font-bold text-amber-800">
                      <span>Delivery Charge:</span>
                      <span>₹{deliveryCharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs text-slate-950 border-t border-black pt-1.5">
                    <span>NET GRAND TOTAL:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="text-center font-bold text-[9px] mt-6 space-y-1">
                  <p>THANK YOU FOR DINING WITH US!</p>
                  <p className="text-[8px] font-normal text-slate-500">Visit bite-speed.com/feedback</p>
                  <p className="text-[7px] text-slate-400 font-normal mt-2">BiteSpeed POS Engine v1.2</p>
                </div>
              </div>
            </div>

            {/* Print trigger Actions inside browser */}
            <div id="print-modal-foot" className="gp-4 border-t border-slate-200 pt-3 mt-3 flex flex-col gap-2.5 print:hidden text-left">
              
              {/* 1. Payment Method Pre-Selector */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold text-slate-450 uppercase tracking-wider block text-center">Select Payment Method:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setSelectedPaymentMethod('cash');
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold border cursor-pointer text-center transition-all ${
                      selectedPaymentMethod === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-205 hover:bg-slate-100'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setSelectedPaymentMethod('upi');
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold border cursor-pointer text-center transition-all ${
                      selectedPaymentMethod === 'upi'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-205 hover:bg-slate-100'
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setSelectedPaymentMethod('card');
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold border cursor-pointer text-center transition-all ${
                      selectedPaymentMethod === 'card'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-205 hover:bg-slate-100'
                    }`}
                  >
                    Card
                  </button>
                  <button
                    type="button"
                    disabled={!isCustomerSelected}
                    onClick={() => {
                      soundEffects.playTick();
                      setSelectedPaymentMethod('due');
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold border cursor-pointer text-center transition-all ${
                      !isCustomerSelected
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                        : selectedPaymentMethod === 'due'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-205 hover:bg-slate-100'
                    }`}
                    title={!isCustomerSelected ? "Please select a registered customer to allow dues" : "Select Due"}
                  >
                    Due
                  </button>
                </div>
              </div>

              {/* Active Printer Driver Info Banner */}
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] my-1">
                <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-200">
                  <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-bold">Active Printer: {(localStorage.getItem('bitespeed_printer_driver') || 'System Thermal').toUpperCase()}</span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">Configured in Settings</span>
              </div>

              {/* Direct Thermal Print buttons */}
              <div className="grid grid-cols-2 gap-2 my-1">
                <button
                  id="btn-actual-device-direct-print"
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    const activeDriver = (localStorage.getItem('bitespeed_printer_driver') as any) || 'system';
                    handleThermalPrint(activeDriver);
                  }}
                  className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold font-sans flex items-center justify-center space-x-1.5 border-none cursor-pointer shadow-sm"
                  title="Direct Thermal Print to Configured Printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Direct Print Invoice</span>
                </button>
                <button
                  id="btn-actual-device-print-sys"
                  type="button"
                  onClick={printSlip}
                  className="py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-[11px] font-bold font-sans flex items-center justify-center space-x-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="System browser print dialog"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Browser Print</span>
                </button>
              </div>

              {/* 4. WhatsApp Sharing Action */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-2 border-none cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
                </svg>
                <span>Share to WhatsApp</span>
              </button>

              {/* 5. Clear table and Settle button */}
              <div className="pt-1.5">
                <button
                  id="btn-complete-settle-vacant"
                  onClick={() => {
                    handleSettleOrder(selectedPaymentMethod);
                    setPrintModalVisible(false);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer border-none flex items-center justify-center space-x-1.5 font-sans"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Settle Order & Vacant Table</span>
                </button>
              </div>

              <button
                id="btn-dismiss-slip"
                onClick={() => setPrintModalVisible(false)}
                className="w-full text-center py-2 text-xs text-slate-500 hover:text-slate-800 font-mono"
              >
                Hold and Return
              </button>
            </div>
          </div>
        </div>
      )}

      {orderPlacedSuccess && (
        <div id="order-success-modal-overlay" className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-250">
              <CheckSquare className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-sans">
              Order Placed! (ऑर्डर भेजा गया)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-sans">
              Your order has been sent straight to the chef in the kitchen! It is now being freshly prepared. Table: <span className="font-bold text-slate-800 dark:text-slate-250">{table.name}</span>.
            </p>
            <button
              onClick={() => {
                soundEffects.playTick();
                setOrderPlacedSuccess(false);
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer font-sans"
            >
              Back to Menu (मेन्यू पर वापस जाएं)
            </button>
          </div>
        </div>
      )}

      {showAddCustomerModal && (
        <div id="add-customer-modal-overlay" className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative select-text">
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold border-none bg-transparent"
            >
              ✕
            </button>
            <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-400 mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Add New Customer</span>
            </h3>
            <form onSubmit={handleAddNewCustomerSubmit} className="space-y-3 font-sans text-xs">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-450 uppercase pl-0.5">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-indigo-500 transition-all font-semibold outline-none"
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-455 uppercase pl-0.5">Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 focus:border-indigo-500 transition-all font-semibold font-mono outline-none"
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-455 uppercase pl-0.5">Email</label>
                <input
                  type="email"
                  placeholder="e.g. vikram@mail.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-indigo-500 transition-all font-semibold outline-none"
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-455 uppercase pl-0.5">Date of Birth</label>
                <input
                  type="date"
                  value={newCustDob}
                  onChange={(e) => setNewCustDob(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-indigo-500 transition-all font-semibold font-mono outline-none"
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-455 uppercase pl-0.5">Notes / Preferences</label>
                <textarea
                  placeholder="e.g. Prefers low spice, VIP customer"
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-indigo-500 transition-all font-semibold h-16 resize-none outline-none"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-all border-none"
                >
                  Save & Select
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg font-semibold cursor-pointer transition-all border-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printerNotConnectedModal && (
        <div id="printer-not-connected-overlay" className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Printer className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800 dark:text-white">Printer Not Connected</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The thermal receipt printer could not be reached. Please check printer power and connection.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setPrinterNotConnectedModal(false);
                  connectBluetoothPrinterSession();
                }}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer border-none"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setPrinterNotConnectedModal(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer border-none"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
