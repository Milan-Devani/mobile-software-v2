import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../../data/db.json');

function sanitizeRecord(record) {
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
        key === 'rejection_reason'
      ) {
        clean[key] = null;
      }
    }
  }
  return clean;
}

async function chunkAndUpsert(supabase, tableName, records, batchSize = 100) {
  if (!records || records.length === 0) {
    console.log(`   ⏭️  [${tableName}] No records to migrate.`);
    return;
  }

  const sanitized = records.map(sanitizeRecord);
  console.log(`   ⏳ [${tableName}] Migrating ${sanitized.length} records...`);
  for (let i = 0; i < sanitized.length; i += batchSize) {
    let chunk = sanitized.slice(i, i + batchSize).map(r => ({ ...r }));
    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      attempts++;
      const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: tableName === 'settings' ? 'key' : 'id' });
      if (!error) {
        success = true;
      } else {
        const match = error.message.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const missingCol = match[1];
          console.warn(`   ⚠️ [${tableName}] Column '${missingCol}' not in Supabase schema. Stripping and retrying...`);
          chunk.forEach(r => delete r[missingCol]);
        } else {
          console.error(`   ❌ [${tableName}] Error inserting batch ${i / batchSize + 1}:`, error.message);
          throw error;
        }
      }
    }
  }
  console.log(`   ✅ [${tableName}] Successfully migrated ${sanitized.length} records.`);
}

