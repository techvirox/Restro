// server/server.ts
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, getPool } from './db.js';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3101;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Store client connections grouped by tenantId
const clientsMap = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket, req) => {
  const parsedUrl = new URL(req.url || '', 'http://localhost');
  const tenantId = parsedUrl.searchParams.get('tenantId') || 'demo';

  if (!clientsMap.has(tenantId)) {
    clientsMap.set(tenantId, new Set());
  }
  clientsMap.get(tenantId)!.add(ws);

  console.log(`WebSocket client connected for tenant: ${tenantId}. Total connections: ${clientsMap.get(tenantId)!.size}`);

  ws.on('close', () => {
    const clients = clientsMap.get(tenantId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        clientsMap.delete(tenantId);
      }
      console.log(`WebSocket client disconnected for tenant: ${tenantId}`);
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for tenant ${tenantId}:`, err);
  });
});

// Broadcast helper
function broadcastToTenant(tenantId: string, message: any, senderWs?: WebSocket) {
  const clients = clientsMap.get(tenantId);
  if (!clients) return;

  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Upgrade handling
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3101',
];

app.use((req, res, next) => {
  const origin = req.headers.origin as string;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || '*');
  }
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-API-Key, X-Tenant-ID");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── SERVE BUILT REACT FRONTEND (SPA) ────────────────────────────────────────
// dist/ folder sits NEXT TO server.js in /www/wwwroot/zaaykapos.in/
const distPath = path.resolve(__dirname, './dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log(`📂 Serving static frontend from: ${distPath}`);
}

let dbOfflineError: string | null = null;

app.use((req, res, next) => {
  if (dbOfflineError && req.path.startsWith('/api/')) {
    return res.status(503).json({
      error: `MySQL Database connection failed (Offline). Please start your local MySQL service on port 3306. (Error: ${dbOfflineError})`
    });
  }
  next();
});

// --- SUBSCRIPTION HELPER ---
function calculateDaysRemaining(expiryStr: string): number {
  if (!expiryStr) return 0;
  const expiry = new Date(expiryStr);
  const now = new Date();
  if (isNaN(expiry.getTime())) return 0;
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register-owner', async (req, res) => {
  const { phone, password, name, clinicName, address, email } = req.body;
  
  if (!phone || !password || !name) {
    return res.status(400).json({ success: false, error: "Required fields missing." });
  }

  try {
    const pool = getPool();
    
    // Check if user already exists
    const [existingUsers]: any = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: "Mobile number is already registered." });
    }

    // Trial periods starts now and expires in 5 days
    const trialDays = 5;
    const expiryDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    // Insert into tenants table
    const [tenantResult]: any = await pool.query(
      `INSERT INTO tenants (owner_phone, clinic_name, expiry_date, is_valid, address, gstin, contact_number, subscription_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [phone, clinicName || 'Rio Restro Restaurant', expiryDate, 1, address || '', '27AAAAA1111A1Z0', phone, 'trial']
    );

    const tenantId = tenantResult.insertId;

    // Insert owner user
    const [userResult]: any = await pool.query(
      `INSERT INTO users (tenant_id, phone, password, name, role, email) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenantId, phone, password, name, 'owner', email || '']
    );

    res.json({
      success: true,
      user: {
        id: userResult.insertId,
        name,
        phone,
        role: 'owner',
        email: email || '',
        tenantId,
        tenant: {
          clinicName: clinicName || 'Rio Restro Restaurant',
          expiryDate: expiryDate,
          isValid: true,
          subscriptionStatus: 'trial',
          daysRemaining: trialDays,
          address: address || '',
          gstin: '27AAAAA1111A1Z0',
          contactNumber: phone
        }
      }
    });

  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Database / Server error during registration: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  
  if (!phone || !password) {
    return res.status(400).json({ success: false, error: "Phone and password required." });
  }

  // 1. Hardcoded System Admin Check
  if (phone === '9999999999' && password === 'admin') {
    return res.json({
      success: true,
      user: {
        id: 'admin',
        name: 'System Admin',
        phone: '9999999999',
        role: 'admin',
        tenantId: 0,
        tenant: null
      }
    });
  }

  try {
    const pool = getPool();
    const [users]: any = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: "Incorrect mobile number or password." });
    }

    const user = users[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: "Incorrect mobile number or password." });
    }

    const [tenants]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [user.tenant_id]);
    if (tenants.length === 0) {
      return res.status(404).json({ success: false, error: "Tenant profile not found." });
    }

    const tenant = tenants[0];
    const daysRemaining = calculateDaysRemaining(tenant.expiry_date);
    
    let subStatus = tenant.subscription_status || 'trial';
    let isValid = tenant.is_valid === 1 || tenant.is_valid === true;

    // Check expiration dynamically
    if (daysRemaining <= 0) {
      if (subStatus === 'trial' || subStatus === 'active') {
        subStatus = 'expired';
        isValid = false;
        // Update database
        await pool.query(
          'UPDATE tenants SET subscription_status = ?, is_valid = 0 WHERE id = ?',
          [subStatus, tenant.id]
        );
      }
    }

    // Block non-owners if tenant subscription has expired or is pending
    if (user.role !== 'owner' && (!isValid || subStatus === 'expired' || subStatus === 'pending')) {
      return res.status(403).json({
        success: false,
        error: "Access blocked: Restaurant subscription has expired. Please contact the owner to renew."
      });
    }

    const tenantInfo = {
      clinicName: tenant.clinic_name,
      expiryDate: tenant.expiry_date,
      isValid: isValid ? 1 : 0,
      subscriptionStatus: subStatus,
      daysRemaining: daysRemaining,
      address: tenant.address || '',
      gstin: tenant.gstin || '',
      contactNumber: tenant.contact_number || '',
      foodLicenseNo: tenant.food_license_no || '',
      profilePic: tenant.profile_pic || '',
      requestedPlanId: tenant.requested_plan_id
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        email: user.email || '',
        tenantId: user.tenant_id,
        tenant: tenantInfo
      }
    });

  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Database / Server error during authentication.' });
  }
});

// --- SUBSCRIPTION & ADMIN ENDPOINTS ---

// Tenant requests a subscription
app.post('/api/subscription/request', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { planId } = req.body;

  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });
  if (!planId) return res.status(400).json({ success: false, error: "Missing plan ID." });

  try {
    const pool = getPool();
    
    // Check if plan exists
    const [plans]: any = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, error: "Subscription plan not found." });
    }

    await pool.query(
      `UPDATE tenants SET subscription_status = 'pending', requested_plan_id = ?, requested_at = ? WHERE id = ?`,
      [planId, new Date().toISOString(), tenantId]
    );

    res.json({ success: true, message: "Subscription request submitted successfully." });
  } catch (err: any) {
    console.error('Request subscription error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Admin gets all tenants and pending requests
app.get('/api/admin/tenants', async (req, res) => {
  try {
    const pool = getPool();
    // Fetch all tenants
    const [tenants]: any = await pool.query('SELECT * FROM tenants ORDER BY created_at DESC');
    
    // Fetch all users to link owner details
    const [users]: any = await pool.query('SELECT id, name, phone, email, tenant_id FROM users WHERE role = "owner"');
    
    // Combine
    const result = tenants.map((tenant: any) => {
      const owner = users.find((u: any) => u.tenant_id == tenant.id);
      return {
        ...tenant,
        ownerName: owner ? owner.name : 'Unknown',
        ownerEmail: owner ? owner.email : '',
        ownerPhone: owner ? owner.phone : tenant.owner_phone
      };
    });

    res.json({ success: true, tenants: result });
  } catch (err: any) {
    console.error('Admin get tenants error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Admin gets subscription plans list
app.get('/api/admin/plans', async (req, res) => {
  try {
    const pool = getPool();
    const [plans]: any = await pool.query('SELECT * FROM subscription_plans');
    res.json({ success: true, plans });
  } catch (err: any) {
    console.error('Admin get plans error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Admin updates subscription plans prices
app.put('/api/admin/plans', async (req, res) => {
  const { plans } = req.body; // Expects array of { id, price }
  if (!plans || !Array.isArray(plans)) {
    return res.status(400).json({ success: false, error: "Invalid plans array." });
  }

  try {
    const pool = getPool();
    for (const plan of plans) {
      await pool.query('UPDATE subscription_plans SET price = ? WHERE id = ?', [plan.price, plan.id]);
    }
    res.json({ success: true, message: "Subscription plan prices updated successfully." });
  } catch (err: any) {
    console.error('Admin update plans error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Admin approves a subscription request
app.post('/api/admin/approve', async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });

  try {
    const pool = getPool();
    
    // Find tenant
    const [tenants]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [tenantId]);
    if (tenants.length === 0) {
      return res.status(404).json({ success: false, error: "Tenant not found." });
    }
    const tenant = tenants[0];
    
    const planId = tenant.requested_plan_id;
    if (!planId) {
      return res.status(400).json({ success: false, error: "No pending subscription request for this tenant." });
    }

    // Find plan duration
    const [plans]: any = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, error: "Requested subscription plan not found." });
    }
    const plan = plans[0];

    // Calculate new expiry date
    const now = new Date();
    let startDate = now;
    
    // If current subscription is still active, extend from the old expiry date
    if (tenant.expiry_date && new Date(tenant.expiry_date) > now) {
      startDate = new Date(tenant.expiry_date);
    }
    
    startDate.setMonth(startDate.getMonth() + plan.duration_months);
    const newExpiryDate = startDate.toISOString();

    await pool.query(
      `UPDATE tenants SET subscription_status = 'active', expiry_date = ?, is_valid = 1, requested_plan_id = NULL, requested_at = NULL WHERE id = ?`,
      [newExpiryDate, tenantId]
    );

    res.json({ success: true, message: "Subscription request approved.", expiryDate: newExpiryDate });
  } catch (err: any) {
    console.error('Admin approve subscription error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Admin rejects a subscription request
app.post('/api/admin/reject', async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });

  try {
    const pool = getPool();
    
    await pool.query(
      `UPDATE tenants SET subscription_status = 'expired', is_valid = 0, requested_plan_id = NULL, requested_at = NULL WHERE id = ?`,
      [tenantId]
    );

    res.json({ success: true, message: "Subscription request rejected." });
  } catch (err: any) {
    console.error('Admin reject subscription error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Admin manually updates a tenant configuration
app.put('/api/admin/tenants/:id', async (req, res) => {
  const { id } = req.params;
  const { expiryDate, status, isValid } = req.body;
  
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE tenants SET expiry_date = ?, subscription_status = ?, is_valid = ? WHERE id = ?',
      [expiryDate, status, isValid ? 1 : 0, id]
    );
    res.json({ success: true, message: "Tenant configuration updated successfully." });
  } catch (err: any) {
    console.error('Admin update tenant error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Admin toggles tenant enable/disable state
app.post('/api/admin/tenants/:id/toggle-valid', async (req, res) => {
  const { id } = req.params;
  const { isValid } = req.body;

  try {
    const pool = getPool();
    const validVal = isValid ? 1 : 0;
    const subStatus = isValid ? 'active' : 'expired';
    await pool.query(
      'UPDATE tenants SET is_valid = ?, subscription_status = ? WHERE id = ?',
      [validVal, subStatus, id]
    );
    res.json({ success: true, message: `Tenant account ${isValid ? 'enabled' : 'disabled'} successfully.`, isValid });
  } catch (err: any) {
    console.error('Admin toggle tenant valid error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Lock / Expiry Message APIs
app.get('/api/lock-message', async (req, res) => {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM lock_message LIMIT 1');
    const defaultMsg = "Your free trial or subscription for Rio Restro POS has expired. Please contact support or select a subscription plan to continue using the software.";
    if (rows && rows.length > 0) {
      res.json({ success: true, message: rows[0].message || defaultMsg });
    } else {
      res.json({ success: true, message: defaultMsg });
    }
  } catch (err: any) {
    res.json({ success: true, message: "Your free trial or subscription for Rio Restro POS has expired. Please contact support or select a subscription plan to continue using the software." });
  }
});

app.post('/api/admin/lock-message', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: "Message cannot be empty." });
  }
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM lock_message LIMIT 1');
    if (rows && rows.length > 0) {
      await pool.query('UPDATE lock_message SET message = ?', [message.trim()]);
    } else {
      await pool.query('INSERT INTO lock_message (message) VALUES (?)', [message.trim()]);
    }
    res.json({ success: true, message: "Lock notice updated successfully." });
  } catch (err: any) {
    console.error('Save lock message error:', err);
    res.status(500).json({ success: false, error: 'Failed to update lock notice.' });
  }
});

// Admin create new plan
app.post('/api/admin/plans', async (req, res) => {
  const { name, duration_months, price } = req.body;
  if (!name || !duration_months || price === undefined) {
    return res.status(400).json({ success: false, error: "Plan name, duration (months), and price are required." });
  }
  try {
    const pool = getPool();
    const planId = `plan_${duration_months}_month_${Date.now()}`;
    await pool.query(
      'INSERT INTO subscription_plans (id, name, duration_months, price) VALUES (?, ?, ?, ?)',
      [planId, name.trim(), Number(duration_months), Number(price)]
    );
    res.json({ success: true, message: "Plan created successfully." });
  } catch (err: any) {
    console.error('Create plan error:', err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// Support Tickets / Complaints APIs
app.get('/api/support-tickets', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  try {
    const pool = getPool();
    const [tickets]: any = await pool.query('SELECT * FROM support_tickets ORDER BY created_at DESC');
    res.json({ success: true, tickets: tickets || [] });
  } catch (err: any) {
    console.error('Get support tickets error:', err);
    res.json({ success: true, tickets: [] });
  }
});

app.post('/api/support-tickets', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || '0';
  const { userName, userEmail, userPhone, type, description } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, error: "Description is required." });
  }

  try {
    const pool = getPool();
    const ticketId = `ticket-${Date.now()}`;
    const newTicket = {
      id: ticketId,
      tenant_id: tenantId,
      userName: userName || 'Staff User',
      userEmail: userEmail || '',
      userPhone: userPhone || '',
      type: type || 'problem',
      description: description.trim(),
      createdAt: new Date().toISOString(),
      status: 'new',
      priority: 'medium',
      adminReply: '',
      updatedAt: new Date().toISOString()
    };

    await pool.query(
      `INSERT INTO support_tickets (id, tenant_id, userName, userEmail, userPhone, type, description, createdAt, status, priority, adminReply, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTicket.id,
        newTicket.tenant_id,
        newTicket.userName,
        newTicket.userEmail,
        newTicket.userPhone,
        newTicket.type,
        newTicket.description,
        newTicket.createdAt,
        newTicket.status,
        newTicket.priority,
        newTicket.adminReply,
        newTicket.updatedAt
      ]
    );

    res.json({ success: true, ticket: newTicket, message: "Support ticket submitted successfully." });
  } catch (err: any) {
    console.error('Submit ticket error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit ticket.' });
  }
});

