/**
 * Types & Interfaces for Rio Restro POS & KOT Billing Software
 */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string; // Date of Birth
  lifetimeSpend: number;
  orderCount: number;
  createdAt: string;
  notes?: string;
  totalPaid?: number;
  totalDue?: number;
}

export interface CustomerDuePayment {
  id: string;
  customerId: string;
  customerPhone: string;
  amountPaid: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'split';
  date: string;
  notes?: string;
  remainingDue: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  type: 'veg' | 'non-veg' | 'egg';
  available: boolean;
  code: string; // Short code like "M1", "A3" for quick keyboard entry
  gstRate?: number; // Custom GST rate for individual item (e.g. 5, 12, 18, etc.)
  image?: string; // Base64 data string or image URL
  stockQuantity?: number; // Real-time ingredient or portion inventory stock count
}

export interface Table {
  id: string;
  name: string; // "Table 1", "Table 2", etc.
  capacity: number;
  status: 'vacant' | 'ordering' | 'kot_pending' | 'billed';
  activeOrderId: string | null;
  currentWaiter?: string;
}

export type KOTItemStatus = 'cooking' | 'ready' | 'served' | 'cancelled';

export interface KOTItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  notes?: string;
  status: KOTItemStatus;
}

export interface KOT {
  id: string;
  kotNumber: string; // e.g. "KOT #42"
  tableId: string;
  tableName: string;
  waiterName?: string;
  createdAt: string;
  items: KOTItem[];
  status: 'pending' | 'completed' | 'cancelled'; // pending if any item is not served/cancelled
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number; // total ordered Quantity
  sentToKitchenQty: number; // Qty already sent via KOT
  notes?: string;
  gstRate?: number; // GST rate active when item is ordered
}

export interface TableOrder {
  id: string;
  tableId: string; // "takeaway" or "delivery" or specific table ID
  tableName: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  items: OrderItem[];
  kotIds: string[]; // Linked KOT numbers
  subtotal: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number; // standard GST overall, e.g. 5%
  serviceChargeRate: number; // e.g. 5%
  deliveryCharge?: number; // Delivery charge at billing time
  grandTotal: number;
  status: 'active' | 'billed' | 'completed' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'upi' | 'due' | 'split';
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  completedAt?: string;
  currentWaiter?: string;
  isCustomerTab?: boolean;
  tabStatus?: 'open' | 'settled';
}

export interface EstimateBill {
  id: string;
  orderId: string;
  billNumber: string; // e.g., "EST-2026-0001"
  type: 'estimate' | 'invoice';
  customerName: string;
  customerPhone: string;
  tableName: string;
  orderType: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  deliveryCharge?: number; // Delivery charge applied
  grandTotal: number;
  createdAt: string;
  paymentMethod?: string;
  currentWaiter?: string;
  isCustomerTab?: boolean;
  tabStatus?: 'open' | 'settled';
  consolidatedOrderIds?: string[];
  isPrinted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  paidAmount?: number;
  dueAmount?: number;
}

export interface BillAuditLog {
  id: string;
  billId: string;
  billNumber: string;
  action: 'deleted' | 'cancelled' | 'updated' | 'printed';
  performedBy: string;
  reason?: string;
  timestamp: string;
  amount: number;
}

export interface CustomerDailyTab {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  date: string;
  status: 'open' | 'settled';
  orders: TableOrder[];
  totalAmount: number;
  createdAt: string;
  settledAt?: string;
  settledPaymentMethod?: string;
  finalBillId?: string;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantityUsed: number;       // e.g. 200
  unit: string;               // e.g. "g", "ml", "pcs", "kg", "l"
  purchasePrice: number;      // Price paid for buying bulk
  purchaseQty: number;        // Packaging quantity bought, e.g. 1
  purchaseUnit: string;       // Bulk purchase unit e.g. "kg", "l", "pcs", "g", "ml"
  calculatedCost: number;     // Material cost calculation
}

export interface DishRecipe {
  id: string;
  menuItemId?: string;        // Optional link to an existing menu item
  dishName: string;
  ingredients: RecipeIngredient[];
  additionalPrepCost: number; // Gas, electricity, spices, charcoal
  labourCost: number;         // Chef time, support crew wages per portion
  wastagePercent: number;     // Food waist margin % (e.g. 5, 10)
  targetPrice: number;        // Selling retail price
  lastUpdated: string;
  foodCostPercent?: number;
  grossMarginPercent?: number;
  suggestedPrice?: number;
}

export interface POSStats {
  totalSales: number;
  totalOrders: number;
  dineInCount: number;
  takeawayCount: number;
  deliveryCount: number;
  popularItems: { name: string; count: number }[];
}

export interface BillSeries {
  id: string;
  name: string;
  prefix: string;
  startNumber: number;
  nextNumber: number;
  type: 'invoice' | 'estimate' | 'all';
  isActive: boolean;
}

export interface OperatingExpense {
  id: string;
  description: string;
  category: 'Rent' | 'Salaries' | 'Utilities' | 'Supplies' | 'Marketing' | 'Maintenance' | 'Miscellaneous';
  amount: number;
  date: string;
}

export interface FeatureToggles {
  billing: boolean;
  crm: boolean;
  expenses: boolean;
  reports: boolean;
  analytics: boolean;
  inventory: boolean;
  tables: boolean;
  bluetoothPrinting: boolean;
  duePayments: boolean;
  advancedReports: boolean;
  staffManagement: boolean;
  customerManagement: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  includedFeatures: (keyof FeatureToggles)[];
  maxOrdersPerMonth?: number;
  maxTables?: number;
  trialPeriodDays: number;
  isActive: boolean;
}

export interface CustomerSubscription {
  id: string;
  tenantId: string;
  planId: string;
  planName: string;
  status: 'active' | 'trialing' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

export interface SystemMessage {
  id: string;
  title: string;
  text: string;
  type: 'expiring' | 'expired' | 'feature_unavailable' | 'upgrade_required' | 'payment_required' | 'new_feature' | 'maintenance';
  visibility: boolean;
  targetUserRole?: 'all' | 'admin' | 'staff' | 'waiter' | 'kot';
  startDate?: string;
  endDate?: string;
  buttonText?: string;
  buttonAction?: string;
}

export interface SupportTicket {
  id: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  type: 'problem' | 'complaint' | 'bug' | 'feature_request' | 'printer_problem' | 'payment_problem' | 'subscription_problem' | 'other';
  description: string;
  createdAt: string;
  status: 'new' | 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  adminReply?: string;
  updatedAt?: string;
}
