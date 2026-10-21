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
  console.log('Shops count or record:', shops);

  // Test 2: check repair_jobs
  const { data: jobs, error: jobsErr } = await supabase
    .from('repair_jobs')
    .select('id, job_number')
    .limit(5);

  if (jobsErr) {
    console.warn('⚠️ Error querying repair_jobs:', jobsErr.message);
  } else {
    console.log(`✅ repair_jobs table found with ${jobs.length} sample records:`, jobs);
  }
}

testConnection().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