app.post('/api/admin/support-tickets/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { adminReply, status } = req.body;

  if (!adminReply || !adminReply.trim()) {
    return res.status(400).json({ success: false, error: "Reply text is required." });
  }

  try {
    const pool = getPool();
    await pool.query(
      'UPDATE support_tickets SET adminReply = ?, status = ?, updatedAt = ? WHERE id = ?',
      [adminReply.trim(), status || 'resolved', new Date().toISOString(), id]
    );
    res.json({ success: true, message: "Ticket reply sent and updated." });
  } catch (err: any) {
    console.error('Reply ticket error:', err);
    res.status(500).json({ success: false, error: 'Failed to reply to ticket.' });
  }
});

const handleUpdateProfileRoute = async (req: any, res: any) => {
  const tenantId = req.headers['x-tenant-id'];
  const { userId, name, email, restaurantName, address, contactNumber, gstin, foodLicenseNo, profilePic } = req.body;

  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });
  if (!userId) return res.status(400).json({ success: false, error: "Missing user ID." });

  try {
    const pool = getPool();

    // Update users table
    await pool.query(
      `UPDATE users SET name = ?, email = ? WHERE id = ? AND tenant_id = ?`,
      [name || '', email || '', userId, tenantId]
    );

    // Update tenants table
    await pool.query(
      `UPDATE tenants SET clinic_name = ?, address = ?, contact_number = ?, gstin = ?, food_license_no = ?, profile_pic = ? WHERE id = ?`,
      [restaurantName || '', address || '', contactNumber || '', gstin || '', foodLicenseNo || null, profilePic || null, tenantId]
    );

    res.json({
      success: true,
      message: "Profile updated successfully."
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: 'Database / Server error during profile update: ' + err.message });
  }
};

