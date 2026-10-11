import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';
import { createInitialSeedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Local in-memory cache for development mode
let localDb = null;

// Ensure local data directory and seed file exist
export const initDb = async () => {
  if (isSupabaseConfigured()) {
    console.log('✅ Supabase PostgreSQL is connected as primary database.');
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      localDb = JSON.parse(content);
      console.log('✅ Local persistent JSON database loaded successfully.');
    } catch (err) {
      console.warn('⚠️ Error reading local db file, re-initializing seeds...', err.message);
      localDb = await createInitialSeedData();
      saveLocalDb();
    }
  } else {
    console.log('🌱 Seeding initial local database records...');
    localDb = await createInitialSeedData();
    saveLocalDb();
    console.log('✅ Initial database seeded successfully.');
  }
};

const saveLocalDb = () => {
  if (!localDb) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ Error saving local database:', err.message);
  }
};

// Next Job Number generator: format JOB-YYYY-000001
export const generateNextJobNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `JOB-${currentYear}-`;

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('repair_jobs')
      .select('job_number')
      .like('job_number', `${prefix}%`)
      .order('job_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumberStr = data[0].job_number.replace(prefix, '');
      const lastSeq = parseInt(lastNumberStr, 10) || 0;
      return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
    }
    return `${prefix}000001`;
  }

  // Local engine
  const existingNumbers = (localDb.repair_jobs || [])
    .map(j => j.job_number)
    .filter(num => num && num.startsWith(prefix));

  if (existingNumbers.length === 0) {
    return `${prefix}000001`;
  }

  let highestSeq = 0;
  for (const num of existingNumbers) {
    const seq = parseInt(num.replace(prefix, ''), 10) || 0;
    if (seq > highestSeq) highestSeq = seq;
  }

  return `${prefix}${String(highestSeq + 1).padStart(6, '0')}`;
};

