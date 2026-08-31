-- Cloudflare D1 Database Schema (SQLite)

CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_phone TEXT NOT NULL UNIQUE,
  clinic_name TEXT,
  device_id TEXT,
  expiry_date TEXT,
  is_valid INTEGER DEFAULT 1,
  address TEXT,
  gstin TEXT,
  contact_number TEXT,
  food_license_no TEXT,
  profile_pic TEXT,
  subscription_status TEXT DEFAULT 'trial',
  requested_plan_id TEXT DEFAULT NULL,
  requested_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  type TEXT NOT NULL,
  available INTEGER DEFAULT 1,
  code TEXT NOT NULL,
  gstRate INTEGER DEFAULT 5,
  stockQuantity INTEGER DEFAULT 15,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tables_list (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL,
  activeOrderId TEXT,
  currentWaiter TEXT,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  tableId TEXT NOT NULL,
  tableName TEXT NOT NULL,
  orderType TEXT NOT NULL,
  items TEXT NOT NULL,
  kotIds TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discountValue REAL NOT NULL,
  discountType TEXT NOT NULL,
  taxRate REAL NOT NULL,
  serviceChargeRate REAL NOT NULL,
  grandTotal REAL NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  paymentMethod TEXT,
  customerName TEXT,
  customerPhone TEXT,
  currentWaiter TEXT,
  completedAt TEXT,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kots (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  kotNumber TEXT NOT NULL,
  tableId TEXT NOT NULL,
  tableName TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  items TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  orderId TEXT NOT NULL,
  billNumber TEXT NOT NULL,
  type TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerPhone TEXT NOT NULL,
  tableName TEXT NOT NULL,
  orderType TEXT NOT NULL,
  items TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discountAmount REAL NOT NULL,
  taxAmount REAL NOT NULL,
  serviceChargeAmount REAL NOT NULL,
  grandTotal REAL NOT NULL,
  createdAt TEXT NOT NULL,
  paymentMethod TEXT NOT NULL,
  currentWaiter TEXT,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bill_series (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  startNumber INTEGER NOT NULL,
  nextNumber INTEGER NOT NULL,
  type TEXT NOT NULL,
  isActive INTEGER DEFAULT 0,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  dob TEXT,
  lifetimeSpend REAL NOT NULL DEFAULT 0,
  orderCount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS waiters (
  id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  commissionRate REAL NOT NULL,
  rating REAL NOT NULL,
  joiningDate TEXT NOT NULL,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  price REAL NOT NULL
);

INSERT OR IGNORE INTO subscription_plans (id, name, duration_months, price) VALUES 
  ('plan_1_month', '1 Month', 1, 499.00),
  ('plan_2_month', '2 Months', 2, 899.00),
  ('plan_6_month', '6 Months', 6, 2499.00),
  ('plan_12_month', '12 Months', 12, 4499.00);