export async function migrateAllData() {
  console.log('====================================================');
  console.log('🚀 SUPABASE FULL DATABASE MIGRATION SCRIPT');
  console.log('====================================================');

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured in .env. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Failed to get Supabase client.');
    process.exit(1);
  }

  // Quick sanity check to see if tables exist
  const { error: testErr } = await supabase.from('shops').select('id').limit(1);
  if (testErr) {
    console.error('❌ Cannot query "shops" table:', testErr.message);
    console.error('👉 Please execute supabase/schema.sql in the Supabase SQL Editor first!');
    process.exit(1);
  }

  if (!fs.existsSync(DB_FILE)) {
    console.error(`❌ db.json file not found at ${DB_FILE}`);
    process.exit(1);
  }

  let rawData = fs.readFileSync(DB_FILE, 'utf-8');
  rawData = rawData.replace(/u0000000-/g, '10000000-');
  const db = JSON.parse(rawData);

  console.log('📦 Loaded local db.json. Beginning migration in dependency order...\n');

  try {
    // 1. Shops
    await chunkAndUpsert(supabase, 'shops', db.shops || []);

    // 2. Roles
    await chunkAndUpsert(supabase, 'roles', db.roles || []);

    // 3. Users
    await chunkAndUpsert(supabase, 'users', db.users || []);

    // 4. Customers
    const customers = db.customers || [];
    await chunkAndUpsert(supabase, 'customers', customers);
    const validCustIds = new Set(customers.map(c => c.id));

    // 5. Devices (only those linked to existing customers)
    const validDevices = (db.devices || []).filter(d => validCustIds.has(d.customer_id));
    await chunkAndUpsert(supabase, 'devices', validDevices);
    const validDevIds = new Set(validDevices.map(d => d.id));

    // 6. Parts
    const parts = db.parts || [];
    await chunkAndUpsert(supabase, 'parts', parts);
    const validPartIds = new Set(parts.map(p => p.id));

    // 7. Repair Jobs (ensure valid customer and device)
    const validJobs = (db.repair_jobs || []).filter(j => validCustIds.has(j.customer_id) && validDevIds.has(j.device_id));
    await chunkAndUpsert(supabase, 'repair_jobs', validJobs);
    const validJobIds = new Set(validJobs.map(j => j.id));

    // 8. Job Status History
    const validHistory = (db.job_status_history || []).filter(h => validJobIds.has(h.job_id));
    await chunkAndUpsert(supabase, 'job_status_history', validHistory);

    // 9. Diagnoses
    const validDiagnoses = (db.diagnoses || []).filter(d => validJobIds.has(d.job_id));
    await chunkAndUpsert(supabase, 'diagnoses', validDiagnoses);

    // 10. Repair Estimates
    const validEstimates = (db.repair_estimates || []).filter(e => validJobIds.has(e.job_id));
    await chunkAndUpsert(supabase, 'repair_estimates', validEstimates);
    const validEstIds = new Set(validEstimates.map(e => e.id));

    // 11. Repair Estimate Items
    const validEstItems = (db.repair_estimate_items || []).filter(i => validEstIds.has(i.estimate_id));
    await chunkAndUpsert(supabase, 'repair_estimate_items', validEstItems);

    // 12. Part Stock Movements
    const cleanedMovements = (db.part_stock_movements || [])
      .filter(m => validPartIds.has(m.part_id))
      .map(m => ({
        ...m,
        job_id: (m.job_id && validJobIds.has(m.job_id)) ? m.job_id : null,
      }));
    await chunkAndUpsert(supabase, 'part_stock_movements', cleanedMovements);

    // 13. Repair Tests
    const validTests = (db.repair_tests || []).filter(t => validJobIds.has(t.job_id));
    await chunkAndUpsert(supabase, 'repair_tests', validTests);

    // 14. Payments
    const validPayments = (db.payments || []).filter(p => validJobIds.has(p.job_id));
    await chunkAndUpsert(supabase, 'payments', validPayments);

    // 15. Invoices
    const validInvoices = (db.invoices || []).filter(i => validJobIds.has(i.job_id));
    await chunkAndUpsert(supabase, 'invoices', validInvoices);
    const validInvIds = new Set(validInvoices.map(i => i.id));

    // 16. Invoice Items
    const validInvItems = (db.invoice_items || []).filter(i => validInvIds.has(i.invoice_id));
    await chunkAndUpsert(supabase, 'invoice_items', validInvItems);

    // 17. Notification Logs (clean orphaned foreign keys to null so historical logs are preserved!)
    const cleanedLogs = (db.notification_logs || []).map(l => ({
      ...l,
      job_id: (l.job_id && validJobIds.has(l.job_id)) ? l.job_id : null,
      customer_id: (l.customer_id && validCustIds.has(l.customer_id)) ? l.customer_id : null,
    }));
    await chunkAndUpsert(supabase, 'notification_logs', cleanedLogs, 100);

    // 18. Settings
    if (db.settings) {
      const settingsArr = Array.isArray(db.settings) ? db.settings : Object.entries(db.settings).map(([k, v]) => ({ key: k, value: v }));
      await chunkAndUpsert(supabase, 'settings', settingsArr);
    }

    // Check if new modules tables (sales, vendors) exist in Supabase
    const { error: salesCheckErr } = await supabase.from('sales').select('id').limit(1);
    const hasSales = !salesCheckErr || salesCheckErr.code !== 'PGRST205';

    if (hasSales) {
      // 19. Sales Invoices
      try {
        await chunkAndUpsert(supabase, 'sales', db.sales || []);
      } catch (err) {
        if (err.message && (err.message.includes('customer_id') || err.message.includes('issued_by'))) {
          console.warn('   ⚠️ Supabase "sales" table missing some columns. Retrying without customer_id/issued_by...');
          const stripped = (db.sales || []).map(s => {
            const copy = { ...s };
            delete copy.customer_id;
            delete copy.issued_by_user_id;
            delete copy.issued_by_name;
            return copy;
          });
          await chunkAndUpsert(supabase, 'sales', stripped);
        } else {
          throw err;
        }
      }
    } else {
      console.log('   ℹ️ Table "sales" not found in Supabase schema yet. Run supabase/migrations/20261023_sales_and_vendors.sql to enable.');
    }

    const { error: vendorCheckErr } = await supabase.from('vendors').select('id').limit(1);
    const hasVendors = !vendorCheckErr || vendorCheckErr.code !== 'PGRST205';

    if (hasVendors) {
      // 20. Vendors
      const vendors = db.vendors || [];
      await chunkAndUpsert(supabase, 'vendors', vendors);
      const validVendorIds = new Set(vendors.map(v => v.id));

      // 21. Vendor Transactions
      const validTxns = (db.vendor_transactions || []).filter(t => validVendorIds.has(t.vendor_id));
      await chunkAndUpsert(supabase, 'vendor_transactions', validTxns);
      const validTxnIds = new Set(validTxns.map(t => t.id));

      // 22. Vendor Mobiles
      const validMobiles = (db.vendor_mobiles || []).filter(m => validVendorIds.has(m.vendor_id));
      await chunkAndUpsert(supabase, 'vendor_mobiles', validMobiles);
      const validMobileIds = new Set(validMobiles.map(m => m.id));

      // 23. Vendor Status History
      const validHistory = (db.vendor_status_history || []).filter(h => validMobileIds.has(h.vendor_mobile_id));
      await chunkAndUpsert(supabase, 'vendor_status_history', validHistory);

      // 24. Vendor Ledger
      const validLedger = (db.vendor_ledger || []).filter(l => validVendorIds.has(l.vendor_id));
      await chunkAndUpsert(supabase, 'vendor_ledger', validLedger);

      // 25. Vendor Payments
      const validPayments = (db.vendor_payments || []).filter(p => validVendorIds.has(p.vendor_id));
      await chunkAndUpsert(supabase, 'vendor_payments', validPayments);
    } else {
      console.log('   ℹ️ Table "vendors" not found in Supabase schema yet. Run supabase/migrations/20261023_sales_and_vendors.sql to enable.');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL DATA MIGRATED TO SUPABASE SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Migration failed with error:', err.message);
    process.exit(1);
  }
}

migrateAllData();

