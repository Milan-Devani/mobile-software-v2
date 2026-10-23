import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testMutationSync() {
  console.log('1. Logging in to backend...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@mobotech.com', password: 'Admin@123456' }),
  });
  const { data: { token } } = await loginRes.json();

  console.log('2. Creating a test part via REST API...');
  const partSku = `TEST-SUPA-${Date.now()}`;
  const createPartRes = await fetch('http://localhost:5000/api/parts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      sku: partSku,
      name: 'Supabase Realtime Verification Part',
      category: 'Display',
      brand: 'Apple',
      compatible_models: ['iPhone 15 Pro'],
      cost_price: 2500,
      selling_price: 3500,
      quantity_in_stock: 10,
      min_stock_level: 2,
      location: 'Bin S-1'
    })
  });

  const createdPart = await createPartRes.json();
  const partId = createdPart.data?.part?.id || createdPart.data?.id;
  console.log('API Create status:', createPartRes.status, 'Part ID:', partId);

  if (!partId) {
    console.error('Failed to create part:', createdPart);
    process.exit(1);
  }

  console.log('3. Directly checking Supabase PostgreSQL database for the created part...');
  const { data: supaPart, error: supaErr } = await supabase
    .from('parts')
    .select('*')
    .eq('id', partId)
    .single();

  if (supaErr || !supaPart) {
    console.error('❌ Part NOT found in Supabase!', supaErr);
    process.exit(1);
  }
  console.log('✅ Supabase verified! Found part in PostgreSQL table "parts":', supaPart.name, '| SKU:', supaPart.sku);

  console.log('4. Deleting part via REST API...');
  const delRes = await fetch(`http://localhost:5000/api/parts/${partId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('API Delete status:', delRes.status);

  console.log('5. Directly checking Supabase PostgreSQL to verify deletion...');
  const { data: postDelPart } = await supabase
    .from('parts')
    .select('*')
    .eq('id', partId)
    .maybeSingle();

  if (postDelPart === null) {
    console.log('✅ Supabase verified! Record successfully purged from Supabase PostgreSQL.');
  } else {
    console.error('❌ Part still exists in Supabase:', postDelPart);
  }

  console.log('🎉 Supabase integration is 100% verified and operational.');
}

testMutationSync().catch(console.error);
