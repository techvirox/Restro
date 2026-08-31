// src/services/api.ts
import axios from 'axios';

// In production: same-origin (relative URL), so the Express server serves both
// the React app AND the API from the same port.
// In development: use localhost:3101 (or override via VITE_API_URL env var).
declare const __VITE_API_URL__: string | undefined;
const isDev = typeof window !== 'undefined' && 
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BACKEND_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 
                    (isDev ? 'http://localhost:3101' : '');  // Empty = same-origin in production

export const getWsUrl = (): string | null => {
  if (BACKEND_URL) {
    const wsProto = BACKEND_URL.startsWith('https') ? 'wss:' : 'ws:';
    return BACKEND_URL.replace(/^https?:\/\//, `${wsProto}//`).replace(/\/$/, '') + '/ws';
  }
  if (typeof window !== 'undefined') {
    const isStaticHost = window.location.hostname.endsWith('.workers.dev') || 
                         window.location.hostname.endsWith('.pages.dev') ||
                         window.location.hostname.endsWith('.netlify.app') ||
                         window.location.hostname.endsWith('.vercel.app') ||
                         window.location.hostname.endsWith('.github.io');
    if (isStaticHost) {
      return null;
    }
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}/ws`;
  }
  return 'ws://localhost:3101/ws';
};

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
});

// Configure client with X-Tenant-ID header when set
export const api = {
  setTenantId(tenantId: string | null) {
    if (tenantId) {
      apiClient.defaults.headers.common['X-Tenant-ID'] = tenantId;
    } else {
      delete apiClient.defaults.headers.common['X-Tenant-ID'];
    }
  },

  // Auth Operations
  async registerOwner(data: any) {
    const res = await apiClient.post('/api/auth/register-owner', data);
    return res.data;
  },

  async login(data: any) {
    const res = await apiClient.post('/api/auth/login', data);
    return res.data;
  },

  // Subscription Operations
  async requestSubscription(data: { planId: string }) {
    const res = await apiClient.post('/api/subscription/request', data);
    return res.data;
  },

  async getTenantSubscriptionStatus() {
    const res = await apiClient.get('/api/tenant/status');
    return res.data;
  },

  // Admin Operations
  async adminGetTenants() {
    const res = await apiClient.get('/api/admin/tenants');
    return res.data.tenants;
  },

  async adminGetPlans() {
    const res = await apiClient.get('/api/admin/plans');
    return res.data.plans;
  },

  async adminUpdatePlans(plans: Array<{ id: string; price: number }>) {
    const res = await apiClient.put('/api/admin/plans', { plans });
    return res.data;
  },

  async adminApproveSubscription(tenantId: number) {
    const res = await apiClient.post('/api/admin/approve', { tenantId });
    return res.data;
  },

  async adminRejectSubscription(tenantId: number) {
    const res = await apiClient.post('/api/admin/reject', { tenantId });
    return res.data;
  },

  async adminUpdateTenantConfig(tenantId: number, config: { expiryDate: string; status: string; isValid: boolean }) {
    const res = await apiClient.put(`/api/admin/tenants/${tenantId}`, config);
    return res.data;
  },

  async adminToggleTenantValid(tenantId: number, isValid: boolean) {
    const res = await apiClient.post(`/api/admin/tenants/${tenantId}/toggle-valid`, { isValid });
    return res.data;
  },

  async adminCreatePlan(data: { name: string; duration_months: number; price: number }) {
    const res = await apiClient.post('/api/admin/plans', data);
    return res.data;
  },

  async getLockMessage() {
    const res = await apiClient.get('/api/lock-message');
    return res.data;
  },

  async adminSaveLockMessage(message: string) {
    const res = await apiClient.post('/api/admin/lock-message', { message });
    return res.data;
  },

  async getSupportTickets() {
    const res = await apiClient.get('/api/support-tickets');
    return res.data.tickets;
  },

  async createSupportTicket(data: any) {
    const res = await apiClient.post('/api/support-tickets', data);
    return res.data;
  },

  async adminReplySupportTicket(ticketId: string, reply: string, status: string = 'resolved') {
    const res = await apiClient.post(`/api/admin/support-tickets/${ticketId}/reply`, { adminReply: reply, status });
    return res.data;
  },

  async updateProfile(data: any) {
    try {
      const res = await apiClient.post('/api/auth/update-profile', data);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        try {
          const res2 = await apiClient.post('/api/profile/update', data);
          return res2.data;
        } catch (err2: any) {
          if (err2?.response?.status === 404) {
            const res3 = await apiClient.post('/api/update-profile', data);
            return res3.data;
          }
          throw err2;
        }
      }
      throw err;
    }
  },

  async addStaff(data: any) {
    const res = await apiClient.post('/api/auth/add-staff', data);
    return res.data;
  },

  async getStaff() {
    const res = await apiClient.get('/api/auth/get-staff');
    return res.data.staff;
  },

  async deleteStaff(phone: string) {
    const res = await apiClient.delete(`/api/auth/delete-staff/${phone}`);
    return res.data;
  },

  // Menu Operations
  async getMenu() {
    const res = await apiClient.get('/api/menu');
    return res.data;
  },

  async addMenuItem(item: any) {
    const res = await apiClient.post('/api/menu', item);
    return res.data;
  },

  async updateMenuItem(id: string, item: any) {
    const res = await apiClient.put(`/api/menu/${id}`, item);
    return res.data;
  },

  async deleteMenuItem(id: string) {
    const res = await apiClient.delete(`/api/menu/${id}`);
    return res.data;
  },

  async resetMenu() {
    const res = await apiClient.post('/api/menu/reset');
    return res.data;
  },

  // Tables Operations
  async getTables() {
    const res = await apiClient.get('/api/tables');
    return res.data;
  },

  async addTable(table: any) {
    const res = await apiClient.post('/api/tables', table);
    return res.data;
  },

  async updateTable(id: string, table: any) {
    const res = await apiClient.put(`/api/tables/${id}`, table);
    return res.data;
  },

  async deleteTable(id: string) {
    const res = await apiClient.delete(`/api/tables/${id}`);
    return res.data;
  },

  // Orders Operations
  async getOrders() {
    const res = await apiClient.get('/api/orders');
    return res.data;
  },

  async saveOrder(order: any) {
    const res = await apiClient.post('/api/orders', order);
    return res.data;
  },

  // KOTs Operations
  async getKots() {
    const res = await apiClient.get('/api/kots');
    return res.data;
  },

  async saveKot(kot: any) {
    const res = await apiClient.post('/api/kots', kot);
    return res.data;
  },

  // Bills Operations
  async getBills() {
    const res = await apiClient.get('/api/bills');
    return res.data;
  },

  async saveBill(bill: any) {
    const res = await apiClient.post('/api/bills', bill);
    return res.data;
  },

  // Bill Series Operations
  async getBillSeries() {
    const res = await apiClient.get('/api/bill-series');
    return res.data;
  },

  async updateBillSeries(seriesArray: any[]) {
    const res = await apiClient.put('/api/bill-series', seriesArray);
    return res.data;
  },

  // Customers Operations
  async getCustomers() {
    const res = await apiClient.get('/api/customers');
    return res.data;
  },

  async addCustomer(customer: any) {
    const res = await apiClient.post('/api/customers', customer);
    return res.data;
  },

  async updateCustomer(id: string, customer: any) {
    const res = await apiClient.put(`/api/customers/${id}`, customer);
    return res.data;
  },

  async deleteCustomer(id: string) {
    const res = await apiClient.delete(`/api/customers/${id}`);
    return res.data;
  },

  // Expenses Operations
  async getExpenses() {
    const res = await apiClient.get('/api/expenses');
    return res.data;
  },

  async addExpense(expense: any) {
    const res = await apiClient.post('/api/expenses', expense);
    return res.data;
  },

  async deleteExpense(id: string) {
    const res = await apiClient.delete(`/api/expenses/${id}`);
    return res.data;
  },

  // Waiters Operations
  async getWaiters() {
    const res = await apiClient.get('/api/waiters');
    return res.data;
  },

  async addWaiter(waiter: any) {
    const res = await apiClient.post('/api/waiters', waiter);
    return res.data;
  },

  async updateWaiter(id: string, waiter: any) {
    const res = await apiClient.put(`/api/waiters/${id}`, waiter);
    return res.data;
  },

  async deleteWaiter(id: string) {
    const res = await apiClient.delete(`/api/waiters/${id}`);
    return res.data;
  }
};
export default api;
