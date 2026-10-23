import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';

async function testConnection() {
  console.log('Testing Supabase configuration...');
  console.log('isSupabaseConfigured():', isSupabaseConfigured());

  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client failed to initialize');
    process.exit(1);
  }

  console.log('✅ Supabase client initialized. Testing query...');

  // Test 1: check connection and list tables / check shops table
  const { data: shops, error: shopsErr } = await supabase
    .from('shops')
    .select('*')
    .limit(1);

  if (shopsErr) {
    console.error('⚠️ Error querying "shops" table:', shopsErr.message, 'Code:', shopsErr.code);
    if (shopsErr.code === '42P01' || shopsErr.message.includes('relation "shops" does not exist') || shopsErr.message.includes('not found') || shopsErr.code === 'PGRST205') {
      console.log('ℹ️ Table "shops" does not exist yet. The database schema needs to be executed in Supabase SQL Editor.');
    }
    return;
  }

  console.log('✅ Successfully connected to Supabase PostgreSQL!');
  const allTables = [
    'shops',
    'roles',
    'users',
    'customers',
    'devices',
    'parts',
    'repair_jobs',
    'job_notes',
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
    'settings',
    'backup_logs',
    'sales',
    'vendors',
    'vendor_transactions',
    'vendor_mobiles',
    'vendor_ledger',
    'vendor_payments',
    'vendor_status_history',
  ];

  console.log('\n--- Checking All Tables in Supabase ---');
  for (const tbl of allTables) {
    const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${tbl}: ${error.message} (${error.code})`);
    } else {
      console.log(`✅ ${tbl}: EXISTS (${count ?? 0} rows)`);
    }
  }
}

testConnection().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
