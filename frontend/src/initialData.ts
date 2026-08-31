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
  { id: 't2', name: 'Table 2', capacity: 4, status: 'ordering', activeOrderId: 'ord-t2', currentWaiter: 'Rajesh' },
  { id: 't3', name: 'Table 3', capacity: 4, status: 'kot_pending', activeOrderId: 'ord-t3', currentWaiter: 'Sonia' },
  { id: 't4', name: 'Table 4', capacity: 6, status: 'vacant', activeOrderId: null },
  { id: 't5', name: 'Table 5 (VIP)', capacity: 8, status: 'billed', activeOrderId: 'ord-t5', currentWaiter: 'Amit' },
  { id: 't6', name: 'Table 6 (Window)', capacity: 2, status: 'vacant', activeOrderId: null },
  { id: 't7', name: 'Table 7 (Balcony)', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 't8', name: 'Table 8', capacity: 4, status: 'vacant', activeOrderId: null }
];

export const INITIAL_ORDERS: TableOrder[] = [
  {
    id: 'ord-t2',
    tableId: 't2',
    tableName: 'Table 2',
    orderType: 'dine-in',
    items: [
      { menuItemId: 'm1', name: 'Veg Crispy Spring Rolls', price: 180, quantity: 2, sentToKitchenQty: 1, notes: 'Make it extra crispy' },
      { menuItemId: 'm15', name: 'Mint Virgin Mojito', price: 140, quantity: 2, sentToKitchenQty: 2 }
    ],
    kotIds: ['kot-101'],
    subtotal: 500,
    discountValue: 0,
    discountType: 'percentage',
    taxRate: 5,
    serviceChargeRate: 5,
    grandTotal: 550,
    status: 'active',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString() // 35 min ago
  },
  {
    id: 'ord-t3',
    tableId: 't3',
    tableName: 'Table 3',
    orderType: 'dine-in',
    items: [
      { menuItemId: 'm3', name: 'Spicy Chilli Chicken fry', price: 290, quantity: 1, sentToKitchenQty: 1 },
      { menuItemId: 'm10', name: 'Chicken Dum Biryani (Hyderabadi)', price: 320, quantity: 2, sentToKitchenQty: 2, notes: 'Double masala in one' },
      { menuItemId: 'm16', name: 'Mango Lassi Premium', price: 110, quantity: 2, sentToKitchenQty: 2 }
    ],
    kotIds: ['kot-102'],
    subtotal: 1150,
    discountValue: 10,
    discountType: 'percentage', // 10% off
    taxRate: 5,
    serviceChargeRate: 5,
    grandTotal: 1138.5,
    status: 'active',
    createdAt: new Date(Date.now() - 50 * 60000).toISOString() // 50 min ago
  },
  {
    id: 'ord-t5',
    tableId: 't5',
    tableName: 'Table 5 (VIP)',
    orderType: 'dine-in',
    items: [
      { menuItemId: 'm2', name: 'Paneer Tikka Multani', price: 260, quantity: 2, sentToKitchenQty: 2 },
      { menuItemId: 'm6', name: 'Paneer Butter Masala', price: 280, quantity: 2, sentToKitchenQty: 2 },
      { menuItemId: 'm11', name: 'Assorted Bread Basket', price: 150, quantity: 3, sentToKitchenQty: 3 },
      { menuItemId: 'm12', name: 'Sizzling Chocolate Brownie', price: 190, quantity: 4, sentToKitchenQty: 4 }
    ],
    kotIds: ['kot-103', 'kot-104'],
    subtotal: 1990,
    discountValue: 15,
    discountType: 'percentage', // 15% off VIP
    taxRate: 5,
    serviceChargeRate: 5,
    grandTotal: 1860.65,
    status: 'billed',
    createdAt: new Date(Date.now() - 75 * 60000).toISOString() // 1h 15m ago
  }
];

