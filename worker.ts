export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle OPTIONS CORS preflight for all routes
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key, X-Tenant-ID',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        }
      });
    }

    // If request URL starts with /api/, handle API requests using Cloudflare D1
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApiRequest(request, env, url);
      } catch (err: any) {
        console.error('API Worker error:', err);
        return jsonResponse({ success: false, error: err.message || 'Internal Server Error' }, 500);
      }
    }

    // Otherwise serve static React frontend assets from dist/
    return env.ASSETS.fetch(request);
  }
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key, X-Tenant-ID',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    }
  });
}

function getTenantId(request: Request): number {
  const header = request.headers.get('X-Tenant-ID');
  if (header && !isNaN(Number(header))) {
    return Number(header);
  }
  return 1;
}

function calculateDaysRemaining(expiryStr: string): number {
  if (!expiryStr) return 0;
  const expiry = new Date(expiryStr);
  const now = new Date();
  if (isNaN(expiry.getTime())) return 0;
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

async function handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method;
  const pathname = url.pathname;
  const tenantId = getTenantId(request);

  // ─── 1. AUTH: REGISTER OWNER ───────────────────────────────────────────────
  if (pathname === '/api/auth/register-owner' && method === 'POST') {
    const body: any = await request.json();
    const { phone, password, name, clinicName, address, email } = body;

    if (!phone || !password || !name) {
      return jsonResponse({ success: false, error: "Required fields missing." }, 400);
    }

    // Check existing user
    const existing: any = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first();
    if (existing) {
      return jsonResponse({ success: false, error: "Mobile number is already registered." }, 400);
    }

    const trialDays = 5;
    const expiryDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const tenantRes = await env.DB.prepare(
      `INSERT INTO tenants (owner_phone, clinic_name, expiry_date, is_valid, address, gstin, contact_number, subscription_status) 
       VALUES (?, ?, ?, 1, ?, '27AAAAA1111A1Z0', ?, 'trial')`
    ).bind(phone, clinicName || 'Rio Restro Restaurant', expiryDate, address || '', phone).run();

    const newTenantId = tenantRes.meta.last_row_id;

    const userRes = await env.DB.prepare(
      `INSERT INTO users (tenant_id, phone, password, name, role, email) VALUES (?, ?, ?, ?, 'owner', ?)`
    ).bind(newTenantId, phone, password, name, email || '').run();

    const userId = userRes.meta.last_row_id;

    return jsonResponse({
      success: true,
      user: {
        id: userId,
        name,
        phone,
        role: 'owner',
        email: email || '',
        tenantId: newTenantId,
        tenant: {
          clinicName: clinicName || 'Rio Restro Restaurant',
          expiryDate,
          isValid: true,
          subscriptionStatus: 'trial',
          daysRemaining: trialDays,
          address: address || '',
          gstin: '27AAAAA1111A1Z0',
          contactNumber: phone
        }
      }
    });
  }

  // ─── 2. AUTH: LOGIN ────────────────────────────────────────────────────────
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body: any = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return jsonResponse({ success: false, error: "Phone and password required." }, 400);
    }

    // Hardcoded System Admin Check
    if (phone === '9999999999' && password === 'admin') {
      return jsonResponse({
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

    const user: any = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first();
    if (!user || user.password !== password) {
      return jsonResponse({ success: false, error: "Incorrect mobile number or password." }, 401);
    }

    const tenant: any = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(user.tenant_id).first();
    if (!tenant) {
      return jsonResponse({ success: false, error: "Tenant profile not found." }, 404);
    }

    const daysRemaining = calculateDaysRemaining(tenant.expiry_date);
    let subStatus = tenant.subscription_status || 'trial';
    let isValid = tenant.is_valid === 1;

    if (daysRemaining <= 0 && (subStatus === 'trial' || subStatus === 'active')) {
      subStatus = 'expired';
      isValid = false;
      await env.DB.prepare('UPDATE tenants SET subscription_status = ?, is_valid = 0 WHERE id = ?')
        .bind(subStatus, tenant.id).run();
    }

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        email: user.email || '',
        tenantId: tenant.id,
        tenant: {
          clinicName: tenant.clinic_name,
          expiryDate: tenant.expiry_date,
          isValid,
          subscriptionStatus: subStatus,
          daysRemaining,
          address: tenant.address || '',
          gstin: tenant.gstin || '',
          contactNumber: tenant.contact_number || tenant.owner_phone,
          foodLicenseNo: tenant.food_license_no || '',
          profilePic: tenant.profile_pic || null
        }
      }
    });
  }

  // ─── 3. UPDATE PROFILE ─────────────────────────────────────────────────────
  if ((pathname === '/api/auth/update-profile' || pathname === '/api/profile/update' || pathname === '/api/update-profile') && method === 'POST') {
    const body: any = await request.json();
    const { clinicName, address, contactNumber, gstin, foodLicenseNo, profilePic } = body;

    await env.DB.prepare(
      `UPDATE tenants SET 
        clinic_name = COALESCE(?, clinic_name),
        address = COALESCE(?, address),
        contact_number = COALESCE(?, contact_number),
        gstin = COALESCE(?, gstin),
        food_license_no = COALESCE(?, food_license_no),
        profile_pic = COALESCE(?, profile_pic)
       WHERE id = ?`
    ).bind(
      clinicName || null,
      address || null,
      contactNumber || null,
      gstin || null,
      foodLicenseNo || null,
      profilePic || null,
      tenantId
    ).run();

    const updatedTenant: any = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(tenantId).first();
    return jsonResponse({ success: true, tenant: updatedTenant });
  }

  // ─── 4. STAFF MANAGEMENT ──────────────────────────────────────────────────
  if (pathname === '/api/auth/get-staff' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, phone, name, role, email FROM users WHERE tenant_id = ?').bind(tenantId).all();
    return jsonResponse({ success: true, staff: results || [] });
  }

  if (pathname === '/api/auth/add-staff' && method === 'POST') {
    const body: any = await request.json();
    const { phone, password, name, role, email } = body;

    const existing: any = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first();
    if (existing) {
      return jsonResponse({ success: false, error: "Staff with this phone already exists." }, 400);
    }

    await env.DB.prepare(
      'INSERT INTO users (tenant_id, phone, password, name, role, email) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(tenantId, phone, password, name, role || 'waiter', email || '').run();

    return jsonResponse({ success: true, message: "Staff added successfully." });
  }

  if (pathname.startsWith('/api/auth/delete-staff/') && method === 'DELETE') {
    const phone = pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM users WHERE tenant_id = ? AND phone = ?').bind(tenantId, phone).run();
    return jsonResponse({ success: true, message: "Staff deleted successfully." });
  }

  // ─── 5. SUBSCRIPTION & ADMIN ENDPOINTS ──────────────────────────────────────
  if (pathname === '/api/subscription/request' && method === 'POST') {
    const body: any = await request.json();
    const { planId } = body;
    await env.DB.prepare(
      'UPDATE tenants SET requested_plan_id = ?, requested_at = ?, subscription_status = ? WHERE id = ?'
    ).bind(planId, new Date().toISOString(), 'requested', tenantId).run();
    return jsonResponse({ success: true, message: "Subscription request submitted." });
  }

  if (pathname === '/api/tenant/status' && method === 'GET') {
    const tenant: any = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(tenantId).first();
    if (!tenant) return jsonResponse({ success: false, error: "Tenant not found" }, 404);
    const daysRemaining = calculateDaysRemaining(tenant.expiry_date);
    return jsonResponse({
      success: true,
      tenant: {
        subscriptionStatus: tenant.subscription_status,
        expiryDate: tenant.expiry_date,
        isValid: tenant.is_valid === 1,
        daysRemaining
      }
    });
  }

  if (pathname === '/api/admin/tenants' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM tenants ORDER BY id DESC').all();
    return jsonResponse({ success: true, tenants: results || [] });
  }

  if (pathname === '/api/admin/plans' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM subscription_plans').all();
    return jsonResponse({ success: true, plans: results || [] });
  }

  if (pathname === '/api/admin/approve' && method === 'POST') {
    const body: any = await request.json();
    const { tenantId: targetId } = body;
    const tenant: any = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(targetId).first();
    if (!tenant) return jsonResponse({ success: false, error: "Tenant not found" }, 404);

    let months = 1;
    if (tenant.requested_plan_id === 'plan_2_month') months = 2;
    if (tenant.requested_plan_id === 'plan_6_month') months = 6;
    if (tenant.requested_plan_id === 'plan_12_month') months = 12;

    const currentExpiry = new Date(tenant.expiry_date && new Date(tenant.expiry_date).getTime() > Date.now() ? tenant.expiry_date : Date.now());
    currentExpiry.setMonth(currentExpiry.getMonth() + months);

    await env.DB.prepare(
      'UPDATE tenants SET expiry_date = ?, is_valid = 1, subscription_status = ?, requested_plan_id = NULL WHERE id = ?'
    ).bind(currentExpiry.toISOString(), 'active', targetId).run();

    return jsonResponse({ success: true, message: "Subscription approved." });
  }

  if (pathname === '/api/admin/reject' && method === 'POST') {
    const body: any = await request.json();
    const { tenantId: targetId } = body;
    await env.DB.prepare(
      'UPDATE tenants SET subscription_status = ?, requested_plan_id = NULL WHERE id = ?'
    ).bind('rejected', targetId).run();
    return jsonResponse({ success: true, message: "Subscription rejected." });
  }

  // ─── 6. MENU OPERATIONS ───────────────────────────────────────────────────
  if (pathname === '/api/menu' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM menu WHERE tenant_id = ?').bind(tenantId).all();
    const menuItems = (results || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      price: row.price,
      type: row.type,
      available: row.available === 1,
      code: row.code,
      gstRate: row.gstRate || 5,
      stockQuantity: row.stockQuantity || 15
    }));
    return jsonResponse(menuItems);
  }

  if (pathname === '/api/menu' && method === 'POST') {
    const item: any = await request.json();
    await env.DB.prepare(
      `INSERT INTO menu (id, tenant_id, name, category, price, type, available, code, gstRate, stockQuantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      item.id, tenantId, item.name, item.category, item.price, item.type,
      item.available ? 1 : 0, item.code || '', item.gstRate || 5, item.stockQuantity || 15
    ).run();
    return jsonResponse({ success: true, item });
  }

  if (pathname.startsWith('/api/menu/') && method === 'PUT') {
    const id = pathname.split('/').pop();
    const item: any = await request.json();
    await env.DB.prepare(
      `UPDATE menu SET name = ?, category = ?, price = ?, type = ?, available = ?, code = ?, gstRate = ?, stockQuantity = ?
       WHERE id = ? AND tenant_id = ?`
    ).bind(
      item.name, item.category, item.price, item.type, item.available ? 1 : 0,
      item.code || '', item.gstRate || 5, item.stockQuantity || 15, id, tenantId
    ).run();
    return jsonResponse({ success: true, item });
  }

  if (pathname.startsWith('/api/menu/') && method === 'DELETE') {
    const id = pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM menu WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    return jsonResponse({ success: true });
  }

  // ─── 7. TABLES OPERATIONS ──────────────────────────────────────────────────
  if (pathname === '/api/tables' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM tables_list WHERE tenant_id = ?').bind(tenantId).all();
    const tables = (results || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      status: row.status,
      activeOrderId: row.activeOrderId || null,
      currentWaiter: row.currentWaiter || null
    }));
    return jsonResponse(tables);
  }

  if (pathname === '/api/tables' && method === 'POST') {
    const table: any = await request.json();
    await env.DB.prepare(
      'INSERT INTO tables_list (id, tenant_id, name, capacity, status, activeOrderId, currentWaiter) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(table.id, tenantId, table.name, table.capacity, table.status, table.activeOrderId || null, table.currentWaiter || null).run();
    return jsonResponse({ success: true, table });
  }

  if (pathname.startsWith('/api/tables/') && method === 'PUT') {
    const id = pathname.split('/').pop();
    const table: any = await request.json();
    await env.DB.prepare(
      'UPDATE tables_list SET name = ?, capacity = ?, status = ?, activeOrderId = ?, currentWaiter = ? WHERE id = ? AND tenant_id = ?'
    ).bind(table.name, table.capacity, table.status, table.activeOrderId || null, table.currentWaiter || null, id, tenantId).run();
    return jsonResponse({ success: true, table });
  }

  if (pathname.startsWith('/api/tables/') && method === 'DELETE') {
    const id = pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM tables_list WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    return jsonResponse({ success: true });
  if (pathname === '/api/orders/purge-all' && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM orders WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM kots WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM bills WHERE tenant_id = ?').bind(tenantId).run();
    return jsonResponse({ success: true, message: "All orders, KOTs, and bills purged successfully." });
  }

  // ─── 8. ORDERS OPERATIONS ──────────────────────────────────────────────────
  if (pathname === '/api/orders' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM orders WHERE tenant_id = ?').bind(tenantId).all();
    const orders = (results || []).map((row: any) => ({
      ...row,
      items: JSON.parse(row.items || '[]'),
      kotIds: JSON.parse(row.kotIds || '[]')
    }));
    return jsonResponse(orders);
  }

  if (pathname === '/api/orders' && method === 'POST') {
    const order: any = await request.json();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO orders (id, tenant_id, tableId, tableName, orderType, items, kotIds, subtotal, discountValue, discountType, taxRate, serviceChargeRate, grandTotal, status, createdAt, paymentMethod, customerName, customerPhone, currentWaiter, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      order.id, tenantId, order.tableId, order.tableName, order.orderType,
      JSON.stringify(order.items || []), JSON.stringify(order.kotIds || []),
      order.subtotal, order.discountValue || 0, order.discountType || 'percentage',
      order.taxRate || 5, order.serviceChargeRate || 0, order.grandTotal, order.status,
      order.createdAt || new Date().toISOString(), order.paymentMethod || null,
      order.customerName || null, order.customerPhone || null, order.currentWaiter || null, order.completedAt || null
    ).run();
    return jsonResponse({ success: true, order });
  }

  // ─── 9. KOTS OPERATIONS ────────────────────────────────────────────────────
  if (pathname === '/api/kots' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM kots WHERE tenant_id = ?').bind(tenantId).all();
    const kots = (results || []).map((row: any) => ({
      ...row,
      items: JSON.parse(row.items || '[]')
    }));
    return jsonResponse(kots);
  }

  if (pathname === '/api/kots' && method === 'POST') {
    const kot: any = await request.json();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO kots (id, tenant_id, kotNumber, tableId, tableName, createdAt, items, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      kot.id, tenantId, kot.kotNumber, kot.tableId, kot.tableName,
      kot.createdAt || new Date().toISOString(), JSON.stringify(kot.items || []), kot.status
    ).run();
    return jsonResponse({ success: true, kot });
  }

  // ─── 10. BILLS OPERATIONS ──────────────────────────────────────────────────
  if (pathname === '/api/bills' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM bills WHERE tenant_id = ?').bind(tenantId).all();
    const bills = (results || []).map((row: any) => ({
      ...row,
      items: JSON.parse(row.items || '[]')
    }));
    return jsonResponse(bills);
  }

  if (pathname === '/api/bills' && method === 'POST') {
    const bill: any = await request.json();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO bills (id, tenant_id, orderId, billNumber, type, customerName, customerPhone, tableName, orderType, items, subtotal, discountAmount, taxAmount, serviceChargeAmount, grandTotal, createdAt, paymentMethod, currentWaiter)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      bill.id, tenantId, bill.orderId, bill.billNumber, bill.type,
      bill.customerName || '', bill.customerPhone || '', bill.tableName, bill.orderType,
      JSON.stringify(bill.items || []), bill.subtotal, bill.discountAmount || 0,
      bill.taxAmount || 0, bill.serviceChargeAmount || 0, bill.grandTotal,
      bill.createdAt || new Date().toISOString(), bill.paymentMethod || 'cash', bill.currentWaiter || null
    ).run();
    return jsonResponse({ success: true, bill });
  }

  // ─── 11. BILL SERIES OPERATIONS ────────────────────────────────────────────
  if (pathname === '/api/bill-series' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM bill_series WHERE tenant_id = ?').bind(tenantId).all();
    return jsonResponse(results || []);
  }

  if (pathname === '/api/bill-series' && method === 'PUT') {
    const seriesArray: any[] = await request.json();
    for (const s of seriesArray) {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO bill_series (id, tenant_id, name, prefix, startNumber, nextNumber, type, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(s.id, tenantId, s.name, s.prefix, s.startNumber, s.nextNumber, s.type, s.isActive ? 1 : 0).run();
    }
    return jsonResponse({ success: true });
  }

  // ─── 12. CUSTOMERS OPERATIONS ──────────────────────────────────────────────
  if (pathname === '/api/customers' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM customers WHERE tenant_id = ?').bind(tenantId).all();
    return jsonResponse(results || []);
  }

  if (pathname === '/api/customers' && method === 'POST') {
    const cust: any = await request.json();
    await env.DB.prepare(
      `INSERT INTO customers (id, tenant_id, name, phone, email, dob, lifetimeSpend, orderCount, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(cust.id, tenantId, cust.name, cust.phone, cust.email || '', cust.dob || '', cust.lifetimeSpend || 0, cust.orderCount || 0, cust.notes || '', cust.createdAt || new Date().toISOString()).run();
    return jsonResponse({ success: true, customer: cust });
  }

  // ─── 13. EXPENSES OPERATIONS ───────────────────────────────────────────────
  if (pathname === '/api/expenses' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM expenses WHERE tenant_id = ?').bind(tenantId).all();
    return jsonResponse(results || []);
  }

  if (pathname === '/api/expenses' && method === 'POST') {
    const exp: any = await request.json();
    await env.DB.prepare(
      'INSERT INTO expenses (id, tenant_id, description, category, amount, date) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(exp.id, tenantId, exp.description, exp.category, exp.amount, exp.date || new Date().toISOString().split('T')[0]).run();
    return jsonResponse({ success: true, expense: exp });
  }

  if (pathname.startsWith('/api/expenses/') && method === 'DELETE') {
    const id = pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM expenses WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    return jsonResponse({ success: true });
  }

  // ─── 14. WAITERS OPERATIONS ────────────────────────────────────────────────
  if (pathname === '/api/waiters' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM waiters WHERE tenant_id = ?').bind(tenantId).all();
    return jsonResponse(results || []);
  }

  if (pathname === '/api/waiters' && method === 'POST') {
    const waiter: any = await request.json();
    await env.DB.prepare(
      `INSERT INTO waiters (id, tenant_id, name, phone, status, commissionRate, rating, joiningDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(waiter.id, tenantId, waiter.name, waiter.phone, waiter.status || 'active', waiter.commissionRate || 5.0, waiter.rating || 5.0, waiter.joiningDate || new Date().toISOString().split('T')[0]).run();
    return jsonResponse({ success: true, waiter });
  }

  return jsonResponse({ success: false, error: 'Endpoint not found' }, 404);
}