app.post('/api/auth/update-profile', handleUpdateProfileRoute);
app.post('/api/profile/update', handleUpdateProfileRoute);
app.post('/api/update-profile', handleUpdateProfileRoute);
app.put('/api/profile', handleUpdateProfileRoute);

app.post('/api/auth/add-staff', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { phone, password, name, role } = req.body;

  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });
  if (!phone || !password || !name || !role) return res.status(400).json({ success: false, error: "All fields are required." });

  try {
    const pool = getPool();
    // Verify phone uniqueness
    const [existing]: any = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: "This mobile number is already registered." });
    }

    const [result]: any = await pool.query(
      `INSERT INTO users (tenant_id, phone, password, name, role) VALUES (?, ?, ?, ?, ?)`,
      [tenantId, phone, password, name, role]
    );

    res.json({
      success: true,
      user: {
        id: result.insertId,
        name,
        phone,
        role
      }
    });
  } catch (err: any) {
    console.error('Add staff error:', err);
    res.status(500).json({ success: false, error: 'Failed to add staff member.' });
  }
});

app.get('/api/auth/get-staff', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [staff]: any = await pool.query(
      'SELECT id, name, phone, role, created_at FROM users WHERE tenant_id = ? AND role != "owner"',
      [tenantId]
    );
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get staff list.' });
  }
});

