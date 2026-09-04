import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Utensils, 
  Bike, 
  Layers, 
  CreditCard, 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  Search, 
  Percent, 
  Sparkles, 
  ChefHat, 
  Info,
  ArrowUpRight,
  TrendingDown,
  AlertTriangle,
  Play,
  Users,
  Award,
  Star,
  Check,
  Sun,
  Sunset,
  Moon,
  Clock,
  Eye,
  X,
  Plus,
  Trash2,
  Briefcase,
  FileText
} from 'lucide-react';
import { EstimateBill, MenuItem, DishRecipe } from '../types';
import { soundEffects } from './SoundUtility';
import { Waiter } from './WaitersView';
import { printThermalBill } from '../utils/printUtility';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ReportsViewProps {
  bills: EstimateBill[];
  menu: MenuItem[];
  waiters?: Waiter[];
  onUpdateBill?: (bill: EstimateBill) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ bills, menu, waiters = [], onUpdateBill }) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Filters & Tabs State
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'sales' | 'items' | 'orders' | 'margins' | 'waiters' | 'taxes' | 'shifts' | 'hourly' | 'customers' | 'pnl' | 'dues'>('sales');

  // Dues state and helpers
  const [duesSearch, setDuesSearch] = useState('');
  const [settlingDueBill, setSettlingDueBill] = useState<EstimateBill | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState<'cash' | 'card' | 'upi'>('cash');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Operational expenses configuration
  const [operatingExpenses, setOperatingExpenses] = useState<Array<{
    id: string;
    description: string;
    category: 'Rent' | 'Salaries' | 'Utilities' | 'Supplies' | 'Marketing' | 'Maintenance' | 'Miscellaneous';
    amount: number;
    date: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('bitespeed_operating_expenses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [unlinkedCogsPercent, setUnlinkedCogsPercent] = useState<number>(33);

  // Sync state with localStorage to capture updates from outside Expense Entry
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bitespeed_operating_expenses');
      if (saved) {
        setOperatingExpenses(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeReportTab]);

  // New expense form inputs state
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpCat, setNewExpCat] = useState<'Rent' | 'Salaries' | 'Utilities' | 'Supplies' | 'Marketing' | 'Maintenance' | 'Miscellaneous'>('Utilities');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWaiterDetailName, setSelectedWaiterDetailName] = useState<string | null>(null);
  const [payoutStatusMessage, setPayoutStatusMessage] = useState<string | null>(null);
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'evening' | 'night'>('all');
  const [salesListSearch, setSalesListSearch] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const [salesPaperSize, setSalesPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [viewingBillModal, setViewingBillModal] = useState<EstimateBill | null>(null);
  const [showShiftSummaryModal, setShowShiftSummaryModal] = useState(false);

  // Dues Selectors
  const duesStats = useMemo(() => {
    const dueBills = bills.filter(b => b.paymentMethod === 'due' && b.type === 'invoice');
    const totalOutstanding = dueBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const count = dueBills.length;
    
    // Unique debtor customers count
    const debtorPhones = new Set(dueBills.map(b => b.customerPhone || b.customerName));
    const uniqueDebtors = debtorPhones.size;

    return {
      dueBills,
      totalOutstanding,
      count,
      uniqueDebtors
    };
  }, [bills]);

  const filteredDueBills = useMemo(() => {
    const query = duesSearch.toLowerCase().trim();
    if (!query) return duesStats.dueBills;
    return duesStats.dueBills.filter(bill => {
      const bNo = (bill.billNumber || '').toLowerCase();
      const cName = (bill.customerName || '').toLowerCase();
      const cPhone = (bill.customerPhone || '').toLowerCase();
      const tName = (bill.tableName || '').toLowerCase();
      return bNo.includes(query) || 
             cName.includes(query) || 
             cPhone.includes(query) || 
             tName.includes(query);
    });
  }, [duesStats.dueBills, duesSearch]);

  // Helper actions to handle addition/deletion of operational expenses
  const handleAddExpense = (
    description: string, 
    category: 'Rent' | 'Salaries' | 'Utilities' | 'Supplies' | 'Marketing' | 'Maintenance' | 'Miscellaneous', 
    amount: number, 
    date: string
  ) => {
    const newExp = {
      id: 'exp_' + Date.now(),
      description,
      category,
      amount,
      date
    };
    const updated = [...operatingExpenses, newExp];
    setOperatingExpenses(updated);
    localStorage.setItem('bitespeed_operating_expenses', JSON.stringify(updated));
  };

  const handleDeleteExpense = (id: string) => {
    const updated = operatingExpenses.filter(e => exp => exp.id !== id); // Let's simplify this to e => e.id !== id
    const finalUpdate = operatingExpenses.filter(e => e.id !== id);
    setOperatingExpenses(finalUpdate);
    localStorage.setItem('bitespeed_operating_expenses', JSON.stringify(finalUpdate));
  };

  // Calculate shift metrics specifically for the current day (Today)
  const todayShiftStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    
    // filter bills for today
    const todayBills = bills.filter(bill => {
      const bDate = new Date(bill.createdAt);
      return bDate.toDateString() === todayStr;
    });

    let totalGrossSales = 0;
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalServiceCharge = 0;
    let totalDiscounts = 0;
    let totalDeliveryCharge = 0;
    const paymentMethods = { cash: 0, card: 0, upi: 0, due: 0, other: 0 };
    const orderTypesCount = { dineIn: 0, takeaway: 0, delivery: 0 };
    let orderCount = todayBills.length;

    todayBills.forEach(bill => {
      totalGrossSales += bill.grandTotal;
      totalSubtotal += bill.subtotal;
      totalTax += bill.taxAmount;
      totalServiceCharge += bill.serviceChargeAmount;
      totalDiscounts += bill.discountAmount;
      totalDeliveryCharge += bill.deliveryCharge || 0;

      const method = (bill.paymentMethod || 'cash').toLowerCase();
      if (method.includes('cash')) paymentMethods.cash += bill.grandTotal;
      else if (method.includes('card')) paymentMethods.card += bill.grandTotal;
      else if (method.includes('upi')) paymentMethods.upi += bill.grandTotal;
      else if (method.includes('due')) paymentMethods.due += bill.grandTotal;
      else paymentMethods.other += bill.grandTotal;

      const type = (bill.orderType || 'dine-in').toLowerCase();
      if (type.includes('dine-in')) orderTypesCount.dineIn++;
      else if (type.includes('takeaway')) orderTypesCount.takeaway++;
      else if (type.includes('delivery')) orderTypesCount.delivery++;
    });

    return {
      totalGrossSales,
      totalSubtotal,
      totalTax,
      totalServiceCharge,
      totalDiscounts,
      totalDeliveryCharge,
      paymentMethods,
      orderTypesCount,
      orderCount,
      bills: todayBills
    };
  }, [bills]);

  const handlePrintShiftSummary = () => {
    soundEffects.playTick();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const todayStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const upiPercent = getPercentageString(todayShiftStats.paymentMethods.upi, todayShiftStats.totalGrossSales);
    const cashPercent = getPercentageString(todayShiftStats.paymentMethods.cash, todayShiftStats.totalGrossSales);
    const cardPercent = getPercentageString(todayShiftStats.paymentMethods.card, todayShiftStats.totalGrossSales);
    const duePercent = getPercentageString(todayShiftStats.paymentMethods.due, todayShiftStats.totalGrossSales);
    const otherPercent = getPercentageString(todayShiftStats.paymentMethods.other, todayShiftStats.totalGrossSales);

    const printContent = `
      <html>
        <head>
          <title>BiteSpeed Bistro - Shift Summary</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              padding: 10px; 
              font-size: 11px; 
              line-height: 1.4; 
              color: #000; 
              background-color: #fff;
              margin: 0;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .double-divider { border-bottom: 3px double #000; margin: 8px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .header { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
            .subheader { font-size: 11px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="header font-bold">BITESPEED BISTRO</div>
            <div class="subheader">COMMAND CENTER DAILY REPORT</div>
            <div>*** DAILY SHIFT SUMMARY ***</div>
            <div>--------------------------------</div>
          </div>
          <div style="margin: 10px 0;">
            <div><strong>RUN DATE  :</strong> ${todayStr}</div>
            <div><strong>RUN TIME  :</strong> ${timeStr}</div>
            <div><strong>TERMINAL  :</strong> MAIN COUNTER POS</div>
            <div><strong>TOTAL BILLS:</strong> ${todayShiftStats.orderCount} Settled</div>
          </div>
          
          <div class="divider"></div>
          <div class="bold text-center font-bold">FINANCIAL RECONCILIATION</div>
          <div class="divider"></div>
          
          <div class="item-row">
            <span>Gross Sales Subtotal:</span>
            <span>INR ${todayShiftStats.totalSubtotal.toFixed(2)}</span>
          </div>
          <div class="item-row">
            <span>GST Tax (2.5%+2.5%):</span>
            <span>INR ${todayShiftStats.totalTax.toFixed(2)}</span>
          </div>
          <div class="item-row">
            <span>Service Charges:</span>
            <span>INR ${todayShiftStats.totalServiceCharge.toFixed(2)}</span>
          </div>
          <div class="item-row">
            <span>Delivery Fees:</span>
            <span>INR ${todayShiftStats.totalDeliveryCharge.toFixed(2)}</span>
          </div>
          <div class="item-row" style="color: #000;">
            <span>Discounts Allowed:</span>
            <span>-INR ${todayShiftStats.totalDiscounts.toFixed(2)}</span>
          </div>
          
          <div class="divider"></div>
          <div class="item-row bold font-bold" style="font-size: 12px;">
            <span>TOTAL COLLECTED REVENUE:</span>
            <span>INR ${todayShiftStats.totalGrossSales.toFixed(2)}</span>
          </div>
          <div class="divider"></div>

          <div class="bold text-center font-bold">TENDER MODE BREAKDOWN</div>
          <div class="divider"></div>
          
          <div class="item-row">
            <span>1. UPI / QR Payments:</span>
            <span>INR ${todayShiftStats.paymentMethods.upi.toFixed(2)} (${upiPercent})</span>
          </div>
          <div class="item-row">
            <span>2. Cash Box Cash:</span>
            <span>INR ${todayShiftStats.paymentMethods.cash.toFixed(2)} (${cashPercent})</span>
          </div>
          <div class="item-row">
            <span>3. Card Swipe Swipe:</span>
            <span>INR ${todayShiftStats.paymentMethods.card.toFixed(2)} (${cardPercent})</span>
          </div>
          <div class="item-row">
            <span>4. Customer Dues / Credit:</span>
            <span>INR ${todayShiftStats.paymentMethods.due.toFixed(2)} (${duePercent})</span>
          </div>
          <div class="item-row">
            <span>5. Other Splits:</span>
            <span>INR ${todayShiftStats.paymentMethods.other.toFixed(2)} (${otherPercent})</span>
          </div>
          
          <div class="divider"></div>
          <div class="bold text-center font-bold">ORDER TYPE DISTRIBUTION</div>
          <div class="divider"></div>
          
          <div class="item-row">
            <span>Dine-In Orders:</span>
            <span>${todayShiftStats.orderTypesCount.dineIn} tickets</span>
          </div>
          <div class="item-row">
            <span>Takeaway Orders:</span>
            <span>${todayShiftStats.orderTypesCount.takeaway} tickets</span>
          </div>
          <div class="item-row">
            <span>Delivery Orders:</span>
            <span>${todayShiftStats.orderTypesCount.delivery} tickets</span>
          </div>
          
          <div class="double-divider"></div>
          <div class="text-center" style="margin-top: 15px;">
            <p>Verified & Audited By Server:</p>
            <br/>
            <p>__________________________</p>
            <p>Bistro POS Manager Signature</p>
            <p style="font-size: 8px; color: #555; margin-top: 20px;">System powered by Antigravity OS Node</p>
          </div>
          <script>
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
  };
  
  // Daily revenue trends over the last 7 days for the Recharts line graph
  const lastSevenDaysRevenue = useMemo(() => {
    const trendMap: Record<string, number> = {};
    const days: string[] = [];
    const dateLabels: string[] = [];

    // Generate last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toDateString(); // unique key for date matching
      const displayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      days.push(dateString);
      dateLabels.push(displayLabel);
      trendMap[dateString] = 0;
    }

    // Accumulate invoice totals
    bills.forEach(bill => {
      // Aggregate only settled invoices (same logic as gross sales)
      const bDate = new Date(bill.createdAt);
      const bDateString = bDate.toDateString();
      if (trendMap[bDateString] !== undefined) {
        trendMap[bDateString] += bill.grandTotal;
      }
    });

    return days.map((day, idx) => ({
      date: dateLabels[idx],
      revenue: parseFloat(trendMap[day].toFixed(2)),
    }));
  }, [bills]);
  
  // Loaded Recipes from localStorage for Profit Margin computations
  const recipes = useMemo<DishRecipe[]>(() => {
    try {
      const saved = localStorage.getItem('bitespeed_recipes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  // Filter bills based on date selection
  const filteredBills = useMemo(() => {
    const now = new Date();
    
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      
      switch (dateFilter) {
        case 'today':
          return billDate.toDateString() === now.toDateString();
        case 'yesterday': {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return billDate.toDateString() === yesterday.toDateString();
        }
        case 'week': {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return billDate >= oneWeekAgo;
        }
        case 'month': {
          return billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
        }
        case 'custom':
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return billDate >= start && billDate <= end;
          }
          return true;
        case 'all':
        default:
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return billDate >= start && billDate <= end;
          }
          return true;
      }
    });
  }, [bills, dateFilter, customStartDate, customEndDate]);

  // Master overall stats calculation
  const stats = useMemo(() => {
    let totalGrossSales = 0;
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalServiceCharge = 0;
    let totalDiscounts = 0;
    let totalDeliveryCharge = 0;
    const paymentMethods: Record<string, number> = { cash: 0, card: 0, upi: 0, due: 0, other: 0 };
    
    filteredBills.forEach(bill => {
      totalGrossSales += bill.grandTotal;
      totalSubtotal += bill.subtotal;
      totalTax += bill.taxAmount;
      totalServiceCharge += bill.serviceChargeAmount;
      totalDiscounts += bill.discountAmount;
      totalDeliveryCharge += bill.deliveryCharge || 0;
      
      const method = (bill.paymentMethod || 'cash').toLowerCase();
      if (method.includes('cash')) paymentMethods.cash += bill.grandTotal;
      else if (method.includes('card')) paymentMethods.card += bill.grandTotal;
      else if (method.includes('upi')) paymentMethods.upi += bill.grandTotal;
      else if (method.includes('due')) paymentMethods.due += bill.grandTotal;
      else paymentMethods.other += bill.grandTotal;
    });

    const averageOrderValue = filteredBills.length > 0 ? (totalGrossSales / filteredBills.length) : 0;
    const totalCollectedServiceFees = totalServiceCharge;

    return {
      totalGrossSales,
      totalSubtotal,
      totalTax,
      totalServiceCharge,
      totalDiscounts,
      totalDeliveryCharge,
      averageOrderValue,
      paymentMethods,
      totalOrders: filteredBills.length
    };
  }, [filteredBills]);

  // Item Performance metrics compilation
  const itemPerformance = useMemo(() => {
    const itemsMap: Record<string, { 
      name: string; 
      code: string;
      category: string; 
      quantity: number; 
      revenue: number;
      type: 'veg' | 'non-veg' | 'egg';
    }> = {};

    filteredBills.forEach(bill => {
      bill.items.forEach(item => {
        // Look up item type in active menu
        const menuItem = menu.find(m => m.id === item.menuItemId || m.name === item.name);
        const code = menuItem?.code || 'POSItem';
        const category = menuItem?.category || 'Mains';
        const itemType = menuItem?.type || 'veg';

        if (!itemsMap[item.name]) {
          itemsMap[item.name] = {
            name: item.name,
            code,
            category,
            quantity: 0,
            revenue: 0,
            type: itemType
          };
        }
        itemsMap[item.name].quantity += item.quantity;
        itemsMap[item.name].revenue += item.quantity * item.price;
      });
    });

    const list = Object.values(itemsMap);
    
    // Sort by quantity sold descending as default
    return list.sort((a, b) => b.revenue - a.revenue);
  }, [filteredBills, menu]);

  // Filtered Item Performance based on search query
  const filteredItemPerformance = useMemo(() => {
    if (!searchQuery) return itemPerformance;
    const query = searchQuery.toLowerCase();
    return itemPerformance.filter(
      item => item.name.toLowerCase().includes(query) || 
              item.code.toLowerCase().includes(query) ||
              item.category.toLowerCase().includes(query)
    );
  }, [itemPerformance, searchQuery]);

  // Categorized Revenue Distribution
  const categorySummary = useMemo(() => {
    const cats: Record<string, { count: number; revenue: number }> = {};
    itemPerformance.forEach(item => {
      if (!cats[item.category]) {
        cats[item.category] = { count: 0, revenue: 0 };
      }
      cats[item.category].count += item.quantity;
      cats[item.category].revenue += item.revenue;
    });
    return Object.entries(cats).map(([category, data]) => ({
      category,
      ...data
    }));
  }, [itemPerformance]);

  // Order type statistics breakdown (Dine-in vs takeaway vs delivery)
  const orderTypeStats = useMemo(() => {
    const types: Record<string, { count: number; revenue: number; deliveryChargesCollected: number }> = {
      'dine-in': { count: 0, revenue: 0, deliveryChargesCollected: 0 },
      'takeaway': { count: 0, revenue: 0, deliveryChargesCollected: 0 },
      'delivery': { count: 0, revenue: 0, deliveryChargesCollected: 0 }
    };

    filteredBills.forEach(bill => {
      let t = (bill.orderType || 'dine-in').toLowerCase();
      if (!types[t]) {
        types[t] = { count: 0, revenue: 0, deliveryChargesCollected: 0 };
      }
      types[t].count += 1;
      types[t].revenue += bill.grandTotal;
      types[t].deliveryChargesCollected += bill.deliveryCharge || 0;
    });

    return Object.entries(types).map(([type, data]) => ({
      type: type === 'dine-in' ? 'Dine-In' : type === 'takeaway' ? 'Takeaway' : 'Delivery',
      key: type,
      ...data
    }));
  }, [filteredBills]);

  // Search and paginated list of bills for the Sales register list
  const searchedSalesBills = useMemo(() => {
    const query = salesListSearch.toLowerCase().trim();
    if (!query) return filteredBills;
    return filteredBills.filter(bill => {
      const bNo = (bill.billNumber || '').toLowerCase();
      const cName = (bill.customerName || '').toLowerCase();
      const cPhone = (bill.customerPhone || '').toLowerCase();
      const tName = (bill.tableName || '').toLowerCase();
      const waiter = (bill.currentWaiter || '').toLowerCase();
      const pMode = (bill.paymentMethod || '').toLowerCase();
      const itemsStr = bill.items.map(it => it.name.toLowerCase()).join(' ');
      return bNo.includes(query) || 
             cName.includes(query) || 
             cPhone.includes(query) || 
             tName.includes(query) || 
             waiter.includes(query) || 
             pMode.includes(query) ||
             itemsStr.includes(query);
    });
  }, [filteredBills, salesListSearch]);

  const itemsPerPage = 10;
  const totalPages = useMemo(() => {
    return Math.ceil(searchedSalesBills.length / itemsPerPage) || 1;
  }, [searchedSalesBills]);

  const activeSalesPage = useMemo(() => {
    return Math.min(salesPage, totalPages);
  }, [salesPage, totalPages]);

  const currentPageBills = useMemo(() => {
    const startIndex = (activeSalesPage - 1) * itemsPerPage;
    return searchedSalesBills.slice(startIndex, startIndex + itemsPerPage);
  }, [searchedSalesBills, activeSalesPage]);

  // Sales Trend charts (Grouped by hour for today/yesterday, or by date for longer dates)
  const salesTrend = useMemo(() => {
    const groups: Record<string, number> = {};
    const isShortRange = dateFilter === 'today' || dateFilter === 'yesterday';

    filteredBills.forEach(bill => {
      const date = new Date(bill.createdAt);
      let key = '';
      if (isShortRange) {
        // Group by hour
        const hour = date.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        key = `${displayHour} ${ampm}`;
      } else {
        // Group by date
        key = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      }

      groups[key] = (groups[key] || 0) + bill.grandTotal;
    });

    // Sort order
    if (isShortRange) {
      // Create ordered hour keys
      const hours = ['11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];
      return hours.map(h => ({
        label: h,
        amount: groups[h] || 0
      }));
    } else {
      // Sort keys alphabetically by actual dates
      return Object.entries(groups).map(([label, amount]) => ({
        label,
        amount
      })).slice(-10); // Last 10 keys
    }
  }, [filteredBills, dateFilter]);

  // Dish Margin join performance (join recipe materials with POS item sales)
  const marginReports = useMemo(() => {
    return recipes.map(recipe => {
      // Calculate individual cost
      const rawCost = recipe.ingredients.reduce((acc, curr) => acc + curr.calculatedCost, 0);
      const wastageCost = (rawCost * recipe.wastagePercent) / 100;
      const materialCost = rawCost + wastageCost;
      const totalCOGS = materialCost + recipe.additionalPrepCost + recipe.labourCost;
      
      // Look up sales quantity and average selling price from POS
      // Look up linked MenuItem in Menu first
      const linkedMenuItem = menu.find(m => m.id === recipe.menuItemId);
      const matchedSales = itemPerformance.find(
        p => (linkedMenuItem && p.name === linkedMenuItem.name) || p.name.toLowerCase() === recipe.dishName.toLowerCase()
      );

      const qtySold = matchedSales ? matchedSales.quantity : 0;
      const averageSellingPrice = matchedSales ? (matchedSales.revenue / matchedSales.quantity) : recipe.targetPrice;
      const totalRevenue = qtySold * averageSellingPrice;
      const totalCost = qtySold * totalCOGS;
      const totalProfit = totalRevenue - totalCost;
      
      // Margin percentages
      const profitMarginPerItemPercent = averageSellingPrice > 0 
        ? ((averageSellingPrice - totalCOGS) / averageSellingPrice) * 100 
        : 0;

      const foodCostPercentage = averageSellingPrice > 0
        ? (materialCost / averageSellingPrice) * 100
        : 0;

      return {
        id: recipe.id,
        dishName: recipe.dishName,
        totalCOGS,
        materialCost,
        targetPrice: recipe.targetPrice,
        averageSellingPrice,
        qtySold,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMarginPercent: profitMarginPerItemPercent,
        foodCostPercentage,
        lastUpdated: recipe.lastUpdated,
        menuLinked: !!linkedMenuItem
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [recipes, itemPerformance, menu]);

  // Dynamic date-filtered/personnel waiter stats
  const dynamicWaiterStats = useMemo<Record<string, {
    ordersCount: number;
    salesVolume: number;
    commissionEarned: number;
    detailedOrders: Array<{
      billNumber: string;
      tableName: string;
      grandTotal: number;
      createdAt: string;
      commissionAmount: number;
      paymentMethod: string;
    }>;
  }>>(() => {
    const stats: Record<string, {
      ordersCount: number;
      salesVolume: number;
      commissionEarned: number;
      detailedOrders: Array<{
        billNumber: string;
        tableName: string;
        grandTotal: number;
        createdAt: string;
        commissionAmount: number;
        paymentMethod: string;
      }>
    }> = {};

    // Seed stats with known waiters so everyone is reported
    waiters.forEach(w => {
      stats[w.name] = {
        ordersCount: 0,
        salesVolume: 0,
        commissionEarned: 0,
        detailedOrders: []
      };
    });

    // Seed for "Self" counter sales
    stats['Self'] = {
      ordersCount: 0,
      salesVolume: 0,
      commissionEarned: 0,
      detailedOrders: []
    };

    // Calculate from filtered bills
    filteredBills.forEach(b => {
      if (b.type === 'invoice') {
        // Shift Filter handling
        const billDate = new Date(b.createdAt);
        const hour = billDate.getHours();
        let matchesShift = true;
        if (shiftFilter === 'morning') {
          matchesShift = hour >= 7 && hour < 15;
        } else if (shiftFilter === 'evening') {
          matchesShift = hour >= 15 && hour < 23;
        } else if (shiftFilter === 'night') {
          matchesShift = hour >= 23 || hour < 7;
        }

        if (!matchesShift) return;

        const nameKey = b.currentWaiter || 'Self';
        if (!stats[nameKey]) {
          stats[nameKey] = {
            ordersCount: 0,
            salesVolume: 0,
            commissionEarned: 0,
            detailedOrders: []
          };
        }
        stats[nameKey].ordersCount += 1;
        stats[nameKey].salesVolume += b.grandTotal;

        const matchingWaiter = waiters.find(w => w.name === nameKey);
        const commPercent = matchingWaiter ? matchingWaiter.commissionRate : 0; // Self gets 0%
        const commValue = (b.grandTotal * commPercent) / 100;
        stats[nameKey].commissionEarned += commValue;

        stats[nameKey].detailedOrders.push({
          billNumber: b.billNumber,
          tableName: b.tableName,
          grandTotal: b.grandTotal,
          createdAt: b.createdAt,
          commissionAmount: commValue,
          paymentMethod: b.paymentMethod || 'cash'
        });
      }
    });

    return stats;
  }, [waiters, filteredBills, shiftFilter]);

  // Tax Slab-wise Audit Reports Calculations
  const taxAuditReports = useMemo(() => {
    const slabsMap: Record<number, {
      slabRate: number;
      baseValue: number;
      cgst: number;
      sgst: number;
      taxAmount: number;
      itemCount: number;
      discountsApportioned: number;
    }> = {};

    filteredBills.forEach(bill => {
      const discountRatio = bill.subtotal > 0 ? (bill.discountAmount / bill.subtotal) : 0;

      bill.items.forEach(item => {
        const itemGstRate = item.gstRate || 5; 
        const itemSubtotal = item.price * item.quantity;
        const apportionedDiscount = itemSubtotal * discountRatio;
        const taxableBase = itemSubtotal - apportionedDiscount;
        const taxVal = (taxableBase * itemGstRate) / 100;

        if (!slabsMap[itemGstRate]) {
          slabsMap[itemGstRate] = {
            slabRate: itemGstRate,
            baseValue: 0,
            cgst: 0,
            sgst: 0,
            taxAmount: 0,
            itemCount: 0,
            discountsApportioned: 0
          };
        }

        slabsMap[itemGstRate].baseValue += taxableBase;
        slabsMap[itemGstRate].taxAmount += taxVal;
        slabsMap[itemGstRate].cgst += taxVal / 2;
        slabsMap[itemGstRate].sgst += taxVal / 2;
        slabsMap[itemGstRate].itemCount += item.quantity;
        slabsMap[itemGstRate].discountsApportioned += apportionedDiscount;
      });
    });

    return Object.values(slabsMap).sort((a, b) => b.slabRate - a.slabRate);
  }, [filteredBills]);

  // Shift Analysis Calculations
  const shiftReports = useMemo(() => {
    const shifts: Record<string, {
      name: string;
      hours: string;
      revenue: number;
      orderCount: number;
      cashRevenue: number;
      cardRevenue: number;
      upiRevenue: number;
      discounts: number;
      taxes: number;
    }> = {
      'morning': { name: 'Morning Shift', hours: '07:00 AM - 03:00 PM', revenue: 0, orderCount: 0, cashRevenue: 0, cardRevenue: 0, upiRevenue: 0, discounts: 0, taxes: 0 },
      'evening': { name: 'Evening / Twilight Shift', hours: '03:00 PM - 11:00 PM', revenue: 0, orderCount: 0, cashRevenue: 0, cardRevenue: 0, upiRevenue: 0, discounts: 0, taxes: 0 },
      'night': { name: 'Midnight / Night Shift', hours: '11:00 PM - 07:00 AM', revenue: 0, orderCount: 0, cashRevenue: 0, cardRevenue: 0, upiRevenue: 0, discounts: 0, taxes: 0 }
    };

    filteredBills.forEach(bill => {
      const bHour = new Date(bill.createdAt).getHours();
      let shiftKey = 'morning';
      if (bHour >= 7 && bHour < 15) {
        shiftKey = 'morning';
      } else if (bHour >= 15 && bHour < 23) {
        shiftKey = 'evening';
      } else {
        shiftKey = 'night';
      }

      shifts[shiftKey].orderCount += 1;
      shifts[shiftKey].revenue += bill.grandTotal;
      shifts[shiftKey].discounts += bill.discountAmount;
      shifts[shiftKey].taxes += bill.taxAmount;

      const pMethod = (bill.paymentMethod || 'cash').toLowerCase();
      if (pMethod.includes('cash')) {
        shifts[shiftKey].cashRevenue += bill.grandTotal;
      } else if (pMethod.includes('card')) {
        shifts[shiftKey].cardRevenue += bill.grandTotal;
      } else {
        shifts[shiftKey].upiRevenue += bill.grandTotal;
      }
    });

    return Object.values(shifts);
  }, [filteredBills]);

  // Hourly Performance Analysis Calculations
  const hourlyReportStats = useMemo(() => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${displayHour} ${ampm}`;
      return {
        hour,
        label,
        revenue: 0,
        orderCount: 0,
        dineInCount: 0,
        takeawayCount: 0,
        deliveryCount: 0,
      };
    });

    filteredBills.forEach(bill => {
      const hour = new Date(bill.createdAt).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyData[hour].revenue += bill.grandTotal;
        hourlyData[hour].orderCount += 1;
        
        const type = (bill.orderType || 'dine-in').toLowerCase();
        if (type.includes('dine-in')) {
          hourlyData[hour].dineInCount += 1;
        } else if (type.includes('takeaway')) {
          hourlyData[hour].takeawayCount += 1;
        } else {
          hourlyData[hour].deliveryCount += 1;
        }
      }
    });

    return hourlyData;
  }, [filteredBills]);

  // CRM Patron Loyalty Calculations
  const customerLoyaltyStats = useMemo(() => {
    const clients: Record<string, {
      name: string;
      phone: string;
      orderCount: number;
      totalSpend: number;
      averageTicket: number;
      lastVisit: string;
      paymentPreferred: string;
    }> = {};

    filteredBills.forEach(bill => {
      const phone = bill.customerPhone ? bill.customerPhone.trim() : '';
      const name = bill.customerName ? bill.customerName.trim() : 'Walk-in Guest';
      
      const key = phone || name;
      if (key === 'Walk-in Guest' || key === '') return;

      if (!clients[key]) {
        clients[key] = {
          name,
          phone: phone || 'N/A',
          orderCount: 0,
          totalSpend: 0,
          averageTicket: 0,
          lastVisit: bill.createdAt,
          paymentPreferred: bill.paymentMethod || 'cash'
        };
      }

      clients[key].orderCount += 1;
      clients[key].totalSpend += bill.grandTotal;
      if (new Date(bill.createdAt) > new Date(clients[key].lastVisit)) {
        clients[key].lastVisit = bill.createdAt;
        clients[key].paymentPreferred = bill.paymentMethod || 'cash';
      }
    });

    const list = Object.values(clients).map(c => ({
      ...c,
      averageTicket: c.orderCount > 0 ? (c.totalSpend / c.orderCount) : 0
    }));

    return list.sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 50);
  }, [filteredBills]);

  // Dynamic Profit & Loss statement calculations
  const pnlReports = useMemo(() => {
    let recipeCogsSum = 0;
    let estimatedCogsSum = 0;
    let recipeLinkedItemsCount = 0;
    let fallbackItemsCount = 0;

    itemPerformance.forEach(item => {
      // Find matching recipe in marginReports
      const matchingMarginItem = marginReports.find(
        m => m.dishName.toLowerCase() === item.name.toLowerCase()
      );

      if (matchingMarginItem) {
        recipeCogsSum += matchingMarginItem.totalCOGS * item.quantity;
        recipeLinkedItemsCount += item.quantity;
      } else {
        // Fallback estimate based on selling price
        const itemSalesRevenue = item.revenue;
        const estimatedCOGS = (itemSalesRevenue * unlinkedCogsPercent) / 100;
        estimatedCogsSum += estimatedCOGS;
        fallbackItemsCount += item.quantity;
      }
    });

    const totalCOGS = recipeCogsSum + estimatedCogsSum;
    const grossRevenue = stats.totalSubtotal + stats.totalServiceCharge + (stats.totalDeliveryCharge || 0);
    const netRevenue = grossRevenue - stats.totalDiscounts;
    
    // Gross Margin / Profit
    const grossProfit = netRevenue - totalCOGS;
    const grossProfitMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    // Operating expenses from staff commissions
    let totalWaiterCommissions = 0;
    Object.values(dynamicWaiterStats).forEach((stat: any) => {
      totalWaiterCommissions += stat.commissionEarned;
    });

    // Date-filtered operational expenses
    const filteredExpenses = operatingExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      const now = new Date();
      if (dateFilter === 'today') {
        return expDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        return expDate.toDateString() === yesterday.toDateString();
      } else if (dateFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return expDate >= oneWeekAgo;
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return expDate >= startOfMonth;
      } else if (dateFilter === 'all') {
        return true;
      }
      return true;
    });

    const customExpensesSum = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalOperatingExpenses = totalWaiterCommissions + customExpensesSum;

    const netProfit = grossProfit - totalOperatingExpenses;
    const netProfitMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      recipeCogsSum,
      estimatedCogsSum,
      recipeLinkedItemsCount,
      fallbackItemsCount,
      totalCOGS,
      grossRevenue,
      netRevenue,
      grossProfit,
      grossProfitMarginPercent,
      totalWaiterCommissions,
      customExpensesSum,
      filteredExpenses,
      totalOperatingExpenses,
      netProfit,
      netProfitMarginPercent
    };
  }, [itemPerformance, marginReports, stats, unlinkedCogsPercent, dynamicWaiterStats, operatingExpenses, dateFilter]);

  // Export to CSV Functionality simulation
  const handleExportCSV = () => {
    soundEffects.playSuccessChime();
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeReportTab === 'sales') {
      csvContent += "Metric,Value\n";
      csvContent += `Total Gross Sales,INR ${stats.totalGrossSales.toFixed(2)}\n`;
      csvContent += `Tax Collected (GST),INR ${stats.totalTax.toFixed(2)}\n`;
      csvContent += `Service Charge Collected,INR ${stats.totalServiceCharge.toFixed(2)}\n`;
      csvContent += `Delivery Charge Collected,INR ${stats.totalDeliveryCharge.toFixed(2)}\n`;
      csvContent += `Total Discounts Offered,INR ${stats.totalDiscounts.toFixed(2)}\n`;
      csvContent += `Net Sells Subtotal,INR ${stats.totalSubtotal.toFixed(2)}\n`;
      csvContent += `Order Count,${stats.totalOrders}\n`;
      csvContent += `Average Order Value (AOV),INR ${stats.averageOrderValue.toFixed(2)}\n`;
    } else if (activeReportTab === 'items') {
      csvContent += "Item Name,Category,Diet Type,Quantity Sold,Revenue Sold\n";
      itemPerformance.forEach(item => {
        csvContent += `"${item.name}",${item.category},${item.type},${item.quantity},${item.revenue}\n`;
      });
    } else if (activeReportTab === 'orders') {
      csvContent += "Order Type,Orders Count,Total Sales Revenue,Delivery Charge Collected\n";
      orderTypeStats.forEach(type => {
        csvContent += `"${type.type}",${type.count},${type.revenue},${type.deliveryChargesCollected}\n`;
      });
    } else if (activeReportTab === 'waiters') {
      csvContent += "Waiter Name,Roster Status,Join Date,Comm Rate %,Rating,Orders Count,Dynamic Sales Vol,Commissions Accrued\n";
      (Object.entries(dynamicWaiterStats) as [string, any][]).forEach(([wName, wStat]) => {
        const matching = waiters.find(w => w.name === wName);
        const rosterStatus = matching ? matching.status : 'active';
        const joinDate = matching ? matching.joiningDate : 'N/A';
        const rate = matching ? matching.commissionRate : 0;
        const rating = matching ? matching.rating : 5;
        csvContent += `"${wName}",${rosterStatus},${joinDate},${rate}%,${rating},${wStat.ordersCount},${wStat.salesVolume},${wStat.commissionEarned.toFixed(2)}\n`;
      });
    } else if (activeReportTab === 'margins') {
      csvContent += "Dish Name,Linked MenuItem,Cost Per Plate (COGS),Avg Sale Price,Qty Sold,Total Revenue,Total Cost,Total Profit,Profit Margin %\n";
      marginReports.forEach(m => {
        csvContent += `"${m.dishName}",${m.menuLinked ? 'YES':'NO'},${m.totalCOGS.toFixed(2)},${m.averageSellingPrice.toFixed(2)},${m.qtySold},${m.totalRevenue.toFixed(2)},${m.totalCost.toFixed(2)},${m.totalProfit.toFixed(2)},${m.profitMarginPercent.toFixed(1)}%\n`;
      });
    } else if (activeReportTab === 'taxes') {
      csvContent += "Tax Slab % Rate,Base Taxable Value,CGST Collected,SGST Collected,Total Tax Liability,Item Count Sold,Discounts Apportioned\n";
      taxAuditReports.forEach(tax => {
        csvContent += `${tax.slabRate}%,INR ${tax.baseValue.toFixed(2)},INR ${tax.cgst.toFixed(2)},INR ${tax.sgst.toFixed(2)},INR ${tax.taxAmount.toFixed(2)},${tax.itemCount},INR ${tax.discountsApportioned.toFixed(2)}\n`;
      });
    } else if (activeReportTab === 'shifts') {
      csvContent += "Shift Name,Hours Slot,Total Shift Revenue,Orders Count,Cash Volume,Card Volume,UPI Volume,Discounts Volume,Taxes Volume\n";
      shiftReports.forEach(shift => {
        csvContent += `"${shift.name}","${shift.hours}",INR ${shift.revenue.toFixed(2)},${shift.orderCount},INR ${shift.cashRevenue.toFixed(2)},INR ${shift.cardRevenue.toFixed(2)},INR ${shift.upiRevenue.toFixed(2)},INR ${shift.discounts.toFixed(2)},INR ${shift.taxes.toFixed(2)}\n`;
      });
    } else if (activeReportTab === 'hourly') {
      csvContent += "Hour Interval,Time Block,Total Revenue,Orders count,Dine-in Tick,Takeaway Tick,Delivery Tick\n";
      hourlyReportStats.forEach(h => {
        csvContent += `${h.hour},"${h.label}",INR ${h.revenue.toFixed(2)},${h.orderCount},${h.dineInCount},${h.takeawayCount},${h.deliveryCount}\n`;
      });
    } else if (activeReportTab === 'customers') {
      csvContent += "Customer Name,Phone,Orders Count,Total Spend,Average Ticket,Last Visit Date,Preferred Tender\n";
      customerLoyaltyStats.forEach(cust => {
        csvContent += `"${cust.name}","${cust.phone}",${cust.orderCount},INR ${cust.totalSpend.toFixed(2)},INR ${cust.averageTicket.toFixed(2)},"${new Date(cust.lastVisit).toLocaleDateString()}",${cust.paymentPreferred}\n`;
      });
    } else if (activeReportTab === 'pnl') {
      csvContent += "Financial Key Line,Sub-ledger Details,Debit (Expense),Credit (Revenue),Balance (Calculated)\n";
      csvContent += `REVENUE,Food & Beverages (Subtotal),,INR ${stats.totalSubtotal.toFixed(2)},\n`;
      csvContent += `REVENUE,Service Charges Collected,,INR ${stats.totalServiceCharge.toFixed(2)},\n`;
      csvContent += `REVENUE,Delivery charges Recovery,,INR ${(stats.totalDeliveryCharge || 0).toFixed(2)},\n`;
      csvContent += `REVENUE,Promotional Discounts Given,INR ${stats.totalDiscounts.toFixed(2)},,Deduction\n`;
      csvContent += `REVENUE,NET REVENUE FLOWS,,,INR ${pnlReports.netRevenue.toFixed(2)}\n`;
      csvContent += `COGS,Recipe Material Costs (Linked),INR ${pnlReports.recipeCogsSum.toFixed(2)},,${pnlReports.recipeLinkedItemsCount} portions\n`;
      csvContent += `COGS,Estimated Ingredient Cost (Fallback),INR ${pnlReports.estimatedCogsSum.toFixed(2)},,${pnlReports.fallbackItemsCount} portions\n`;
      csvContent += `COGS,TOTAL COST OF GOODS SOLD (COGS),,,INR -${pnlReports.totalCOGS.toFixed(2)}\n`;
      csvContent += `GROSS PROFIT,MARGIN AFTER PRIMARY MATERIALS,,,INR ${pnlReports.grossProfit.toFixed(2)}\n`;
      csvContent += `OPEX,Staff Commissions (Waiters),INR ${pnlReports.totalWaiterCommissions.toFixed(2)},,Commission paid\n`;
      pnlReports.filteredExpenses.forEach(exp => {
        csvContent += `OPEX,${exp.description} (${exp.category}),INR ${exp.amount.toFixed(2)},,Expense on ${exp.date}\n`;
      });
      csvContent += `OPEX,TOTAL OPERATING EXPENSES (OPEX),,,INR -${pnlReports.totalOperatingExpenses.toFixed(2)}\n`;
      csvContent += `NET RESULT,DYNAMIC BOTTOM LINE RESULT,,,INR ${pnlReports.netProfit.toFixed(2)}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bitespeed_Report_${activeReportTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe Math percentage rendering for progress bars
  const getPercentageString = (val: number, total: number) => {
    if (total <= 0) return '0%';
    const pct = Math.min(100, Math.round((val / total) * 100));
    return `${pct}%`;
  };

  return (
    <div id="reports-workspace-root" className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Top filter toolbar panel */}
      <div id="reports-top-controls" className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl shadow-2xs">
        
        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider mr-2">Timeline:</span>
          {[
            { id: 'all', label: 'All Sales Logged' },
            { id: 'today', label: 'Today (Live)' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' }
          ].map((item) => (
            <button
              id={`btn-date-filter-${item.id}`}
              key={item.id}
              onClick={() => {
                soundEffects.playTick();
                setDateFilter(item.id as any);
                setCustomStartDate('');
                setCustomEndDate('');
                setTempStartDate('');
                setTempEndDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${dateFilter === item.id && !customStartDate ? 'bg-indigo-650 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-slate-650 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom date range controls with explicit 'Apply' and 'Clear' options */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              id="custom-start-date"
              type="date"
              value={tempStartDate}
              onChange={(e) => {
                setTempStartDate(e.target.value);
              }}
              className="bg-transparent text-slate-700 dark:text-slate-200 outline-none w-28 font-mono select-none"
            />
            <span className="text-gray-400 font-medium">to</span>
            <input
              id="custom-end-date"
              type="date"
              value={tempEndDate}
              onChange={(e) => {
                setTempEndDate(e.target.value);
              }}
              className="bg-transparent text-slate-700 dark:text-slate-200 outline-none w-28 font-mono select-none"
            />
          </div>

          <button
            id="btn-apply-custom-dates"
            onClick={() => {
              if (!tempStartDate || !tempEndDate) {
                soundEffects.playTick();
                alert('Please pick both starts and ends date range before applying!');
                return;
              }
              const d1 = new Date(tempStartDate);
              const d2 = new Date(tempEndDate);
              if (d1 > d2) {
                soundEffects.playTick();
                alert('Start date cannot fall after the end date.');
                return;
              }
              soundEffects.playSuccessChime();
              setDateFilter('all');
              setCustomStartDate(tempStartDate);
              setCustomEndDate(tempEndDate);
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              tempStartDate && tempEndDate
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-150 dark:border-slate-750'
            }`}
          >
            <span>Apply</span>
            {customStartDate && customEndDate && customStartDate === tempStartDate && customEndDate === tempEndDate && (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {(customStartDate || customEndDate) && (
            <button
              id="btn-clear-custom-dates"
              onClick={() => {
                soundEffects.playTick();
                setTempStartDate('');
                setTempEndDate('');
                setCustomStartDate('');
                setCustomEndDate('');
                setDateFilter('all');
              }}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 text-red-650 dark:bg-red-955/35 dark:text-red-400 transition-all cursor-pointer"
            >
              Clear
            </button>
          )}

          {/* Raw export button */}
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-indigo-205 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
            title="Download CSV Spreadsheet representation"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Generate Shift Summary button */}
          <button
            id="btn-generate-shift-summary"
            onClick={() => {
              soundEffects.playSuccessChime();
              setShowShiftSummaryModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Generate and view shift summary for the current day"
          >
            <Clock className="w-4 h-4 animate-pulse" />
            <span>Generate Shift Summary</span>
          </button>
        </div>

      </div>

      {/* Metrics Cards Grid */}
      <div id="reports-key-metrics-bento" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        
        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Gross Revenue</span>
            <div className="p-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-850 dark:text-white">
              ₹{stats.totalGrossSales.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </h3>
            <p className="text-[9px] text-[#10b981] font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>Full collected invoices</span>
            </p>
          </div>
        </div>

        {/* GST collected */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Collected GST (Tax)</span>
            <div className="p-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Percent className="w-4 h-4 animate-spin-slow" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-850 dark:text-white font-bold">
              ₹{stats.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </h3>
            <p className="text-[9px] text-slate-400 font-medium">Total sales liability</p>
          </div>
        </div>

        {/* Service fees gathered */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Service Overhead</span>
            <div className="p-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-850 dark:text-white font-bold">
              ₹{stats.totalServiceCharge.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </h3>
            <p className="text-[9px] text-slate-400 font-medium font-mono">Gratuity collections</p>
          </div>
        </div>

        {/* Delivery Charge gathered */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Delivery Charges</span>
            <div className="p-1 bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-850 dark:text-white font-bold">
              ₹{stats.totalDeliveryCharge.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </h3>
            <p className="text-[9px] text-amber-500 font-bold font-mono">Last-mile dispatch premiums</p>
          </div>
        </div>

        {/* Total tickets & AOV */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">AOV / Orders</span>
            <div className="p-1 bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-850 dark:text-white font-bold">
              ₹{stats.averageOrderValue.toFixed(0)} <span className="text-xs font-normal text-slate-400">/ {stats.totalOrders} tickets</span>
            </h3>
            <p className="text-[9px] text-rose-500 font-semibold font-mono">Avg ticket sales density</p>
          </div>
        </div>

      </div>

      {/* Premium Category Dropdown Navigation Selector */}
      <div className="relative w-full max-w-md select-text" id="report-category-selector-dropdown">
        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1.5 pl-0.5">Select Report Category</label>
        
        {/* Toggle Trigger Button */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playTick();
            setShowCategoryDropdown(!showCategoryDropdown);
          }}
          className="w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-slate-100 font-bold outline-none shadow-2xs cursor-pointer hover:border-indigo-500 transition-all text-xs"
        >
          <div className="flex items-center gap-2">
            {(() => {
              const reportCategories = [
                { id: 'sales', label: 'Sales & Revenue Flows', icon: TrendingUp },
                { id: 'items', label: 'Dish Menu Performance', icon: ChefHat },
                { id: 'orders', label: 'Channels & Delivery Metrics', icon: Bike },
                { id: 'margins', label: 'Dish Profit Margin Joined Report', icon: Layers },
                { id: 'pnl', label: 'Expense & Profit-Loss (P&L) Report', icon: DollarSign },
                { id: 'dues', label: 'Customer Dues Ledger', icon: AlertTriangle },
                { id: 'taxes', label: 'GST & Tax Audit', icon: Percent },
                { id: 'shifts', label: 'Shift Sales & Settlement', icon: Sunset },
                { id: 'hourly', label: 'Hourly Peak Load', icon: Clock },
                { id: 'customers', label: 'Patron Loyalty Insights', icon: Users },
                { id: 'waiters', label: 'Waiter Commissions & Staff Reports', icon: Users }
              ];
              const activeCategory = reportCategories.find(c => c.id === activeReportTab) || reportCategories[0];
              const ActiveIcon = activeCategory.icon;
              return (
                <>
                  <ActiveIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-405 shrink-0" />
                  <span>{activeCategory.label}</span>
                </>
              );
            })()}
          </div>
          <span className="text-slate-400 dark:text-slate-550 text-[10px] select-none font-bold">
            {showCategoryDropdown ? '▲' : '▼'}
          </span>
        </button>

        {/* Dropdown Options Drawer Panel */}
        {showCategoryDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowCategoryDropdown(false)} 
            />
            <div className="absolute left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 select-text">
              {[
                { id: 'sales', label: 'Sales & Revenue Flows', icon: TrendingUp },
                { id: 'items', label: 'Dish Menu Performance', icon: ChefHat },
                { id: 'orders', label: 'Channels & Delivery Metrics', icon: Bike },
                { id: 'margins', label: 'Dish Profit Margin Joined Report', icon: Layers },
                { id: 'pnl', label: 'Expense & Profit-Loss (P&L) Report', icon: DollarSign },
                { id: 'dues', label: 'Customer Dues Ledger', icon: AlertTriangle },
                { id: 'taxes', label: 'GST & Tax Audit', icon: Percent },
                { id: 'shifts', label: 'Shift Sales & Settlement', icon: Sunset },
                { id: 'hourly', label: 'Hourly Peak Load', icon: Clock },
                { id: 'customers', label: 'Patron Loyalty Insights', icon: Users },
                { id: 'waiters', label: 'Waiter Commissions & Staff Reports', icon: Users }
              ].map((cat) => {
                const CatIcon = cat.icon;
                const isSelected = cat.id === activeReportTab;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setActiveReportTab(cat.id as any);
                      setSearchQuery('');
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-left transition-all border-none cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400'
                        : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <CatIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* WORKSPACE DETAILED REPORT RENDER AREA */}
      <div id="active-report-presentation-board">
        
        {/* TAB 1: SALES & REVENUE RENDERING */}
        {activeReportTab === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales Trend Diagram */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Invoiced Sales Progress Timeline</h4>
                  <p className="text-[10px] text-gray-400">Interactive SVG-generated transaction value curves</p>
                </div>
                <span className="text-[10px] uppercase font-mono font-black italic bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                  {dateFilter === 'today' || dateFilter === 'yesterday' ? 'Hourly Sales' : 'Periodic Revenue'}
                </span>
              </div>

              {/* Responsive SVG Area Chart Curve */}
              {salesTrend.length > 0 && Math.max(...salesTrend.map(s => s.amount)) > 0 ? (
                <div className="space-y-2">
                  <div className="relative w-full h-56 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-gray-100 dark:border-slate-800 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#94a3b8" strokeOpacity="0.15" strokeDasharray="3,3" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#94a3b8" strokeOpacity="0.15" strokeDasharray="3,3" />
                      <line x1="0" y1="150" x2="500" y2="150" stroke="#94a3b8" strokeOpacity="0.15" strokeDasharray="3,3" />

                      {/* Area and Line construct */}
                      {(() => {
                        const maxVal = Math.max(...salesTrend.map(s => s.amount)) || 1;
                        const points = salesTrend.map((s, index) => {
                          const divisor = salesTrend.length > 1 ? salesTrend.length - 1 : 1;
                          const x = salesTrend.length > 1 
                            ? (index / divisor) * 500 
                            : 250; // Center coordinate if single element exists
                          const y = 180 - (s.amount / maxVal) * 160;
                          return { x, y };
                        });

                        const pathString = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        const areaString = `${pathString} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                        return (
                          <>
                            <path d={areaString} fill="url(#salesGrad)" />
                            <path d={pathString} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map((p, i) => (
                              <g key={i}>
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r="4" 
                                  fill="#ffffff" 
                                  stroke="#4f46e5" 
                                  strokeWidth="2.5" 
                                  className="transition-all duration-300 hover:r-6 cursor-pointer"
                                />
                                <text 
                                  x={p.x} 
                                  y={p.y - 10} 
                                  textAnchor="middle" 
                                  className="text-[9px] font-mono font-bold fill-slate-500 dark:fill-slate-350"
                                >
                                  {salesTrend[i].amount > 0 ? `₹${salesTrend[i].amount.toFixed(0)}` : ''}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Horizontal Labels */}
                  <div className="flex justify-between px-1 text-[9px] text-slate-400 font-mono">
                    {salesTrend.map((s, i) => (
                      <span key={i} className="text-center w-8 truncate" title={s.label}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-56 bg-slate-55 dark:bg-slate-950 flex flex-col items-center justify-center text-xs text-gray-400 italic rounded-xl border border-dashed border-gray-200">
                  <span>No Sales Transactions to chart</span>
                </div>
              )}

              {/* Sales diagnostics summaries */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-[9px] text-gray-450 uppercase font-black font-mono">Peak Period Sales</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {(() => {
                      if (salesTrend.length === 0) return 'No data';
                      const sorted = [...salesTrend].sort((a,b) => b.amount - a.amount);
                      if (sorted[0]?.amount === 0) return 'No active sells';
                      return `${sorted[0]?.label || 'NA'} (${getPercentageString(sorted[0]?.amount, stats.totalGrossSales)} of total volume)`;
                    })()}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-[9px] text-gray-450 uppercase font-black font-mono">Tax Margin Ratio</span>
                  <p className="text-xs font-bold text-indigo-650 dark:text-indigo-400 mt-1">
                    {stats.totalGrossSales > 0 ? ((stats.totalTax / stats.totalGrossSales) * 100).toFixed(1) : 0}% inclusive GST
                  </p>
                </div>
              </div>

            </div>

            {/* Payment Method Split & Totals Reconciliation Ledger */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Income Streams & Settlement</h4>
                <p className="text-[10px] text-gray-405">Breakdown of tender modes accepted</p>
              </div>

              {/* Progress bars of payment method splits */}
              <div className="space-y-3.5 pt-2">
                
                {/* UPI App Sells */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>UPI Payments / QR codes</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      ₹{stats.paymentMethods.upi.toFixed(1)} ({getPercentageString(stats.paymentMethods.upi, stats.totalGrossSales)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: getPercentageString(stats.paymentMethods.upi, stats.totalGrossSales) }}
                    ></div>
                  </div>
                </div>

                {/* Cash Drawer */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Liquid Cash Box Cash/Split register</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      ₹{stats.paymentMethods.cash.toFixed(1)} ({getPercentageString(stats.paymentMethods.cash, stats.totalGrossSales)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: getPercentageString(stats.paymentMethods.cash, stats.totalGrossSales) }}
                    ></div>
                  </div>
                </div>

                {/* Card Terminal */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold font-sans">
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>POS Card Swipe Terminal</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      ₹{stats.paymentMethods.card.toFixed(1)} ({getPercentageString(stats.paymentMethods.card, stats.totalGrossSales)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: getPercentageString(stats.paymentMethods.card, stats.totalGrossSales) }}
                    ></div>
                  </div>
                </div>

                {/* Customer Dues / Ledger Credit */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold font-sans">
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Customer Dues / Ledger Credit</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      ₹{stats.paymentMethods.due.toFixed(1)} ({getPercentageString(stats.paymentMethods.due, stats.totalGrossSales)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: getPercentageString(stats.paymentMethods.due, stats.totalGrossSales) }}
                    ></div>
                  </div>
                </div>

                {/* Other/Unclassified */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Other Tender Splits</span>
                    <span className="font-mono text-[11px]">
                      ₹{stats.paymentMethods.other.toFixed(1)} ({getPercentageString(stats.paymentMethods.other, stats.totalGrossSales)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-400 h-full rounded-full transition-all duration-500"
                      style={{ width: getPercentageString(stats.paymentMethods.other, stats.totalGrossSales) }}
                    ></div>
                  </div>
                </div>

              </div>

              {/* Cumulative audit ledger section */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4 mt-2 space-y-2">
                <h5 className="text-[10px] uppercase font-mono font-black text-slate-500 tracking-wide">Ledger Reconciliation</h5>
                
                <div className="flex justify-between text-xs text-slate-650 dark:text-slate-300">
                  <span>Gross Sales (Invoiced):</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">₹{stats.totalGrossSales.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-xs text-rose-500">
                  <span>Less Total Discounts Allowed:</span>
                  <span className="font-mono font-bold">- ₹{stats.totalDiscounts.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xs text-emerald-600 font-bold border-t border-slate-100 dark:border-slate-800 pt-2 text-slate-900 dark:text-white">
                  <span>Subtotal Net Sells Trade Margin:</span>
                  <span className="font-mono">₹{stats.totalSubtotal.toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Recharts Daily Revenue Trends over the last 7 days */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Daily Revenue Trend (Last 7 Days)</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">Interactive line visualization of weekly sales velocity and peak metrics</p>
                </div>
                <div className="text-[9.5px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
                  7-Day Total: ₹{lastSevenDaysRevenue.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </div>
              </div>

              <div className="w-full h-72 pr-3 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lastSevenDaysRevenue}
                    margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11}
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

            {/* Detailed Sales Bills List Ledger spanning all 3 columns */}
            <div id="sales-register-list-ledger-card" className="lg:col-span-3 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-gray-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Invoiced Bills Register</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">Detailed list of all bills matching applied date range</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  {/* Paper size reprint setting */}
                  <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setSalesPaperSize('80mm');
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        salesPaperSize === '80mm'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      80mm Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setSalesPaperSize('58mm');
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        salesPaperSize === '58mm'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      58mm Receipt
                    </button>
                  </div>

                  {/* Register search input */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input
                      id="sales-ledger-search"
                      type="text"
                      placeholder="Search bill#, guest, item, table..."
                      value={salesListSearch}
                      onChange={(e) => {
                        setSalesListSearch(e.target.value);
                        setSalesPage(1); // Reset page to 1
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 pl-8 pr-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Real Table */}
              <div className="overflow-x-auto border border-gray-100 dark:border-slate-850 rounded-xl">
                <table id="sales-register-table" className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 dark:bg-slate-950/40 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-gray-150 dark:border-slate-850">
                      <th className="py-3 px-4">Bill No</th>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Table / Captain</th>
                      <th className="py-3 px-3">Guest Details</th>
                      <th className="py-3 px-3">Type & pay</th>
                      <th className="py-3 px-3 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-850">
                    {currentPageBills.length > 0 ? (
                      currentPageBills.map((bill) => {
                        const dateObj = new Date(bill.createdAt);
                        const displayDate = dateObj.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });
                        const displayTime = dateObj.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        
                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-xs transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-indigo-400">
                              {bill.billNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                              <div>{displayDate}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{displayTime}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-800 dark:text-slate-300">
                              <div className="font-semibold">{bill.tableName}</div>
                              <div className="text-[10px] text-indigo-550 uppercase font-mono">{bill.currentWaiter || 'Counter Self'}</div>
                            </td>
                            <td className="py-3 px-3">
                              {bill.customerName ? (
                                <div>
                                  <div className="font-medium text-slate-700 dark:text-slate-200">{bill.customerName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{bill.customerPhone || 'No Phone'}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic font-mono text-[10px]">Walk-In Guest</span>
                              )}
                            </td>
                            <td className="py-3 px-3 space-y-1">
                              <div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  bill.orderType === 'dine-in' 
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' 
                                    : bill.orderType === 'delivery'
                                    ? 'bg-amber-50 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                  {bill.orderType}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 font-semibold text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">
                                <CreditCard className="w-3 h-3 text-slate-400" />
                                <span>{bill.paymentMethod || 'CASH'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                              ₹{bill.grandTotal.toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEffects.playTick();
                                    setViewingBillModal(bill);
                                  }}
                                  title="View Bill Details"
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-all border-none"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEffects.playTick();
                                    printThermalBill(bill, false, salesPaperSize);
                                  }}
                                  title={`Reprint Thermal Slip (${salesPaperSize})`}
                                  className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-500 hover:text-indigo-700 flex items-center justify-center cursor-pointer transition-all border-none"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 italic">
                          No bills found matching filters or search queries
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination elements */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Showing <strong className="text-slate-700 dark:text-slate-200">{((activeSalesPage - 1) * itemsPerPage) + 1}</strong> to{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {Math.min(activeSalesPage * itemsPerPage, searchedSalesBills.length)}
                    </strong>{' '}
                    of <strong className="text-slate-700 dark:text-slate-200">{searchedSalesBills.length}</strong> bills
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={activeSalesPage === 1}
                      onClick={() => {
                        soundEffects.playTick();
                        setSalesPage(prev => Math.max(prev - 1, 1));
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer font-bold"
                    >
                      ← Previous
                    </button>
                    <span className="text-slate-400 dark:text-slate-500 font-mono">
                      Page {activeSalesPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={activeSalesPage === totalPages}
                      onClick={() => {
                        soundEffects.playTick();
                        setSalesPage(prev => Math.min(prev + 1, totalPages));
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer font-bold"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MENU ITEMS PERFORMANCE RENDERING */}
        {activeReportTab === 'items' && (
          <div className="space-y-6">
            
            {/* Search filter row */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="reports-menu-search"
                  type="text"
                  placeholder="Search item, category, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-505"
                />
              </div>

              <div className="text-xs text-gray-450 font-mono shrink-0 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg text-indigo-650">
                <Info className="w-3.5 h-3.5" />
                <span>Sort priority: Total Sells Revenue generated</span>
              </div>
            </div>

            {/* Menu item breakdown layout split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Table Ledger block */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Dish Revenue & Quantity Roster</h4>
                  <p className="text-[10px] text-gray-400">Comprehensive breakdown of menu popularity dynamics</p>
                </div>

                <div className="overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 uppercase font-mono text-[9px] text-gray-500 font-extrabold tracking-wider border-b border-gray-100 dark:border-slate-800">
                        <th className="p-3">MenuItem Description / Details</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Qty Sold</th>
                        <th className="p-3 text-right">Revenue Sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40">
                      {filteredItemPerformance.length > 0 ? (
                        filteredItemPerformance.map((item, id) => {
                          return (
                            <tr key={id} className="hover:bg-slate-55/40 dark:hover:bg-slate-800/30 transition-all font-sans">
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === 'veg' ? 'bg-emerald-500' : item.type === 'non-veg' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                  <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono font-medium">{item.code}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 font-sans border border-indigo-100 dark:border-indigo-900/60">
                                  {item.category}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold font-mono text-slate-700 dark:text-slate-200">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-right font-black font-mono text-slate-900 dark:text-white">
                                ₹{item.revenue.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                            No menu item transactions recorded in selected timeline
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categoric share & dessert metrics summary column */}
              <div className="space-y-4">
                
                {/* Category Sales Split summary box */}
                <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Category Sells Splittings</h4>
                    <p className="text-[10px] text-gray-405">Share of sales categorized by department</p>
                  </div>

                  <div className="space-y-3.5">
                    {categorySummary.length > 0 ? (
                      categorySummary.map((cat, idx) => {
                        const totalRevenueSum = categorySummary.reduce((acc,curr) => acc + curr.revenue,0) || 1;
                        const pctStr = getPercentageString(cat.revenue, totalRevenueSum);
                        
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-350">{cat.category}</span>
                              <span className="font-mono text-slate-450">
                                ₹{cat.revenue.toFixed(0)} ({pctStr})
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                                style={{ width: pctStr }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-450 italic py-4 text-center">No categories mapped</p>
                    )}
                  </div>
                </div>

                {/* Diet preference metrics diagnostics (Veg vs Non-Veg breakdown) */}
                <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">Dietary Order Splits</h4>
                  
                  {(() => {
                    let vegRev = 0, nonVegRev = 0, eggRev = 0;
                    itemPerformance.forEach(item => {
                      if (item.type === 'veg') vegRev += item.revenue;
                      else if (item.type === 'non-veg') nonVegRev += item.revenue;
                      else eggRev += item.revenue;
                    });
                    const totalDietSum = vegRev + nonVegRev + eggRev || 1;

                    return (
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-emerald-600 flex items-center gap-1">🟢 Vegetarian sells</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-white">
                            ₹{vegRev.toFixed(0)} ({getPercentageString(vegRev, totalDietSum)})
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-rose-600 flex items-center gap-1 font-sans">🔴 Non-Vegetarian sells</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-white">
                            ₹{nonVegRev.toFixed(0)} ({getPercentageString(nonVegRev, totalDietSum)})
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-amber-651 flex items-center gap-1 font-sans">🟡 Egg contains sells</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-white">
                            ₹{eggRev.toFixed(0)} ({getPercentageString(eggRev, totalDietSum)})
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 3: ORDER TYPE SPLITS & LAST MILE DELIVERY */}
        {activeReportTab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales Channel summary panels */}
            <div className="lg:col-span-2 space-y-4">
              
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sales Channels Allocation</h4>
                  <p className="text-[10px] text-gray-400">Comparative revenue splits between seating arrangements, takeaways, and active dispatches</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {orderTypeStats.map((item, idx) => {
                    const totalSellsSum = orderTypeStats.reduce((acc,curr) => acc + curr.revenue,0) || 1;
                    const totalOrdersSum = orderTypeStats.reduce((acc,curr) => acc + curr.count,0) || 1;
                    const isDelivery = item.key === 'delivery';

                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border border-gray-105 space-y-3 relative overflow-hidden ${isDelivery ? 'bg-amber-50/20 dark:bg-amber-951/5 border-amber-100 dark:border-amber-900/40' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs capitalize text-slate-805 dark:text-slate-100 flex items-center gap-1.5">
                            {idx === 0 ? <Layers className="w-3.5 h-3.5 text-blue-500" /> : idx === 1 ? <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" /> : <Bike className="w-3.5 h-3.5 text-amber-500" />}
                            <span>{item.type}</span>
                          </span>
                          <span className="text-[9px] font-mono font-black italic select-all p-1 bg-white dark:bg-slate-800 rounded shadow-3xs">
                            {getPercentageString(item.revenue, totalSellsSum)} share
                          </span>
                        </div>

                        <div>
                          <p className="text-lg font-black font-mono text-slate-900 dark:text-white">₹{item.revenue.toFixed(1)}</p>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-450 font-mono">
                            <span>{item.count} tickets sold</span>
                            <span>AOV: ₹{(item.revenue / (item.count || 1)).toFixed(0)}</span>
                          </div>
                        </div>

                        {item.key === 'delivery' && item.deliveryChargesCollected > 0 && (
                          <div className="pt-2 border-t border-amber-100/60 flex justify-between items-center text-[10px] text-amber-700 italic font-medium">
                            <span>Delivery Fees Collected:</span>
                            <span className="font-mono font-bold">₹{item.deliveryChargesCollected.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery premium diagnostics audit card */}
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">In-Transit Channel Diagnostics</h4>
                <p className="text-[10px] text-gray-400">Tracking dispatch costs recovery margins to support delivery operations riders</p>
                
                {(() => {
                  const delData = orderTypeStats.find(t => t.key === 'delivery');
                  const count = delData ? delData.count : 0;
                  const revenue = delData ? delData.revenue : 0;
                  const charge = delData ? delData.deliveryChargesCollected : 0;
                  const avgDeliveryCharges = count > 0 ? (charge / count) : 0;
                  const deliveryRatio = revenue > 0 ? ((charge / revenue) * 100) : 0;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase font-mono tracking-wider block">Completed Dispatches</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{count} order trips</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase font-mono tracking-wider block">Logistics Sells</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">₹{revenue.toFixed(0)}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase font-mono tracking-wider block">Average Delivery Fee</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">₹{avgDeliveryCharges.toFixed(1)} per trip</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase font-mono tracking-wider block">Surcharge Recovery</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{deliveryRatio.toFixed(1)}% of sales</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Loyalty and Customer Demography quick dashboard */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Customer Spends Ledger</h4>
                <p className="text-[10px] text-gray-450">Top repeat customer accounts details and tickets count</p>
              </div>

              {/* Loyal Customers leaderboard list */}
              <div className="space-y-2.5 divide-y divide-gray-100 dark:divide-slate-800/40">
                {(() => {
                  const loyalties: Record<string, { name: string; phone: string; visits: number; spent: number }> = {};
                  filteredBills.forEach(b => {
                    const phone = b.customerPhone || 'Walk-In Guest';
                    const name = b.customerName || 'Anonymous Guest';
                    const k = phone === 'Walk-In Guest' ? `anon-${Math.random()}` : phone;

                    if (phone !== 'Walk-In Guest') {
                      if (!loyalties[phone]) {
                        loyalties[phone] = { name, phone, visits: 0, spent: 0 };
                      }
                      loyalties[phone].visits += 1;
                      loyalties[phone].spent += b.grandTotal;
                    }
                  });

                  const lists = Object.values(loyalties).sort((a,b) => b.spent - a.spent).slice(0, 5);

                  if (lists.length === 0) {
                    return (
                      <div className="text-center py-6 text-xs text-slate-400 italic">
                        No customized customer accounts detected. Most checkouts processed as Walk-In Guests.
                      </div>
                    );
                  }

                  return lists.map((cust, itemIdx) => (
                    <div key={itemIdx} className="pt-2.5 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{cust.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{cust.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-905 dark:text-white font-mono">₹{cust.spent.toFixed(0)}</p>
                        <p className="text-[9px] text-indigo-500 font-mono font-medium">{cust.visits} repeat invoice visits</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: DISH PROFIT MARGIN JOINED REPORT (INTEGRATED SPECIFIC COGS) */}
        {activeReportTab === 'margins' && (
          <div className="space-y-6">
            
            {/* Detailed Profit margin introduction header banner */}
            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-2xl">
                <h4 className="font-bold text-xs text-indigo-805 dark:text-indigo-400 uppercase tracking-widest font-mono">Material Profit Margins Analyzer Dashboard</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This report joins Recipe Ingredients records (raw materials, preparation labour, wastage indexes) from the **Dish Cost Calculator** with **Live POS checkouts** of matched items, highlighting actual dynamic Gross Profit (GP) performance!
                </p>
              </div>
              <div className="shrink-0 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 font-bold border border-indigo-105 rounded-xl shadow-2xs font-mono">
                Active tracked Sheets: <span className="text-indigo-650 dark:text-indigo-400 font-extrabold">{recipes.length} dishes</span>
              </div>
            </div>

            {/* Profit margin table layout */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl shadow-3xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Active Sheets Cost-to-Sales Gross Profit Ledger</h4>
                  <p className="text-[10px] text-gray-400">Live reconciliation of individual recipe margins relative to customer volume</p>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono rounded px-2 py-0.5">
                  Gross Profit = Revenue - COGS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 uppercase font-mono text-[9px] text-gray-550 font-extrabold tracking-wider border-b border-gray-100 dark:border-slate-800 select-all">
                      <th className="p-3">Tracked Item / Dish Name</th>
                      <th className="p-3 text-right">Cost Per portion (COGS)</th>
                      <th className="p-3 text-right">Avg Retail Sale Price</th>
                      <th className="p-3 text-right">Qty Sold (POS)</th>
                      <th className="p-3 text-right">Total Sells Revenue</th>
                      <th className="p-3 text-right">Consolidated Cost</th>
                      <th className="p-3 text-right">Net Profit Accrued</th>
                      <th className="p-3 text-right">Gross Profit % (GP)</th>
                      <th className="p-3 text-center">Status Index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40 font-mono text-[11px]">
                    {marginReports.length > 0 ? (
                      marginReports.map((item, idx) => {
                        const hasSales = item.qtySold > 0;
                        const isUnderpriced = item.profitMarginPercent < 45; // alert if profit margins are thin (typical restaurant threshold is >65% GP)
                        
                        return (
                          <tr key={idx} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all ${isUnderpriced ? 'bg-amber-50/5 dark:bg-amber-951/5' : ''}`}>
                            <td className="p-3 font-sans font-bold">
                              <div>
                                <span className="text-slate-850 dark:text-white block">{item.dishName}</span>
                                <span className="text-[9px] font-mono font-medium text-slate-400 block font-normal">
                                  {item.menuLinked ? '🔗 Synchronized Category matched' : '⚠️ Unlinked from POS catalog'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-rose-500 font-bold">
                              ₹{item.totalCOGS.toFixed(1)}
                            </td>
                            <td className="p-3 text-right text-slate-800 dark:text-slate-205 font-bold">
                              ₹{item.averageSellingPrice.toFixed(1)}
                            </td>
                            <td className="p-3 text-right text-slate-655 dark:text-slate-400 font-sans font-bold">
                              {item.qtySold} plate{item.qtySold !== 1 ? 's':''}
                            </td>
                            <td className="p-3 text-right text-slate-805 dark:text-white font-bold">
                              ₹{item.totalRevenue.toFixed(0)}
                            </td>
                            <td className="p-3 text-right text-slate-500">
                              ₹{item.totalCost.toFixed(0)}
                            </td>
                            <td className={`p-3 text-right font-black ${item.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-505'}`}>
                              ₹{item.totalProfit.toFixed(1)}
                            </td>
                            <td className="p-3 text-right font-black">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.profitMarginPercent > 70 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                item.profitMarginPercent > 50 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                item.profitMarginPercent > 30 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {item.profitMarginPercent.toFixed(1)}% GP
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {item.qtySold === 0 ? (
                                <span className="text-[10px] text-gray-400 italic">No Sales logs</span>
                              ) : isUnderpriced ? (
                                <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-bold flex items-center justify-center gap-0.5 w-max mx-auto font-sans" title="GP Margin index under safe 55% threshold index. Consider raising menu Price!">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>Raise Price</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-bold flex items-center justify-center gap-0.5 w-max mx-auto font-sans" title="Excellent margin profile!">
                                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                                  <span>Healthy GP</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-400 italic font-sans text-xs">
                          No customized Dish Recipe cards found standard in storage. Go create material cards inside the Dish Cost Calculator workspace!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Strategic profit diagnostic analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Star performers of dishes (high GP + high sales) */}
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">Performers Star Menu Leaders</h4>
                <p className="text-[10px] text-gray-400">High margin items generating maximum bottom line profits</p>
                
                <div className="space-y-2.5">
                  {(() => {
                    const stars = marginReports.filter(m => m.qtySold > 0 && m.profitMarginPercent >= 50);
                    if (stars.length === 0) {
                      return <p className="text-xs text-gray-400 italic py-2">No qualified items identified in sales timeline.</p>;
                    }
                    return stars.slice(0, 3).map((item, id) => (
                      <div key={id} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-205">{item.dishName}</span>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-emerald-550 font-bold">₹{item.totalProfit.toFixed(0)} net profit</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 font-bold">{item.profitMarginPercent.toFixed(0)}% GP</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Material cost caution items (high food cost % + sells occurring) */}
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ingredients Inflation Alerts</h4>
                <p className="text-[10px] text-gray-400">Items with thinner margins where procurement spike may lead to overall loses</p>
                
                <div className="space-y-2.5">
                  {(() => {
                    const stars = marginReports.filter(m => m.qtySold > 0 && m.profitMarginPercent < 45);
                    if (stars.length === 0) {
                      return <p className="text-xs text-slate-400 italic py-2">No active warnings detected. Procurement structures are safe.</p>;
                    }
                    return stars.slice(0, 3).map((item, id) => (
                      <div key={id} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.dishName}</span>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-rose-500 font-bold">₹{item.totalProfit.toFixed(0)} profit</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-600 font-bold">{item.profitMarginPercent.toFixed(0)}% GP</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 5: WAITER COMMISSIONS & STAFF PERFORMANCE REPORT */}
        {activeReportTab === 'waiters' && (
          <div className="space-y-6">
            
            {/* Introductory Header Card */}
            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
              <div className="space-y-0.5 max-w-2xl">
                <h4 className="font-bold text-xs text-indigo-800 dark:text-indigo-400 uppercase tracking-widest font-mono">Waiter Captain Commissions Auditor</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Real-time reporting of individual waiter sales attribution, ratings, and commission payouts calculated dynamically based on settled bills matching your active date/time selection.
                </p>
              </div>
              <div className="shrink-0 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 font-bold border border-indigo-100 rounded-xl shadow-2xs font-mono dark:border-slate-700">
                Total Tracked Staff: <span className="text-indigo-650 dark:text-indigo-400 font-extrabold">{waiters.length} captains</span>
              </div>
            </div>

            {/* Shift Period Filter Widget */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-in">
              <div className="space-y-1">
                <h5 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Time-Based Shift Period Filter
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a shift period to view performance statistics, attributed sales, and dynamic captain commission payouts.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Shifts', icon: Clock, range: '24 Hours' },
                  { id: 'morning', label: 'Morning', icon: Sun, range: '07:00 AM - 03:00 PM' },
                  { id: 'evening', label: 'Evening', icon: Sunset, range: '03:00 PM - 11:00 PM' },
                  { id: 'night', label: 'Night Shift', icon: Moon, range: '11:00 PM - 07:00 AM' }
                ].map((shift) => {
                  const ShiftIcon = shift.icon;
                  const isSelected = shiftFilter === shift.id;
                  return (
                    <button
                      key={shift.id}
                      onClick={() => {
                        soundEffects.playTick();
                        setShiftFilter(shift.id as any);
                      }}
                      className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-gray-150 dark:border-slate-705 text-slate-705 dark:text-slate-350 hover:bg-indigo-50/40 dark:hover:bg-slate-800'
                      }`}
                    >
                      <ShiftIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-400 dark:text-indigo-300'}`} />
                      <div className="text-left leading-normal">
                        <div className="font-bold">{shift.label}</div>
                        <div className={`text-[9px] font-medium ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                          {shift.range}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated Payout Success Banner */}
            {payoutStatusMessage && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-150 dark:border-emerald-900/45 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-emerald-850 dark:text-emerald-450 font-mono">Commission Settled & Recorded</h5>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-350">{payoutStatusMessage}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPayoutStatusMessage(null)}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-mono font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Waiter Roster statistics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Registered Waiters */}
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-3xs flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold tracking-widest font-mono">Registered Roster</h4>
                  <p className="text-lg font-black text-slate-800 dark:text-white font-mono">{waiters.length} staff</p>
                  <p className="text-[9px] text-emerald-500 font-mono">{waiters.filter(w => w.status === 'active').length} active shift</p>
                </div>
              </div>

              {/* Card 2: Attributed Sales */}
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-3xs flex items-center space-x-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold tracking-widest font-mono">Dynamic Sales Roster</h4>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-450 font-mono">
                    ₹{(Object.values(dynamicWaiterStats) as any[]).reduce((acc, curr) => acc + curr.salesVolume, 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">{filteredBills.filter(b => b.type === 'invoice').length} total checks</p>
                </div>
              </div>

              {/* Card 3: Accrued Commissions */}
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-3xs flex items-center space-x-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-xl text-amber-550">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold tracking-widest font-mono">Captains Accrued</h4>
                  <p className="text-lg font-black text-amber-500 font-mono">
                    ₹{(Object.values(dynamicWaiterStats) as any[]).reduce((acc, curr) => acc + curr.commissionEarned, 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono font-sans">Based on variable ratings/rates</p>
                </div>
              </div>

              {/* Card 4: High Performer */}
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 rounded-2xl shadow-3xs flex items-center space-x-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-500">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold tracking-widest font-mono">Leader (Sales)</h4>
                  {(() => {
                    const sortedCaptains = (Object.entries(dynamicWaiterStats) as [string, any][])
                      .filter(([name]) => name !== 'Self')
                      .sort((a, b) => b[1].salesVolume - a[1].salesVolume);
                    
                    if (sortedCaptains.length > 0 && sortedCaptains[0][1].salesVolume > 0) {
                      return (
                        <>
                          <p className="text-sm font-black text-slate-800 dark:text-white truncate max-w-[130px]">{sortedCaptains[0][0]}</p>
                          <p className="text-[9px] text-rose-500 font-mono">₹{sortedCaptains[0][1].salesVolume.toFixed(0)} Attributed</p>
                        </>
                      );
                    }
                    return (
                      <>
                        <p className="text-sm font-black text-slate-400">None Active</p>
                        <p className="text-[9px] text-slate-400 font-mono">Zero sales logged</p>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* MAIN WAITER PERFORMANCE LEDGER TABLE */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl shadow-3xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Captain Staff Commission Performance Ledger</h4>
                  <p className="text-[10px] text-gray-450">
                    Live breakdown of individual commission checks during the active timeframe
                    {shiftFilter !== 'all' && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-indigo-50 text-indigo-600 font-mono font-bold dark:bg-indigo-950/40 dark:text-indigo-400">
                        {shiftFilter.toUpperCase()} SHIFT ONLY
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 font-mono font-bold rounded px-2.5 py-1">
                  Commission Bracket Range: 4% - 6%
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-[9px] text-slate-400 font-mono uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                      <th className="px-4 py-3">Captain Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Avg Rating</th>
                      <th className="px-4 py-3 text-center">Tickets Serviced</th>
                      <th className="px-4 py-3 text-right">Attributed Sales</th>
                      <th className="px-4 py-3 text-center">Commission %</th>
                      <th className="px-4 py-3 text-right">Commission Accrued</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                    {(Object.entries(dynamicWaiterStats) as [string, any][]).map(([wName, wStat]) => {
                      const rosterInfo = waiters.find(w => w.name === wName);
                      const isRegistered = !!rosterInfo;
                      const status = isRegistered ? rosterInfo.status : 'active';
                      const rating = isRegistered ? rosterInfo.rating : 5.0;
                      const commissionRate = isRegistered ? rosterInfo.commissionRate : 0; // Self Counter has 0%

                      return (
                        <React.Fragment key={wName}>
                          <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 font-medium ${selectedWaiterDetailName === wName ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-800 dark:text-slate-205">{wName}</div>
                              <div className="text-[9px] text-gray-400 font-mono">
                                {isRegistered ? `ID: ${rosterInfo.id} • Joined ${rosterInfo.joiningDate}` : 'Point-of-Sells Center Counter'}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {wName === 'Self' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">Counter Default</span>
                              ) : status === 'active' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold font-mono">ON SHIFT</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-50 text-rose-650 dark:bg-rose-950/35 dark:text-rose-450 font-mono">OFF DUTY</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {wName === 'Self' ? (
                                <span className="text-gray-300 font-mono">-</span>
                              ) : (
                                <div className="flex items-center justify-center space-x-1 font-mono text-amber-500 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                                  <span>{rating.toFixed(1)}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-705 dark:text-slate-300">
                              {wStat.ordersCount}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                              ₹{wStat.salesVolume.toFixed(0)}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-indigo-650 dark:text-indigo-400 font-bold">
                              {commissionRate > 0 ? `${commissionRate}%` : '0%'}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-black text-amber-500 font-bold">
                              ₹{wStat.commissionEarned.toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => {
                                    soundEffects.playTick();
                                    setSelectedWaiterDetailName(selectedWaiterDetailName === wName ? null : wName);
                                  }}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${selectedWaiterDetailName === wName ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300'}`}
                                >
                                  {selectedWaiterDetailName === wName ? 'Hide Logs' : 'View Audit'}
                                </button>
                                
                                {wName !== 'Self' && wStat.commissionEarned > 0 && (
                                  <>
                                    <button
                                      onClick={() => {
                                        soundEffects.playSuccessChime();
                                        setPayoutStatusMessage(`Disbursed ₹${wStat.commissionEarned.toFixed(2)} cash commission payout directly to Captain ${wName} for shift of ${wStat.ordersCount} registered tickets.`);
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold border border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 rounded-lg dark:border-emerald-900/30 dark:hover:bg-emerald-950/20 cursor-pointer"
                                    >
                                      Settle Payout
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        if (printWindow) {
                                          const printContent = `
                                            <html>
                                              <head>
                                                <title>BiteSpeed - Commission Shift Slip</title>
                                                <style>
                                                  body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 5px; font-size: 11px; line-height: 1.4; color: #000; }
                                                  .text-center { text-align: center; }
                                                  .text-right { text-align: right; }
                                                  .bold { font-weight: bold; }
                                                  .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
                                                  .item-row { display: flex; justify-content: space-between; }
                                                  .header { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
                                                </style>
                                              </head>
                                              <body>
                                                <div class="text-center">
                                                  <div class="header">BITESPEED COMMAND</div>
                                                  <div>STAFF COMMISSIONS DISBURSEMENT</div>
                                                  <div>================================</div>
                                                </div>
                                                <div><strong>STAFF MEMBER:</strong> ${wName}</div>
                                                <div><strong>ROSTER CODE:</strong> ${rosterInfo ? rosterInfo.id : 'N/A'}</div>
                                                <div><strong>COMM RATE:</strong> ${commissionRate}%</div>
                                                <div><strong>RATING INDEX:</strong> ★${rating.toFixed(1)}</div>
                                                <div class="divider"></div>
                                                <div class="bold">SHIFT STATISTICS LIST:</div>
                                                <div class="item-row">
                                                  <span>Total Tickets Serviced:</span>
                                                  <span>${wStat.ordersCount}</span>
                                                </div>
                                                <div class="item-row">
                                                  <span>Gross Attributed Sales:</span>
                                                  <span>INR ${wStat.salesVolume.toFixed(2)}</span>
                                                </div>
                                                <div class="divider"></div>
                                                <div class="item-row bold" style="font-size: 12px;">
                                                  <span>TOTAL COMMISSION EARNED:</span>
                                                  <span>INR ${wStat.commissionEarned.toFixed(2)}</span>
                                                </div>
                                                <div class="divider"></div>
                                                <div class="text-center" style="margin-top: 15px;">
                                                  <p>__________________________</p>
                                                  <p>Captain Authorized Signature</p>
                                                  <p style="font-size: 8px; color: #555;">Printed at ${new Date().toLocaleString()}</p>
                                                </div>
                                                <script>window.print(); window.close();</script>
                                              </body>
                                            </html>
                                          `;
                                          printWindow.document.write(printContent);
                                          printWindow.document.close();
                                        }
                                      }}
                                      className="p-1 px-1.5 py-1 text-slate-400 hover:text-indigo-655 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                                      title="Print Slip"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDABLE REGISTER DETAIL ORDERS AUDIT LOG */}
                          {selectedWaiterDetailName === wName && (
                            <tr>
                              <td colSpan={8} className="bg-slate-50/50 dark:bg-slate-900/40 p-4 border-b border-gray-150 dark:border-slate-800">
                                <div className="space-y-3 max-w-4xl mx-auto">
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                                      Dynamic Invoiced Sales Ledger Audit for {wName}
                                    </h5>
                                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold font-mono">
                                      {wStat.detailedOrders.length} settled cases matched timeframe
                                    </span>
                                  </div>

                                  {wStat.detailedOrders.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-gray-400 italic bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                                      No attributed invoices settled during selected date boundaries.
                                    </div>
                                  ) : (
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-800 overflow-hidden shadow-2xs">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 dark:bg-slate-800/40 text-[9px] text-slate-400 font-mono border-b border-gray-100 dark:border-slate-800">
                                          <tr>
                                            <th className="px-3 py-2">Invoice #</th>
                                            <th className="px-3 py-2">Source Table</th>
                                            <th className="px-3 py-2">Settlement Date</th>
                                            <th className="px-3 py-2">MOP</th>
                                            <th className="px-3 py-2 text-right">Bill Value</th>
                                            <th className="px-3 py-2 text-center">Comm Share</th>
                                            <th className="px-3 py-2 text-right">Payout Earned</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40 font-mono text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900">
                                          {wStat.detailedOrders.map((ord, oIdx) => (
                                            <tr key={oIdx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20">
                                              <td className="px-3 py-2 text-slate-900 dark:text-white font-bold">{ord.billNumber}</td>
                                              <td className="px-3 py-2 font-sans font-medium text-slate-600 dark:text-slate-200">{ord.tableName}</td>
                                              <td className="px-3 py-2 text-[10px] text-gray-400 dark:text-slate-400">{new Date(ord.createdAt).toLocaleString()}</td>
                                              <td className="px-3 py-2 text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400">{ord.paymentMethod}</td>
                                              <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300">₹{ord.grandTotal.toFixed(2)}</td>
                                              <td className="px-3 py-2 text-center text-indigo-500 dark:text-indigo-400 font-bold">{commissionRate}%</td>
                                              <td className="px-3 py-2 text-right font-extrabold text-amber-500">₹{ord.commissionAmount.toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: GST & TAX SLABS AUDIT RENDERING */}
        {activeReportTab === 'taxes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-2">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Taxable Turnover (Base Value)</span>
                <h3 className="text-2xl font-black font-mono text-slate-800 dark:text-white">
                  ₹{(stats.totalSubtotal - stats.totalDiscounts).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] text-gray-400">Excluding direct service additions and last-mile fees</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-2">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">CGST (Central Tax 50% split)</span>
                <h3 className="text-2xl font-black font-mono text-slate-800 dark:text-white">
                  ₹{(stats.totalTax / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] text-slate-400 font-mono">Central Goods & Services Tax pool</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-2">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">SGST (State Tax 50% split)</span>
                <h3 className="text-2xl font-black font-mono text-slate-800 dark:text-white">
                  ₹{(stats.totalTax / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] text-slate-400 font-mono">State Goods & Services Tax pool</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">GST Slab-Wise Reconciliation Audit</h4>
                <p className="text-[10px] text-gray-400">Full breakdown of active POS invoices categorized by tax brackets</p>
              </div>

              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-450 uppercase tracking-wider text-[9.5px] border-b border-slate-150 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Slab Code Label</th>
                      <th className="p-3 text-center">Items Count</th>
                      <th className="p-3 text-right">Apportioned Discounts</th>
                      <th className="p-3 text-right">Taxable Turnover (Base)</th>
                      <th className="p-3 text-right">CGST (Half-Split)</th>
                      <th className="p-3 text-right">SGST (Half-Split)</th>
                      <th className="p-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">Total GST Tax Liability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {taxAuditReports.length > 0 ? (
                      taxAuditReports.map((tax, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                          <td className="p-3 font-semibold text-slate-800 dark:text-white text-sm">
                            GST @ {tax.slabRate}%
                          </td>
                          <td className="p-3 text-center font-bold">{tax.itemCount} items</td>
                          <td className="p-3 text-right text-rose-500 font-medium">- ₹{tax.discountsApportioned.toFixed(2)}</td>
                          <td className="p-3 text-right font-medium">₹{tax.baseValue.toFixed(2)}</td>
                          <td className="p-3 text-right text-slate-400">₹{tax.cgst.toFixed(2)}</td>
                          <td className="p-3 text-right text-slate-400">₹{tax.sgst.toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-indigo-300">
                            ₹{tax.taxAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                          No transactions found containing itemized tax slab info.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-4 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-indigo-950 dark:text-indigo-305 font-sans">
                  <strong className="block font-bold">Reconciliation Notice:</strong>
                  Tax calculations apportion the coupon or general ticket discounts proportionally across items based on their subtotal contribution ratio. This ensures strict audit conformity with standard double-entry bookkeeping of actual tax pools collected compared to pre-discount estimates.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SHIFT PERFORMANCE & SETTLEMENT */}
        {activeReportTab === 'shifts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {shiftReports.map((shift, idx) => {
              const Icon = idx === 0 ? Sun : idx === 1 ? Sunset : Moon;
              const colorClass = idx === 0 ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : idx === 1 ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'text-purple-500 bg-purple-50 dark:bg-purple-950/40';
              const totalRevenue = shift.revenue || 1;
              
              return (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-3xs flex flex-col justify-between space-y-5">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2.5 items-center">
                        <div className={`p-2 rounded-xl ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-sans font-black text-slate-900 dark:text-white text-sm">{shift.name}</h4>
                          <span className="text-[9.5px] font-mono text-slate-400 block">{shift.hours}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-lg font-mono font-bold">
                        {shift.orderCount} tickets
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/70 space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10.5px] text-slate-400 font-bold block">Gross Shift Revenue:</span>
                        <span className="text-xl font-bold font-mono text-slate-800 dark:text-white">₹{shift.revenue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-[9.5px] text-gray-400 font-black uppercase font-mono block">Shift Tender Splits:</span>
                        
                        {/* UPI */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-500 font-mono">UPI / QR Codes</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              ₹{shift.upiRevenue.toFixed(0)} ({getPercentageString(shift.upiRevenue, totalRevenue)})
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: getPercentageString(shift.upiRevenue, totalRevenue) }}></div>
                          </div>
                        </div>

                        {/* Cash */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-500 font-mono">Cash Vault Float</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              ₹{shift.cashRevenue.toFixed(0)} ({getPercentageString(shift.cashRevenue, totalRevenue)})
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: getPercentageString(shift.cashRevenue, totalRevenue) }}></div>
                          </div>
                        </div>

                        {/* Card */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-500 font-mono">POS Card Terminal</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              ₹{shift.cardRevenue.toFixed(0)} ({getPercentageString(shift.cardRevenue, totalRevenue)})
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: getPercentageString(shift.cardRevenue, totalRevenue) }}></div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150/40 dark:border-slate-850 text-[10px] space-y-1 leading-normal font-sans font-medium text-slate-500">
                    <div className="flex justify-between">
                      <span>Shift Tax Collected:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">₹{shift.taxes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shift Discounts Allowed:</span>
                      <span className="font-mono text-rose-500 font-bold">- ₹{shift.discounts.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-205 dark:border-slate-800 font-bold text-[10.5px] text-slate-700 dark:text-slate-300">
                      <span>Net Shift Sales:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{(shift.revenue - shift.taxes).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 8: HOURLY PERFORMANCE & PEAK LOADS */}
        {activeReportTab === 'hourly' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Hourly sales timeline bar chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">24-Hour Bistro Load Distribution</h4>
                <p className="text-[10px] text-gray-400">Footfall hourly revenue trends and active kitchen ticket capacities</p>
              </div>

              {/* Graphical representation */}
              <div className="space-y-4 pt-2">
                {/* Max sales in hour */}
                {(() => {
                  const maxHourRev = Math.max(...hourlyReportStats.map(h => h.revenue)) || 1;
                  const activeHours = hourlyReportStats.filter(h => h.revenue > 0);
                  
                  return (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {hourlyReportStats.map((h, i) => {
                        const pct = (h.revenue / maxHourRev) * 100;
                        const hasSales = h.revenue > 0;
                        
                        return (
                          <div key={i} className={`flex items-center gap-3 text-xs ${hasSales ? 'opacity-100' : 'opacity-30 dark:opacity-20'}`}>
                            <span className="w-16 font-mono font-bold text-slate-500 shrink-0 text-[10px]">{h.label}</span>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-5 border border-slate-100 dark:border-slate-850 rounded-lg overflow-hidden flex items-center relative">
                              <div 
                                className={`h-full opacity-80 rounded-l-md transition-all duration-500 ${
                                  pct > 75 
                                    ? 'bg-gradient-to-r from-indigo-500 to-rose-500' 
                                    : pct > 35 
                                      ? 'bg-gradient-to-r from-indigo-505 to-indigo-600' 
                                      : 'bg-indigo-300 dark:bg-indigo-850'
                                }`}
                                style={{ width: `${Math.max(hasSales ? 4 : 0, pct)}%` }}
                              ></div>
                              
                              {hasSales && (
                                <span className="absolute left-2.5 text-[9.5px] font-black font-mono text-slate-900 dark:text-white drop-shadow-xs">
                                  ₹{h.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                              )}
                            </div>
                            <span className="w-18 font-mono text-[10.5px] text-right text-slate-400 shrink-0">
                              {h.orderCount > 0 ? `${h.orderCount} bills` : '0 sales'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Peak hour analytics and metrics card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Kitchen Load Peak Diagnoses</h4>
                <p className="text-[10px] text-gray-400">Peak dining time frames and capacity planning tips</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-rose-500/[0.04] border border-rose-500/10 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-mono font-black text-rose-500 block">Peak Slot (Highest Revenue)</span>
                  <strong className="block text-base font-bold text-slate-900 dark:text-white">
                    {(() => {
                      const sorted = [...hourlyReportStats].sort((a,b) => b.revenue - a.revenue);
                      if (sorted[0]?.revenue === 0) return 'No Peak Data';
                      return `${sorted[0]?.label || 'NA'} (₹${sorted[0]?.revenue.toFixed(1)})`;
                    })()}
                  </strong>
                  <span className="text-[10px] text-slate-400 block pt-0.5">Kitchen staff should operate at full strength here.</span>
                </div>

                <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-mono font-black text-emerald-500 block">Busy Ticket Hours (Highest volumes)</span>
                  <strong className="block text-base font-bold text-slate-900 dark:text-white">
                    {(() => {
                      const sorted = [...hourlyReportStats].sort((a,b) => b.orderCount - a.orderCount);
                      if (sorted[0]?.orderCount === 0) return 'No Traffic Data';
                      return `${sorted[0]?.label || 'NA'} (${sorted[0]?.orderCount} order tickets issued)`;
                    })()}
                  </strong>
                  <span className="text-[10px] text-slate-400 block pt-0.5">Indicates dense ticketing times requiring prompt expediting.</span>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-4 border border-indigo-150/40 dark:border-indigo-900/35 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-mono font-black text-indigo-700 dark:text-indigo-400 block">Staffing Recommandation:</span>
                  <p className="text-[11px] leading-relaxed text-indigo-950 dark:text-indigo-305 font-sans font-medium">
                    Based on transactional trends, lunch hours (12 PM - 3 PM) and late dinner segments (7 PM - 10 PM) are prime revenue bottlenecks. Schedule chef prep cycles 1.5 hours prior to these slots to optimize inventory portion scaling and limit KOT turnaround delays.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 9: PATRON LOYALTY INSIGHTS */}
        {activeReportTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">CRM Patron Lifetime Value Ledger</h4>
                <p className="text-[10px] text-gray-400">Loyalty rankings compiled from active billing guest records</p>
              </div>
              <span className="text-[10.5px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/40 font-mono font-black">
                Loyal Records Registered: {customerLoyaltyStats.length}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-450 uppercase tracking-wider text-[9.5px] border-b border-slate-150 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Guest Identity Details</th>
                      <th className="p-3 text-center">Visit frequency</th>
                      <th className="p-3 text-right">Lifetime Spent Pool</th>
                      <th className="p-3 text-right">Average Invoiced Ticket</th>
                      <th className="p-3 text-center">Tender Favorite</th>
                      <th className="p-3">Last Visit Recorded</th>
                      <th className="p-3 text-center">Patron Status Band</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans text-slate-700 dark:text-slate-300">
                    {customerLoyaltyStats.length > 0 ? (
                      customerLoyaltyStats.map((cust, index) => {
                        const isVip = cust.totalSpend >= 4000;
                        const isSilver = cust.totalSpend >= 1500 && cust.totalSpend < 4000;
                        
                        return (
                          <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15">
                            <td className="p-3.5">
                              <div className="space-y-0.5">
                                <span className="block font-bold text-slate-900 dark:text-white text-sm">{cust.name}</span>
                                <span className="block text-[10.5px] text-slate-400 font-mono font-medium">{cust.phone}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {cust.orderCount} checkouts
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                              ₹{cust.totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-500">
                              ₹{cust.averageTicket.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[10px] uppercase font-black bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400">
                                {cust.paymentPreferred}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">
                              {new Date(cust.lastVisit).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3 text-center font-sans">
                              {isVip ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 dark:bg-amber-955/30 dark:text-amber-400 border border-amber-300 dark:border-amber-900/60 rounded-md shadow-xs animate-pulse">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                                  <span>Gold VIP Patron</span>
                                </span>
                              ) : isSilver ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-750 rounded-md">
                                  <Award className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>Silver loyalty</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-md">
                                  <span>Standard Walkin</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic font-sans text-xs">
                          No customer profiles found with linked invoice loyalty records in the selected date boundaries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: PROFIT & LOSS (P&L) LEDGER */}
        {activeReportTab === 'pnl' && (
          <div className="space-y-6 animate-in fade-in duration-200" id="pnl-ledger-report-tab">
            {/* Header Description */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Profit & Loss (P&L) Statement Ledger</h4>
                <p className="text-[10px] text-slate-400">GAAP-aligned reporting reflecting realized revenues, recipe/estimated cost of goods sold, and operational expenses</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-450 uppercase font-mono font-bold">Unlinked COGS Factor:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-150 dark:border-slate-800">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={unlinkedCogsPercent}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 0));
                      setUnlinkedCogsPercent(val);
                    }}
                    className="w-10 bg-transparent text-right font-mono text-xs font-black border-none focus:outline-none focus:ring-0 p-0 text-slate-900 dark:text-white cursor-pointer"
                    id="unlinked-cogs-input"
                  />
                  <span className="text-[10px] font-mono text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="pnl-kpi-cards-grid">
              {/* Card 1: Net Revenue */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 shadow-3xs" id="pnl-net-revenue-card">
                <div className="flex justify-between items-center text-slate-450">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider">Net Realized Revenue</span>
                  <div className="p-1 px-1.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-md">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xl font-extrabold text-slate-905 dark:text-white font-mono block">
                    ₹{pnlReports.netRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block font-sans">
                    Gross ₹{pnlReports.grossRevenue.toFixed(0)} - Discounts ₹{stats.totalDiscounts.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Card 2: Cost of Goods (COGS) */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 shadow-3xs" id="pnl-cogs-card">
                <div className="flex justify-between items-center text-slate-450">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider">Cost of Goods (COGS)</span>
                  <div className="p-1 px-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-md">
                    <TrendingDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xl font-extrabold text-slate-905 dark:text-white font-mono block">
                    ₹{pnlReports.totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block font-sans">
                    Linked recipe: ₹{pnlReports.recipeCogsSum.toFixed(0)} | Fallback estimate: ₹{pnlReports.estimatedCogsSum.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Card 3: Gross Margin */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 shadow-3xs" id="pnl-gross-margin-card">
                <div className="flex justify-between items-center text-slate-450">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider">Gross Profit Margin</span>
                  <div className="p-1 px-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-md font-mono text-[9.5px] font-black">
                    {pnlReports.grossProfitMarginPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xl font-extrabold text-indigo-900 dark:text-indigo-305 font-mono block">
                    ₹{pnlReports.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block font-sans">
                    Substances gross margin contribution
                  </span>
                </div>
              </div>

              {/* Card 4: Bottom-Line Net Income */}
              <div 
                id="pnl-net-profit-card"
                className={`p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 shadow-3xs ${pnlReports.netProfit >= 0 ? 'bg-emerald-50/20 dark:bg-emerald-950/5' : 'bg-rose-50/20 dark:bg-rose-950/5'}`}
              >
                <div className="flex justify-between items-center text-slate-450">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider">Bottom-Line Net Profit</span>
                  <div className={`p-1 px-1.5 rounded-md font-mono text-[9.5px] font-black ${pnlReports.netProfit >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                    {pnlReports.netProfitMarginPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className={`text-xl font-extrabold font-mono block ${pnlReports.netProfit >= 0 ? 'text-emerald-650 dark:text-emerald-400' : 'text-rose-650 dark:text-rose-400'}`}>
                    ₹{pnlReports.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block font-sans">
                    Realized profit after ₹{pnlReports.totalOperatingExpenses.toFixed(0)} OPEX
                  </span>
                </div>
              </div>
            </div>

            {/* Core Section: Expense Entry & Operating Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="pnl-expense-entry-logs-grid">
              {/* Setup Form Panel */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-4" id="pnl-expense-form-container">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-450" />
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Record Operating Expense (OPEX)</h5>
                </div>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newExpDesc.trim()) return;
                    const amountNum = parseFloat(newExpAmount);
                    if (isNaN(amountNum) || amountNum <= 0) return;
                    
                    handleAddExpense(newExpDesc.trim(), newExpCat, amountNum, newExpDate);
                    soundEffects.playSuccessChime();
                    setNewExpDesc('');
                    setNewExpAmount('');
                  }}
                  className="space-y-3.5 font-sans"
                  id="pnl-expense-interactive-form"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Outflow Category</label>
                    <select
                      value={newExpCat}
                      onChange={(e: any) => {
                        soundEffects.playTick();
                        setNewExpCat(e.target.value);
                      }}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-2.5 text-slate-990 dark:text-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      id="expense-category-selector"
                    >
                      <option value="Rent">Rent & Lease</option>
                      <option value="Salaries">Staff Salaries</option>
                      <option value="Utilities">Utilities (Gas, Electricity, Water)</option>
                      <option value="Supplies font-sans">Operating Supplies</option>
                      <option value="Marketing">Marketing & Ad Campaigns</option>
                      <option value="Maintenance">Maintenance & Repairs</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Particulars / Description</label>
                    <input
                      type="text"
                      placeholder="e.g., Gas cylinder replacement"
                      value={newExpDesc}
                      onChange={(e) => setNewExpDesc(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                      id="expense-description-field"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Debit Amount (₹)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder="0.00"
                        value={newExpAmount}
                        onChange={(e) => setNewExpAmount(e.target.value)}
                        required
                        className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                        id="expense-amount-field"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Expense Date</label>
                      <input
                        type="date"
                        value={newExpDate}
                        onChange={(e) => setNewExpDate(e.target.value)}
                        required
                        className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        id="expense-date-field"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono uppercase font-black text-[10.5px] rounded-lg tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-xs"
                    id="submit-expense-button"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Post Operational Outflow</span>
                  </button>
                </form>
              </div>

              {/* Dynamic Ledger Summary Table */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/80 lg:col-span-2 space-y-4" id="pnl-outflow-ledger-container">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-450" />
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Debit Outflows Ledger</h5>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Filtered Active Rows: {pnlReports.filteredExpenses.length + (pnlReports.totalWaiterCommissions > 0 ? 1 : 0)}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs" id="pnl-outflow-ledger-table">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-450 uppercase tracking-wider text-[9px] border-b border-slate-150 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Particulars / Details</th>
                        <th className="p-2.5 text-right">Debit Out (₹)</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {/* Interactive Waiter Commissions (Automatically Pulled from Shift performance) */}
                      {pnlReports.totalWaiterCommissions > 0 && (
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15">
                          <td className="p-2.5 font-mono text-slate-400 text-[11px]">Auto</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-amber-700 bg-amber-100 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400">
                              Salaries (Comm)
                            </span>
                          </td>
                          <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                            Waiter Commissions (Interactive Shift Aggregates)
                          </td>
                          <td className="p-2.5 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                            ₹{pnlReports.totalWaiterCommissions.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[9.5px] text-slate-400 italic font-sans">immutable</span>
                          </td>
                        </tr>
                      )}

                      {/* User Added Custom Operational Expenses */}
                      {pnlReports.filteredExpenses.length > 0 ? (
                        pnlReports.filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15">
                            <td className="p-2.5 font-mono text-[11px]">
                              {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-150 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                                {exp.category}
                              </span>
                            </td>
                            <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                              {exp.description}
                            </td>
                            <td className="p-2.5 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                              ₹{exp.amount.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEffects.playTick();
                                  handleDeleteExpense(exp.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-colors cursor-pointer border-none bg-transparent"
                                title="Remove expense entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        pnlReports.totalWaiterCommissions <= 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-slate-400 text-center italic font-sans text-xs">
                              No operational expense outflows posted in the selected {dateFilter} filter boundary.
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Comprehensive GAAP-Style Direct Statement Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-3xs p-6 space-y-6" id="pnl-formal-statement-container">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">Operating Income Statement (P&L Ledger Detail)</h5>
                  <p className="text-[10px] text-slate-400">Accrued breakdown under {dateFilter === 'all' ? 'All Transactions' : `Filter: ${dateFilter}`}</p>
                </div>
                <div className="text-right text-[10.5px] font-mono font-bold text-slate-450 uppercase">
                  Statement Currency: INR (₹)
                </div>
              </div>

              {/* Statement Structure */}
              <div className="space-y-4 font-mono text-xs">
                {/* 1. Operating Revenue Flows */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-450 border-b border-dashed border-slate-200 dark:border-slate-800 py-1">
                    <span>1. OPERATING REVENUE FLOWS</span>
                    <span>CREDIT (+)</span>
                  </div>
                  <div className="pl-4 space-y-1.5 py-1 text-slate-650 dark:text-slate-350">
                    <div className="flex justify-between items-center">
                      <span>Food & Beverages Billing (Subtotal)</span>
                      <span>₹{stats.totalSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Service Charges Collected</span>
                      <span>₹{stats.totalServiceCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Delivery Fee Recovery</span>
                      <span>₹{(stats.totalDeliveryCharge || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-550">
                      <span>Less: Promotional Discounts Offered & Allowed</span>
                      <span>-₹{stats.totalDiscounts.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg text-slate-900 dark:text-white mt-1">
                    <span>TOTAL REALIZED NET REVENUE (A)</span>
                    <span>₹{pnlReports.netRevenue.toFixed(2)}</span>
                  </div>
                </div>

                {/* 2. Direct Costs (COGS) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-450 border-b border-dashed border-slate-200 dark:border-slate-800 py-1">
                    <span>2. DIRECT MATERIAL SERVICE COST (COGS)</span>
                    <span>DEBIT (-)</span>
                  </div>
                  <div className="pl-4 space-y-1.5 py-1 text-slate-650 dark:text-slate-350">
                    <div className="flex justify-between items-center">
                      <span>Linked Recipe Ingredients Cost ({pnlReports.recipeLinkedItemsCount} portions linked)</span>
                      <span>₹{pnlReports.recipeCogsSum.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Estimated Unlinked Ingredients Cost ({pnlReports.fallbackItemsCount} portions at {unlinkedCogsPercent}%)</span>
                      <span>₹{pnlReports.estimatedCogsSum.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg text-slate-900 dark:text-white mt-1">
                    <span>TOTAL MATERIAL COST OF GOODS SOLD (B)</span>
                    <span>₹{pnlReports.totalCOGS.toFixed(2)}</span>
                  </div>
                </div>

                {/* Primary Gross Margin Line */}
                <div className="flex justify-between items-center font-black bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-2.5 border border-indigo-150/30 dark:border-indigo-900/40 rounded-xl text-slate-900 dark:text-white text-[11.5px]">
                  <span>3. REVENUE GROSS PROFIT CONTRIBUTION (A - B)</span>
                  <span>₹{pnlReports.grossProfit.toFixed(2)}</span>
                </div>

                {/* 3. Operating Indebts (OPEX) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-450 border-b border-dashed border-slate-200 dark:border-slate-800 py-1">
                    <span>4. OPERATING INDIRECT DEBITS (OPEX)</span>
                    <span>DEBIT (-)</span>
                  </div>
                  <div className="pl-4 space-y-1.5 py-1 text-slate-650 dark:text-slate-350">
                    <div className="flex justify-between items-center">
                      <span>Waiter commissions on shifts (Performance-Based)</span>
                      <span>₹{pnlReports.totalWaiterCommissions.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>In-ledger Recorded Expenses (Custom Added)</span>
                      <span>₹{pnlReports.customExpensesSum.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg text-slate-900 dark:text-white mt-1">
                    <span>TOTAL OPERATING DEBITS (C)</span>
                    <span>₹{pnlReports.totalOperatingExpenses.toFixed(2)}</span>
                  </div>
                </div>

                {/* Final Income Line */}
                <div className={`flex justify-between items-center font-black px-4 py-3 border rounded-xl text-xs sm:text-[13px] ${pnlReports.netProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400'}`}>
                  <span>5. DYNAMIC NET BUSINESS INCOME (A - B - C)</span>
                  <div className="space-x-2">
                    <span>({pnlReports.netProfitMarginPercent.toFixed(1)}%)</span>
                    <span>₹{pnlReports.netProfit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'dues' && (
          <div className="space-y-6 animate-in fade-in duration-200" id="customer-dues-tab">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Customer Outstanding Dues Ledger</h4>
                <p className="text-[10px] text-slate-400">Track and settle customer credits and outstanding liabilities securely</p>
              </div>
            </div>

            {/* Dues Overview Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="dues-metrics-row">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 shadow-3xs">
                <div className="flex justify-between items-center text-slate-450">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider">Total Outstanding Dues</span>
                  <div className="p-1 px-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-md">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono block font-bold">
                  ₹{duesStats.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 shadow-3xs">
                <div className="flex justify-between items-center text-slate-450">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider">Unpaid Due Invoices</span>
                  <div className="p-1 px-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-md">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono block font-bold">
                  {duesStats.count} bills
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 shadow-3xs">
                <div className="flex justify-between items-center text-slate-450">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider">Active Debtors</span>
                  <div className="p-1 px-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-md">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono block font-bold">
                  {duesStats.uniqueDebtors} customers
                </h3>
              </div>
            </div>

            {/* Dues table list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-3xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="font-bold text-xs uppercase text-slate-455 tracking-wider font-mono">Dues Invoices Register</h4>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Invoice, Customer Name, Phone..."
                    value={duesSearch}
                    onChange={(e) => setDuesSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-455 uppercase tracking-wider text-[9.5px] border-b border-slate-150 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Customer Info</th>
                      <th className="p-3">Table name</th>
                      <th className="p-3 text-right">Outstanding Amount (₹)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans text-slate-700 dark:text-slate-350">
                    {filteredDueBills.length > 0 ? (
                      filteredDueBills.map((bill, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15">
                          <td className="p-3 font-mono font-bold text-indigo-650 dark:text-indigo-400">
                            {bill.billNumber}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(bill.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-left">
                            <div className="space-y-0.5 text-left">
                              <span className="block font-bold text-slate-900 dark:text-white text-xs">{bill.customerName}</span>
                              <span className="block text-[10px] text-slate-400 font-mono font-medium">{bill.customerPhone}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono">
                            {bill.tableName}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-rose-600 dark:text-rose-450 text-xs font-bold">
                            ₹{bill.grandTotal.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playTick();
                                setSettlingDueBill(bill);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer border-none font-sans"
                            >
                              Settle Due
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-450 italic font-sans text-xs">
                          No pending customer dues found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Settle Due Dialog Modal */}
            {settlingDueBill && (
              <div id="settle-due-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-text">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                  <button
                    type="button"
                    onClick={() => setSettlingDueBill(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer font-bold border-none bg-transparent"
                  >
                    ✕
                  </button>
                  <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-400 mb-4 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <DollarSign className="w-4 h-4 text-indigo-650" />
                    <span>Settle Bill Due</span>
                  </h3>
                  
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-850/85 rounded-xl text-xs space-y-1.5 mb-4 text-left">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Invoice Ref</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-250">{settlingDueBill.billNumber}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Guest Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-250 text-xs">{settlingDueBill.customerName} ({settlingDueBill.customerPhone})</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Pending Amount</span>
                      <span className="font-mono font-black text-rose-605 dark:text-rose-450 font-bold">₹{settlingDueBill.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!onUpdateBill) return;
                      const updated: EstimateBill = {
                        ...settlingDueBill,
                        paymentMethod: settlePaymentMode
                      };
                      onUpdateBill(updated);
                      soundEffects.playSuccessChime();
                      setSettlingDueBill(null);
                    }}
                    className="space-y-4 font-sans text-xs text-left"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase pl-0.5">Settle Payment Mode</label>
                      <select
                        value={settlePaymentMode}
                        onChange={(e: any) => {
                          soundEffects.playTick();
                          setSettlePaymentMode(e.target.value);
                        }}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold outline-none"
                      >
                        <option value="cash">💵 Cash Box</option>
                        <option value="upi">⚡ UPI QR Scan</option>
                        <option value="card">💳 Card Terminal</option>
                      </select>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-all border-none font-bold"
                      >
                        Confirm Settlement
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlingDueBill(null)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg font-semibold cursor-pointer transition-all border-none font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* View Bill Details Modal Overlay */}
      {viewingBillModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-650 dark:text-indigo-400 text-xs px-2.5 py-1 rounded-lg font-mono font-bold">
                    {viewingBillModal.billNumber}
                  </span>
                  <span>Invoice Audit File</span>
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                  Issued on {new Date(viewingBillModal.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setViewingBillModal(null);
                }}
                className="p-1 px-2 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-colors border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Grid with metadata */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/30 p-4 border border-slate-100 dark:border-slate-850/85 rounded-xl text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Table Covered</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingBillModal.tableName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Order Type</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{viewingBillModal.orderType}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Duty Captain</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingBillModal.currentWaiter || 'Counter Personnel'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Settlement Mode</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{viewingBillModal.paymentMethod || 'CASH'}</span>
                </div>
                {viewingBillModal.customerName && (
                  <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Walk-In Guest</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {viewingBillModal.customerName} {viewingBillModal.customerPhone ? `(${viewingBillModal.customerPhone})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ordered Items ({viewingBillModal.items.length})</h4>
                <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-950/45 p-2.5 font-black uppercase text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-850">
                    <span className="col-span-6">Item Name</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Price</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-850 bg-white dark:bg-slate-900/40">
                    {viewingBillModal.items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 p-3 items-center">
                        <span className="col-span-6 font-bold text-slate-850 dark:text-slate-200">{it.name}</span>
                        <span className="col-span-2 text-center">
                          <span className="inline-block font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded px-2 py-0.5 text-[11px]">
                            {it.quantity}
                          </span>
                        </span>
                        <span className="col-span-2 text-right text-slate-500 dark:text-slate-400 font-mono">₹{it.price.toFixed(0)}</span>
                        <span className="col-span-2 text-right font-bold text-slate-800 dark:text-slate-100 font-mono">₹{(it.price * it.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing Math */}
              <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl space-y-2 text-xs border border-slate-150/40 dark:border-slate-850">
                <div className="flex justify-between text-slate-500 dark:text-slate-455">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{viewingBillModal.subtotal.toFixed(2)}</span>
                </div>
                {viewingBillModal.discountAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-650 dark:text-emerald-400">
                    <span>Discounted Value:</span>
                    <span className="font-mono">-₹{viewingBillModal.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 dark:text-slate-455">
                  <span>SGST ({(viewingBillModal.subtotal - viewingBillModal.discountAmount > 0 ? (viewingBillModal.taxAmount / (viewingBillModal.subtotal - viewingBillModal.discountAmount)) * 50 : 0).toFixed(1)}%):</span>
                  <span className="font-mono">₹{(viewingBillModal.taxAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-455">
                  <span>CGST ({(viewingBillModal.subtotal - viewingBillModal.discountAmount > 0 ? (viewingBillModal.taxAmount / (viewingBillModal.subtotal - viewingBillModal.discountAmount)) * 50 : 0).toFixed(1)}%):</span>
                  <span className="font-mono">₹{(viewingBillModal.taxAmount / 2).toFixed(2)}</span>
                </div>
                {viewingBillModal.deliveryCharge && viewingBillModal.deliveryCharge > 0 ? (
                  <div className="flex justify-between text-slate-500 dark:text-slate-455">
                    <span>Delivery Charge:</span>
                    <span className="font-mono">₹{viewingBillModal.deliveryCharge.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span>PAID GRAND TOTAL:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{viewingBillModal.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  printThermalBill(viewingBillModal, false, '58mm');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border-none"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print 58mm</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  printThermalBill(viewingBillModal, false, '80mm');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow-md border-none"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setViewingBillModal(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer bg-white dark:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Daily Shift Summary Modal Overlay */}
      {showShiftSummaryModal && (
        <div id="shift-summary-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                    <Clock className="w-4 h-4 animate-pulse" />
                  </div>
                  <span className="font-sans font-black">Daily Shift Summary Snapshot</span>
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Active POS Terminal Register Audit for {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setShowShiftSummaryModal(false);
                }}
                className="p-1 px-2 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-colors border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Gross Snapshot Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex justify-between items-center shadow-3xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500 dark:text-indigo-405 font-mono">Today's Settlement Revenue</span>
                  <h3 className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                    ₹{todayShiftStats.totalGrossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-indigo-300 flex items-center gap-1.5 font-sans font-semibold">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{todayShiftStats.orderCount} Closed POS Tickets Audited</span>
                  </p>
                </div>
                <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-6xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Grid Cards for Quick Numbers */}
              <div className="grid grid-cols-2 gap-3.5">
                
                {/* GST Liability */}
                <div className="bg-slate-50 dark:bg-slate-950/30 p-4 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">GST liability (CGST+SGST)</span>
                  <span className="text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100 block">
                    ₹{todayShiftStats.totalTax.toFixed(2)}
                  </span>
                  <span className="block text-[9.5px] text-slate-400 leading-none">5.0% inclusive rate</span>
                </div>

                {/* Subtotal trade */}
                <div className="bg-slate-50 dark:bg-slate-950/30 p-4 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">Net subtotal sales</span>
                  <span className="text-lg font-extrabold font-mono text-slate-850 dark:text-slate-100 block">
                    ₹{todayShiftStats.totalSubtotal.toFixed(2)}
                  </span>
                  <span className="block text-[9.5px] text-slate-400 leading-none">Excluding tax & charges</span>
                </div>

              </div>

              {/* Financial Ledger reconciliations breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Financial Reconciliation Ledger</h4>
                
                <div className="bg-slate-50 dark:bg-slate-950/15 p-4 rounded-2xl border border-slate-150/45 dark:border-slate-850 space-y-2 text-xs">
                  
                  <div className="flex justify-between text-slate-600 dark:text-slate-350">
                    <span>Base Gross Sales Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-205">₹{todayShiftStats.totalSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-350">
                    <span>GST Tax collected (2.5%+2.5%):</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-205">₹{todayShiftStats.totalTax.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-350">
                    <span>Gratuity & Service Charges:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-205">₹{todayShiftStats.totalServiceCharge.toFixed(2)}</span>
                  </div>

                  {todayShiftStats.totalDeliveryCharge > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-350">
                      <span>Logistics Delivery Charges:</span>
                      <span className="font-mono font-semibold text-slate-850 dark:text-slate-205">₹{todayShiftStats.totalDeliveryCharge.toFixed(2)}</span>
                    </div>
                  )}

                  {todayShiftStats.totalDiscounts > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>Allowed Campaign Discounts:</span>
                      <span className="font-mono font-bold">-₹{todayShiftStats.totalDiscounts.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <span>TOTAL SHIFT HANDLES:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">₹{todayShiftStats.totalGrossSales.toFixed(2)}</span>
                  </div>

                </div>
              </div>

              {/* Payment Flow Split bars */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Tender Modes Audited</h4>
                
                <div className="bg-slate-50 dark:bg-slate-955/10 p-4 rounded-2xl border border-slate-150/45 dark:border-slate-850 space-y-3.5">
                  
                  {/* UPI */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-650 dark:text-emerald-400 flex items-center gap-1 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>UPI QR Codes / Apps</span>
                      </span>
                      <span className="font-mono text-[11px] font-extrabold text-slate-800 dark:text-slate-205">
                        ₹{todayShiftStats.paymentMethods.upi.toFixed(2)} ({getPercentageString(todayShiftStats.paymentMethods.upi, todayShiftStats.totalGrossSales)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: getPercentageString(todayShiftStats.paymentMethods.upi, todayShiftStats.totalGrossSales) }}
                      ></div>
                    </div>
                  </div>

                  {/* Cash */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-bold">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Cash box float</span>
                      </span>
                      <span className="font-mono text-[11px] font-extrabold text-slate-800 dark:text-slate-205">
                        ₹{todayShiftStats.paymentMethods.cash.toFixed(2)} ({getPercentageString(todayShiftStats.paymentMethods.cash, todayShiftStats.totalGrossSales)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: getPercentageString(todayShiftStats.paymentMethods.cash, todayShiftStats.totalGrossSales) }}
                      ></div>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-bold">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>POS Terminals Card</span>
                      </span>
                      <span className="font-mono text-[11px] font-extrabold text-slate-800 dark:text-slate-205">
                        ₹{todayShiftStats.paymentMethods.card.toFixed(2)} ({getPercentageString(todayShiftStats.paymentMethods.card, todayShiftStats.totalGrossSales)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: getPercentageString(todayShiftStats.paymentMethods.card, todayShiftStats.totalGrossSales) }}
                      ></div>
                    </div>
                  </div>

                  {/* Other */}
                  {todayShiftStats.paymentMethods.other > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 flex items-center gap-1 font-bold">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Other Tender Mode Splits</span>
                        </span>
                        <span className="font-mono text-[11px] font-extrabold text-slate-800 dark:text-slate-205">
                          ₹{todayShiftStats.paymentMethods.other.toFixed(2)} ({getPercentageString(todayShiftStats.paymentMethods.other, todayShiftStats.totalGrossSales)})
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-slate-400 h-full rounded-full transition-all duration-300"
                          style={{ width: getPercentageString(todayShiftStats.paymentMethods.other, todayShiftStats.totalGrossSales) }}
                        ></div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Order channels splits */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Order Channel Distribution</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850 rounded-xl">
                    <span className="block text-[8px] font-black uppercase text-slate-400 font-mono">Dine-In</span>
                    <strong className="block text-sm text-slate-800 dark:text-slate-200 mt-1">{todayShiftStats.orderTypesCount.dineIn} ts</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850 rounded-xl">
                    <span className="block text-[8px] font-black uppercase text-slate-400 font-mono">Takeaway</span>
                    <strong className="block text-sm text-slate-800 dark:text-slate-200 mt-1">{todayShiftStats.orderTypesCount.takeaway} ts</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850 rounded-xl">
                    <span className="block text-[8px] font-black uppercase text-slate-400 font-mono">Delivery</span>
                    <strong className="block text-sm text-slate-800 dark:text-slate-200 mt-1">{todayShiftStats.orderTypesCount.delivery} ts</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-end">
              
              <button
                type="button"
                onClick={handlePrintShiftSummary}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow-md border-none"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shift Slip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setShowShiftSummaryModal(false);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
