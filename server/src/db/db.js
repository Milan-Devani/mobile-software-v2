import { v4 as uuidv4 } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';
import { createInitialSeedData } from './seedData.js';
import { setupVendorRepo } from './vendorRepo.js';

// In-memory synchronized mirror of Supabase PostgreSQL tables
let localDb = null;

export const sanitizeRecord = (record) => {
  if (!record || typeof record !== 'object') return record;
  const clean = { ...record };
  for (const [key, val] of Object.entries(clean)) {
    if (val === '') {
      if (
        key.endsWith('_date') ||
        key.endsWith('_at') ||
        key.endsWith('_id') ||
        key === 'valid_until' ||
        key === 'invoice_date' ||
        key === 'expiry_date' ||
        key === 'rejection_reason' ||
        key === 'date'
      ) {
        clean[key] = null;
      }
    }
  }
  return clean;
};

export const safeSupabaseInsert = async (table, data) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    let payload = Array.isArray(data)
      ? data.map(r => ({ ...sanitizeRecord(r) }))
      : { ...sanitizeRecord(data) };

    for (let attempts = 0; attempts < 10; attempts++) {
      const { data: res, error } = await supabase.from(table).insert(payload).select();
      if (!error) return res;

      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        if (Array.isArray(payload)) {
          payload.forEach(r => delete r[missingCol]);
        } else {
          delete payload[missingCol];
        }
      } else {
        if (error.code !== 'PGRST205') {
          console.warn(`⚠️ Supabase [${table}] insert error:`, error.message);
        }
        return null;
      }
    }
    return null;
  } catch (err) {
    console.warn(`⚠️ Supabase [${table}] insert error:`, err.message);
    return null;
  }
};

export const safeSupabaseUpdate = async (table, id, updates) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    let payload = { ...sanitizeRecord(updates) };

    for (let attempts = 0; attempts < 10; attempts++) {
      const { data: res, error } = await supabase.from(table).update(payload).eq('id', id).select();
      if (!error) return res;

      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        delete payload[missingCol];
      } else {
        if (error.code !== 'PGRST205') {
          console.warn(`⚠️ Supabase [${table}] update error:`, error.message);
        }
        return null;
      }
    }
    return null;
  } catch (err) {
    console.warn(`⚠️ Supabase [${table}] update error:`, err.message);
    return null;
  }
};

export const safeSupabaseDelete = async (table, id, idColumn = 'id') => {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase.from(table).delete().eq(idColumn, id);
    if (error) {
      if (error.code !== 'PGRST205') {
        console.warn(`⚠️ Supabase [${table}] delete error:`, error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`⚠️ Supabase [${table}] delete error:`, err.message);
    return false;
  }
};

export const safeSupabaseUpsert = async (table, data, onConflict = 'id') => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    let payload = Array.isArray(data)
      ? data.map(r => ({ ...sanitizeRecord(r) }))
      : { ...sanitizeRecord(data) };

    for (let attempts = 0; attempts < 10; attempts++) {
      const { data: res, error } = await supabase.from(table).upsert(payload, { onConflict }).select();
      if (!error) return res;

      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        if (Array.isArray(payload)) {
          payload.forEach(r => delete r[missingCol]);
        } else {
          delete payload[missingCol];
        }
      } else {
        if (error.code !== 'PGRST205') {
          console.warn(`⚠️ Supabase [${table}] upsert error:`, error.message);
        }
        return null;
      }
    }
    return null;
  } catch (err) {
    console.warn(`⚠️ Supabase [${table}] upsert error:`, err.message);
    return null;
  }
};

export const syncFromSupabase = async () => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const coreTables = [
      'shops',
      'roles',
      'users',
      'customers',
      'devices',
      'parts',
      'repair_jobs',
      'job_status_history',
      'diagnoses',
      'repair_estimates',
      'repair_estimate_items',
      'part_stock_movements',
      'repair_tests',
      'payments',
      'invoices',
      'invoice_items',
      'notification_logs',
      'attachments',
      'backup_logs',
      'settings',
      'sales',
      'vendors',
      'vendor_transactions',
      'vendor_mobiles',
      'vendor_status_history',
      'vendor_ledger',
      'vendor_payments',
    ];

    const seedFallbackTables = new Set(['shops', 'roles', 'users']);

    await Promise.all(
      coreTables.map(async (tbl) => {
        try {
          const { data, error } = await supabase.from(tbl).select('*').limit(3000);
          if (!error && Array.isArray(data)) {
            if (!seedFallbackTables.has(tbl) || data.length > 0) {
              localDb[tbl] = data;
            }
          }
        } catch (_) {
          // Table may not exist yet or empty
        }
      })
    );
    console.log('🔄 Live database synchronized from Supabase PostgreSQL.');
  } catch (err) {
    console.warn('⚠️ Supabase live sync warning:', err.message);
  }
};

// Initialize database directly from Supabase PostgreSQL (no local db.json file)
export const initDb = async () => {
  localDb = await createInitialSeedData();

  localDb.vendors = localDb.vendors || [];
  localDb.vendor_transactions = localDb.vendor_transactions || [];
  localDb.vendor_mobiles = localDb.vendor_mobiles || [];
  localDb.vendor_status_history = localDb.vendor_status_history || [];
  localDb.vendor_ledger = localDb.vendor_ledger || [];
  localDb.vendor_payments = localDb.vendor_payments || [];
  localDb.sales = localDb.sales || [];
  localDb.attachments = localDb.attachments || [];
  localDb.backup_logs = localDb.backup_logs || [];

  if (isSupabaseConfigured()) {
    console.log('✅ Supabase PostgreSQL is connected as permanent primary database. Syncing live tables...');
    await syncFromSupabase();
  } else {
    console.warn('⚠️ Supabase is not configured in environment variables.');
  }
};
const saveLocalDb = () => {};

export const parseWarrantyDays = (val) => {
  if (val === undefined || val === null || val === '') return -1;
  if (typeof val === 'number') return val;
  const str = String(val).toLowerCase().trim();
  if (str === 'no warranty' || str === 'none' || str === 'no' || str === '0') return 0;
  const match = str.match(/(\d+)\s*(d|day|m|month|y|year)?/i);
  if (!match) return -1;
  const num = parseInt(match[1], 10);
  const unit = (match[2] || '').toLowerCase();
  if (unit.startsWith('y')) return num * 365;
  if (unit.startsWith('m')) return num * 30;
  return num;
};

// Next Job Number generator: format mobo-YYYY-0001
export const generateNextJobNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `mobo-${currentYear}-`;
  let highestSeq = 0;

  // 1. Check local engine records
  const localNumbers = (localDb?.repair_jobs || [])
    .map(j => j.job_number)
    .filter(num => num && num.startsWith(prefix));

  for (const num of localNumbers) {
    const seq = parseInt(num.replace(prefix, ''), 10) || 0;
    if (seq > highestSeq) highestSeq = seq;
  }

  // 2. Also check Supabase records if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('repair_jobs')
        .select('job_number')
        .like('job_number', `${prefix}%`)
        .order('job_number', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        for (const row of data) {
          const seq = parseInt((row.job_number || '').replace(prefix, ''), 10) || 0;
          if (seq > highestSeq) highestSeq = seq;
        }
      }
    } catch (_) {
      // Non-blocking fallback to local highest sequence
    }
  }

  return `${prefix}${String(highestSeq + 1).padStart(4, '0')}`;
};

// Next Invoice Number generator: format INV-YYYY-000001
export const generateNextInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  let highestSeq = 0;

  // 1. Check local engine records
  const localInvoices = (localDb?.invoices || [])
    .map(inv => inv.invoice_number)
    .filter(num => num && num.startsWith(prefix));

  for (const num of localInvoices) {
    const seq = parseInt(num.replace(prefix, ''), 10) || 0;
    if (seq > highestSeq) highestSeq = seq;
  }

  // 2. Also check Supabase records if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        for (const row of data) {
          const seq = parseInt((row.invoice_number || '').replace(prefix, ''), 10) || 0;
          if (seq > highestSeq) highestSeq = seq;
        }
      }
    } catch (_) {
      // Non-blocking fallback
    }
  }

  return `${prefix}${String(highestSeq + 1).padStart(6, '0')}`;
};

// Next Sales Invoice Number generator
export const generateNextSaleInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  let highestSeq = 0;

  const allRecords = [
    ...(localDb?.sales || []).map(s => s.invoice_number),
    ...(localDb?.invoices || []).map(i => i.invoice_number)
  ].filter(num => num && typeof num === 'string' && num.startsWith(prefix));

  for (const num of allRecords) {
    const seq = parseInt(num.replace(prefix, ''), 10) || 0;
    if (seq > highestSeq) highestSeq = seq;
  }

  for (const s of (localDb?.sales || [])) {
    if (s.invoice_no_seq && s.invoice_no_seq > highestSeq) {
      highestSeq = s.invoice_no_seq;
    }
  }

  const nextSeq = highestSeq + 1;
  return {
    fullNumber: `${prefix}${String(nextSeq).padStart(6, '0')}`,
    seqNumber: nextSeq,
    shortNumber: String(nextSeq)
  };
};

// Vendor Repository instance
const supabaseHelpers = {
  safeInsert: safeSupabaseInsert,
  safeUpdate: safeSupabaseUpdate,
  safeDelete: safeSupabaseDelete,
  safeUpsert: safeSupabaseUpsert,
};

const {
  generateNextVendorCode,
  generateNextVendorTxnNumber,
  generateNextVendorVoucherNumber,
  vendorDbMethods,
} = setupVendorRepo(() => localDb, () => saveLocalDb(), supabaseHelpers);