app.delete('/api/auth/delete-staff/:phone', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { phone } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query('DELETE FROM users WHERE phone = ? AND tenant_id = ? AND role != "owner"', [phone, tenantId]);
    await pool.query('DELETE FROM waiters WHERE phone = ? AND tenant_id = ?', [phone, tenantId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete staff member: ' + err.message });
  }
});

// --- SEED DATA DEFINITIONS ---

const INITIAL_MENU = [
  { id: 'm1', name: 'Veg Crispy Spring Rolls', category: 'Starters', price: 180, type: 'veg', available: true, code: 'VSR', gstRate: 5, stockQuantity: 12 },
  { id: 'm2', name: 'Paneer Tikka Multani', category: 'Starters', price: 260, type: 'veg', available: true, code: 'PTM', gstRate: 5, stockQuantity: 4 },
  { id: 'm3', name: 'Spicy Chilli Chicken fry', category: 'Starters', price: 290, type: 'non-veg', available: true, code: 'CCF', gstRate: 5, stockQuantity: 15 },
  { id: 'm4', name: 'Salt & Pepper Prawns', category: 'Starters', price: 340, type: 'non-veg', available: true, code: 'SPP', gstRate: 5, stockQuantity: 9 },
  { id: 'm5', name: 'Classic French Fries Large', category: 'Starters', price: 120, type: 'veg', available: true, code: 'CFF', gstRate: 5, stockQuantity: 2 },
  { id: 'm6', name: 'Paneer Butter Masala', category: 'Mains', price: 280, type: 'veg', available: true, code: 'PBM', gstRate: 5, stockQuantity: 14 },
  { id: 'm7', name: 'Butter Chicken Masala', category: 'Mains', price: 340, type: 'non-veg', available: true, code: 'BCM', gstRate: 5, stockQuantity: 11 },
  { id: 'm8', name: 'Yellow Dal Tadka Double', category: 'Mains', price: 190, type: 'veg', available: true, code: 'YDT', gstRate: 5, stockQuantity: 3 },
  { id: 'm9', name: 'Veg Schezwan Noodles', category: 'Mains', price: 220, type: 'veg', available: true, code: 'VSN', gstRate: 5, stockQuantity: 16 },
  { id: 'm10', name: 'Chicken Dum Biryani (Hyderabadi)', category: 'Mains', price: 320, type: 'non-veg', available: true, code: 'CDB', gstRate: 5, stockQuantity: 18 },
  { id: 'm11', name: 'Assorted Bread Basket', category: 'Mains', price: 150, type: 'veg', available: true, code: 'ABB', gstRate: 25 },
  { id: 'm12', name: 'Sizzling Chocolate Brownie', category: 'Desserts', price: 190, type: 'egg', available: true, code: 'SCB', gstRate: 18, stockQuantity: 7 },
  { id: 'm13', name: 'Classic Gulab Jamun (2 Pcs)', category: 'Desserts', price: 90, type: 'veg', available: true, code: 'CGJ', gstRate: 18, stockQuantity: 12 },
  { id: 'm14', name: 'New York Baked Cheesecake', category: 'Desserts', price: 210, type: 'egg', available: true, code: 'NYC', gstRate: 18, stockQuantity: 8 },
  { id: 'm15', name: 'Mint Virgin Mojito', category: 'Beverages', price: 140, type: 'veg', available: true, code: 'MVM', gstRate: 12, stockQuantity: 20 },
  { id: 'm16', name: 'Mango Lassi Premium', category: 'Beverages', price: 110, type: 'veg', available: true, code: 'MLP', gstRate: 12, stockQuantity: 15 },
  { id: 'm17', name: 'Iced Irish Cold Coffee', category: 'Beverages', price: 130, type: 'veg', available: true, code: 'ICC', gstRate: 12, stockQuantity: 14 },
  { id: 'm18', name: 'Mineral Water Bottled', category: 'Beverages', price: 40, type: 'veg', available: true, code: 'MWB', gstRate: 18, stockQuantity: 30 }
];