export const INITIAL_KOTS: KOT[] = [
  {
    id: 'kot-101',
    kotNumber: 'KOT #101',
    tableId: 't2',
    tableName: 'Table 2',
    createdAt: new Date(Date.now() - 32 * 60000).toISOString(),
    items: [
      { id: 'ki-1', menuItemId: 'm1', name: 'Veg Crispy Spring Rolls', quantity: 1, notes: 'Make it extra crispy', status: 'ready' },
      { id: 'ki-2', menuItemId: 'm15', name: 'Mint Virgin Mojito', quantity: 2, status: 'served' }
    ],
    status: 'completed'
  },
  {
    id: 'kot-102',
    kotNumber: 'KOT #102',
    tableId: 't3',
    tableName: 'Table 3',
    createdAt: new Date(Date.now() - 48 * 60000).toISOString(),
    items: [
      { id: 'ki-3', menuItemId: 'm3', name: 'Spicy Chilli Chicken fry', quantity: 1, status: 'cooking' },
      { id: 'ki-4', menuItemId: 'm10', name: 'Chicken Dum Biryani (Hyderabadi)', quantity: 2, notes: 'Double masala in one', status: 'cooking' },
      { id: 'ki-5', menuItemId: 'm16', name: 'Mango Lassi Premium', quantity: 2, status: 'ready' }
    ],
    status: 'pending'
  },
  {
    id: 'kot-103',
    kotNumber: 'KOT #103',
    tableId: 't5',
    tableName: 'Table 5 (VIP)',
    createdAt: new Date(Date.now() - 72 * 60000).toISOString(),
    items: [
      { id: 'ki-6', menuItemId: 'm2', name: 'Paneer Tikka Multani', quantity: 2, status: 'served' },
      { id: 'ki-7', menuItemId: 'm6', name: 'Paneer Butter Masala', quantity: 2, status: 'served' },
      { id: 'ki-8', menuItemId: 'm11', name: 'Assorted Bread Basket', quantity: 3, status: 'served' }
    ],
    status: 'completed'
  },
  {
    id: 'kot-104',
    kotNumber: 'KOT #104',
    tableId: 't5',
    tableName: 'Table 5 (VIP)',
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    items: [
      { id: 'ki-9', menuItemId: 'm12', name: 'Sizzling Chocolate Brownie', quantity: 4, status: 'served' }
    ],
    status: 'completed'
  }
];

export const INITIAL_BILLS: EstimateBill[] = [
  {
    id: 'bill-1001',
    orderId: 'orig-ord-past-1',
    billNumber: 'INV-2026-1001',
    type: 'invoice',
    customerName: 'Karan Sharma',
    customerPhone: '+91 98765 43210',
    tableName: 'Table 4',
    orderType: 'dine-in',
    items: [
      { menuItemId: 'm2', name: 'Paneer Tikka Multani', price: 260, quantity: 1, sentToKitchenQty: 1 },
      { menuItemId: 'm8', name: 'Yellow Dal Tadka Double', price: 190, quantity: 1, sentToKitchenQty: 1 },
      { menuItemId: 'm11', name: 'Assorted Bread Basket', price: 150, quantity: 1, sentToKitchenQty: 1 },
      { menuItemId: 'm17', name: 'Iced Irish Cold Coffee', price: 130, quantity: 1, sentToKitchenQty: 1 }
    ],
    subtotal: 730,
    discountAmount: 0,
    taxAmount: 36.5,
    serviceChargeAmount: 36.5,
    grandTotal: 803,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    paymentMethod: 'upi'
  },
  {
    id: 'bill-1002',
    orderId: 'orig-ord-past-2',
    billNumber: 'EST-2026-1002',
    type: 'estimate',
    customerName: 'Ananya Roy',
    customerPhone: '+91 91234 56789',
    tableName: 'Takeaway #1',
    orderType: 'takeaway',
    items: [
      { menuItemId: 'm10', name: 'Chicken Dum Biryani (Hyderabadi)', price: 320, quantity: 2, sentToKitchenQty: 2 },
      { menuItemId: 'm15', name: 'Mint Virgin Mojito', price: 140, quantity: 2, sentToKitchenQty: 2 }
    ],
    subtotal: 920,
    discountAmount: 92, // 10% discount
    taxAmount: 41.4,
    serviceChargeAmount: 0, // No service charge on takeaway
    grandTotal: 869.4,
    createdAt: new Date(Date.now() - 1.5 * 3600000).toISOString() // 1.5 hours ago
  }
];

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

