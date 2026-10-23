import { getSupabase } from '../config/supabase.js';

async function checkCols() {
  const supabase = getSupabase();

  console.log('Testing select on sales...');
  const { data: sales, error: salesErr } = await supabase.from('sales').select('*').limit(1);
  console.log('sales result:', sales, 'error:', salesErr);

  console.log('Testing select on vendors...');
  const { data: vendors, error: vendorsErr } = await supabase.from('vendors').select('*').limit(1);
  console.log('vendors result:', vendors, 'error:', vendorsErr);

  console.log('Testing select on vendor_transactions...');
  const { data: vt, error: vtErr } = await supabase.from('vendor_transactions').select('*').limit(1);
  console.log('vendor_transactions result:', vt, 'error:', vtErr);

  console.log('Testing select on vendor_mobiles...');
  const { data: vm, error: vmErr } = await supabase.from('vendor_mobiles').select('*').limit(1);
  console.log('vendor_mobiles result:', vm, 'error:', vmErr);

  console.log('Testing select on vendor_ledger...');
  const { data: vl, error: vlErr } = await supabase.from('vendor_ledger').select('*').limit(1);
  console.log('vendor_ledger result:', vl, 'error:', vlErr);

  console.log('Testing select on vendor_payments...');
  const { data: vp, error: vpErr } = await supabase.from('vendor_payments').select('*').limit(1);
  console.log('vendor_payments result:', vp, 'error:', vpErr);

  console.log('Testing select on vendor_status_history...');
  const { data: vsh, error: vshErr } = await supabase.from('vendor_status_history').select('*').limit(1);
  console.log('vendor_status_history result:', vsh, 'error:', vshErr);
}

checkCols().catch(console.error);