// Next Invoice Number generator: format INV-YYYY-000001
export const generateNextInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumberStr = data[0].invoice_number.replace(prefix, '');
      const lastSeq = parseInt(lastNumberStr, 10) || 0;
      return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
    }
    return `${prefix}000001`;
  }

  const existing = (localDb.invoices || [])
    .map(inv => inv.invoice_number)
    .filter(num => num && num.startsWith(prefix));

  if (existing.length === 0) return `${prefix}000001`;
  let highest = 0;
  for (const num of existing) {
    const seq = parseInt(num.replace(prefix, ''), 10) || 0;
    if (seq > highest) highest = seq;
  }
  return `${prefix}${String(highest + 1).padStart(6, '0')}`;
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
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase().from('users').insert(newUser).select().single();
        if (error) throw error;
        return data;
      }
      localDb.users.push(newUser);
      saveLocalDb();
      const { password_hash, ...safe } = newUser;
      return safe;
    }
  },

  // SHOPS
  shops: {
    getProfile: async () => {
      if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('shops').select('*').limit(1).single();
        return data || null;
      }
      return (localDb.shops && localDb.shops[0]) || null;
    },
    updateProfile: async (updates) => {
      if (isSupabaseConfigured()) {
        const profile = await db.shops.getProfile();
        if (!profile) return null;
        const { data, error } = await getSupabase()
          .from('shops')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      if (localDb.shops && localDb.shops[0]) {
        localDb.shops[0] = { ...localDb.shops[0], ...updates, updated_at: new Date().toISOString() };
        saveLocalDb();
        return localDb.shops[0];
      }
      return null;
    }
  },

  // CUSTOMERS
  customers: {
    list: async ({ search = '', limit = 50, offset = 0 } = {}) => {
      if (isSupabaseConfigured()) {
        let query = getSupabase().from('customers').select('*', { count: 'exact' });
        if (search) {
          query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }
        const { data, count, error } = await query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
        if (error) throw error;
        return { customers: data || [], total: count || 0 };
      }

      let filtered = [...(localDb.customers || [])];
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
      const codeSeq = ((localDb?.customers?.length || 0) + 1);
      const newCustomer = {
        id: uuidv4(),
        customer_code: `CUST-${String(codeSeq).padStart(4, '0')}`,
        ...customerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase().from('customers').insert(newCustomer).select().single();
        if (error) throw error;
        return data;
      }
      localDb.customers.push(newCustomer);
      saveLocalDb();
      return newCustomer;
    },
    update: async (id, updates) => {
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase()
          .from('customers')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const idx = (localDb.customers || []).findIndex(c => c.id === id);
      if (idx === -1) return null;
      localDb.customers[idx] = { ...localDb.customers[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalDb();
      return localDb.customers[idx];
    },
    delete: async (id) => {
      if (isSupabaseConfigured()) {
        const { error } = await getSupabase().from('customers').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const idx = (localDb.customers || []).findIndex(c => c.id === id);
      if (idx === -1) return false;
      localDb.customers.splice(idx, 1);
      saveLocalDb();
      return true;
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase().from('devices').insert(newDevice).select().single();
        if (error) throw error;
        return data;
      }
      localDb.devices.push(newDevice);
      saveLocalDb();
      return newDevice;
    },
    update: async (id, updates) => {
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase()
          .from('devices')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const idx = (localDb.devices || []).findIndex(d => d.id === id);
      if (idx === -1) return null;
      localDb.devices[idx] = { ...localDb.devices[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalDb();
      return localDb.devices[idx];
    }
  },

  // REPAIR JOBS
  jobs: {
    list: async ({ status, customerId, technicianId, search, limit = 50, offset = 0, sortBy = 'created_at', sortDir = 'desc' } = {}) => {
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

      // Populate joined customer & device
      let populated = jobs.map(j => {
        const customer = (localDb.customers || []).find(c => c.id === j.customer_id) || {};
        const device = (localDb.devices || []).find(d => d.id === j.device_id) || {};
        const tech = (localDb.users || []).find(u => u.id === j.assigned_technician_id) || null;
        return {
          ...j,
          customer: {
            id: customer.id,
            full_name: customer.full_name,
            phone: customer.phone,
            email: customer.email,
            whatsapp_number: customer.whatsapp_number
          },
          device: {
            id: device.id,
            brand: device.brand,
            model: device.model,
            imei: device.imei,
            color: device.color
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
      const job = (localDb.repair_jobs || []).find(j => j.id === id || j.job_number === id);
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
        customer_complaint: jobData.customer_complaint,
        device_condition: jobData.device_condition || {},
        accessories_received: jobData.accessories_received || [],
        subtotal: 0.00,
        discount: 0.00,
        tax_rate: 8.25,
        tax_amount: 0.00,
        total_amount: 0.00,
        paid_amount: 0.00,
        balance_due: 0.00,
        payment_status: 'UNPAID',
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
      return localDb.repair_jobs[idx];
    },

    updateStatus: async (id, newStatus, actionTitle, notes, userId) => {
      const idx = (localDb.repair_jobs || []).findIndex(j => j.id === id);
      if (idx === -1) return null;
      const oldStatus = localDb.repair_jobs[idx].status;

      localDb.repair_jobs[idx].status = newStatus;
      localDb.repair_jobs[idx].updated_at = new Date().toISOString();

      localDb.job_status_history.push({
        id: uuidv4(),
        job_id: id,
        from_status: oldStatus,
        to_status: newStatus,
        action_title: actionTitle,
        notes: notes || '',
        performed_by_user_id: userId || null,
        created_at: new Date().toISOString()
      });

      saveLocalDb();
      return localDb.repair_jobs[idx];
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
    save: async ({ jobId, laborCharge = 0, items = [], discount = 0, taxRate = 8.25, notes = '', validUntil, userId }) => {
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
          quantity: qty,
          unit_price: unitPrice,
          discount: itemDiscount,
          total_price: parseFloat(total.toFixed(2))
        };
      });

      const parsedLabor = Math.max(0, parseFloat(laborCharge) || 0);
      const parsedDiscount = Math.max(0, parseFloat(discount) || 0);
      const parsedTaxRate = Math.max(0, parseFloat(taxRate) || 0);

      const subtotalBeforeTax = Math.max(0, (partsSubtotal + parsedLabor) - parsedDiscount);
      const taxAmount = parseFloat(((subtotalBeforeTax * parsedTaxRate) / 100).toFixed(2));
      const grandTotal = parseFloat((subtotalBeforeTax + taxAmount).toFixed(2));

      let est = (localDb.repair_estimates || []).find(e => e.job_id === jobId);
      if (est) {
        est.labor_charge = parsedLabor;
        est.parts_subtotal = parseFloat(partsSubtotal.toFixed(2));
        est.discount = parsedDiscount;
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

      for (const item of processedItems) {
        localDb.repair_estimate_items.push({
          ...item,
          estimate_id: est.id,
          created_at: new Date().toISOString()
        });
      }

      // Update cached totals on the repair_job record
      const jobIdx = (localDb.repair_jobs || []).findIndex(j => j.id === jobId);
      if (jobIdx !== -1) {
        localDb.repair_jobs[jobIdx].subtotal = parseFloat((partsSubtotal + parsedLabor).toFixed(2));
        localDb.repair_jobs[jobIdx].discount = parsedDiscount;
        localDb.repair_jobs[jobIdx].tax_rate = parsedTaxRate;
        localDb.repair_jobs[jobIdx].tax_amount = taxAmount;
        localDb.repair_jobs[jobIdx].total_amount = grandTotal;
        localDb.repair_jobs[jobIdx].balance_due = Math.max(0, grandTotal - (localDb.repair_jobs[jobIdx].paid_amount || 0));
        localDb.repair_jobs[jobIdx].updated_at = new Date().toISOString();
      }

      saveLocalDb();
      return { ...est, items: processedItems };
    }
  },

  // PARTS & INVENTORY
  parts: {
    list: async ({ category, search, lowStockOnly = false } = {}) => {
      let parts = [...(localDb.parts || [])];
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
      return parts;
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

      localDb.part_stock_movements.push({
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
      });

      saveLocalDb();
      return part;
    },
    delete: async (id) => {
      const idx = (localDb.parts || []).findIndex(p => p.id === id);
      if (idx === -1) return false;
      localDb.parts.splice(idx, 1);
      saveLocalDb();
      return true;
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

      const currentBalance = job.balance_due !== undefined ? job.balance_due : (job.total_amount - (job.paid_amount || 0));
      if (parsedAmount > (currentBalance + 0.01)) {
        throw new Error(`Payment amount ($${parsedAmount.toFixed(2)}) cannot exceed remaining balance ($${currentBalance.toFixed(2)})`);
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
      const newBalance = Math.max(0, parseFloat((job.total_amount - newPaidAmount).toFixed(2)));

      job.paid_amount = newPaidAmount;
      job.balance_due = newBalance;
      job.payment_status = newBalance === 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID');
      job.updated_at = new Date().toISOString();

      // Add timeline entry
      localDb.job_status_history.push({
        id: uuidv4(),
        job_id: jobId,
        from_status: job.status,
        to_status: job.status,
        action_title: `Payment Received: $${parsedAmount.toFixed(2)} (${paymentMethod})`,
        notes: `Recorded by staff. Total paid: $${newPaidAmount.toFixed(2)}, Remaining balance: $${newBalance.toFixed(2)}. Ref: ${transactionReference || 'N/A'}`,
        performed_by_user_id: userId,
        created_at: new Date().toISOString()
      });

      saveLocalDb();
      return { payment, job };
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
      const taxRate = est ? est.tax_rate : (job.tax_rate || 8.25);
      const taxAmount = est ? est.tax_amount : (job.tax_amount || 0);
      const totalAmount = job.total_amount;
      const paidAmount = job.paid_amount || 0;
      const balanceDue = Math.max(0, totalAmount - paidAmount);

      if (invoice) {
        invoice.subtotal = partsAmount + laborAmount;
        invoice.labor_amount = laborAmount;
        invoice.parts_amount = partsAmount;
        invoice.discount = discount;
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
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          balance_due: balanceDue,
          payment_status: balanceDue === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID'),
          warranty_period: `${warrantyDays} Days Hardware Warranty`,
          notes: notes || 'Thank you for choosing TechFix Pro for your mobile device repair!',
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
          quantity: ei.quantity,
          unit_price: ei.unit_price,
          total_price: ei.total_price,
          created_at: new Date().toISOString()
        };
        localDb.invoice_items.push(item);
        invoiceItems.push(item);
      }

      saveLocalDb();
      return { ...invoice, items: invoiceItems };
    }
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
      return logEntry;
    },
    getLogs: async ({ jobId, limit = 50 } = {}) => {
      let logs = [...(localDb.notification_logs || [])];
      if (jobId) {
        logs = logs.filter(l => l.job_id === jobId);
      }
      logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return logs.slice(0, limit);
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
      saveLocalDb();
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
      return setting;
    }
  }
};
