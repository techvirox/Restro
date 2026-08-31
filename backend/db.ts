// server/db.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || 'bitespeed_pos_kot';

let pool: mysql.Pool;
let useJsonFallback = process.env.USE_MYSQL !== 'true';

export async function initializeDatabase() {
  if (useJsonFallback) {
    console.log(`🔌 Using zero-config local JSON database (bitespeed_db.json) by default.`);
    loadJsonDb();
    return;
  }
  try {
    console.log(`🔌 Connecting to MySQL server at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);
    
    // 1. First connect without a database name to create the database if not exists
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.end();
    
    console.log(`🎉 Database "${DB_NAME}" verified/created.`);

    // 2. Now create the promise pool connected to our database
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Create tables if they do not exist
    await createTables();

    // 4. Run database migrations to add columns if they don't exist
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN address VARCHAR(255) NULL;');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN gstin VARCHAR(50) NULL;');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN contact_number VARCHAR(50) NULL;');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN food_license_no VARCHAR(100) NULL;');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN profile_pic LONGTEXT NULL;');
    } catch (e) {}
    try {
      await pool.query("ALTER TABLE tenants ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'trial';");
    } catch (e) {}
    try {
      await pool.query("ALTER TABLE tenants ADD COLUMN requested_plan_id VARCHAR(50) DEFAULT NULL;");
    } catch (e) {}
    try {
      await pool.query("ALTER TABLE tenants ADD COLUMN requested_at VARCHAR(100) DEFAULT NULL;");
    } catch (e) {}
  } catch (err: any) {
    console.warn(`⚠️ MySQL Database offline: ${err.message}. Falling back to zero-config local JSON database (bitespeed_db.json)!`);
    useJsonFallback = true;
    loadJsonDb();
  }
}

async function createTables() {
  const queries = [
    // 1. Tenants table
    `CREATE TABLE IF NOT EXISTS tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_phone VARCHAR(20) NOT NULL UNIQUE,
      clinic_name VARCHAR(255),
      device_id VARCHAR(255),
      expiry_date VARCHAR(100),
      is_valid BOOLEAN DEFAULT TRUE,
      address VARCHAR(255) NULL,
      gstin VARCHAR(50) NULL,
      contact_number VARCHAR(50) NULL,
      food_license_no VARCHAR(100) NULL,
      profile_pic LONGTEXT NULL,
      subscription_status VARCHAR(50) DEFAULT 'trial',
      requested_plan_id VARCHAR(50) DEFAULT NULL,
      requested_at VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    // 2. Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      email VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 3. Menu table
    `CREATE TABLE IF NOT EXISTS menu (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      price DOUBLE NOT NULL,
      type VARCHAR(50) NOT NULL,
      available BOOLEAN DEFAULT TRUE,
      code VARCHAR(50) NOT NULL,
      gstRate INT DEFAULT 5,
      stockQuantity INT DEFAULT 15,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 4. Tables List table
    `CREATE TABLE IF NOT EXISTS tables_list (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      capacity INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      activeOrderId VARCHAR(50) NULL,
      currentWaiter VARCHAR(255) NULL,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 5. Orders table
    `CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      tableId VARCHAR(50) NOT NULL,
      tableName VARCHAR(255) NOT NULL,
      orderType VARCHAR(50) NOT NULL,
      items TEXT NOT NULL,
      kotIds TEXT NOT NULL,
      subtotal DOUBLE NOT NULL,
      discountValue DOUBLE NOT NULL,
      discountType VARCHAR(50) NOT NULL,
      taxRate DOUBLE NOT NULL,
      serviceChargeRate DOUBLE NOT NULL,
      grandTotal DOUBLE NOT NULL,
      status VARCHAR(50) NOT NULL,
      createdAt VARCHAR(100) NOT NULL,
      paymentMethod VARCHAR(50) NULL,
      customerName VARCHAR(255) NULL,
      customerPhone VARCHAR(50) NULL,
      currentWaiter VARCHAR(255) NULL,
      completedAt VARCHAR(100) NULL,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 6. Kots table
    `CREATE TABLE IF NOT EXISTS kots (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      kotNumber VARCHAR(50) NOT NULL,
      tableId VARCHAR(50) NOT NULL,
      tableName VARCHAR(255) NOT NULL,
      createdAt VARCHAR(100) NOT NULL,
      items TEXT NOT NULL,
      status VARCHAR(50) NOT NULL,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 7. Bills table
    `CREATE TABLE IF NOT EXISTS bills (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      orderId VARCHAR(50) NOT NULL,
      billNumber VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      customerName VARCHAR(255) NOT NULL,
      customerPhone VARCHAR(100) NOT NULL,
      tableName VARCHAR(255) NOT NULL,
      orderType VARCHAR(50) NOT NULL,
      items TEXT NOT NULL,
      subtotal DOUBLE NOT NULL,
      discountAmount DOUBLE NOT NULL,
      taxAmount DOUBLE NOT NULL,
      serviceChargeAmount DOUBLE NOT NULL,
      grandTotal DOUBLE NOT NULL,
      createdAt VARCHAR(100) NOT NULL,
      paymentMethod VARCHAR(50) NOT NULL,
      currentWaiter VARCHAR(255) NULL,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 8. Bill Series table
    `CREATE TABLE IF NOT EXISTS bill_series (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      prefix VARCHAR(50) NOT NULL,
      startNumber INT NOT NULL,
      nextNumber INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      isActive BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 9. Customers table
    `CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(100) NOT NULL,
      email VARCHAR(255) NULL,
      dob VARCHAR(100) NULL,
      lifetimeSpend DOUBLE NOT NULL DEFAULT 0,
      orderCount INT NOT NULL DEFAULT 0,
      notes TEXT NULL,
      createdAt VARCHAR(100) NOT NULL,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 10. Expenses table
    `CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount DOUBLE NOT NULL,
      date VARCHAR(100) NOT NULL,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 11. Waiters table
    `CREATE TABLE IF NOT EXISTS waiters (
      id VARCHAR(50) NOT NULL,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL,
      commissionRate DOUBLE NOT NULL,
      rating DOUBLE NOT NULL,
      joiningDate VARCHAR(100) NOT NULL,
      PRIMARY KEY (id, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // 12. Subscription Plans table
    `CREATE TABLE IF NOT EXISTS subscription_plans (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      duration_months INT NOT NULL,
      price DOUBLE NOT NULL
    ) ENGINE=InnoDB;`
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (err) {
      console.error('❌ Error executing initialization query:', query, err);
      throw err;
    }
  }

  // Seed default subscription plans in MySQL
  try {
    const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM subscription_plans');
    if (rows[0].count === 0) {
      await pool.query(`INSERT INTO subscription_plans (id, name, duration_months, price) VALUES 
        ('plan_1_month', '1 Month', 1, 499.00),
        ('plan_2_month', '2 Months', 2, 899.00),
        ('plan_6_month', '6 Months', 6, 2499.00),
        ('plan_12_month', '12 Months', 12, 4499.00)
      `);
      console.log('🌱 Seeded default subscription plans into MySQL.');
    }
  } catch (err) {
    console.error('Error seeding subscription plans in MySQL:', err);
  }

  console.log('✅ All MySQL database tables initialized successfully.');
}

export function getPool(): any {
  if (useJsonFallback) {
    return {
      query: async (sql: string, params: any[] = []) => {
        return evaluateSqlQuery(sql, params);
      }
    };
  }
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase first.');
  }
  return pool;
}

// --- LIGHTWEIGHT LOCAL JSON DATABASE ENGINE FOR OFFLINE FALLBACK ---

const JSON_DB_PATH = path.join(process.cwd(), 'bitespeed_db.json');
let jsonDbData: { [tableName: string]: any[] } = {};

function loadJsonDb() {
  if (fs.existsSync(JSON_DB_PATH)) {
    try {
      jsonDbData = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
      
      // Ensure subscription_plans exists
      if (!jsonDbData.subscription_plans) {
        jsonDbData.subscription_plans = [
          { id: 'plan_1_month', name: '1 Month', duration_months: 1, price: 499.00 },
          { id: 'plan_2_month', name: '2 Months', duration_months: 2, price: 899.00 },
          { id: 'plan_6_month', name: '6 Months', duration_months: 6, price: 2499.00 },
          { id: 'plan_12_month', name: '12 Months', duration_months: 12, price: 4499.00 }
        ];
        saveJsonDb();
      }

      // Ensure existing tenants have subscription fields
      if (jsonDbData.tenants) {
        jsonDbData.tenants.forEach(t => {
          if (t.subscription_status === undefined) {
            t.subscription_status = 'trial';
          }
        });
      }
    } catch (e) {
      console.error('Failed to parse JSON DB, initializing empty.', e);
      initEmptyJsonDb();
    }
  } else {
    initEmptyJsonDb();
  }
}

function initEmptyJsonDb() {
  jsonDbData = {
    tenants: [],
    users: [],
    menu: [],
    tables_list: [],
    orders: [],
    kots: [],
    bills: [],
    bill_series: [],
    customers: [],
    expenses: [],
    waiters: [],
    subscription_plans: [
      { id: 'plan_1_month', name: '1 Month', duration_months: 1, price: 499.00 },
      { id: 'plan_2_month', name: '2 Months', duration_months: 2, price: 899.00 },
      { id: 'plan_6_month', name: '6 Months', duration_months: 6, price: 2499.00 },
      { id: 'plan_12_month', name: '12 Months', duration_months: 12, price: 4499.00 }
    ],
    lock_message: {
      message: "Your free trial or subscription for Rio Restro POS has expired. Please contact support or select a subscription plan to continue using the software."
    },
    support_tickets: []
  };
  saveJsonDb();
}

function saveJsonDb() {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(jsonDbData, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write JSON DB to disk:', e);
  }
}

function parseWhereClause(whereClause: string, params: any[], initialParamIdx: number = 0) {
  let wherePart = whereClause.trim();
  // Strip ORDER BY, GROUP BY, LIMIT
  const orderByIndex = wherePart.toUpperCase().indexOf('ORDER BY');
  if (orderByIndex !== -1) {
    wherePart = wherePart.substring(0, orderByIndex).trim();
  }
  const groupByIndex = wherePart.toUpperCase().indexOf('GROUP BY');
  if (groupByIndex !== -1) {
    wherePart = wherePart.substring(0, groupByIndex).trim();
  }
  const limitIndex = wherePart.toUpperCase().indexOf('LIMIT');
  if (limitIndex !== -1) {
    wherePart = wherePart.substring(0, limitIndex).trim();
  }

  if (!wherePart) {
    return { conditions: [], nextParamIdx: initialParamIdx };
  }

  const condStrings = wherePart.split(/\s+AND\s+/i);
  let paramIdx = initialParamIdx;
  const conditions: { colName: string; op: '=' | '!='; expectedVal: any }[] = [];

  for (const cond of condStrings) {
    let colName = '';
    let op: '=' | '!=' = '=';
    let rawVal = '';

    if (cond.includes('!=')) {
      const parts = cond.split('!=');
      colName = parts[0].trim();
      op = '!=';
      rawVal = parts[1].trim();
    } else if (cond.includes('<>')) {
      const parts = cond.split('<>');
      colName = parts[0].trim();
      op = '!=';
      rawVal = parts[1].trim();
    } else if (cond.includes('=')) {
      const parts = cond.split('=');
      colName = parts[0].trim();
      op = '=';
      rawVal = parts[1].trim();
    } else {
      // Unhandled operator
      continue;
    }

    let expectedVal: any;
    if (rawVal === '?') {
      expectedVal = params[paramIdx++];
    } else {
      expectedVal = rawVal.replace(/['"]/g, '').trim();
    }

    conditions.push({ colName, op, expectedVal });
  }

  return { conditions, nextParamIdx: paramIdx };
}

function evaluateSqlQuery(sql: string, params: any[]): any {
  loadJsonDb();
  const cleanSql = sql.replace(/`/g, '').replace(/\s+/g, ' ').trim();
  
  if (cleanSql.toUpperCase().startsWith('SELECT')) {
    const fromMatch = cleanSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) throw new Error('Unsupported SELECT query.');
    const tableName = fromMatch[1];
    
    let rows = jsonDbData[tableName] || [];
    
    const whereIndex = cleanSql.toUpperCase().indexOf('WHERE');
    if (whereIndex !== -1) {
      const whereClause = cleanSql.substring(whereIndex + 5).trim();
      const { conditions } = parseWhereClause(whereClause, params, 0);
      
      rows = rows.filter(row => {
        for (const cond of conditions) {
          const rowVal = String(row[cond.colName]);
          const expVal = String(cond.expectedVal);
          if (cond.op === '=') {
            if (rowVal !== expVal) return false;
          } else if (cond.op === '!=') {
            if (rowVal === expVal) return false;
          }
        }
        return true;
      });
    }

    // Handle ORDER BY sorting
    const orderByMatch = cleanSql.match(/ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?/i);
    if (orderByMatch) {
      const field = orderByMatch[1];
      const dir = (orderByMatch[2] || 'ASC').toUpperCase();
      rows = [...rows].sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === undefined || valB === undefined) return 0;
        if (dir === 'DESC') {
          return String(valB).localeCompare(String(valA));
        } else {
          return String(valA).localeCompare(String(valB));
        }
      });
    }

    return [JSON.parse(JSON.stringify(rows))];
  }
  
  if (cleanSql.toUpperCase().startsWith('INSERT')) {
    const insertMatch = cleanSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!insertMatch) throw new Error('Unsupported INSERT query.');
    const tableName = insertMatch[1];
    const columns = insertMatch[2].split(',').map(s => s.trim());
    
    if (!jsonDbData[tableName]) {
      jsonDbData[tableName] = [];
    }
    
    const newRow: any = {};
    columns.forEach((col, idx) => {
      newRow[col] = params[idx];
    });
    
    let insertId = 0;
    if (tableName === 'tenants' || tableName === 'users') {
      const maxId = jsonDbData[tableName].reduce((max, r) => Math.max(max, r.id || 0), 0);
      insertId = maxId + 1;
      newRow.id = insertId;
      newRow.created_at = newRow.created_at || new Date().toISOString();
    }
    
    jsonDbData[tableName].push(newRow);
    saveJsonDb();
    
    return [{ insertId }];
  }
  
  if (cleanSql.toUpperCase().startsWith('UPDATE')) {
    const updateMatch = cleanSql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i);
    if (!updateMatch) throw new Error('Unsupported UPDATE query.');
    const tableName = updateMatch[1];
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];
    
    const sets = setClause.split(',').map(s => s.trim());
    let paramIdx = 0;
    const setValues: { [col: string]: any } = {};
    sets.forEach(s => {
      const parts = s.split('=');
      const colName = parts[0].trim();
      const val = parts[1].trim();
      if (val === '?') {
        setValues[colName] = params[paramIdx++];
      } else {
        setValues[colName] = val.replace(/['"]/g, '').trim();
      }
    });
    
    const { conditions } = parseWhereClause(whereClause, params, paramIdx);
    
    let affectedRows = 0;
    if (jsonDbData[tableName]) {
      jsonDbData[tableName] = jsonDbData[tableName].map(row => {
        let match = true;
        for (const cond of conditions) {
          const rowVal = String(row[cond.colName]);
          const expVal = String(cond.expectedVal);
          if (cond.op === '=') {
            if (rowVal !== expVal) { match = false; break; }
          } else if (cond.op === '!=') {
            if (rowVal === expVal) { match = false; break; }
          }
        }
        if (match) {
          affectedRows++;
          return { ...row, ...setValues };
        }
        return row;
      });
    }
    
    saveJsonDb();
    return [{ affectedRows }];
  }
  
  if (cleanSql.toUpperCase().startsWith('DELETE')) {
    const deleteMatch = cleanSql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?/i);
    if (!deleteMatch) throw new Error('Unsupported DELETE query.');
    const tableName = deleteMatch[1];
    const whereClause = deleteMatch[2];
    
    let affectedRows = 0;
    if (whereClause) {
      const { conditions } = parseWhereClause(whereClause, params, 0);
      
      if (jsonDbData[tableName]) {
        const initialLen = jsonDbData[tableName].length;
        jsonDbData[tableName] = jsonDbData[tableName].filter(row => {
          let match = true;
          for (const cond of conditions) {
            const rowVal = String(row[cond.colName]);
            const expVal = String(cond.expectedVal);
            if (cond.op === '=') {
              if (rowVal !== expVal) { match = false; break; }
            } else if (cond.op === '!=') {
              if (rowVal === expVal) { match = false; break; }
            }
          }
          return !match;
        });
        affectedRows = initialLen - jsonDbData[tableName].length;
      }
    } else {
      if (jsonDbData[tableName]) {
        affectedRows = jsonDbData[tableName].length;
        jsonDbData[tableName] = [];
      }
    }
    
    saveJsonDb();
    return [{ affectedRows }];
  }
  
  throw new Error('Unsupported SQL command in JSON Fallback.');
}
