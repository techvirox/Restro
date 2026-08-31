import { useState, useEffect, useMemo } from 'react';
import { MenuItem, Table, TableOrder, OrderItem, KOT, EstimateBill, KOTItem, BillSeries, Customer, OperatingExpense } from './types';
import { Sidebar } from './components/Sidebar';
import { TableView } from './components/TableView';
import { PosTerminal } from './components/PosTerminal';
import { KotView } from './components/KotView';
import { BillingEstimator } from './components/BillingEstimator';
import { MenuSettings } from './components/MenuSettings';
import { DishCostCalculator } from './components/DishCostCalculator';
import { ReportsView } from './components/ReportsView';
import { DashboardView } from './components/DashboardView';
import { CrmView } from './components/CrmView';
import { ExpensesView } from './components/ExpensesView';
import { PrinterSettings } from './components/PrinterSettings';
import { soundEffects } from './components/SoundUtility';
import { 
  INITIAL_MENU, 
  INITIAL_TABLES, 
  INITIAL_ORDERS, 
  INITIAL_KOTS, 
  INITIAL_BILLS,
  INITIAL_BILL_SERIES,
  INITIAL_CUSTOMERS
} from './initialData';
import { motion } from 'motion/react';
import { WaitersView, Waiter } from './components/WaitersView';
import { ThermalSettlementModal } from './components/ThermalSettlementModal';
import { LoginScreen } from './components/LoginScreen';
import { ProfileView } from './components/ProfileView';
import { SubscriptionOverlay } from './components/SubscriptionOverlay';
import { AdminDashboard } from './components/AdminDashboard';
import { SupportTicketModal } from './components/SupportTicketModal';
import { api, getWsUrl } from './services/api';
import { 
  Tv, 
  Wifi, 
  HelpCircle, 
  Smartphone, 
  RefreshCw, 
  AlertTriangle, 
  LogOut,
  Maximize2,
  Sun,
  Moon,
  ChefHat
} from 'lucide-react';
import { ThemeSelector, ColorTheme, CustomThemeConfig } from './components/ThemeSelector';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('rio_restro_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('rio_restro_color_theme');
    const validThemes = ['indigo', 'emerald', 'amber', 'violet', 'obsidian', 'cyberpunk', 'gold', 'crimson', 'rose', 'nordic', 'custom'];
    return (saved && validThemes.includes(saved)) ? (saved as ColorTheme) : 'indigo';
  });

  const [customThemeConfig, setCustomThemeConfig] = useState<CustomThemeConfig>(() => {
    const saved = localStorage.getItem('rio_restro_custom_theme');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { primaryColor: '#3b82f6', secondaryColor: '#8b5cf6' };
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', colorTheme);

    if (colorTheme === 'custom' && customThemeConfig) {
      const root = document.documentElement;
      root.style.setProperty('--accent-primary', customThemeConfig.primaryColor);
      root.style.setProperty('--accent-secondary', customThemeConfig.secondaryColor);
      root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${customThemeConfig.primaryColor} 0%, ${customThemeConfig.secondaryColor} 100%)`);
      root.style.setProperty('--accent-bg-soft', `${customThemeConfig.primaryColor}14`);
      root.style.setProperty('--accent-border-soft', `${customThemeConfig.primaryColor}33`);
      root.style.setProperty('--accent-glow', `0 0 20px ${customThemeConfig.primaryColor}55`);
      root.style.setProperty('--theme-text-accent', customThemeConfig.primaryColor);
    } else {
      const root = document.documentElement;
      root.style.removeProperty('--accent-primary');
      root.style.removeProperty('--accent-secondary');
      root.style.removeProperty('--accent-gradient');
      root.style.removeProperty('--accent-bg-soft');
      root.style.removeProperty('--accent-border-soft');
      root.style.removeProperty('--accent-glow');
      root.style.removeProperty('--theme-text-accent');
    }

    localStorage.setItem('rio_restro_theme', theme);
    localStorage.setItem('rio_restro_color_theme', colorTheme);
    localStorage.setItem('rio_restro_custom_theme', JSON.stringify(customThemeConfig));
  }, [theme, colorTheme, customThemeConfig]);

  const handleColorThemeChange = (newTheme: ColorTheme, config?: CustomThemeConfig) => {
    if (config) {
      setCustomThemeConfig(config);
    }
    setColorTheme(newTheme);
  };

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('rio_restro_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);

  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);

  const [orders, setOrders] = useState<TableOrder[]>(INITIAL_ORDERS);

  const [kots, setKots] = useState<KOT[]>(INITIAL_KOTS);

  const [bills, setBills] = useState<EstimateBill[]>(INITIAL_BILLS);

  const [billSeries, setBillSeries] = useState<BillSeries[]>(INITIAL_BILL_SERIES);

  const INITIAL_WAITERS: Waiter[] = [
    { id: 'w1', name: 'Rajesh M.', phone: '9876543215', status: 'active', commissionRate: 5.0, rating: 4.8, joiningDate: '2026-01-15' },
    { id: 'w2', name: 'Sonia K.', phone: '9812345670', status: 'active', commissionRate: 4.5, rating: 4.5, joiningDate: '2026-02-10' },
    { id: 'w3', name: 'Amit Verma', phone: '9123456789', status: 'active', commissionRate: 5.0, rating: 4.2, joiningDate: '2026-03-01' },
    { id: 'w4', name: 'Vikram Singh', phone: '9988776655', status: 'active', commissionRate: 4.0, rating: 4.0, joiningDate: '2026-04-12' },
  ];

  const [waiters, setWaiters] = useState<Waiter[]>(INITIAL_WAITERS);

  const [inventoryThreshold, setInventoryThreshold] = useState<number>(5);

  // CRM & Customer Profiles database state
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);

  // WebSocket Connection State
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Operating Expenses state
  const [operatingExpenses, setOperatingExpenses] = useState<OperatingExpense[]>(() => {
    return [
      { id: 'exp1', description: 'Monthly Commercial Space Rent', category: 'Rent', amount: 35000, date: new Date().toISOString().split('T')[0] },
      { id: 'exp2', description: 'Chef & Kitchen Staff Salaries', category: 'Salaries', amount: 65000, date: new Date().toISOString().split('T')[0] },
      { id: 'exp3', description: 'Commercial Cooking Gas (LPG Cylinders)', category: 'Utilities', amount: 8400, date: new Date().toISOString().split('T')[0] },
      { id: 'exp4', description: 'Electricity & Water Bill (Restaurant Load)', category: 'Utilities', amount: 12500, date: new Date().toISOString().split('T')[0] },
      { id: 'exp5', description: 'Social Media & Google Maps Promotion', category: 'Marketing', amount: 4500, date: new Date().toISOString().split('T')[0] },
    ];
  });

  // Feature Toggles state
  const [featureToggles, setFeatureToggles] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('bitespeed_feature_toggles');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      billing: true,
      crm: true,
      expenses: true,
      reports: true,
      analytics: true,
      inventory: true,
      tables: true,
      bluetoothPrinting: true,
      duePayments: true,
      advancedReports: true,
      staffManagement: true,
      customerManagement: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('bitespeed_feature_toggles', JSON.stringify(featureToggles));
  }, [featureToggles]);

  // System Announcements state
  const [systemMessages, setSystemMessages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('bitespeed_system_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('bitespeed_system_messages', JSON.stringify(systemMessages));
  }, [systemMessages]);

  // Support Tickets state
  const [supportTickets, setSupportTickets] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('bitespeed_support_tickets');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('bitespeed_support_tickets', JSON.stringify(supportTickets));
  }, [supportTickets]);

  // Bill Audit Logs state
  const [billAuditLogs, setBillAuditLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('bitespeed_bill_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('bitespeed_bill_audit_logs', JSON.stringify(billAuditLogs));
  }, [billAuditLogs]);

  // Customer Due Payments state
  const [duePayments, setDuePayments] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('bitespeed_due_payments');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('bitespeed_due_payments', JSON.stringify(duePayments));
  }, [duePayments]);

  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Guest Table Scan details
  const [guestTableId, setGuestTableId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const tParam = urlParams.get('table');
      if (tParam) {
        localStorage.setItem('bitespeed_customer_table_id', tParam);
        return tParam;
      }
    }
    // Only fall back to localStorage guest mode if there is no logged-in admin/staff user
    const hasUser = localStorage.getItem('rio_restro_current_user');
    if (hasUser) return null;
    return localStorage.getItem('bitespeed_customer_table_id');
  });

  const [guestTenantId, setGuestTenantId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const tenParam = urlParams.get('tenantId');
      if (tenParam) {
        localStorage.setItem('bitespeed_customer_tenant_id', tenParam);
        return tenParam;
      }
    }
    // Only fall back to localStorage guest mode if there is no logged-in admin/staff user
    const hasUser = localStorage.getItem('rio_restro_current_user');
    if (hasUser) return null;
    return localStorage.getItem('bitespeed_customer_tenant_id');
  });

  // Sync to API or LocalStorage
  useEffect(() => {
    if (currentUser && !currentUser.isDemo) {
      api.setTenantId(currentUser.tenantId);
    } else if (guestTenantId) {
      api.setTenantId(guestTenantId);
    } else if (guestTableId) {
      // Fallback to 'demo' if table QR has no tenantId parameter
      api.setTenantId('demo');
    } else {
      api.setTenantId(null);
    }

    if (currentUser?.tenant) {
      if (currentUser.tenant.clinicName) {
        localStorage.setItem('bitespeed_printer_title', currentUser.tenant.clinicName);
      }
      if (currentUser.tenant.address) {
        localStorage.setItem('bitespeed_printer_address', currentUser.tenant.address);
      }
      if (currentUser.tenant.contactNumber) {
        localStorage.setItem('bitespeed_printer_contact', currentUser.tenant.contactNumber);
      }
      if (currentUser.tenant.gstin) {
        localStorage.setItem('bitespeed_printer_gstin', currentUser.tenant.gstin);
      }
    }
  }, [currentUser, guestTenantId, guestTableId]);

  // Load data from DB if real user or guest table session active
  const [loadingDb, setLoadingDb] = useState(false);
  useEffect(() => {
    const shouldLoadFromDb = (currentUser && !currentUser.isDemo) || (!!guestTableId && !!guestTenantId && guestTenantId !== 'demo');
    if (shouldLoadFromDb) {
      const loadData = async () => {
        setLoadingDb(true);
        try {
          const [dbMenu, dbTables, dbOrders, dbKots, dbBills, dbBillSeries, dbWaiters, dbCustomers, dbExpenses] = await Promise.all([
            api.getMenu().catch(() => INITIAL_MENU),
            api.getTables().catch(() => INITIAL_TABLES),
            api.getOrders().catch(() => []),
            api.getKots().catch(() => []),
            api.getBills().catch(() => []),
            api.getBillSeries().catch(() => INITIAL_BILL_SERIES),
            api.getWaiters().catch(() => INITIAL_WAITERS),
            api.getCustomers().catch(() => INITIAL_CUSTOMERS),
            api.getExpenses().catch(() => []),
          ]);
          setMenu(dbMenu);
          setTables(dbTables);
          setOrders(dbOrders);
          setKots(dbKots);
          setBills(dbBills);
          setBillSeries(dbBillSeries);
          setWaiters(dbWaiters);
          setCustomers(dbCustomers);
          setOperatingExpenses(dbExpenses);
        } catch (e) {
          console.error("Error loading data from database:", e);
        } finally {
          setLoadingDb(false);
        }
      };
      loadData();
    }
  }, [currentUser, guestTableId, guestTenantId]);

  // WebSocket Real-time updates handler
  useEffect(() => {
    const tenantId = (currentUser && !currentUser.isDemo) 
      ? currentUser.tenantId 
      : (guestTenantId || 'demo');

    // Only establish WebSocket if not in demo mode
    const isDemo = currentUser?.isDemo;
    if (isDemo) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;
    let reconnectDelay = 3000;

    const connectWs = () => {
      if (!isMounted) return;
      try {
        const wsUrl = `${getWsUrl()}?tenantId=${tenantId}`;
        console.log(`🔌 Connecting WebSocket: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log(`⚡ WebSocket connected successfully for tenant: ${tenantId}`);
          reconnectDelay = 3000; // Reset reconnect delay on success
          setIsWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log(`📥 WebSocket event received:`, message.type);

            switch (message.type) {
              case 'ORDER_SAVED': {
                const updatedOrder = message.data;
                setOrders(prev => {
                  if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
                    return prev.filter(o => o.id !== updatedOrder.id);
                  }
                  const idx = prev.findIndex(o => o.id === updatedOrder.id);
                  if (idx !== -1) {
                    return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
                  } else {
                    return [...prev, updatedOrder];
                  }
                });
                break;
              }
              case 'KOT_SAVED': {
                const updatedKot = message.data;
                setKots(prev => {
                  const idx = prev.findIndex(k => k.id === updatedKot.id);
                  if (idx !== -1) {
                    return prev.map(k => k.id === updatedKot.id ? updatedKot : k);
                  } else {
                    // Play Success Chime for new KOT arrival!
                    soundEffects.playSuccessChime();
                    return [updatedKot, ...prev];
                  }
                });
                break;
              }
              case 'BILL_SAVED': {
                const newBill = message.data;
                setBills(prev => {
                  const exists = prev.some(b => b.id === newBill.id);
                  if (exists) return prev;
                  return [newBill, ...prev];
                });
                break;
              }
              case 'TABLE_SAVED': {
                const updatedTable = message.data;
                setTables(prev => {
                  const idx = prev.findIndex(t => t.id === updatedTable.id);
                  if (idx !== -1) {
                    return prev.map(t => t.id === updatedTable.id ? updatedTable : t);
                  } else {
                    return [...prev, updatedTable];
                  }
                });
                break;
              }
              case 'TABLE_DELETED': {
                const tableId = message.id;
                setTables(prev => prev.filter(t => t.id !== tableId));
                break;
              }
              case 'WAITER_SAVED': {
                const updatedWaiter = message.data;
                setWaiters(prev => {
                  const idx = prev.findIndex(w => w.id === updatedWaiter.id);
                  if (idx !== -1) {
                    return prev.map(w => w.id === updatedWaiter.id ? updatedWaiter : w);
                  } else {
                    return [...prev, updatedWaiter];
                  }
                });
                break;
              }
              case 'WAITER_DELETED': {
                const waiterId = message.id;
                setWaiters(prev => prev.filter(w => w.id !== waiterId));
                break;
              }
              case 'MENU_ITEM_SAVED': {
                const updatedItem = message.data;
                setMenu(prev => {
                  const idx = prev.findIndex(m => m.id === updatedItem.id);
                  if (idx !== -1) {
                    return prev.map(m => m.id === updatedItem.id ? updatedItem : m);
                  } else {
                    return [...prev, updatedItem];
                  }
                });
                break;
              }
              case 'MENU_ITEM_DELETED': {
                const itemId = message.id;
                setMenu(prev => prev.filter(m => m.id !== itemId));
                break;
              }
              case 'MENU_RESET': {
                api.getMenu().then(setMenu).catch(err => console.error(err));
                api.getTables().then(setTables).catch(err => console.error(err));
                api.getOrders().then(setOrders).catch(err => console.error(err));
                api.getKots().then(setKots).catch(err => console.error(err));
                api.getBills().then(setBills).catch(err => console.error(err));
                break;
              }
              case 'BILL_SERIES_SAVED': {
                const updatedSeries = message.data;
                setBillSeries(updatedSeries);
                break;
              }
              default:
                break;
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        socket.onclose = () => {
          console.log(`🔌 WebSocket connection closed. Reconnecting in ${reconnectDelay / 1000}s...`);
          setIsWsConnected(false);
          if (isMounted) {
            reconnectTimeout = setTimeout(connectWs, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 1.5, 30000); // Exponential backoff up to 30s
          }
        };

        socket.onerror = (err) => {
          console.error(`❌ WebSocket error:`, err);
          setIsWsConnected(false);
          if (socket) socket.close();
        };

      } catch (e) {
        console.error('Error starting WebSocket connection:', e);
        setIsWsConnected(false);
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWs, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      setIsWsConnected(false);
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [currentUser, guestTenantId]);

  // HTTP Polling fallback if WebSocket is offline/disconnected
  useEffect(() => {
    if (isWsConnected) return;

    const isDemo = currentUser?.isDemo;
    if (isDemo) return;

    const shouldLoadFromDb = (currentUser && !currentUser.isDemo) || (!!guestTableId && !!guestTenantId && guestTenantId !== 'demo');
    if (!shouldLoadFromDb) return;

    const pollData = async () => {
      try {
        console.log("🔄 WebSocket offline: Polling latest data from database...");
        const [dbMenu, dbTables, dbOrders, dbKots, dbBills, dbBillSeries, dbWaiters, dbCustomers, dbExpenses] = await Promise.all([
          api.getMenu().catch(() => null),
          api.getTables().catch(() => null),
          api.getOrders().catch(() => null),
          api.getKots().catch(() => null),
          api.getBills().catch(() => null),
          api.getBillSeries().catch(() => null),
          api.getWaiters().catch(() => null),
          api.getCustomers().catch(() => null),
          api.getExpenses().catch(() => null),
        ]);
        
        if (dbMenu) setMenu(dbMenu);
        if (dbTables) setTables(dbTables);
        if (dbOrders) setOrders(dbOrders);
        if (dbKots) setKots(dbKots);
        if (dbBills) setBills(dbBills);
        if (dbBillSeries) setBillSeries(dbBillSeries);
        if (dbWaiters) setWaiters(dbWaiters);
        if (dbCustomers) setCustomers(dbCustomers);
        if (dbExpenses) setOperatingExpenses(dbExpenses);
      } catch (err) {
        console.error("HTTP Polling fallback database sync error:", err);
      }
    };

    // Poll every 10 seconds to keep UI fresh and reactive while WebSocket is down
    const interval = setInterval(pollData, 10000);

    return () => clearInterval(interval);
  }, [isWsConnected, currentUser, guestTableId, guestTenantId]);

  const handleAddCustomer = (newCust: Omit<Customer, 'id' | 'lifetimeSpend' | 'orderCount' | 'createdAt'>) => {
    const freshCust: Customer = {
      ...newCust,
      id: `cust-${Date.now()}`,
      lifetimeSpend: 0,
      orderCount: 0,
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [freshCust, ...prev]);
    if (currentUser && !currentUser.isDemo) {
      api.addCustomer(freshCust).catch(err => console.error("Error adding customer:", err));
    }
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCust.id ? updatedCust : c));
    if (currentUser && !currentUser.isDemo) {
      api.updateCustomer(updatedCust.id, updatedCust).catch(err => console.error("Error updating customer:", err));
    }
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (currentUser && !currentUser.isDemo) {
      api.deleteCustomer(id).catch(err => console.error("Error deleting customer:", err));
    }
  };

  const handleImportCustomers = async (importedData: Omit<Customer, 'id' | 'createdAt'>[]) => {
    if (currentUser && !currentUser.isDemo) {
      for (const item of importedData) {
        const cleanPhone = item.phone.trim().replace(/\D/g, '');
        if (!cleanPhone) continue;
        const matched = customers.find(c => c.phone.trim().replace(/\D/g, '') === cleanPhone);
        if (matched) {
          const updated = {
            ...matched,
            name: item.name && item.name.trim() !== '' ? item.name.trim() : matched.name,
            email: item.email && item.email.trim() !== '' ? item.email.trim() : matched.email,
            dob: item.dob && item.dob.trim() !== '' ? item.dob.trim() : matched.dob,
            notes: item.notes && item.notes.trim() !== '' 
              ? (matched.notes && matched.notes.trim() !== '' 
                  ? `${matched.notes} | ${item.notes.trim()}` 
                  : item.notes.trim()) 
              : matched.notes,
            lifetimeSpend: matched.lifetimeSpend + (item.lifetimeSpend || 0),
            orderCount: matched.orderCount + (item.orderCount || 0)
          };
          setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
          await api.updateCustomer(updated.id, updated).catch(err => console.error(err));
        } else {
          const newCust: Customer = {
            id: `cust-import-${Date.now()}-${Math.floor(Math.random() * 10500)}`,
            name: item.name && item.name.trim() !== '' ? item.name.trim() : 'Imported Guest',
            phone: item.phone.trim(),
            email: item.email && item.email.trim() !== '' ? item.email.trim() : undefined,
            dob: item.dob && item.dob.trim() !== '' ? item.dob.trim() : undefined,
            lifetimeSpend: item.lifetimeSpend || 0,
            orderCount: item.orderCount || 0,
            createdAt: new Date().toISOString(),
            notes: item.notes && item.notes.trim() !== '' ? item.notes.trim() : undefined
          };
          setCustomers(prev => [newCust, ...prev]);
          await api.addCustomer(newCust).catch(err => console.error(err));
        }
      }
    } else {
      setCustomers(prev => {
        const updatedList = [...prev];
        importedData.forEach(item => {
          const cleanPhone = item.phone.trim().replace(/\D/g, '');
          if (!cleanPhone) return;
          
          const matchIdx = updatedList.findIndex(c => c.phone.trim().replace(/\D/g, '') === cleanPhone);
          
          if (matchIdx !== -1) {
            const existing = updatedList[matchIdx];
            updatedList[matchIdx] = {
              ...existing,
              name: item.name && item.name.trim() !== '' ? item.name.trim() : existing.name,
              email: item.email && item.email.trim() !== '' ? item.email.trim() : existing.email,
              dob: item.dob && item.dob.trim() !== '' ? item.dob.trim() : existing.dob,
              notes: item.notes && item.notes.trim() !== '' 
                ? (existing.notes && existing.notes.trim() !== '' 
                    ? `${existing.notes} | ${item.notes.trim()}` 
                    : item.notes.trim()) 
                : existing.notes,
              lifetimeSpend: existing.lifetimeSpend + (item.lifetimeSpend || 0),
              orderCount: existing.orderCount + (item.orderCount || 0)
            };
          } else {
            const newCust: Customer = {
              id: `cust-import-${Date.now()}-${Math.floor(Math.random() * 10500)}`,
              name: item.name && item.name.trim() !== '' ? item.name.trim() : 'Imported Guest',
              phone: item.phone.trim(),
              email: item.email && item.email.trim() !== '' ? item.email.trim() : undefined,
              dob: item.dob && item.dob.trim() !== '' ? item.dob.trim() : undefined,
              lifetimeSpend: item.lifetimeSpend || 0,
              orderCount: item.orderCount || 0,
              createdAt: new Date().toISOString(),
              notes: item.notes && item.notes.trim() !== '' ? item.notes.trim() : undefined
            };
            updatedList.unshift(newCust);
          }
        });
        return updatedList;
      });
    }
  };

  const registerOrUpdateCRMFromSale = (name: string, phone: string, totalAmount: number) => {
    if (!phone || phone.trim() === '' || phone.toLowerCase() === 'walk-in') return;
    
    const cleanPhone = phone.trim();
    setCustomers(prev => {
      const matchIdx = prev.findIndex(c => c.phone.trim().replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''));
      if (matchIdx !== -1) {
        const updated = prev.map((c, idx) => {
          if (idx === matchIdx) {
            const updatedCust = {
              ...c,
              name: name && name !== 'Loyal Guest' && name !== 'Walk-In' && name !== 'Walk-in' ? name : c.name,
              lifetimeSpend: c.lifetimeSpend + totalAmount,
              orderCount: c.orderCount + 1
            };
            if (currentUser && !currentUser.isDemo) {
              api.updateCustomer(updatedCust.id, updatedCust).catch(err => console.error("Error updating customer CRM:", err));
            }
            return updatedCust;
          }
          return c;
        });
        return updated;
      } else {
        const newCust: Customer = {
          id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: name || 'Loyal Guest',
          phone: cleanPhone,
          lifetimeSpend: totalAmount,
          orderCount: 1,
          createdAt: new Date().toISOString()
        };
        if (currentUser && !currentUser.isDemo) {
          api.addCustomer(newCust).catch(err => console.error("Error adding customer CRM:", err));
        }
        return [newCust, ...prev];
      }
    });
  };


  const handleAddExpense = (description: string, category: any, amount: number, date: string) => {
    const newExp: OperatingExpense = {
      id: 'exp_' + Date.now(),
      description,
      category,
      amount,
      date
    };
    setOperatingExpenses(prev => [...prev, newExp]);
    if (currentUser && !currentUser.isDemo) {
      api.addExpense(newExp).catch(err => console.error("Error adding expense:", err));
    }
  };

  const handleDeleteExpense = (id: string) => {
    setOperatingExpenses(prev => prev.filter(e => e.id !== id));
    if (currentUser && !currentUser.isDemo) {
      api.deleteExpense(id).catch(err => console.error("Error deleting expense:", err));
    }
  };

  // UI State toggles
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'tables' | 'kitchen' | 'billing' | 'settings' | 'calculator' | 'reports' | 'waiters' | 'crm' | 'printer-settings' | 'expenses' | 'profile'>('dashboard');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [settledReceipt, setSettledReceipt] = useState<EstimateBill | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  // Clock Update Effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto Table Selector from URL query parameters (for real customer scan-to-order)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        const tableParam = urlParams.get('table');
        if (tableParam) {
          const match = tables.find(t => 
            t.id.toLowerCase() === tableParam.toLowerCase() ||
            t.name.toLowerCase().replace(/\s+/g, '') === tableParam.toLowerCase().replace(/\s+/g, '')
          );
          if (match) {
            // Automatically switch current tab to Tables and pick the table, which opens the POS ordering screen
            setCurrentTab('tables');
            setSelectedTable(match);
            soundEffects.playSuccessChime();
            
            // Remove parameter from URL quietly to avoid re-triggering issues
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
          }
        }
      }
    } catch (e) {
      console.warn("Could not read URL query parameters or modify history state inside the sandboxed preview iframe:", e);
    }
  }, [tables]);

  // Role-based tab redirection enforcement
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'kot' && currentTab !== 'kitchen' && currentTab !== 'profile') {
        setCurrentTab('kitchen');
      } else if (currentUser.role === 'waiter' && currentTab !== 'tables' && currentTab !== 'crm' && currentTab !== 'profile') {
        setCurrentTab('tables');
      }
    }
  }, [currentUser, currentTab]);

  // Removed local storage sync effects to avoid conflicts and sandbox environment restrictions

  // Handlers for POS Flow
  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
  };

  const handleQuickCounterSale = (type: 'takeaway' | 'delivery') => {
    const virtualTableId = `${type}-${Date.now().toString().slice(-4)}`;
    const virtualTableName = type === 'takeaway' ? `Takeaway #${101 + Math.floor(Math.random() * 899)}` : `Delivery Outbound`;
    
    // Create direct Virtual Table
    const virtualTable: Table = {
      id: virtualTableId,
      name: virtualTableName,
      capacity: 1,
      status: 'ordering',
      activeOrderId: null,
      currentWaiter: 'Counter Quick'
    };

    setTables(prev => [...prev, virtualTable]);
    setSelectedTable(virtualTable);
  };

  const handleSaveOrder = (updatedOrder: TableOrder) => {
    let updatedTableObj: Table | null = null;
    // 1. Calculate and update parent Table Status dynamically
    setTables(prevTables => prevTables.map(t => {
      if (t.id === updatedOrder.tableId) {
        let tableStatus: Table['status'] = 'vacant';
        if (updatedOrder.status === 'billed') {
          tableStatus = 'billed';
        } else if (updatedOrder.status === 'cancelled' || updatedOrder.status === 'completed') {
          tableStatus = 'vacant';
        } else {
          const hasDraftItems = updatedOrder.items.some(it => it.quantity > it.sentToKitchenQty);
          tableStatus = hasDraftItems ? 'ordering' : 'kot_pending';
        }
        
        updatedTableObj = {
          ...t,
          status: tableStatus,
          activeOrderId: updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled' ? null : updatedOrder.id,
          currentWaiter: updatedOrder.currentWaiter || t.currentWaiter
        };

        if (((currentUser && !currentUser.isDemo) || (guestTableId && guestTenantId && guestTenantId !== 'demo')) && updatedTableObj) {
          api.updateTable(updatedTableObj.id, updatedTableObj).catch(err => console.error("Error updating table:", err));
        }

        return updatedTableObj;
      }
      return t;
    }));

    // 2. Insert or replace in Orders database
    setOrders(prevOrders => {
      const idx = prevOrders.findIndex(o => o.id === updatedOrder.id);
      if (idx !== -1) {
        return prevOrders.map((o, index) => index === idx ? updatedOrder : o);
      } else {
        return [...prevOrders, updatedOrder];
      }
    });

    if ((currentUser && !currentUser.isDemo) || (guestTableId && guestTenantId && guestTenantId !== 'demo')) {
      api.saveOrder(updatedOrder).catch(err => console.error("Error saving order:", err));
    }
  };

  const handleFireKOT = (newKOT: KOT) => {
    setKots(prev => [newKOT, ...prev]);
    if ((currentUser && !currentUser.isDemo) || (guestTableId && guestTenantId && guestTenantId !== 'demo')) {
      api.saveKot(newKOT).catch(err => console.error("Error saving KOT:", err));
    }
    
    // Auto-decrement menu item stock quantities on kitchen release
    setMenu(prevMenu => prevMenu.map(menuItem => {
      const matchingKotItem = newKOT.items.find(kit => kit.menuItemId === menuItem.id);
      if (matchingKotItem) {
        const currentStock = menuItem.stockQuantity ?? 15;
        const updatedStock = Math.max(0, currentStock - matchingKotItem.quantity);
        const updatedMenuItem = {
          ...menuItem,
          stockQuantity: updatedStock
        };
        
        if ((currentUser && !currentUser.isDemo) || (guestTableId && guestTenantId && guestTenantId !== 'demo')) {
          api.updateMenuItem(updatedMenuItem.id, updatedMenuItem).catch(err => console.error("Error updating menu item:", err));
        }

        return updatedMenuItem;
      }
      return menuItem;
    }));
  };

  const handleSettleCustomerTab = (customerPhone: string, settledPaymentMethod: string = 'cash') => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone) return;

    const openOrders = orders.filter(o => {
      const pClean = (o.customerPhone || '').replace(/\D/g, '');
      return pClean === cleanPhone && (o.paymentMethod === 'due' || o.isCustomerTab) && o.tabStatus !== 'settled';
    });

    if (openOrders.length === 0) {
      alert("No active daily running tab orders found for this customer.");
      return;
    }

    const itemMap = new Map<string, OrderItem>();
    let totalSubtotal = 0;

    openOrders.forEach(ord => {
      ord.items.forEach(item => {
        totalSubtotal += item.price * item.quantity;
        const key = `${item.menuItemId}-${item.notes || ''}`;
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.quantity += item.quantity;
          existing.sentToKitchenQty += item.sentToKitchenQty;
        } else {
          itemMap.set(key, { ...item });
        }
      });
    });

    const consolidatedItems = Array.from(itemMap.values());
    const taxAmount = consolidatedItems.reduce((acc, item) => {
      const rate = item.gstRate !== undefined ? item.gstRate : 5;
      return acc + (item.price * item.quantity * rate) / 100;
    }, 0);
    const grandTotal = totalSubtotal + taxAmount;

    const activeInvoiceSeries = billSeries.find(s => s.type === 'invoice' && s.isActive) || billSeries[0];
    const generatedBillNum = `${activeInvoiceSeries.prefix}${activeInvoiceSeries.nextNumber}`;

    const updatedBillSeries = billSeries.map(s => {
      if (s.id === activeInvoiceSeries.id) {
        return { ...s, nextNumber: s.nextNumber + 1 };
      }
      return s;
    });
    setBillSeries(updatedBillSeries);

    const customerName = openOrders[0]?.customerName || 'Loyal Guest';

    const consolidatedBill: EstimateBill = {
      id: `bill-tab-${Date.now()}`,
      orderId: openOrders.map(o => o.id).join(','),
      billNumber: generatedBillNum,
      type: 'invoice',
      customerName,
      customerPhone,
      tableName: 'Customer Tab (Consolidated)',
      orderType: 'Daily Running Tab',
      items: consolidatedItems,
      subtotal: totalSubtotal,
      discountAmount: 0,
      taxAmount,
      serviceChargeAmount: 0,
      grandTotal,
      createdAt: new Date().toISOString(),
      paymentMethod: settledPaymentMethod,
      isCustomerTab: true,
      tabStatus: 'settled',
      consolidatedOrderIds: openOrders.map(o => o.id)
    };

    setOrders(prev => prev.map(o => {
      const pClean = (o.customerPhone || '').replace(/\D/g, '');
      if (pClean === cleanPhone && (o.paymentMethod === 'due' || o.isCustomerTab) && o.tabStatus !== 'settled') {
        return {
          ...o,
          status: 'completed' as const,
          tabStatus: 'settled' as const,
          completedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    setBills(prev => [consolidatedBill, ...prev]);
    registerOrUpdateCRMFromSale(customerName, customerPhone, grandTotal);

    setSettledReceipt(consolidatedBill);
    soundEffects.playSuccessChime();
  };

  const handleCompleteBilling = (activeOrder: TableOrder, paymentMethod: 'cash' | 'card' | 'upi' | 'due') => {
    soundEffects.playSuccessChime();

    if (paymentMethod === 'due') {
      const dueOrder: TableOrder = {
        ...activeOrder,
        status: 'active',
        paymentMethod: 'due',
        isCustomerTab: true,
        tabStatus: 'open'
      };

      handleSaveOrder(dueOrder);
      alert(`Order of ₹${activeOrder.grandTotal.toFixed(2)} saved to ${activeOrder.customerName || 'Customer'}'s Daily Running Tab!\n(KOT sent to kitchen. Bill will be printed at end-of-day settlement)`);
      return;
    }

    // 1. Compile estimate/invoice transaction log list
    const billAmount = activeOrder.grandTotal;
    const currentDiscountAmount = activeOrder.discountType === 'percentage' 
      ? (activeOrder.subtotal * activeOrder.discountValue) / 100 
      : activeOrder.discountValue;

    const discountFraction = activeOrder.subtotal > 0
      ? Math.max(0, (activeOrder.subtotal - currentDiscountAmount) / activeOrder.subtotal)
      : 0;
    const currentTaxValue = activeOrder.items.reduce((acc, item) => {
      const itemGst = item.gstRate !== undefined ? item.gstRate : 5;
      const itemSubtotal = item.price * item.quantity;
      const itemTaxableBase = itemSubtotal * discountFraction;
      return acc + (itemTaxableBase * itemGst) / 100;
    }, 0);
    const currentSvcValue = ((activeOrder.subtotal - currentDiscountAmount) * activeOrder.serviceChargeRate) / 100;

    // Resolve bill number from the active invoice series list
    const activeInvoiceSeries = billSeries.find(s => s.type === 'invoice' && s.isActive) || billSeries[0];
    const generatedBillNum = `${activeInvoiceSeries.prefix}${activeInvoiceSeries.nextNumber}`;

    // Increment active series counter
    const updatedBillSeries = billSeries.map(s => {
      if (s.id === activeInvoiceSeries.id) {
        return { ...s, nextNumber: s.nextNumber + 1 };
      }
      return s;
    });
    setBillSeries(updatedBillSeries);
    if (currentUser && !currentUser.isDemo) {
      api.updateBillSeries(updatedBillSeries).catch(err => console.error("Error updating bill series:", err));
    }

    const newBill: EstimateBill = {
      id: `bill-${Date.now()}`,
      orderId: activeOrder.id,
      billNumber: generatedBillNum,
      type: 'invoice',
      customerName: activeOrder.customerName || 'Loyal Guest',
      customerPhone: activeOrder.customerPhone || 'Walk-in',
      tableName: activeOrder.tableName,
      orderType: activeOrder.orderType,
      items: activeOrder.items,
      subtotal: activeOrder.subtotal,
      discountAmount: currentDiscountAmount,
      taxAmount: currentTaxValue,
      serviceChargeAmount: currentSvcValue,
      deliveryCharge: activeOrder.deliveryCharge || 0,
      grandTotal: billAmount,
      createdAt: new Date().toISOString(),
      paymentMethod,
      currentWaiter: activeOrder.currentWaiter
    };

    setBills(prev => [newBill, ...prev]);
    setSettledReceipt(newBill);
    if (currentUser && !currentUser.isDemo) {
      api.saveBill(newBill).catch(err => console.error("Error saving bill:", err));
    }

    // Dynamic CRM synchronization: automatically store or update customer profile with purchase details
    registerOrUpdateCRMFromSale(newBill.customerName, newBill.customerPhone, newBill.grandTotal);

    // 2. Remove order from active list (or set completed)
    const completedOrder = {
      ...activeOrder,
      status: 'completed' as const,
      paymentMethod,
      completedAt: new Date().toISOString()
    };
    setOrders(prev => prev.filter(o => o.id !== activeOrder.id));
    if (currentUser && !currentUser.isDemo) {
      api.saveOrder(completedOrder).catch(err => console.error("Error saving completed order:", err));
    }

    // 3. Clear Table status back to vacant
    setTables(prevTables => prevTables.map(t => {
      if (t.id === activeOrder.tableId) {
        const updatedTable = {
          ...t,
          status: 'vacant' as const,
          activeOrderId: null,
          currentWaiter: undefined
        };
        if (currentUser && !currentUser.isDemo) {
          api.updateTable(updatedTable.id, updatedTable).catch(err => console.error("Error updating table status:", err));
        }
        return updatedTable;
      }
      return t;
    }));

    // 4. Close terminal view
    setSelectedTable(null);
  };

  const handleUpdateBill = (updatedBill: EstimateBill) => {
    setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
    if (currentUser && !currentUser.isDemo) {
      api.saveBill(updatedBill).catch(err => console.error("Error updating bill:", err));
    }
  };

  const handleUpdateKOTItemStatus = (kotId: string, itemId: string, status: KOTItem['status']) => {
    setKots(prevKots => prevKots.map(kot => {
      if (kot.id === kotId) {
        const updatedItems = kot.items.map(it => 
          it.id === itemId ? { ...it, status } : it
        );
        const allServedOrCancelled = updatedItems.every(it => it.status === 'served' || it.status === 'cancelled');
        const updatedKot = {
          ...kot,
          items: updatedItems,
          status: allServedOrCancelled ? 'completed' as const : kot.status
        };
        if (currentUser && !currentUser.isDemo) {
          api.saveKot(updatedKot).catch(err => console.error("Error updating KOT item status:", err));
        }
        return updatedKot;
      }
      return kot;
    }));
  };

  const handleUpdateKOTStatus = (kotId: string, status: KOT['status']) => {
    setKots(prev => prev.map(k => {
      if (k.id === kotId) {
        const updatedKot = { ...k, status };
        if (currentUser && !currentUser.isDemo) {
          api.saveKot(updatedKot).catch(err => console.error("Error updating KOT status:", err));
        }
        return updatedKot;
      }
      return k;
    }));
  };

  // Menu Settings Adjustments callbacks
  const handleAddMenuItem = (item: MenuItem) => {
    setMenu(prev => [...prev, item]);
    if (currentUser && !currentUser.isDemo) {
      api.addMenuItem(item).catch(err => console.error("Error adding menu item:", err));
    }
  };

  const handleUpdateMenuItem = (item: MenuItem) => {
    setMenu(prev => prev.map(m => m.id === item.id ? item : m));
    if (currentUser && !currentUser.isDemo) {
      api.updateMenuItem(item.id, item).catch(err => console.error("Error updating menu item:", err));
    }
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenu(prev => prev.filter(m => m.id !== id));
    if (currentUser && !currentUser.isDemo) {
      api.deleteMenuItem(id).catch(err => console.error("Error deleting menu item:", err));
    }
  };

  const handleResetMenu = async () => {
    if (currentUser && !currentUser.isDemo) {
      try {
        const freshMenu = await api.resetMenu();
        setMenu(freshMenu);
        const [dbTables, dbOrders, dbKots, dbBills] = await Promise.all([
          api.getTables(),
          api.getOrders(),
          api.getKots(),
          api.getBills()
        ]);
        setTables(dbTables);
        setOrders(dbOrders);
        setKots(dbKots);
        setBills(dbBills);
      } catch (err) {
        console.error("Error resetting menu:", err);
      }
    } else {
      setMenu(INITIAL_MENU);
      setTables(INITIAL_TABLES);
      setOrders(INITIAL_ORDERS);
      setKots(INITIAL_KOTS);
      setBills(INITIAL_BILLS);
    }
    setSelectedTable(null);
  };

  // Table Seating Adjustments callbacks
  const handleAddTable = (newTable: Omit<Table, 'status' | 'activeOrderId'>) => {
    const tableObj: Table = {
      ...newTable,
      status: 'vacant',
      activeOrderId: null
    };
    setTables(prev => [...prev, tableObj]);
    if (currentUser && !currentUser.isDemo) {
      api.addTable(tableObj).catch(err => console.error("Error adding table:", err));
    }
  };

  const handleUpdateTable = (updatedTable: Table) => {
    setTables(prev => prev.map(t => t.id === updatedTable.id ? updatedTable : t));
    if (currentUser && !currentUser.isDemo) {
      api.updateTable(updatedTable.id, updatedTable).catch(err => console.error("Error updating table:", err));
    }
  };

  const handleDeleteTable = (id: string) => {
    setTables(prev => prev.filter(t => t.id !== id));
    if (currentUser && !currentUser.isDemo) {
      api.deleteTable(id).catch(err => console.error("Error deleting table:", err));
    }
  };

  // Waiter staff callback handlers
  const handleAddWaiter = (newWaiter: Omit<Waiter, 'id'>) => {
    const waiterObj: Waiter = {
      ...newWaiter,
      id: `waiter-${Date.now()}`
    };
    setWaiters(prev => [...prev, waiterObj]);
    if (currentUser && !currentUser.isDemo) {
      api.addWaiter(waiterObj).catch(err => console.error("Error adding waiter:", err));
    }
  };

  const handleUpdateWaiter = (updatedWaiter: Waiter) => {
    setWaiters(prev => prev.map(w => w.id === updatedWaiter.id ? updatedWaiter : w));
    if (currentUser && !currentUser.isDemo) {
      api.updateWaiter(updatedWaiter.id, updatedWaiter).catch(err => console.error("Error updating waiter:", err));
    }
  };

  const handleDeleteWaiter = (id: string) => {
    setWaiters(prev => prev.filter(w => w.id !== id));
    if (currentUser && !currentUser.isDemo) {
      api.deleteWaiter(id).catch(err => console.error("Error deleting waiter:", err));
    }
  };

  // Helper stats for headers
  const getActiveOrderForTable = (tableId: string) => {
    return orders.find(o => o.tableId === tableId && o.status !== 'completed' && o.status !== 'cancelled') || null;
  };

  const currentTabTitle = {
    dashboard: 'central operations center',
    tables: 'floor seeding',
    kitchen: 'KOT queue display',
    billing: 'invoices ledger',
    waiters: 'waitstaff roster & commissions',
    calculator: 'dish cost & profit margins',
    reports: 'analytics & revenue reports',
    settings: 'menu pricing configuration',
    crm: 'customer profiles & lifetime CRM registry',
    expenses: 'expense entry logbook',
    'printer-settings': 'thermal printer hardware setup',
    profile: 'user profile & licensing portal'
  }[currentTab];

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('rio_restro_current_user', JSON.stringify(user));
    if (user.role === 'waiter') {
      setCurrentTab('tables');
    } else if (user.role === 'kot') {
      setCurrentTab('kitchen');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rio_restro_current_user');
    api.setTenantId(null);
  };

  const handleRefreshSubscriptionStatus = async () => {
    if (!currentUser || !currentUser.tenantId || currentUser.role !== 'owner') return;
    try {
      const res = await api.getTenantSubscriptionStatus();
      if (res && res.success) {
        const updatedUser = {
          ...currentUser,
          tenant: {
            ...currentUser.tenant,
            subscriptionStatus: res.subscriptionStatus,
            expiryDate: res.expiryDate,
            daysRemaining: res.daysRemaining,
            isValid: res.isValid
          }
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('rio_restro_current_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Error refreshing subscription status:', err);
    }
  };

  const guestTable = useMemo(() => {
    if (!guestTableId) return null;
    return tables.find(t => 
      t.id.toLowerCase() === guestTableId.toLowerCase() ||
      t.name.toLowerCase().replace(/\s+/g, '') === guestTableId.toLowerCase().replace(/\s+/g, '')
    );
  }, [tables, guestTableId]);

  const hasGuestParams = !!guestTableId;

  if (hasGuestParams) {
    if (loadingDb || tables.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 select-none transition-colors duration-300">
          <div className="text-center space-y-6 max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
            <div className="relative mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center border border-indigo-150 dark:border-indigo-900">
              <ChefHat className="w-8 h-8 text-indigo-650 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase font-sans">
                Rio Restro Ordering
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">
                Setting up table menu interface...
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      );
    }

    if (!guestTable) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 select-none transition-colors duration-300">
          <div className="text-center space-y-6 max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
            <div className="relative mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-955 rounded-2xl flex items-center justify-center border border-rose-250">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase font-sans">
                Invalid Table
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">
                Table link is invalid or table was not found. Please scan the table QR code again.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('bitespeed_customer_table_id');
                localStorage.removeItem('bitespeed_customer_tenant_id');
                window.location.href = window.location.pathname; // clear query parameters and reload
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer border-none"
            >
              Go to Login Page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div id="rio-restro-pos-root" className="min-h-screen bg-slate-50 dark:bg-slate-955 flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased transition-colors duration-300">
        <main className="flex-1 p-3 md:p-6 overflow-y-auto w-full min-w-0">
          <PosTerminal
            table={guestTable}
            menu={menu}
            activeOrder={getActiveOrderForTable(guestTable.id)}
            onSaveOrder={handleSaveOrder}
            onFireKOT={handleFireKOT}
            onBack={() => {}}
            onCompleteBilling={() => {}}
            waitersList={[]}
            customers={[]}
            isGuest={true}
            kots={kots}
            onUpdateKOTItemStatus={handleUpdateKOTItemStatus}
          />
        </main>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.role === 'admin') {
    return (
      <AdminDashboard 
        currentUser={currentUser} 
        onLogout={handleLogout}
        mode={theme}
        colorTheme={colorTheme}
        onModeChange={setTheme}
        onColorThemeChange={setColorTheme}
      />
    );
  }

  // Subscription block check for owner
  const isOwner = currentUser.role === 'owner';
  const tenant = currentUser.tenant;
  const isBlocked = isOwner && (tenant?.subscriptionStatus === 'expired' || tenant?.subscriptionStatus === 'pending');

  if (isBlocked) {
    return (
      <SubscriptionOverlay 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        onRefreshStatus={handleRefreshSubscriptionStatus} 
      />
    );
  }

  return (
    <div id="rio-restro-pos-root" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-800 dark:text-slate-100 select-none antialiased transition-colors duration-300 mesh-bg-light dark:mesh-bg">
      
      {/* Sidebar Command Station */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          // Auto exit POS terminal when switching tabs
          setSelectedTable(null);
        }}
        currentTime={currentTime}
        userRole={currentUser.role}
        onLogout={handleLogout}
        featureToggles={featureToggles}
      />

      {/* Primary Workspace container */}
      <main id="primary-workspace" className="flex-1 p-4 md:p-6 lg:p-7 overflow-y-auto lg:max-h-screen print:p-0 w-full min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          id="desktop-tablet-workspace-layout"
          className="space-y-5"
        >
            {/* Refined Header with glassmorphism card */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl px-5 py-4 gap-3 print:hidden border border-slate-200/50 dark:border-slate-800/30 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Rio Restro
                  </h1>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-2 py-0.5 rounded-md">POS</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
                  <span>Dashboard</span>
                  <span className="text-slate-300 dark:text-slate-600">→</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent font-bold uppercase">{currentTabTitle}</span>
                </div>
              </div>

              {/* Status details bar & Theme Studio Studio */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <ThemeSelector
                  mode={theme}
                  colorTheme={colorTheme}
                  customConfig={customThemeConfig}
                  onModeChange={setTheme}
                  onColorThemeChange={handleColorThemeChange}
                />

                <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-ring"></div>
                  <span className="text-slate-600 dark:text-slate-300 font-semibold text-[11px]">Terminal Active</span>
                </div>
              </div>
            </header>

            {/* Inner Route/State switcher */}
            <div id="route-panel" className="min-h-[70vh]">
              {selectedTable ? (
                <PosTerminal
                  table={selectedTable}
                  menu={menu}
                  activeOrder={getActiveOrderForTable(selectedTable.id)}
                  onSaveOrder={handleSaveOrder}
                  onFireKOT={handleFireKOT}
                  onBack={() => setSelectedTable(null)}
                  onCompleteBilling={handleCompleteBilling}
                  waitersList={waiters.filter(w => w.status === 'active').map(w => w.name)}
                  customers={customers}
                  onAddCustomer={handleAddCustomer}
                  kots={kots}
                  onUpdateKOTItemStatus={handleUpdateKOTItemStatus}
                />
              ) : (
                <>
                  {currentTab === 'dashboard' && (
                    <DashboardView
                      tables={tables}
                      orders={orders}
                      kots={kots}
                      bills={bills}
                      menu={menu}
                      onSelectTab={setCurrentTab}
                      onQuickOrder={handleQuickCounterSale}
                      onSelectTable={handleSelectTable}
                      inventoryThreshold={inventoryThreshold}
                      setInventoryThreshold={setInventoryThreshold}
                      onUpdateMenuItem={handleUpdateMenuItem}
                    />
                  )}

                  {currentTab === 'tables' && (
                    <TableView
                      tables={tables}
                      orders={orders}
                      kots={kots}
                      onSelectTable={handleSelectTable}
                      onQuickOrder={handleQuickCounterSale}
                      onAddTable={handleAddTable}
                      onUpdateTable={handleUpdateTable}
                      onDeleteTable={handleDeleteTable}
                      tenantId={currentUser?.tenantId}
                    />
                  )}

                  {currentTab === 'kitchen' && (
                    <KotView
                      kots={kots}
                      onUpdateKOTItemStatus={handleUpdateKOTItemStatus}
                      onUpdateKOTStatus={handleUpdateKOTStatus}
                    />
                  )}

                  {currentTab === 'billing' && (
                    <BillingEstimator
                      bills={bills}
                      billSeries={billSeries}
                      setBillSeries={setBillSeries}
                      onAddBillInvoice={(b) => setBills(prev => [b, ...prev])}
                    />
                  )}

                  {currentTab === 'settings' && (
                    <MenuSettings
                      menu={menu}
                      onAddMenuItem={handleAddMenuItem}
                      onUpdateMenuItem={handleUpdateMenuItem}
                      onDeleteMenuItem={handleDeleteMenuItem}
                      onResetMenu={handleResetMenu}
                    />
                  )}

                  {currentTab === 'calculator' && (
                    <DishCostCalculator
                      menu={menu}
                      onAddMenuItem={handleAddMenuItem}
                      onUpdateMenuItem={handleUpdateMenuItem}
                    />
                  )}

                  {currentTab === 'reports' && (
                    <ReportsView
                      bills={bills}
                      menu={menu}
                      waiters={waiters}
                      onUpdateBill={handleUpdateBill}
                    />
                  )}

                  {currentTab === 'expenses' && (
                    <ExpensesView
                      expenses={operatingExpenses}
                      onAddExpense={handleAddExpense}
                      onDeleteExpense={handleDeleteExpense}
                    />
                  )}

                  {currentTab === 'waiters' && (
                    <WaitersView
                      waiters={waiters}
                      tables={tables}
                      bills={bills}
                      orders={orders}
                      onAddWaiter={handleAddWaiter}
                      onUpdateWaiter={handleUpdateWaiter}
                      onDeleteWaiter={handleDeleteWaiter}
                      isDemo={currentUser?.isDemo}
                    />
                  )}

                  {currentTab === 'crm' && (
                    <CrmView
                      customers={customers}
                      bills={bills}
                      orders={orders}
                      duePayments={duePayments}
                      onAddCustomer={handleAddCustomer}
                      onUpdateCustomer={handleUpdateCustomer}
                      onDeleteCustomer={handleDeleteCustomer}
                      onViewBill={setSettledReceipt}
                      onImportCustomers={handleImportCustomers}
                      onSettleCustomerTab={handleSettleCustomerTab}
                      onRecordDuePayment={(payment) => setDuePayments(prev => [payment, ...prev])}
                    />
                  )}

                  {currentTab === 'printer-settings' && (
                    <PrinterSettings />
                  )}

                  {currentTab === 'profile' && (
                    <ProfileView 
                      currentUser={currentUser} 
                      onProfileUpdate={(updatedUser) => {
                        setCurrentUser(updatedUser);
                        localStorage.setItem('rio_restro_current_user', JSON.stringify(updatedUser));
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </motion.div>
      </main>

      <SupportTicketModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        onSubmitTicket={(t) => {
          setSupportTickets(prev => [{
            ...t,
            id: `ticket-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'new' as const,
            priority: 'medium' as const
          }, ...prev]);
        }}
        currentUser={currentUser}
      />

      <ThermalSettlementModal 
        bill={settledReceipt} 
        onClose={() => setSettledReceipt(null)} 
      />
    </div>
  );
}
