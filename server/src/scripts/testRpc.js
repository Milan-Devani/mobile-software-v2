import { getSupabase } from '../config/supabase.js';

async function testRpc() {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
    console.log('rpc exec_sql result:', data, 'error:', error);
  } catch (err) {
    console.log('rpc err:', err.message);
  }
}

testRpc();
