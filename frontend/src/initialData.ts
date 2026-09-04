import { MenuItem, Table, KOT, TableOrder, EstimateBill, BillSeries, Customer } from './types';

export const INITIAL_MENU: MenuItem[] = [
  // Appetizers / Starters
  { id: 'm1', name: 'Veg Crispy Spring Rolls', category: 'Starters', price: 180, type: 'veg', available: true, code: 'VSR', gstRate: 5, stockQuantity: 12 },
  { id: 'm2', name: 'Paneer Tikka Multani', category: 'Starters', price: 260, type: 'veg', available: true, code: 'PTM', gstRate: 5, stockQuantity: 4 },
  { id: 'm3', name: 'Spicy Chilli Chicken fry', category: 'Starters', price: 290, type: 'non-veg', available: true, code: 'CCF', gstRate: 5, stockQuantity: 15 },
  { id: 'm4', name: 'Salt & Pepper Prawns', category: 'Starters', price: 340, type: 'non-veg', available: true, code: 'SPP', gstRate: 5, stockQuantity: 9 },
  { id: 'm5', name: 'Classic French Fries Large', category: 'Starters', price: 120, type: 'veg', available: true, code: 'CFF', gstRate: 5, stockQuantity: 2 },

  // Mains
  { id: 'm6', name: 'Paneer Butter Masala', category: 'Mains', price: 280, type: 'veg', available: true, code: 'PBM', gstRate: 5, stockQuantity: 14 },
  { id: 'm7', name: 'Butter Chicken Masala', category: 'Mains', price: 340, type: 'non-veg', available: true, code: 'BCM', gstRate: 5, stockQuantity: 11 },
  { id: 'm8', name: 'Yellow Dal Tadka Double', category: 'Mains', price: 190, type: 'veg', available: true, code: 'YDT', gstRate: 5, stockQuantity: 3 },
  { id: 'm9', name: 'Veg Schezwan Noodles', category: 'Mains', price: 220, type: 'veg', available: true, code: 'VSN', gstRate: 5, stockQuantity: 16 },
  { id: 'm10', name: 'Chicken Dum Biryani (Hyderabadi)', category: 'Mains', price: 320, type: 'non-veg', available: true, code: 'CDB', gstRate: 5, stockQuantity: 18 },
  { id: 'm11', name: 'Assorted Bread Basket', category: 'Mains', price: 150, type: 'veg', available: true, code: 'ABB', gstRate: 5, stockQuantity: 25 },

  // Desserts
  { id: 'm12', name: 'Sizzling Chocolate Brownie', category: 'Desserts', price: 190, type: 'egg', available: true, code: 'SCB', gstRate: 18, stockQuantity: 7 },
  { id: 'm13', name: 'Classic Gulab Jamun (2 Pcs)', category: 'Desserts', price: 90, type: 'veg', available: true, code: 'CGJ', gstRate: 18, stockQuantity: 12 },
  { id: 'm14', name: 'New York Baked Cheesecake', category: 'Desserts', price: 210, type: 'egg', available: true, code: 'NYC', gstRate: 18, stockQuantity: 8 },

  // Beverages
  { id: 'm15', name: 'Mint Virgin Mojito', category: 'Beverages', price: 140, type: 'veg', available: true, code: 'MVM', gstRate: 12, stockQuantity: 20 },
  { id: 'm16', name: 'Mango Lassi Premium', category: 'Beverages', price: 110, type: 'veg', available: true, code: 'MLP', gstRate: 12, stockQuantity: 15 },
  { id: 'm17', name: 'Iced Irish Cold Coffee', category: 'Beverages', price: 130, type: 'veg', available: true, code: 'ICC', gstRate: 12, stockQuantity: 14 },
  { id: 'm18', name: 'Mineral Water Bottled', category: 'Beverages', price: 40, type: 'veg', available: true, code: 'MWB', gstRate: 18, stockQuantity: 30 }
];

export const INITIAL_TABLES: Table[] = [
  { id: 't1', name: 'Table 1', capacity: 2, status: 'vacant', activeOrderId: null },
  { id: 't2', name: 'Table 2', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 't3', name: 'Table 3', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 't4', name: 'Table 4', capacity: 6, status: 'vacant', activeOrderId: null },
  { id: 't5', name: 'Table 5 (VIP)', capacity: 8, status: 'vacant', activeOrderId: null },
  { id: 't6', name: 'Table 6 (Window)', capacity: 2, status: 'vacant', activeOrderId: null },
  { id: 't7', name: 'Table 7 (Balcony)', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 't8', name: 'Table 8', capacity: 4, status: 'vacant', activeOrderId: null }
];

export const INITIAL_ORDERS: TableOrder[] = [];

export const INITIAL_KOTS: KOT[] = [];

export const INITIAL_BILLS: EstimateBill[] = [];

export const INITIAL_BILL_SERIES: BillSeries[] = [
  { id: 'ser-1', name: 'General Dine-In / Tax Invoice', prefix: 'INV-2026-', startNumber: 1001, nextNumber: 1003, type: 'invoice', isActive: true },
  { id: 'ser-2', name: 'Waitstaff Quick Pay POS', prefix: 'POS-SER-', startNumber: 5001, nextNumber: 5001, type: 'invoice', isActive: false },
  { id: 'ser-3', name: 'Takeaway Counter Series', prefix: 'TAKE-INV-', startNumber: 2001, nextNumber: 2001, type: 'invoice', isActive: false },
  { id: 'ser-4', name: 'Corporate / B2B Series', prefix: 'B2B-INV-', startNumber: 3001, nextNumber: 3001, type: 'invoice', isActive: false },
  { id: 'ser-5', name: 'Standard Estimate Slip', prefix: 'EST-2026-', startNumber: 1001, nextNumber: 1003, type: 'estimate', isActive: true },
  { id: 'ser-6', name: 'Draft Quote Slip', prefix: 'EST-DRF-', startNumber: 8001, nextNumber: 8001, type: 'estimate', isActive: false }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Karan Sharma',
    phone: '+91 98765 43210',
    email: 'karan@gmail.com',
    dob: '1995-06-13', // Set to current date 13th June to trigger live birthday preview!
    lifetimeSpend: 803,
    orderCount: 1,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    notes: 'Regular guest. Prefers spicy starters and iced craft coffee.'
  },
  {
    id: 'c2',
    name: 'Ananya Roy',
    phone: '+91 91234 56789',
    email: 'ananya@yahoo.com',
    dob: '1998-11-20',
    lifetimeSpend: 869.4,
    orderCount: 1,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    notes: 'Health-conscious explorer. Likes fresh virgin mojitos and mildly sweetened desserts.'
  },
  {
    id: 'c3',
    name: 'Rajesh Malhotra',
    phone: '+91 99887 76655',
    email: 'rajesh@malhotra.co',
    dob: '1984-04-15',
    lifetimeSpend: 2450,
    orderCount: 4,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    notes: 'VIP Diner. Frequently visits with corporate partners.'
  }
];