export {
  generateNextVendorCode,
  generateNextVendorTxnNumber,
  generateNextVendorVoucherNumber,
};

// Unified Database Repository
export const db = {
  // USERS
  users: {
    findByEmail: async (email) => {
      const cleanEmail = email.toLowerCase().trim();
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase()
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      }
      return (localDb.users || []).find(u => u.email.toLowerCase() === cleanEmail) || null;
    },
    findById: async (id) => {
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('users').select('*').eq('id', id).single();
        return data || null;
      }
      return (localDb.users || []).find(u => u.id === id) || null;
    },
    list: async () => {
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('users').select('id, role_id, full_name, email, phone, is_active, created_at');
        return data || [];
      }
      return (localDb.users || []).map(({ password_hash, ...u }) => u);
    },
    create: async (userData) => {
      const newUser = {
        id: uuidv4(),
        ...userData,
        email: userData.email.toLowerCase().trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDb.users.push(newUser);
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase().from('users').insert(newUser).select().single();
        if (error) throw error;
        const { password_hash: _ph, ...safeData } = data || newUser;
        return safeData;
      }
      const { password_hash, ...safe } = newUser;
      return safe;
    },
    delete: async (id, currentUserId) => {
      if (id === currentUserId) {
        throw new Error('You cannot delete your own active account.');
      }
      const idx = (localDb.users || []).findIndex(u => u.id === id);
      if (idx !== -1) {
        localDb.users.splice(idx, 1);
      }
      if (isSupabaseConfigured()) {
        await safeSupabaseDelete('users', id);
      }
      return true;
    },
    bulkDelete: async (ids, currentUserId) => {
      const validIds = (ids || []).filter(id => id !== currentUserId);
      if (validIds.length === 0) return 0;
      const initialCount = (localDb.users || []).length;
      localDb.users = (localDb.users || []).filter(u => !validIds.includes(u.id));
      const deletedCount = initialCount - (localDb.users || []).length;
      if (isSupabaseConfigured() && validIds.length > 0) {
        try {
          await getSupabase().from('users').delete().in('id', validIds);
        } catch (_) {}
      }
      return deletedCount || validIds.length;
    }
  },

  // SHOPS
  shops: {
    getProfile: async () => {
      let profile = null;
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('shops').select('*').limit(1).single();
        profile = data ? { ...data } : null;
      } else {
        profile = (localDb.shops && localDb.shops[0]) ? { ...localDb.shops[0] } : null;
      }
      if (!profile) return null;

      try {
        const extra = await db.settings.get('shop_profile_extra');
        if (extra && typeof extra === 'object') {
          profile = { ...profile, ...extra };
        }
      } catch (err) {
        // ignore fallback
      }

      if (localDb.shops && localDb.shops[0]) {
        localDb.shops[0] = { ...localDb.shops[0], ...profile };
      }

      return profile;
    },
    updateProfile: async (updates) => {
      const { instagram_qr_url, ...validShopUpdates } = updates;

      if (instagram_qr_url !== undefined) {
        await db.settings.set(
          'shop_profile_extra',
          { instagram_qr_url },
          'Shop profile extra fields including Instagram QR'
        );
      }

      if (localDb.shops && localDb.shops[0]) {
        localDb.shops[0] = { ...localDb.shops[0], ...updates, updated_at: new Date().toISOString() };
      }

      if (isSupabaseConfigured()) {
        const current = (await getSupabase().from('shops').select('id').limit(1).single()).data;
        if (!current) return null;

        const allowedCols = new Set([
          'name',
          'tagline',
          'logo_url',
          'phone',
          'email',
          'address',
          'city',
          'state',
          'postal_code',
          'country',
          'tax_number',
          'website',
          'currency',
          'currency_symbol',
          'warranty_terms',
          'terms_conditions',
        ]);

        const dbPayload = { updated_at: new Date().toISOString() };
        for (const [k, v] of Object.entries(validShopUpdates)) {
          if (allowedCols.has(k)) {
            dbPayload[k] = v;
          }
        }

        const { data, error } = await getSupabase()
          .from('shops')
          .update(dbPayload)
          .eq('id', current.id)
          .select()
          .single();
        if (error) throw error;

        return {
          ...data,
          instagram_qr_url:
            instagram_qr_url !== undefined
              ? instagram_qr_url
              : (localDb.shops?.[0]?.instagram_qr_url || ''),
        };
      }

      return (localDb.shops && localDb.shops[0]) || null;
    },
  },

  // CUSTOMERS
  customers: {
    list: async ({ search = '', startDate = '', endDate = '', limit = 50, offset = 0 } = {}) => {
      if (isSupabaseConfigured()) {
        let query = getSupabase().from('customers').select('*', { count: 'exact' });
        if (search) {
          query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (startDate) {
          query = query.gte('created_at', startDate.length === 10 ? `${startDate}T00:00:00` : startDate);
        }
        if (endDate) {
          query = query.lte('created_at', endDate.length === 10 ? `${endDate}T23:59:59.999` : endDate);
        }
        const { data, count, error } = await query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
        if (error) throw error;
        return { customers: data || [], total: count || 0 };
      }

      let filtered = [...(localDb.customers || [])];

      if (startDate) {
        const startObj = startDate.length === 10 ? new Date(`${startDate}T00:00:00`) : new Date(startDate);
        const startTime = startObj.getTime();
        if (!isNaN(startTime)) {
          filtered = filtered.filter(c => {
            if (!c.created_at) return false;
            const t = new Date(c.created_at).getTime();
            return !isNaN(t) && t >= startTime;
          });
        }
      }
      if (endDate) {
        const endObj = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999`) : new Date(endDate);
        const endTime = endObj.getTime();
        if (!isNaN(endTime)) {
          filtered = filtered.filter(c => {
            if (!c.created_at) return false;
            const t = new Date(c.created_at).getTime();
            return !isNaN(t) && t <= endTime;
          });
        }
      }

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(c =>
          (c.full_name && c.full_name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.customer_code && c.customer_code.toLowerCase().includes(q))
        );
      }
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const total = filtered.length;
      return { customers: filtered.slice(offset, offset + limit), total };
    },
    findById: async (id) => {
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('customers').select('*').eq('id', id).single();
        return data || null;
      }
      return (localDb.customers || []).find(c => c.id === id) || null;
    },
    create: async (customerData) => {
      let nextSeq = 1;
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase()
          .from('customers')
          .select('customer_code')
          .like('customer_code', 'CUST-%')
          .order('customer_code', { ascending: false })
          .limit(1);
        if (data && data.length > 0 && data[0].customer_code) {
          const num = parseInt(data[0].customer_code.replace('CUST-', ''), 10) || 0;
          nextSeq = num + 1;
        }
      } else {
        const existingCodes = (localDb.customers || [])
          .map(c => c.customer_code)
          .filter(code => code && code.startsWith('CUST-'));
        let highest = 0;
        for (const code of existingCodes) {
          const num = parseInt(code.replace('CUST-', ''), 10) || 0;
          if (num > highest) highest = num;
        }
        nextSeq = highest + 1;
      }

      const newCustomer = {
        id: uuidv4(),
        customer_code: `CUST-${String(nextSeq).padStart(4, '0')}`,
        ...customerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDb.customers.push(newCustomer);
      saveLocalDb();
      if (isSupabaseConfigured()) {
        const inserted = await safeSupabaseInsert('customers', newCustomer);
        if (Array.isArray(inserted) && inserted[0]) {
          return inserted[0];
        }
      }
      return newCustomer;
    },
    update: async (id, updates) => {
      const idx = (localDb.customers || []).findIndex(c => c.id === id);
      if (idx !== -1) {
        localDb.customers[idx] = { ...localDb.customers[idx], ...updates, updated_at: new Date().toISOString() };
      }
      if (isSupabaseConfigured()) {
        const updated = await safeSupabaseUpdate('customers', id, { ...updates, updated_at: new Date().toISOString() });
        if (Array.isArray(updated) && updated[0]) {
          return updated[0];
        }
      }
      return idx !== -1 ? localDb.customers[idx] : null;
    },
    delete: async (id) => {
      const idx = (localDb.customers || []).findIndex(c => c.id === id);
      if (idx !== -1) {
        localDb.customers.splice(idx, 1);
      }
      if (isSupabaseConfigured()) {
        await safeSupabaseDelete('customers', id);
      }
      return true;
    },
    bulkDelete: async (ids = [], force = false) => {
      if (!Array.isArray(ids) || ids.length === 0) return 0;
      let count = 0;
      for (const id of ids) {
        if (force) {
          // Remove associated jobs
          const customerJobs = (localDb.repair_jobs || []).filter(j => j.customer_id === id);
          for (const cj of customerJobs) {
            await db.jobs.delete(cj.id);
          }
        }
        const idx = (localDb.customers || []).findIndex(c => c.id === id);
        if (idx !== -1) {
          localDb.customers.splice(idx, 1);
          count++;
        }
      }
      if (isSupabaseConfigured() && ids.length > 0) {
        try {
          await getSupabase().from('customers').delete().in('id', ids);
        } catch (_) {}
      }
      return count || ids.length;
    }
  },

  // DEVICES
  devices: {
    findById: async (id) => {
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('devices').select('*').eq('id', id).single();
        return data || null;
      }
      return (localDb.devices || []).find(d => d.id === id) || null;
    },
    listByCustomerId: async (customerId) => {
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('devices').select('*').eq('customer_id', customerId);
        return data || [];
      }
      return (localDb.devices || []).filter(d => d.customer_id === customerId);
    },
    create: async (deviceData) => {
      const newDevice = {
        id: uuidv4(),
        ...deviceData,
        invoice_date: deviceData.invoice_date || null,
        expiry_date: deviceData.expiry_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDb.devices.push(newDevice);
      if (isSupabaseConfigured()) {
        const inserted = await safeSupabaseInsert('devices', newDevice);
        if (Array.isArray(inserted) && inserted[0]) {
          return inserted[0];
        }
      }
      return newDevice;
    },
    update: async (id, updates) => {
      const idx = (localDb.devices || []).findIndex(d => d.id === id);
      if (idx !== -1) {
        localDb.devices[idx] = { ...localDb.devices[idx], ...updates, updated_at: new Date().toISOString() };
      }
      if (isSupabaseConfigured()) {
        const updated = await safeSupabaseUpdate('devices', id, { ...updates, updated_at: new Date().toISOString() });
        if (Array.isArray(updated) && updated[0]) {
          return updated[0];
        }
      }
      return idx !== -1 ? localDb.devices[idx] : null;
    }
  },

  // REPAIR JOBS
  jobs: {
    list: async ({ status, customerId, technicianId, search, startDate, endDate, limit = 50, offset = 0, sortBy = 'created_at', sortDir = 'desc' } = {}) => {
      // In local engine
      let jobs = [...(localDb.repair_jobs || [])];

      if (status) {
        jobs = jobs.filter(j => j.status === status);
      }
      if (customerId) {
        jobs = jobs.filter(j => j.customer_id === customerId);
      }
      if (technicianId) {
        jobs = jobs.filter(j => j.assigned_technician_id === technicianId);
      }
      if (startDate) {
        const startObj = startDate.length === 10 ? new Date(`${startDate}T00:00:00`) : new Date(startDate);
        const startTime = startObj.getTime();
        if (!isNaN(startTime)) {
          jobs = jobs.filter(j => {
            if (!j.created_at) return false;
            const t = new Date(j.created_at).getTime();
            return !isNaN(t) && t >= startTime;
          });
        }
      }
      if (endDate) {
        const endObj = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999`) : new Date(endDate);
        const endTime = endObj.getTime();
        if (!isNaN(endTime)) {
          jobs = jobs.filter(j => {
            if (!j.created_at) return false;
            const t = new Date(j.created_at).getTime();
            return !isNaN(t) && t <= endTime;
          });
        }
      }

      // Populate joined customer & device
      let populated = jobs.map(j => {
        const customer = (localDb.customers || []).find(c => c.id === j.customer_id) || {};
        const device = (localDb.devices || []).find(d => d.id === j.device_id) || {};
        const tech = (localDb.users || []).find(u => u.id === j.assigned_technician_id) || null;

        // Dynamic warranty days calculation based on estimate items
        let effectiveWarrantyDays = j.warranty_days !== undefined ? j.warranty_days : 90;
        const est = (localDb.repair_estimates || []).find(e => e.job_id === j.id);
        if (est) {
          const estItems = (localDb.repair_estimate_items || []).filter(i => i.estimate_id === est.id);
          const warranties = estItems
            .map(it => it.warranty)
            .filter(w => w !== undefined && w !== null && String(w).trim() !== '');
          if (warranties.length > 0) {
            let maxDays = -1;
            for (const w of warranties) {
              const d = parseWarrantyDays(w);
              if (d > maxDays) maxDays = d;
            }
            if (maxDays >= 0) {
              effectiveWarrantyDays = maxDays;
            }
          }
        }

        return {
          ...j,
          warranty_days: effectiveWarrantyDays,
          customer: {
            id: customer.id,
            full_name: customer.full_name,
            phone: customer.phone,
            email: customer.email,
            whatsapp_number: customer.whatsapp_number,
            alternate_phone: customer.alternate_phone || '',
            alternate_whatsapp: customer.alternate_whatsapp || '',
            gender: customer.gender || 'male',
            user_type: customer.user_type || 'End User',
            address: customer.address || '',
            city: customer.city || '',
            state: customer.state || '',
            postal_code: customer.postal_code || ''
          },
          device: {
            id: device.id,
            brand: device.brand,
            model: device.model,
            imei: device.imei,
            color: device.color,
            serial_number: device.serial_number || '',
            storage_capacity: device.storage_capacity || '',
            invoice_date: device.invoice_date || '',
            invoice_number: device.invoice_number || '',
            expiry_date: device.expiry_date || '',
            cosmetic_condition: device.cosmetic_condition || ''
          },
          technician: tech ? { id: tech.id, full_name: tech.full_name } : null
        };
      });

      if (search) {
        const q = search.toLowerCase();
        populated = populated.filter(j =>
          (j.job_number && j.job_number.toLowerCase().includes(q)) ||
          (j.customer?.full_name && j.customer.full_name.toLowerCase().includes(q)) ||
          (j.customer?.phone && j.customer.phone.includes(q)) ||
          (j.customer?.whatsapp_number && j.customer.whatsapp_number.includes(q)) ||
          (j.customer?.alternate_phone && j.customer.alternate_phone.includes(q)) ||
          (j.customer?.alternate_whatsapp && j.customer.alternate_whatsapp.includes(q)) ||
          (j.device?.model && j.device.model.toLowerCase().includes(q)) ||
          (j.device?.imei && j.device.imei.toLowerCase().includes(q)) ||
          (j.customer_complaint && j.customer_complaint.toLowerCase().includes(q))
        );
      }

      // Sorting
      populated.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (sortBy === 'created_at') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }
        if (sortDir === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });

      const total = populated.length;
      return { jobs: populated.slice(offset, offset + limit), total };
    },

    findById: async (id) => {
      const job = (localDb.repair_jobs || []).find(j => j.id === id || j.job_number === id || j.approval_token === id);
      if (!job) return null;

      const customer = (localDb.customers || []).find(c => c.id === job.customer_id) || null;
      const device = (localDb.devices || []).find(d => d.id === job.device_id) || null;
      const technician = (localDb.users || []).find(u => u.id === job.assigned_technician_id) || null;
      const createdBy = (localDb.users || []).find(u => u.id === job.created_by_user_id) || null;
      const diagnosis = (localDb.diagnoses || []).find(d => d.job_id === job.id) || null;
      const estimate = (localDb.repair_estimates || []).find(e => e.job_id === job.id) || null;
      const estimateItems = estimate
        ? (localDb.repair_estimate_items || []).filter(ei => ei.estimate_id === estimate.id)
        : [];
      const partsUsed = (localDb.repair_job_parts || []).filter(p => p.job_id === job.id);
      const laborItems = (localDb.repair_job_labor || []).filter(l => l.job_id === job.id);
      const tests = (localDb.repair_tests || []).filter(t => t.job_id === job.id);
      const payments = (localDb.payments || []).filter(p => p.job_id === job.id);
      const invoice = (localDb.invoices || []).find(inv => inv.job_id === job.id) || null;
      const attachments = (localDb.attachments || []).filter(att => att.job_id === job.id);
      const history = (localDb.job_status_history || [])
        .filter(h => h.job_id === job.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      return {
        ...job,
        customer,
        device,
        technician: technician ? { id: technician.id, full_name: technician.full_name, email: technician.email } : null,
        created_by: createdBy ? { id: createdBy.id, full_name: createdBy.full_name } : null,
        diagnosis,
        estimate: estimate ? { ...estimate, items: estimateItems } : null,
        parts_used: partsUsed,
        labor_items: laborItems,
        tests,
        payments,
        invoice,
        attachments,
        history
      };
    },

    create: async ({ jobData, userId }) => {
      const jobNumber = await generateNextJobNumber();
      const approvalToken = uuidv4();
      const shop = (localDb.shops && localDb.shops[0]) || {};

      const newJob = {
        id: uuidv4(),
        job_number: jobNumber,
        shop_id: shop.id || 'a0000000-0000-0000-0000-000000000001',
        customer_id: jobData.customer_id,
        device_id: jobData.device_id,
        assigned_technician_id: jobData.assigned_technician_id || null,
        created_by_user_id: userId,
        status: 'RECEIVED',
        priority: jobData.priority || 'NORMAL',
        service_type: jobData.service_type || 'Pending',
        customer_complaint: jobData.customer_complaint,
        device_condition: jobData.device_condition || {},
        accessories_received: jobData.accessories_received || [],
        subtotal: 0.00,
        discount: 0.00,
        discount_type: 'AMOUNT',
        discount_value: 0.00,
        tax_rate: 8.25,
        tax_amount: 0.00,
        total_amount: 0.00,
        paid_amount: 0.00,
        balance_due: 0.00,
        payment_status: 'UNPAID',
        is_warranty_claim: false,
        reopen_count: 0,
        customer_tested_device: false,
        customer_acceptance_confirmed: false,
        customer_signature: null,
        delivery_notes: null,
        delivered_at: null,
        delivered_by_user_id: null,
        approval_token: approvalToken,
        approval_status: 'PENDING',
        approval_decision_at: null,
        rejection_reason: null,
        warranty_days: 90,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      localDb.repair_jobs.push(newJob);

      // Create initial timeline event
      localDb.job_status_history.push({
        id: uuidv4(),
        job_id: newJob.id,
        from_status: null,
        to_status: 'RECEIVED',
        action_title: 'Device Received & Job Sheet Created',
        notes: `Device accepted into shop service. Assigned Job #${jobNumber}. Customer complaint: "${jobData.customer_complaint}".`,
        performed_by_user_id: userId,
        created_at: new Date().toISOString()
      });

      // Initialize standard quality test checklist for this job
      const standardTests = [
        { key: 'power_on', label: 'Device Powers On' },
        { key: 'display', label: 'Display & Color Quality' },
        { key: 'touch', label: 'Touchscreen Responsiveness' },
        { key: 'charging', label: 'Charging Port & Current Draw' },
        { key: 'camera_rear', label: 'Rear Main Camera & Focus' },
        { key: 'camera_front', label: 'Front Camera' },
        { key: 'speaker_loud', label: 'Loudspeaker / Media Audio' },
        { key: 'speaker_ear', label: 'Earpiece Speaker' },
        { key: 'microphone', label: 'Microphone & Noise Cancelling' },
        { key: 'wifi', label: 'Wi-Fi Connection & Signal' },
        { key: 'bluetooth', label: 'Bluetooth Pairing' },
        { key: 'sim_network', label: 'SIM Card & Cellular Network' },
        { key: 'biometrics', label: 'Fingerprint / Face ID' },
        { key: 'buttons', label: 'Physical Buttons (Power/Volume)' },
        { key: 'battery_health', label: 'Battery Health & Charge Hold' },
        { key: 'sensors', label: 'Proximity Sensor & Accelerometer' }
      ];

      for (const t of standardTests) {
        localDb.repair_tests.push({
          id: uuidv4(),
          job_id: newJob.id,
          test_key: t.key,
          test_label: t.label,
          result: 'NOT_TESTED',
          notes: '',
          tested_by_user_id: null,
          tested_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      saveLocalDb();

      // Persist to Supabase PostgreSQL
      await safeSupabaseInsert('repair_jobs', newJob);
      const firstHistory = (localDb.job_status_history || []).find(h => h.job_id === newJob.id);
      if (firstHistory) await safeSupabaseInsert('job_status_history', firstHistory);
      const testsToInsert = (localDb.repair_tests || []).filter(t => t.job_id === newJob.id);
      if (testsToInsert.length > 0) await safeSupabaseInsert('repair_tests', testsToInsert);

      return newJob;
    },

    update: async (id, updates) => {
      const idx = (localDb.repair_jobs || []).findIndex(j => j.id === id);
      if (idx === -1) return null;
      localDb.repair_jobs[idx] = {
        ...localDb.repair_jobs[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveLocalDb();
      await safeSupabaseUpdate('repair_jobs', id, updates);
      return localDb.repair_jobs[idx];
    },

    delete: async (id) => {
      const idx = (localDb.repair_jobs || []).findIndex(j => j.id === id);
      if (idx === -1) return false;

      // Remove from repair_jobs
      localDb.repair_jobs.splice(idx, 1);

      // Clean up related records
      localDb.repair_tests = (localDb.repair_tests || []).filter(t => t.job_id !== id);
      localDb.diagnoses = (localDb.diagnoses || []).filter(d => d.job_id !== id);
      localDb.job_status_history = (localDb.job_status_history || []).filter(h => h.job_id !== id);

      // Remove associated estimate & items
      const estIdx = (localDb.repair_estimates || []).findIndex(e => e.job_id === id);
      if (estIdx !== -1) {
        const estId = localDb.repair_estimates[estIdx].id;
        localDb.repair_estimate_items = (localDb.repair_estimate_items || []).filter(i => i.estimate_id !== estId);
        localDb.repair_estimates.splice(estIdx, 1);
      }

      // Remove associated invoice & items
      const invIdx = (localDb.invoices || []).findIndex(i => i.job_id === id);
      if (invIdx !== -1) {
        const invId = localDb.invoices[invIdx].id;
        localDb.invoice_items = (localDb.invoice_items || []).filter(i => i.invoice_id !== invId);
        localDb.invoices.splice(invIdx, 1);
      }

      // Remove associated payments
      localDb.payments = (localDb.payments || []).filter(p => p.job_id !== id);

      // Remove associated notifications
      localDb.notifications = (localDb.notifications || []).filter(n => n.job_id !== id);

      saveLocalDb();

      // Cascade delete in Supabase
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabase();
          await supabase.from('repair_tests').delete().eq('job_id', id);
          await supabase.from('job_status_history').delete().eq('job_id', id);
          await supabase.from('diagnoses').delete().eq('job_id', id);
          await supabase.from('payments').delete().eq('job_id', id);
          await supabase.from('repair_jobs').delete().eq('id', id);
        } catch (err) {
          console.warn('⚠️ Supabase repair_jobs delete error:', err.message);
        }
      }

      return true;
    },

    updateStatus: async (id, newStatus, actionTitle, notes, userId) => {
      const idx = (localDb.repair_jobs || []).findIndex(j => j.id === id);
      if (idx === -1) return null;
      const oldStatus = localDb.repair_jobs[idx].status;

      localDb.repair_jobs[idx].status = newStatus;
      localDb.repair_jobs[idx].updated_at = new Date().toISOString();

      const historyRecord = {
        id: uuidv4(),
        job_id: id,
        from_status: oldStatus,
        to_status: newStatus,
        action_title: actionTitle,
        notes: notes || '',
        performed_by_user_id: userId || null,
        created_at: new Date().toISOString()
      };
      localDb.job_status_history.push(historyRecord);

      saveLocalDb();

      await safeSupabaseUpdate('repair_jobs', id, { status: newStatus, updated_at: new Date().toISOString() });
      await safeSupabaseInsert('job_status_history', historyRecord);

      return localDb.repair_jobs[idx];
    },

    bulkDelete: async (ids = []) => {
      if (!Array.isArray(ids) || ids.length === 0) return 0;
      let count = 0;
      for (const id of ids) {
        const deleted = await db.jobs.delete(id);
        if (deleted) count++;
      }
      return count;
    },

    bulkUpdateStatus: async ({ ids = [], status, actionTitle, notes, userId }) => {
      if (!Array.isArray(ids) || ids.length === 0 || !status) return [];
      const updatedList = [];
      const defaultTitle = actionTitle || `Bulk Status Update to ${status}`;
      for (const id of ids) {
        const updated = await db.jobs.updateStatus(id, status, defaultTitle, notes || 'Updated via batch bulk action.', userId);
        if (updated) updatedList.push(updated);
      }
      return updatedList;
    }
  },

  // DIAGNOSES
  diagnoses: {
    getByJobId: async (jobId) => {
      return (localDb.diagnoses || []).find(d => d.job_id === jobId) || null;
    },
    upsert: async ({ jobId, reportedIssue, technicianFindings, rootCause, recommendedSolution, internalNotes, userId }) => {
      let diag = (localDb.diagnoses || []).find(d => d.job_id === jobId);
      if (diag) {
        diag.reported_issue = reportedIssue;
        diag.technician_findings = technicianFindings;
        diag.root_cause = rootCause;
        diag.recommended_solution = recommendedSolution;
        diag.internal_technician_notes = internalNotes;
        diag.diagnosed_by_user_id = userId;
        diag.updated_at = new Date().toISOString();
      } else {
        diag = {
          id: uuidv4(),
          job_id: jobId,
          diagnosed_by_user_id: userId,
          reported_issue: reportedIssue,
          technician_findings: technicianFindings,
          root_cause: rootCause,
          recommended_solution: recommendedSolution,
          internal_technician_notes: internalNotes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        localDb.diagnoses.push(diag);
      }
      saveLocalDb();
      await safeSupabaseUpsert('diagnoses', diag, 'id');
      return diag;
    }
  },

  // ESTIMATES
  estimates: {
    getByJobId: async (jobId) => {
      const est = (localDb.repair_estimates || []).find(e => e.job_id === jobId);
      if (!est) return null;
      const items = (localDb.repair_estimate_items || []).filter(i => i.estimate_id === est.id);
      return { ...est, items };
    },
    save: async ({ jobId, laborCharge = 0, items = [], discount = 0, taxRate = 8.25, notes = '', validUntil, userId, discountType = 'AMOUNT', discountValue = null }) => {
      // Server-side calculation of financial amounts
      let partsSubtotal = 0;
      const processedItems = items.map(item => {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const unitPrice = Math.max(0, parseFloat(item.unit_price) || 0);
        const itemDiscount = Math.max(0, parseFloat(item.discount) || 0);
        const total = Math.max(0, (qty * unitPrice) - itemDiscount);
        partsSubtotal += total;
        return {
          id: item.id || uuidv4(),
          part_id: item.part_id || null,
          item_name: item.item_name || 'Replacement Part',
          warranty: item.warranty || item.warranty_period || '',
          quantity: qty,
          unit_price: unitPrice,
          discount: itemDiscount,
          total_price: parseFloat(total.toFixed(2))
        };
      });

      const parsedLabor = Math.max(0, parseFloat(laborCharge) || 0);
      const isPercentage = String(discountType).toUpperCase() === 'PERCENTAGE';
      const baseTotal = partsSubtotal + parsedLabor;

      let parsedDiscount = 0;
      let finalDiscountValue = 0;

      if (isPercentage) {
        const rawPercent = Math.max(0, Math.min(100, parseFloat(discountValue !== null && discountValue !== undefined ? discountValue : discount) || 0));
        parsedDiscount = parseFloat(((baseTotal * rawPercent) / 100).toFixed(2));
        finalDiscountValue = rawPercent;
      } else {
        const rawAmount = Math.max(0, parseFloat(discountValue !== null && discountValue !== undefined ? discountValue : discount) || 0);
        parsedDiscount = Math.min(baseTotal, rawAmount);
        finalDiscountValue = rawAmount;
      }

      const parsedTaxRate = Math.max(0, parseFloat(taxRate) || 0);
      const subtotalBeforeTax = Math.max(0, baseTotal - parsedDiscount);
      const taxAmount = parseFloat(((subtotalBeforeTax * parsedTaxRate) / 100).toFixed(2));
      const grandTotal = parseFloat((subtotalBeforeTax + taxAmount).toFixed(2));

      let est = (localDb.repair_estimates || []).find(e => e.job_id === jobId);
      if (est) {
        est.labor_charge = parsedLabor;
        est.parts_subtotal = parseFloat(partsSubtotal.toFixed(2));
        est.discount = parsedDiscount;
        est.discount_type = isPercentage ? 'PERCENTAGE' : 'AMOUNT';
        est.discount_value = finalDiscountValue;
        est.tax_rate = parsedTaxRate;
        est.tax_amount = taxAmount;
        est.total_amount = grandTotal;
        est.notes = notes;
        est.valid_until = validUntil || null;
        est.updated_at = new Date().toISOString();
        // Remove old items and re-add
        localDb.repair_estimate_items = (localDb.repair_estimate_items || []).filter(i => i.estimate_id !== est.id);
      } else {
        est = {
          id: uuidv4(),
          job_id: jobId,
          labor_charge: parsedLabor,
          parts_subtotal: parseFloat(partsSubtotal.toFixed(2)),
          discount: parsedDiscount,
          discount_type: isPercentage ? 'PERCENTAGE' : 'AMOUNT',
          discount_value: finalDiscountValue,
          tax_rate: parsedTaxRate,
          tax_amount: taxAmount,
          total_amount: grandTotal,
          notes,
          valid_until: validUntil || null,
          status: 'SENT',
          created_by_user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        localDb.repair_estimates.push(est);
      }

      const estimateItemsToInsert = processedItems.map(item => ({
        ...item,
        estimate_id: est.id,
        created_at: new Date().toISOString()
      }));

      for (const item of estimateItemsToInsert) {
        localDb.repair_estimate_items.push(item);
      }

      // Update cached totals on the repair_job record
      const jobIdx = (localDb.repair_jobs || []).findIndex(j => j.id === jobId);
      if (jobIdx !== -1) {
        localDb.repair_jobs[jobIdx].subtotal = parseFloat(baseTotal.toFixed(2));
        localDb.repair_jobs[jobIdx].discount = parsedDiscount;
        localDb.repair_jobs[jobIdx].discount_type = isPercentage ? 'PERCENTAGE' : 'AMOUNT';
        localDb.repair_jobs[jobIdx].discount_value = finalDiscountValue;
        localDb.repair_jobs[jobIdx].tax_rate = parsedTaxRate;
        localDb.repair_jobs[jobIdx].tax_amount = taxAmount;
        localDb.repair_jobs[jobIdx].total_amount = grandTotal;
        localDb.repair_jobs[jobIdx].balance_due = Math.max(0, grandTotal - (localDb.repair_jobs[jobIdx].paid_amount || 0));

        // Dynamically compute and save warranty_days from items
        let maxItemWarranty = -1;
        for (const item of processedItems) {
          if (item.warranty !== undefined && item.warranty !== null && String(item.warranty).trim() !== '') {
            const d = parseWarrantyDays(item.warranty);
            if (d > maxItemWarranty) maxItemWarranty = d;
          }
        }
        if (maxItemWarranty >= 0) {
          localDb.repair_jobs[jobIdx].warranty_days = maxItemWarranty;
        }

        localDb.repair_jobs[jobIdx].updated_at = new Date().toISOString();
      }

      saveLocalDb();

      // Persist estimate, items, and updated job to Supabase
      if (isSupabaseConfigured()) {
        await safeSupabaseUpsert('repair_estimates', est, 'id');
        try {
          const supabase = getSupabase();
          await supabase.from('repair_estimate_items').delete().eq('estimate_id', est.id);
          await safeSupabaseInsert('repair_estimate_items', estimateItemsToInsert);
        } catch (err) {
          console.warn('⚠️ Supabase estimate items sync error:', err.message);
        }

        if (jobIdx !== -1) {
          const job = localDb.repair_jobs[jobIdx];
          await safeSupabaseUpdate('repair_jobs', jobId, {
            subtotal: job.subtotal,
            discount: job.discount,
            discount_type: job.discount_type,
            discount_value: job.discount_value,
            tax_rate: job.tax_rate,
            tax_amount: job.tax_amount,
            total_amount: job.total_amount,
            balance_due: job.balance_due,
            warranty_days: job.warranty_days,
            updated_at: job.updated_at
          });
        }
      }

      return { ...est, items: processedItems };
    },

    updateDiscount: async ({ jobId, discount, discountType, discountValue, taxAmount, totalAmount }) => {
      const est = (localDb.repair_estimates || []).find(e => e.job_id === jobId);
      if (est) {
        est.discount = discount;
        est.discount_type = discountType;
        est.discount_value = discountValue;
        if (taxAmount !== undefined) est.tax_amount = taxAmount;
        if (totalAmount !== undefined) est.total_amount = totalAmount;
        est.updated_at = new Date().toISOString();
        await safeSupabaseUpdate('repair_estimates', est.id, {
          discount: est.discount,
          discount_type: est.discount_type,
          discount_value: est.discount_value,
          tax_amount: est.tax_amount,
          total_amount: est.total_amount,
          updated_at: est.updated_at,
        });
      }
      return est;
    }
  },

  // PARTS & INVENTORY
  parts: {
    list: async ({ category, search, lowStockOnly = false, startDate = '', endDate = '', limit = 50, offset = 0 } = {}) => {
      let parts = [...(localDb.parts || [])];

      if (startDate) {
        const startObj = startDate.length === 10 ? new Date(`${startDate}T00:00:00`) : new Date(startDate);
        const startTime = startObj.getTime();
        if (!isNaN(startTime)) {
          parts = parts.filter(p => {
            if (!p.created_at) return false;
            const t = new Date(p.created_at).getTime();
            return !isNaN(t) && t >= startTime;
          });
        }
      }
      if (endDate) {
        const endObj = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999`) : new Date(endDate);
        const endTime = endObj.getTime();
        if (!isNaN(endTime)) {
          parts = parts.filter(p => {
            if (!p.created_at) return false;
            const t = new Date(p.created_at).getTime();
            return !isNaN(t) && t <= endTime;
          });
        }
      }

      if (category) {
        parts = parts.filter(p => p.category === category);
      }
      if (search) {
        const q = search.toLowerCase();
        parts = parts.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.part_code && p.part_code.toLowerCase().includes(q)) ||
          (p.compatible_models && p.compatible_models.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      }
      if (lowStockOnly) {
        parts = parts.filter(p => p.stock_quantity <= p.minimum_stock);
      }
      parts.sort((a, b) => a.name.localeCompare(b.name));
      const total = parts.length;
      const sliced = limit ? parts.slice(offset, offset + limit) : parts;
      return { parts: sliced, total };
    },
    findById: async (id) => {
      return (localDb.parts || []).find(p => p.id === id) || null;
    },
    create: async (partData) => {
      const codeSeq = (localDb.parts?.length || 0) + 1;
      const newPart = {
        id: uuidv4(),
        part_code: `PART-${String(codeSeq).padStart(3, '0')}`,
        shop_id: 'a0000000-0000-0000-0000-000000000001',
        ...partData,
        purchase_cost: parseFloat(partData.purchase_cost) || 0,
        selling_price: parseFloat(partData.selling_price) || 0,
        stock_quantity: parseInt(partData.stock_quantity, 10) || 0,
        minimum_stock: parseInt(partData.minimum_stock, 10) || 2,
        status: (parseInt(partData.stock_quantity, 10) || 0) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDb.parts.push(newPart);
      saveLocalDb();
      await safeSupabaseInsert('parts', newPart);
      return newPart;
    },
    update: async (id, updates) => {
      const idx = (localDb.parts || []).findIndex(p => p.id === id);
      if (idx === -1) return null;
      const current = localDb.parts[idx];
      const stock = updates.stock_quantity !== undefined ? parseInt(updates.stock_quantity, 10) : current.stock_quantity;
      localDb.parts[idx] = {
        ...current,
        ...updates,
        purchase_cost: updates.purchase_cost !== undefined ? parseFloat(updates.purchase_cost) : current.purchase_cost,
        selling_price: updates.selling_price !== undefined ? parseFloat(updates.selling_price) : current.selling_price,
        stock_quantity: stock,
        status: stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
        updated_at: new Date().toISOString()
      };
      saveLocalDb();
      await safeSupabaseUpdate('parts', id, updates);
      return localDb.parts[idx];
    },
    adjustStock: async ({ partId, quantityChange, movementType, referenceNumber, notes, jobId, userId }) => {
      const part = (localDb.parts || []).find(p => p.id === partId);
      if (!part) throw new Error('Part not found');

      const prevStock = part.stock_quantity;
      const newStock = prevStock + quantityChange;

      if (newStock < 0) {
        throw new Error(`Insufficient stock for part "${part.name}". Available: ${prevStock}, Requested deduction: ${Math.abs(quantityChange)}`);
      }

      part.stock_quantity = newStock;
      part.status = newStock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';
      part.updated_at = new Date().toISOString();

      const movementRecord = {
        id: uuidv4(),
        part_id: partId,
        job_id: jobId || null,
        movement_type: movementType, // PURCHASE, JOB_USAGE, RETURN, ADJUSTMENT
        quantity: quantityChange,
        previous_stock: prevStock,
        new_stock: newStock,
        reference_number: referenceNumber || null,
        notes: notes || '',
        created_by_user_id: userId || null,
        created_at: new Date().toISOString()
      };

      localDb.part_stock_movements.push(movementRecord);

      saveLocalDb();
      await safeSupabaseUpdate('parts', partId, { stock_quantity: newStock, status: part.status, updated_at: part.updated_at });
      await safeSupabaseInsert('part_stock_movements', movementRecord);
      return part;
    },
    delete: async (id) => {
      const idx = (localDb.parts || []).findIndex(p => p.id === id);
      if (idx === -1) return false;
      localDb.parts.splice(idx, 1);
      saveLocalDb();
      await safeSupabaseDelete('parts', id);
      return true;
    },
    bulkDelete: async (ids = []) => {
      if (!Array.isArray(ids) || ids.length === 0) return 0;
      let count = 0;
      for (const id of ids) {
        const idx = (localDb.parts || []).findIndex(p => p.id === id);
        if (idx !== -1) {
          localDb.parts.splice(idx, 1);
          count++;
        }
      }
      saveLocalDb();
      if (isSupabaseConfigured() && ids.length > 0) {
        try {
          await getSupabase().from('parts').delete().in('id', ids);
        } catch (_) {}
      }
      return count;
    }
  },

  // TESTS (QC)
  tests: {
    getByJobId: async (jobId) => {
      return (localDb.repair_tests || []).filter(t => t.job_id === jobId);
    },
    saveTests: async (jobId, testsList, userId) => {
      for (const item of testsList) {
        const existing = (localDb.repair_tests || []).find(t => t.job_id === jobId && t.test_key === item.test_key);
        if (existing) {
          existing.result = item.result; // PASS, FAIL, NOT_TESTED
          existing.notes = item.notes || '';
          existing.tested_by_user_id = userId;
          existing.tested_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
        } else {
          localDb.repair_tests.push({
            id: uuidv4(),
            job_id: jobId,
            test_key: item.test_key,
            test_label: item.test_label || item.test_key,
            result: item.result || 'NOT_TESTED',
            notes: item.notes || '',
            tested_by_user_id: userId,
            tested_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      saveLocalDb();
      if (isSupabaseConfigured()) {
        const testsToSync = (localDb.repair_tests || []).filter(t => t.job_id === jobId);
        await safeSupabaseUpsert('repair_tests', testsToSync, 'id');
      }
      return (localDb.repair_tests || []).filter(t => t.job_id === jobId);
    }
  },

  // PAYMENTS
  payments: {
    listByJobId: async (jobId) => {
      return (localDb.payments || []).filter(p => p.job_id === jobId);
    },
    create: async ({ jobId, amount, paymentMethod, transactionReference, notes, userId }) => {
      const jobIdx = (localDb.repair_jobs || []).findIndex(j => j.id === jobId);
      if (jobIdx === -1) throw new Error('Repair job not found');

      const job = localDb.repair_jobs[jobIdx];
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Payment amount must be a positive number');
      }

      const currentBalance = job.balance_due !== undefined ? job.balance_due : ((job.total_amount || 0) - (job.paid_amount || 0));
      if (Number(job.total_amount || 0) > 0 && parsedAmount > (currentBalance + 0.01)) {
        throw new Error(`Payment amount (₹${parsedAmount.toFixed(2)}) cannot exceed remaining balance (₹${currentBalance.toFixed(2)})`);
      }

      const paymentCount = (localDb.payments || []).length + 1;
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount).padStart(5, '0')}`;

      const payment = {
        id: uuidv4(),
        payment_number: paymentNumber,
        job_id: jobId,
        customer_id: job.customer_id,
        amount: parseFloat(parsedAmount.toFixed(2)),
        payment_method: paymentMethod, // CASH, CARD, UPI, BANK_TRANSFER, OTHER
        payment_status: 'COMPLETED',
        transaction_reference: transactionReference || null,
        received_by_user_id: userId || null,
        notes: notes || '',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      localDb.payments.push(payment);

      // Recalculate job paid amount and balance
      const newPaidAmount = parseFloat(((job.paid_amount || 0) + parsedAmount).toFixed(2));
      const newBalance = Math.max(0, parseFloat(((job.total_amount || 0) - newPaidAmount).toFixed(2)));

      job.paid_amount = newPaidAmount;
      job.balance_due = newBalance;
      job.payment_status = (Number(job.total_amount || 0) > 0 && newBalance === 0) ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID');
      job.updated_at = new Date().toISOString();

      // Add timeline entry
      const timelineRecord = {
        id: uuidv4(),
        job_id: jobId,
        from_status: job.status,
        to_status: job.status,
        action_title: Number(job.total_amount || 0) === 0
          ? `Advance Deposit Received: ₹${parsedAmount.toFixed(2)} (${paymentMethod})`
          : `Payment Received: ₹${parsedAmount.toFixed(2)} (${paymentMethod})`,
        notes: `Recorded by staff. Total paid: ₹${newPaidAmount.toFixed(2)}, Remaining balance: ₹${newBalance.toFixed(2)}. Ref: ${transactionReference || 'N/A'}`,
        performed_by_user_id: userId,
        created_at: new Date().toISOString()
      };
      localDb.job_status_history.push(timelineRecord);

      saveLocalDb();

      await safeSupabaseInsert('payments', payment);
      await safeSupabaseUpdate('repair_jobs', jobId, {
        paid_amount: job.paid_amount,
        balance_due: job.balance_due,
        payment_status: job.payment_status,
        updated_at: job.updated_at
      });
      await safeSupabaseInsert('job_status_history', timelineRecord);

      return { payment, job };
    },

    list: async ({ search = '', method = 'ALL', startDate = '', endDate = '', limit = 50, offset = 0 } = {}) => {
      let payments = [...(localDb.payments || [])];

      if (startDate) {
        const startObj = startDate.length === 10 ? new Date(`${startDate}T00:00:00`) : new Date(startDate);
        const startTime = startObj.getTime();
        if (!isNaN(startTime)) {
          payments = payments.filter(p => {
            const raw = p.paid_at || p.created_at;
            if (!raw) return false;
            const t = new Date(raw).getTime();
            return !isNaN(t) && t >= startTime;
          });
        }
      }
      if (endDate) {
        const endObj = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999`) : new Date(endDate);
        const endTime = endObj.getTime();
        if (!isNaN(endTime)) {
          payments = payments.filter(p => {
            const raw = p.paid_at || p.created_at;
            if (!raw) return false;
            const t = new Date(raw).getTime();
            return !isNaN(t) && t <= endTime;
          });
        }
      }

      let populated = payments.map(p => {
        const job = (localDb.repair_jobs || []).find(j => j.id === p.job_id) || {};
        const customer = (localDb.customers || []).find(c => c.id === (p.customer_id || job.customer_id)) || {};
        const device = (localDb.devices || []).find(d => d.id === job.device_id) || {};
        return {
          ...p,
          job_number: job.job_number || 'N/A',
          customer_name: customer.full_name || 'Walk-in Customer',
          customer_phone: customer.phone || '',
          device_model: device.brand ? `${device.brand} ${device.model || ''}`.trim() : 'Device',
        };
      });

      if (method && method !== 'ALL') {
        populated = populated.filter(p => p.payment_method === method);
      }

      if (search) {
        const q = search.toLowerCase();
        populated = populated.filter(p =>
          (p.payment_number && p.payment_number.toLowerCase().includes(q)) ||
          (p.job_number && p.job_number.toLowerCase().includes(q)) ||
          (p.customer_name && p.customer_name.toLowerCase().includes(q)) ||
          (p.device_model && p.device_model.toLowerCase().includes(q)) ||
          (p.transaction_reference && p.transaction_reference.toLowerCase().includes(q))
        );
      }

      populated.sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at));
      const total = populated.length;
      const totalAmount = populated.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const cashTotal = populated.filter(p => p.payment_method === 'CASH').reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const cardTotal = populated.filter(p => p.payment_method === 'CARD').reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const upiTotal = populated.filter(p => p.payment_method === 'UPI').reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const sliced = limit ? populated.slice(offset, offset + limit) : populated;
      return { payments: sliced, total, stats: { totalAmount, cashTotal, cardTotal, upiTotal } };
    },
    delete: async (id) => {
      const idx = (localDb.payments || []).findIndex(p => p.id === id);
      if (idx === -1) return false;
      const payment = localDb.payments[idx];
      const jobId = payment.job_id;

      localDb.payments.splice(idx, 1);

      // Recalculate job balance
      const job = (localDb.repair_jobs || []).find(j => j.id === jobId);
      if (job) {
        const remaining = (localDb.payments || []).filter(p => p.job_id === jobId);
        const totalPaid = remaining.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        job.paid_amount = parseFloat(totalPaid.toFixed(2));
        job.balance_due = Math.max(0, parseFloat(((job.total_amount || 0) - totalPaid).toFixed(2)));
        job.payment_status = (Number(job.total_amount || 0) > 0 && job.balance_due === 0) ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID');
        job.updated_at = new Date().toISOString();
      }

      saveLocalDb();

      await safeSupabaseDelete('payments', id);
      if (job) {
        await safeSupabaseUpdate('repair_jobs', jobId, {
          paid_amount: job.paid_amount,
          balance_due: job.balance_due,
          payment_status: job.payment_status,
          updated_at: job.updated_at
        });
      }

      return true;
    },
    bulkDelete: async (ids = []) => {
      if (!Array.isArray(ids) || ids.length === 0) return 0;
      let count = 0;
      const affectedJobIds = new Set();
      for (const id of ids) {
        const idx = (localDb.payments || []).findIndex(p => p.id === id);
        if (idx !== -1) {
          const jobId = localDb.payments[idx].job_id;
          if (jobId) affectedJobIds.add(jobId);
          localDb.payments.splice(idx, 1);
          count++;
        }
      }

      // Recalculate each affected job
      for (const jobId of affectedJobIds) {
        const job = (localDb.repair_jobs || []).find(j => j.id === jobId);
        if (job) {
          const remaining = (localDb.payments || []).filter(p => p.job_id === jobId);
          const totalPaid = remaining.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          job.paid_amount = parseFloat(totalPaid.toFixed(2));
          job.balance_due = Math.max(0, parseFloat(((job.total_amount || 0) - totalPaid).toFixed(2)));
          job.payment_status = (Number(job.total_amount || 0) > 0 && job.balance_due === 0) ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID');
          job.updated_at = new Date().toISOString();
        }
      }

      saveLocalDb();

      if (isSupabaseConfigured() && ids.length > 0) {
        try {
          await getSupabase().from('payments').delete().in('id', ids);
          for (const jobId of affectedJobIds) {
            const job = (localDb.repair_jobs || []).find(j => j.id === jobId);
            if (job) {
              await safeSupabaseUpdate('repair_jobs', jobId, {
                paid_amount: job.paid_amount,
                balance_due: job.balance_due,
                payment_status: job.payment_status,
                updated_at: job.updated_at
              });
            }
          }
        } catch (_) {}
      }

      return count;
    }
  },

  // INVOICES
  invoices: {
    getByJobId: async (jobId) => {
      const inv = (localDb.invoices || []).find(i => i.job_id === jobId);
      if (!inv) return null;
      const items = (localDb.invoice_items || []).filter(item => item.invoice_id === inv.id);
      return { ...inv, items };
    },
    createOrUpdateForJob: async ({ jobId, warrantyDays = 90, notes = '', userId }) => {
      const job = (localDb.repair_jobs || []).find(j => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const est = (localDb.repair_estimates || []).find(e => e.job_id === jobId);
      const estItems = est ? (localDb.repair_estimate_items || []).filter(i => i.estimate_id === est.id) : [];
      const shop = (localDb.shops && localDb.shops[0]) || {};

      let invoice = (localDb.invoices || []).find(i => i.job_id === jobId);
      const invoiceNumber = invoice ? invoice.invoice_number : await generateNextInvoiceNumber();

      const laborAmount = est ? est.labor_charge : 0;
      const partsAmount = est ? est.parts_subtotal : 0;
      const discount = est ? est.discount : (job.discount || 0);
      const discountType = est?.discount_type || job.discount_type || 'AMOUNT';
      const discountValue = est?.discount_value !== undefined ? est.discount_value : (job.discount_value !== undefined ? job.discount_value : discount);
      const taxRate = est
        ? (est.tax_rate !== undefined ? est.tax_rate : 0)
        : (job.tax_rate !== undefined ? job.tax_rate : 0);
      const taxAmount = est
        ? (est.tax_amount !== undefined ? est.tax_amount : 0)
        : (job.tax_amount !== undefined ? job.tax_amount : 0);
      const totalAmount = job.total_amount;
      const paidAmount = job.paid_amount || 0;
      const balanceDue = Math.max(0, totalAmount - paidAmount);

      if (invoice) {
        invoice.subtotal = partsAmount + laborAmount;
        invoice.labor_amount = laborAmount;
        invoice.parts_amount = partsAmount;
        invoice.discount = discount;
        invoice.discount_type = discountType;
        invoice.discount_value = discountValue;
        invoice.tax_rate = taxRate;
        invoice.tax_amount = taxAmount;
        invoice.total_amount = totalAmount;
        invoice.paid_amount = paidAmount;
        invoice.balance_due = balanceDue;
        invoice.payment_status = balanceDue === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID');
        invoice.warranty_period = `${warrantyDays} Days Hardware Warranty`;
        invoice.notes = notes || invoice.notes;
        // Clear items
        localDb.invoice_items = (localDb.invoice_items || []).filter(i => i.invoice_id !== invoice.id);
      } else {
        invoice = {
          id: uuidv4(),
          invoice_number: invoiceNumber,
          job_id: jobId,
          customer_id: job.customer_id,
          shop_id: shop.id || 'a0000000-0000-0000-0000-000000000001',
          subtotal: partsAmount + laborAmount,
          labor_amount: laborAmount,
          parts_amount: partsAmount,
          discount,
          discount_type: discountType,
          discount_value: discountValue,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          balance_due: balanceDue,
          payment_status: balanceDue === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID'),
          warranty_period: `${warrantyDays} Days Hardware Warranty`,
          notes: notes || 'Thank you for choosing Mobotech mobile care for your mobile device repair!',
          pdf_url: null,
          issued_by_user_id: userId,
          issued_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        localDb.invoices.push(invoice);
      }

      // Add items
      const invoiceItems = [];
      if (laborAmount > 0) {
        const item = {
          id: uuidv4(),
          invoice_id: invoice.id,
          item_type: 'LABOR',
          item_name: 'Professional Repair Labor & Diagnostic Bench Fee',
          quantity: 1,
          unit_price: laborAmount,
          total_price: laborAmount,
          created_at: new Date().toISOString()
        };
        localDb.invoice_items.push(item);
        invoiceItems.push(item);
      }

      for (const ei of estItems) {
        const item = {
          id: uuidv4(),
          invoice_id: invoice.id,
          item_type: 'PART',
          item_name: ei.item_name,
          warranty: ei.warranty || '',
          quantity: ei.quantity,
          unit_price: ei.unit_price,
          total_price: ei.total_price,
          created_at: new Date().toISOString()
        };
        localDb.invoice_items.push(item);
        invoiceItems.push(item);
      }

      saveLocalDb();

      if (isSupabaseConfigured()) {
        await safeSupabaseUpsert('invoices', invoice, 'id');
        try {
          const supabase = getSupabase();
          await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
          await safeSupabaseInsert('invoice_items', invoiceItems);
        } catch (err) {
          console.warn('⚠️ Supabase invoice_items sync error:', err.message);
        }
      }

      return { ...invoice, items: invoiceItems };
    }
  },


  // SALES (DIRECT INVOICES FOR PHONES & PARTS)
  sales: {
    list: async ({ search, status, sortBy = 'created_at', sortDir = 'desc', startDate, endDate, limit = 50, offset = 0 } = {}) => {
      let sales = [...(localDb.sales || [])];

      if (startDate) {
        const startObj = startDate.length === 10 ? new Date(`${startDate}T00:00:00`) : new Date(startDate);
        const startTime = startObj.getTime();
        if (!isNaN(startTime)) {
          sales = sales.filter(s => {
            const raw = s.invoice_date || s.created_at;
            if (!raw) return false;
            const t = new Date(raw).getTime();
            return !isNaN(t) && t >= startTime;
          });
        }
      }
      if (endDate) {
        const endObj = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999`) : new Date(endDate);
        const endTime = endObj.getTime();
        if (!isNaN(endTime)) {
          sales = sales.filter(s => {
            const raw = s.invoice_date || s.created_at;
            if (!raw) return false;
            const t = new Date(raw).getTime();
            return !isNaN(t) && t <= endTime;
          });
        }
      }

      // Status / Filter tabs
      if (status && status !== 'ALL') {
        if (status === 'WITH_GST') {
          sales = sales.filter((s) => s.gst_enabled === true);
        } else if (status === 'NON_GST') {
          sales = sales.filter((s) => !s.gst_enabled);
        } else if (status === 'CASH') {
          sales = sales.filter((s) => (s.payment_mode || 'CASH').toUpperCase() === 'CASH');
        } else if (status === 'UPI') {
          sales = sales.filter((s) => (s.payment_mode || '').toUpperCase() === 'UPI');
        } else if (status === 'CARD') {
          sales = sales.filter((s) => (s.payment_mode || '').toUpperCase() === 'CARD');
        }
      }

      // Search matching customer name, phone, email, invoice_number, sequence number, items name, description/IMEI
      if (search) {
        const q = search.toLowerCase();
        sales = sales.filter((s) =>
          (s.invoice_number && s.invoice_number.toLowerCase().includes(q)) ||
          (s.invoice_no_seq && String(s.invoice_no_seq).includes(q)) ||
          (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
          (s.customer_phone && s.customer_phone.includes(q)) ||
          (s.customer_email && s.customer_email.toLowerCase().includes(q)) ||
          (s.items && Array.isArray(s.items) && s.items.some((it) =>
            (it.name && it.name.toLowerCase().includes(q)) ||
            (it.item_name && it.item_name.toLowerCase().includes(q)) ||
            (it.imei && it.imei.toLowerCase().includes(q)) ||
            (it.description && it.description.toLowerCase().includes(q)) ||
            (it.warranty && it.warranty.toLowerCase().includes(q))
          ))
        );
      }

      // Sorting
      sales.sort((a, b) => {
        let valA, valB;
        if (sortBy === 'total_amount') {
          valA = parseFloat(a.total_amount) || 0;
          valB = parseFloat(b.total_amount) || 0;
        } else if (sortBy === 'customer_name') {
          valA = (a.customer_name || '').toLowerCase();
          valB = (b.customer_name || '').toLowerCase();
        } else {
          // created_at or default
          valA = new Date(a.created_at || a.invoice_date || 0).getTime();
          valB = new Date(b.created_at || b.invoice_date || 0).getTime();
        }

        if (sortDir === 'asc') {
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
      });

      const total = sales.length;
      const paginated = sales.slice(offset, offset + limit);
      return { sales: paginated, total };
    },
    findById: async (id) => {
      const sale = (localDb.sales || []).find((s) => s.id === id || s.invoice_number === id);
      return sale || null;
    },
    create: async (saleData) => {
      localDb.sales = localDb.sales || [];
      const newSale = {
        id: uuidv4(),
        ...saleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localDb.sales.push(newSale);
      saveLocalDb();
      await safeSupabaseInsert('sales', newSale);
      return newSale;
    },
    delete: async (id) => {
      localDb.sales = localDb.sales || [];
      const idx = localDb.sales.findIndex((s) => s.id === id);
      if (idx !== -1) {
        localDb.sales.splice(idx, 1);
        saveLocalDb();
        await safeSupabaseDelete('sales', id);
        return true;
      }
      return false;
    },
    bulkDelete: async (ids = []) => {
      localDb.sales = localDb.sales || [];
      const idSet = new Set(ids);
      const beforeCount = localDb.sales.length;
      localDb.sales = localDb.sales.filter((s) => !idSet.has(s.id));
      saveLocalDb();
      if (isSupabaseConfigured() && ids.length > 0) {
        try {
          await getSupabase().from('sales').delete().in('id', ids);
        } catch (_) {}
      }
      return beforeCount - localDb.sales.length;
    },
  },

  // NOTIFICATION LOGS
  notifications: {
    log: async ({ jobId, customerId, channel, messageType, recipient, status, provider, providerResponse, errorMessage }) => {
      const logEntry = {
        id: uuidv4(),
        notification_id: null,
        job_id: jobId || null,
        customer_id: customerId || null,
        channel, // EMAIL, SMS, WHATSAPP
        message_type: messageType,
        recipient,
        status, // SENT, FAILED, PENDING
        provider, // BREVO, MSG91, OPENWA
        provider_response: providerResponse || null,
        error_message: errorMessage || null,
        retry_count: 0,
        sent_at: status === 'SENT' ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      };
      if (!localDb.notification_logs) localDb.notification_logs = [];
      localDb.notification_logs.push(logEntry);
      saveLocalDb();
      const supabaseLog = { ...logEntry };
      if (supabaseLog.job_id && !(localDb.repair_jobs || []).some(j => j.id === supabaseLog.job_id)) {
        supabaseLog.job_id = null;
      }
      await safeSupabaseInsert('notification_logs', supabaseLog);
      return logEntry;
    },
    getLogs: async ({ jobId, channel, search, startDate = '', endDate = '', limit = 50, offset = 0 } = {}) => {
      let logs = [...(localDb.notification_logs || [])];

      if (startDate) {
        const startObj = startDate.length === 10 ? new Date(`${startDate}T00:00:00`) : new Date(startDate);
        const startTime = startObj.getTime();
        if (!isNaN(startTime)) {
          logs = logs.filter(l => {
            if (!l.created_at) return false;
            const t = new Date(l.created_at).getTime();
            return !isNaN(t) && t >= startTime;
          });
        }
      }
      if (endDate) {
        const endObj = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999`) : new Date(endDate);
        const endTime = endObj.getTime();
        if (!isNaN(endTime)) {
          logs = logs.filter(l => {
            if (!l.created_at) return false;
            const t = new Date(l.created_at).getTime();
            return !isNaN(t) && t <= endTime;
          });
        }
      }

      if (jobId) {
        logs = logs.filter(l => l.job_id === jobId);
      }
      if (channel && channel !== 'ALL') {
        logs = logs.filter(l => l.channel === channel);
      }
      if (search) {
        const q = search.toLowerCase();
        logs = logs.filter(l =>
          (l.recipient && l.recipient.toLowerCase().includes(q)) ||
          (l.message_type && l.message_type.toLowerCase().includes(q)) ||
          (l.provider && l.provider.toLowerCase().includes(q))
        );
      }
      logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const total = logs.length;
      const sliced = limit ? logs.slice(offset, offset + limit) : logs;
      return { logs: sliced, total };
    },
    delete: async (id) => {
      const idx = (localDb.notification_logs || []).findIndex(l => l.id === id);
      if (idx === -1) return false;
      localDb.notification_logs.splice(idx, 1);
      saveLocalDb();
      await safeSupabaseDelete('notification_logs', id);
      return true;
    },
    bulkDelete: async (ids = []) => {
      if (!Array.isArray(ids) || ids.length === 0) return 0;
      let count = 0;
      for (const id of ids) {
        const idx = (localDb.notification_logs || []).findIndex(l => l.id === id);
        if (idx !== -1) {
          localDb.notification_logs.splice(idx, 1);
          count++;
        }
      }
      saveLocalDb();
      if (isSupabaseConfigured() && ids.length > 0) {
        try {
          await getSupabase().from('notification_logs').delete().in('id', ids);
        } catch (_) {}
      }
      return count;
    }
  },

  // ATTACHMENTS
  attachments: {
    create: async ({ jobId, fileType, fileName, filePath, fileUrl, mimeType, sizeBytes, userId }) => {
      const att = {
        id: uuidv4(),
        job_id: jobId,
        file_type: fileType,
        file_name: fileName,
        file_path: filePath,
        file_url: fileUrl,
        file_size_bytes: sizeBytes,
        mime_type: mimeType,
        uploaded_by_user_id: userId,
        created_at: new Date().toISOString()
      };
      if (!localDb.attachments) localDb.attachments = [];
      localDb.attachments.push(att);
      await safeSupabaseInsert('attachments', att);
      return att;
    },
    listByJobId: async (jobId) => {
      return (localDb.attachments || []).filter(a => a.job_id === jobId);
    }
  },

  // SETTINGS
  settings: {
    get: async (key) => {
      const setting = (localDb.settings || []).find(s => s.key === key);
      return setting ? setting.value : null;
    },
    set: async (key, value, description) => {
      let setting = (localDb.settings || []).find(s => s.key === key);
      if (setting) {
        setting.value = value;
        setting.updated_at = new Date().toISOString();
      } else {
        setting = {
          key,
          value,
          description: description || '',
          updated_at: new Date().toISOString()
        };
        localDb.settings.push(setting);
      }
      saveLocalDb();
      await safeSupabaseUpsert('settings', setting, 'key');
      return setting;
    }
  },


  // BACKUP LOGS
  backup_logs: {
    create: async ({ backup_type = 'MANUAL', status = 'RUNNING', created_by_user_id = null, filename = null }) => {
      const log = {
        id: uuidv4(),
        backup_type,
        status,
        filename,
        drive_file_id: null,
        drive_folder_id: null,
        file_size_bytes: null,
        checksum_md5: null,
        duration_ms: null,
        error_message: null,
        created_by_user_id,
        started_at: new Date().toISOString(),
        completed_at: null,
      };

      if (!localDb.backup_logs) localDb.backup_logs = [];
      localDb.backup_logs.unshift(log);
      saveLocalDb();

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await getSupabase().from('backup_logs').insert(log).select().single();
          if (!error && data) return data;
        } catch (err) {
          console.warn('⚠️ Supabase backup_logs insert fallback to local:', err.message);
        }
      }

      return log;
    },

    update: async (id, updates) => {
      if (!localDb.backup_logs) localDb.backup_logs = [];
      const idx = localDb.backup_logs.findIndex(b => b.id === id);
      if (idx !== -1) {
        localDb.backup_logs[idx] = { ...localDb.backup_logs[idx], ...updates };
        saveLocalDb();
      }

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await getSupabase()
            .from('backup_logs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          if (!error && data) return data;
        } catch (err) {
          console.warn('⚠️ Supabase backup_logs update fallback to local:', err.message);
        }
      }

      return idx !== -1 ? localDb.backup_logs[idx] : null;
    },

    findById: async (id) => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await getSupabase().from('backup_logs').select('*').eq('id', id).single();
          if (!error && data) return data;
        } catch (err) {
          // fallback
        }
      }
      return (localDb.backup_logs || []).find(b => b.id === id) || null;
    },

    list: async ({ limit = 30, offset = 0 } = {}) => {
      if (isSupabaseConfigured()) {
        try {
          const { data, count, error } = await getSupabase()
            .from('backup_logs')
            .select('*', { count: 'exact' })
            .order('started_at', { ascending: false })
            .range(offset, offset + limit - 1);
          if (!error && data) {
            return { backups: data, total: count || data.length };
          }
        } catch (err) {
          console.warn('⚠️ Supabase backup_logs list fallback to local:', err.message);
        }
      }

      const all = [...(localDb.backup_logs || [])].sort(
        (a, b) => new Date(b.started_at) - new Date(a.started_at)
      );
      return {
        backups: all.slice(offset, offset + limit),
        total: all.length,
      };
    },

    getLatest: async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await getSupabase()
            .from('backup_logs')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(1)
            .single();
          if (!error && data) return data;
        } catch (err) {
          // fallback
        }
      }

      const all = (localDb.backup_logs || []).sort(
        (a, b) => new Date(b.started_at) - new Date(a.started_at)
      );
      return all[0] || null;
    },

    getRunningJob: async () => {
      // 30 minute stale threshold
      const staleThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await getSupabase()
            .from('backup_logs')
            .select('*')
            .in('status', ['RUNNING', 'QUEUED'])
            .gt('started_at', staleThreshold)
            .order('started_at', { ascending: false })
            .limit(1);
          if (!error && data && data.length > 0) return data[0];
        } catch (err) {
          // fallback
        }
      }

      const running = (localDb.backup_logs || []).find(
        b => ['RUNNING', 'QUEUED'].includes(b.status) && b.started_at > staleThreshold
      );
      return running || null;
    }
  },

  ...vendorDbMethods,
};