const INITIAL_TABLES = [
  { id: 't1', name: 'Table 1', capacity: 2, status: 'vacant', activeOrderId: null },
  { id: 't2', name: 'Table 2', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 't3', name: 'Table 3', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 't4', name: 'Table 4', capacity: 6, status: 'vacant', activeOrderId: null },
  { id: 't5', name: 'Table 5 (VIP)', capacity: 8, status: 'vacant', activeOrderId: null },
  { id: 't6', name: 'Table 6 (Window)', capacity: 2, status: 'vacant', activeOrderId: null },
  { id: 't7', name: 'Table 7 (Balcony)', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 't8', name: 'Table 8', capacity: 4, status: 'vacant', activeOrderId: null }
];

const INITIAL_BILL_SERIES = [
  { id: 'ser-1', name: 'General Dine-In / Tax Invoice', prefix: 'INV-2026-', startNumber: 1001, nextNumber: 1001, type: 'invoice', isActive: true },
  { id: 'ser-2', name: 'Waitstaff Quick Pay POS', prefix: 'POS-SER-', startNumber: 5001, nextNumber: 5001, type: 'invoice', isActive: false },
  { id: 'ser-3', name: 'Takeaway Counter Series', prefix: 'TAKE-INV-', startNumber: 2001, nextNumber: 2001, type: 'invoice', isActive: false },
  { id: 'ser-4', name: 'Corporate / B2B Series', prefix: 'B2B-INV-', startNumber: 3001, nextNumber: 3001, type: 'invoice', isActive: false },
  { id: 'ser-5', name: 'Standard Estimate Slip', prefix: 'EST-2026-', startNumber: 1001, nextNumber: 1001, type: 'estimate', isActive: true },
  { id: 'ser-6', name: 'Draft Quote Slip', prefix: 'EST-DRF-', startNumber: 8001, nextNumber: 8001, type: 'estimate', isActive: false }
];

const INITIAL_WAITERS = [
  { id: 'w1', name: 'Rajesh M.', phone: '9876543215', status: 'active', commissionRate: 5.0, rating: 4.8, joiningDate: '2026-01-15' },
  { id: 'w2', name: 'Sonia K.', phone: '9812345670', status: 'active', commissionRate: 4.5, rating: 4.5, joiningDate: '2026-02-10' },
  { id: 'w3', name: 'Amit Verma', phone: '9123456789', status: 'active', commissionRate: 5.0, rating: 4.2, joiningDate: '2026-03-01' },
  { id: 'w4', name: 'Vikram Singh', phone: '9988776655', status: 'active', commissionRate: 4.0, rating: 4.0, joiningDate: '2026-04-12' },
];

const INITIAL_CUSTOMERS = [
  { id: 'c1', name: 'Karan Sharma', phone: '+91 98765 43210', email: 'karan@gmail.com', dob: '1995-06-13', lifetimeSpend: 0, orderCount: 0, createdAt: new Date().toISOString(), notes: 'Prefers spicy starters and iced craft coffee.' },
  { id: 'c2', name: 'Ananya Roy', phone: '+91 91234 56789', email: 'ananya@yahoo.com', dob: '1998-11-20', lifetimeSpend: 0, orderCount: 0, createdAt: new Date().toISOString(), notes: 'Likes fresh virgin mojitos and mildly sweetened desserts.' }
];

// --- REST CLIENT SYNC ENDPOINTS ---

// MENU
app.get('/api/menu', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });
  
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM menu WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id, name, category, price, type, available, code, gstRate, stockQuantity } = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });
  
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO menu (id, tenant_id, name, category, price, type, available, code, gstRate, stockQuantity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, name, category, price, type, available ? 1 : 0, code, gstRate, stockQuantity]
    );
    broadcastToTenant(String(tenantId), { type: 'MENU_ITEM_SAVED', data: { id, name, category, price, type, available, code, gstRate, stockQuantity } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  const { name, category, price, type, available, code, gstRate, stockQuantity } = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE menu SET name = ?, category = ?, price = ?, type = ?, available = ?, code = ?, gstRate = ?, stockQuantity = ?
       WHERE id = ? AND tenant_id = ?`,
      [name, category, price, type, available ? 1 : 0, code, gstRate, stockQuantity, id, tenantId]
    );
    broadcastToTenant(String(tenantId), { type: 'MENU_ITEM_SAVED', data: { id, name, category, price, type, available, code, gstRate, stockQuantity } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query('DELETE FROM menu WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    broadcastToTenant(String(tenantId), { type: 'MENU_ITEM_DELETED', id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu/reset', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query('DELETE FROM menu WHERE tenant_id = ?', [tenantId]);
    for (const m of INITIAL_MENU) {
      await pool.query(
        `INSERT INTO menu (id, tenant_id, name, category, price, type, available, code, gstRate, stockQuantity) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, tenantId, m.name, m.category, m.price, m.type, m.available, m.code, m.gstRate, m.stockQuantity]
      );
    }
    const [rows]: any = await pool.query('SELECT * FROM menu WHERE tenant_id = ?', [tenantId]);
    broadcastToTenant(String(tenantId), { type: 'MENU_RESET' });
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// TABLES
app.get('/api/tables', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });
  
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM tables_list WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id, name, capacity, status, activeOrderId, currentWaiter } = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO tables_list (id, tenant_id, name, capacity, status, activeOrderId, currentWaiter) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, name, capacity, status, activeOrderId || null, currentWaiter || null]
    );
    broadcastToTenant(String(tenantId), { type: 'TABLE_SAVED', data: { id, name, capacity, status, activeOrderId, currentWaiter } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tables/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  const { name, capacity, status, activeOrderId, currentWaiter } = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE tables_list SET name = ?, capacity = ?, status = ?, activeOrderId = ?, currentWaiter = ?
       WHERE id = ? AND tenant_id = ?`,
      [name, capacity, status, activeOrderId || null, currentWaiter || null, id, tenantId]
    );
    broadcastToTenant(String(tenantId), { type: 'TABLE_SAVED', data: { id, name, capacity, status, activeOrderId, currentWaiter } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tables/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query('DELETE FROM tables_list WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    broadcastToTenant(String(tenantId), { type: 'TABLE_DELETED', id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ORDERS
app.delete('/api/orders/purge-all', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });
  try {
    const pool = getPool();
    await pool.query('DELETE FROM orders WHERE tenant_id = ?', [tenantId]);
    await pool.query('DELETE FROM kots WHERE tenant_id = ?', [tenantId]);
    await pool.query('DELETE FROM bills WHERE tenant_id = ?', [tenantId]);
    broadcastToTenant(String(tenantId), { type: 'ORDERS_PURGED' });
    res.json({ success: true, message: "All orders, KOTs, and bills purged successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM orders WHERE tenant_id = ?', [tenantId]);
    const parsed = rows.map((r: any) => ({
      ...r,
      items: JSON.parse(r.items),
      kotIds: JSON.parse(r.kotIds)
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const order = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    // Check if order exists (upsert logic)
    const [existing]: any = await pool.query('SELECT id FROM orders WHERE id = ? AND tenant_id = ?', [order.id, tenantId]);
    
    if (existing.length > 0) {
      // Update
      await pool.query(
        `UPDATE orders SET tableId = ?, tableName = ?, orderType = ?, items = ?, kotIds = ?, subtotal = ?, 
         discountValue = ?, discountType = ?, taxRate = ?, serviceChargeRate = ?, grandTotal = ?, status = ?, 
         paymentMethod = ?, customerName = ?, customerPhone = ?, currentWaiter = ?, completedAt = ?
         WHERE id = ? AND tenant_id = ?`,
        [
          order.tableId, order.tableName, order.orderType, JSON.stringify(order.items), JSON.stringify(order.kotIds),
          order.subtotal, order.discountValue, order.discountType, order.taxRate, order.serviceChargeRate,
          order.grandTotal, order.status, order.paymentMethod || null, order.customerName || null,
          order.customerPhone || null, order.currentWaiter || null, order.completedAt || null, order.id, tenantId
        ]
      );
    } else {
      // Insert
      await pool.query(
        `INSERT INTO orders (id, tenant_id, tableId, tableName, orderType, items, kotIds, subtotal, discountValue, 
         discountType, taxRate, serviceChargeRate, grandTotal, status, createdAt, paymentMethod, customerName, 
         customerPhone, currentWaiter, completedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id, tenantId, order.tableId, order.tableName, order.orderType, JSON.stringify(order.items), JSON.stringify(order.kotIds),
          order.subtotal, order.discountValue, order.discountType, order.taxRate, order.serviceChargeRate,
          order.grandTotal, order.status, order.createdAt, order.paymentMethod || null, order.customerName || null,
          order.customerPhone || null, order.currentWaiter || null, order.completedAt || null
        ]
      );
    }
    broadcastToTenant(String(tenantId), { type: 'ORDER_SAVED', data: order });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// KOTS
app.get('/api/kots', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM kots WHERE tenant_id = ? ORDER BY createdAt DESC', [tenantId]);
    const parsed = rows.map((r: any) => ({
      ...r,
      items: JSON.parse(r.items)
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kots', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const kot = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [existing]: any = await pool.query('SELECT id FROM kots WHERE id = ? AND tenant_id = ?', [kot.id, tenantId]);
    
    if (existing.length > 0) {
      await pool.query(
        `UPDATE kots SET kotNumber = ?, tableId = ?, tableName = ?, items = ?, status = ? 
         WHERE id = ? AND tenant_id = ?`,
        [kot.kotNumber, kot.tableId, kot.tableName, JSON.stringify(kot.items), kot.status, kot.id, tenantId]
      );
    } else {
      await pool.query(
        `INSERT INTO kots (id, tenant_id, kotNumber, tableId, tableName, createdAt, items, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [kot.id, tenantId, kot.kotNumber, kot.tableId, kot.tableName, kot.createdAt, JSON.stringify(kot.items), kot.status]
      );
    }
    broadcastToTenant(String(tenantId), { type: 'KOT_SAVED', data: kot });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// BILLS
app.get('/api/bills', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM bills WHERE tenant_id = ? ORDER BY createdAt DESC', [tenantId]);
    const parsed = rows.map((r: any) => ({
      ...r,
      items: JSON.parse(r.items)
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const bill = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [existing]: any = await pool.query('SELECT id FROM bills WHERE id = ? AND tenant_id = ?', [bill.id, tenantId]);
    
    if (existing.length > 0) {
      await pool.query(
        `UPDATE bills SET orderId = ?, billNumber = ?, type = ?, customerName = ?, customerPhone = ?, tableName = ?, 
         orderType = ?, items = ?, subtotal = ?, discountAmount = ?, taxAmount = ?, serviceChargeAmount = ?, 
         grandTotal = ?, paymentMethod = ?, currentWaiter = ?
         WHERE id = ? AND tenant_id = ?`,
        [
          bill.orderId, bill.billNumber, bill.type, bill.customerName, bill.customerPhone, bill.tableName,
          bill.orderType, JSON.stringify(bill.items), bill.subtotal, bill.discountAmount, bill.taxAmount,
          bill.serviceChargeAmount, bill.grandTotal, bill.paymentMethod, bill.currentWaiter || null, bill.id, tenantId
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO bills (id, tenant_id, orderId, billNumber, type, customerName, customerPhone, tableName, 
         orderType, items, subtotal, discountAmount, taxAmount, serviceChargeAmount, grandTotal, createdAt, 
         paymentMethod, currentWaiter) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bill.id, tenantId, bill.orderId, bill.billNumber, bill.type, bill.customerName, bill.customerPhone,
          bill.tableName, bill.orderType, JSON.stringify(bill.items), bill.subtotal, bill.discountAmount,
          bill.taxAmount, bill.serviceChargeAmount, bill.grandTotal, bill.createdAt, bill.paymentMethod, bill.currentWaiter || null
        ]
      );
    }
    broadcastToTenant(String(tenantId), { type: 'BILL_SAVED', data: bill });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// BILL SERIES
app.get('/api/bill-series', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM bill_series WHERE tenant_id = ?', [tenantId]);
    if (rows.length === 0) {
      for (const s of INITIAL_BILL_SERIES) {
        await pool.query(
          `INSERT INTO bill_series (id, tenant_id, name, prefix, startNumber, nextNumber, type, isActive) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, tenantId, s.name, s.prefix, s.startNumber, s.nextNumber, s.type, s.isActive ? 1 : 0]
        );
      }
      const [newRows]: any = await pool.query('SELECT * FROM bill_series WHERE tenant_id = ?', [tenantId]);
      return res.json(newRows);
    }
    // Parse boolean status
    const parsed = rows.map((r: any) => ({ ...r, isActive: r.isActive === 1 }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bill-series', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const seriesArray = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    for (const s of seriesArray) {
      await pool.query(
        `UPDATE bill_series SET name = ?, prefix = ?, startNumber = ?, nextNumber = ?, type = ?, isActive = ? 
         WHERE id = ? AND tenant_id = ?`,
        [s.name, s.prefix, s.startNumber, s.nextNumber, s.type, s.isActive ? 1 : 0, s.id, tenantId]
      );
    }
    broadcastToTenant(String(tenantId), { type: 'BILL_SERIES_SAVED', data: seriesArray });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMERS
app.get('/api/customers', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM customers WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const c = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO customers (id, tenant_id, name, phone, email, dob, lifetimeSpend, orderCount, notes, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, tenantId, c.name, c.phone, c.email || null, c.dob || null, c.lifetimeSpend, c.orderCount, c.notes || null, c.createdAt]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  const c = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE customers SET name = ?, phone = ?, email = ?, dob = ?, lifetimeSpend = ?, orderCount = ?, notes = ? 
       WHERE id = ? AND tenant_id = ?`,
      [c.name, c.phone, c.email || null, c.dob || null, c.lifetimeSpend, c.orderCount, c.notes || null, id, tenantId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query('DELETE FROM customers WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// EXPENSES
app.get('/api/expenses', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM expenses WHERE tenant_id = ? ORDER BY date DESC', [tenantId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const exp = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO expenses (id, tenant_id, description, category, amount, date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [exp.id, tenantId, exp.description, exp.category, exp.amount, exp.date]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query('DELETE FROM expenses WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// WAITERS
app.get('/api/waiters', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM waiters WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/waiters', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const w = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO waiters (id, tenant_id, name, phone, status, commissionRate, rating, joiningDate) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [w.id, tenantId, w.name, w.phone, w.status, w.commissionRate, w.rating, w.joiningDate]
    );
    broadcastToTenant(String(tenantId), { type: 'WAITER_SAVED', data: w });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/waiters/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  const w = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE waiters SET name = ?, phone = ?, status = ?, commissionRate = ?, rating = ?, joiningDate = ? 
       WHERE id = ? AND tenant_id = ?`,
      [w.name, w.phone, w.status, w.commissionRate, w.rating, w.joiningDate, id, tenantId]
    );
    broadcastToTenant(String(tenantId), { type: 'WAITER_SAVED', data: { ...w, id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/waiters/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant ID." });

  try {
    const pool = getPool();
    await pool.query('DELETE FROM waiters WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    broadcastToTenant(String(tenantId), { type: 'WAITER_DELETED', id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tenant/status', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ success: false, error: "Missing tenant ID." });
  try {
    const pool = getPool();
    const [tenants]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [tenantId]);
    if (tenants.length === 0) return res.status(404).json({ success: false, error: "Tenant not found." });
    const tenant = tenants[0];
    const daysRemaining = calculateDaysRemaining(tenant.expiry_date);
    res.json({
      success: true,
      subscriptionStatus: tenant.subscription_status || 'trial',
      expiryDate: tenant.expiry_date,
      daysRemaining,
      isValid: tenant.is_valid === 1 || tenant.is_valid === true
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── SPA FALLBACK ROUTE ────────────────────────────────────────────────────
// For React Router: serve index.html for all non-API GET requests
app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send('Frontend not built. Run: npm run build:client first.');
  }
});

// STARTUP SERVICE
async function start() {
  try {
    await initializeDatabase();
  } catch (err: any) {
    dbOfflineError = err.message || String(err);
    console.error('⚠️ Warning: MySQL Database connection failed. Database features will be unavailable.', err);
  }

  server.listen(PORT, () => {
    console.log(`🚀 Express/WebSocket server running on port ${PORT}`);
    if (dbOfflineError) {
      console.log(`⚠️ Database is OFFLINE: ${dbOfflineError}`);
    }
  });
}

start();
