import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Reopen & Discount Feature Test Suite...\n');

  try {
    // 1. Login as Admin
    console.log('1. Authenticating as Admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@mobotech.com',
      password: 'Admin@123456',
    });
    const token = loginRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✅ Authenticated successfully.\n');

    // 2. Create customer & job
    console.log('2. Creating customer and job sheet...');
    const custRes = await axios.post(
      `${API_BASE}/customers`,
      {
        full_name: 'Warranty Test Customer',
        phone: '9988776655',
        email: 'warranty@test.com',
      },
      authHeaders
    );
    const customerId = custRes.data.data.customer.id;

    const jobRes = await axios.post(
      `${API_BASE}/jobs`,
      {
        customer_id: customerId,
        customer_complaint: 'Screen touch freezing and display lines',
        device_data: {
          brand: 'Samsung',
          model: 'Galaxy S23',
          color: 'Phantom Black',
          imei: '358900112233445',
        },
      },
      authHeaders
    );
    const job = jobRes.data.data.job;
    const jobId = job.id;
    console.log(`✅ Job created: #${job.job_number} (ID: ${jobId}, Status: ${job.status})\n`);

    // 3. Move to DIAGNOSING
    console.log('3. Moving to DIAGNOSING...');
    await axios.post(`${API_BASE}/jobs/${jobId}/start-diagnosis`, {}, authHeaders);
    console.log('✅ Moved to DIAGNOSING.\n');

    // 4. Test Percentage Discount (e.g. 15% discount on parts ₹1,000 + labor ₹500 = ₹1,500 total, discount = ₹225)
    console.log('4. Testing Percentage Discount calculation...');
    const estRes = await axios.post(
      `${API_BASE}/jobs/${jobId}/estimate`,
      {
        labor_charge: 500,
        items: [
          { item_name: 'Display Assembly AMOLED', quantity: 1, unit_price: 1000 },
        ],
        discount_type: 'PERCENTAGE',
        discount_value: 15, // 15%
        tax_rate: 18,
        notes: '15% Festive discount applied',
      },
      authHeaders
    );
    const estData = estRes.data.data.estimate;
    const expectedDiscount = 225; // 15% of 1500
    console.log(`- Labor: ₹${estData.labor_charge}, Parts: ₹${estData.parts_subtotal}`);
    console.log(`- Discount Type: ${estData.discount_type}, Value: ${estData.discount_value}%`);
    console.log(`- Resolved Discount: ₹${estData.discount} (Expected: ₹${expectedDiscount})`);
    if (Math.abs(estData.discount - expectedDiscount) > 0.01) {
      throw new Error(`Discount calculation mismatch: expected ${expectedDiscount}, got ${estData.discount}`);
    }
    console.log('✅ Percentage discount calculated and saved accurately!\n');

    // 5. Test Fixed Amount Discount (e.g. ₹300 off)
    console.log('5. Testing Fixed Amount Discount...');
    const estRes2 = await axios.post(
      `${API_BASE}/jobs/${jobId}/estimate`,
      {
        labor_charge: 500,
        items: [
          { item_name: 'Display Assembly AMOLED', quantity: 1, unit_price: 1000 },
        ],
        discount_type: 'AMOUNT',
        discount_value: 300,
        tax_rate: 18,
        notes: '₹300 flat loyalty discount',
      },
      authHeaders
    );
    const estData2 = estRes2.data.data.estimate;
    console.log(`- Discount Type: ${estData2.discount_type}, Amount: ₹${estData2.discount}`);
    if (estData2.discount !== 300 || estData2.discount_type !== 'AMOUNT') {
      throw new Error(`Amount discount failed: expected 300, got ${estData2.discount}`);
    }
    console.log('✅ Fixed amount discount saved accurately!\n');

    // 6. Complete Job flow to DELIVERED
    console.log('6. Advancing job to DELIVERED...');
    // Approve
    const tokenRes = await axios.get(`${API_BASE}/jobs/${jobId}`, authHeaders);
    const approvalToken = tokenRes.data.data.job.approval_token;
    await axios.post(`${API_BASE}/jobs/public/approval/${approvalToken}`, {
      decision: 'APPROVE',
    });
    // Start repair
    await axios.post(`${API_BASE}/jobs/${jobId}/start-repair`, {}, authHeaders);
    // Complete repair
    await axios.post(`${API_BASE}/jobs/${jobId}/complete-repair`, {}, authHeaders);
    // Mark ready
    await axios.post(`${API_BASE}/jobs/${jobId}/ready-for-pickup`, {}, authHeaders);
    // Record payment to clear balance
    const currentJob = (await axios.get(`${API_BASE}/jobs/${jobId}`, authHeaders)).data.data.job;
    await axios.post(
      `${API_BASE}/payments`,
      {
        job_id: jobId,
        amount: currentJob.balance_due,
        payment_method: 'CASH',
        notes: 'Full payment received',
      },
      authHeaders
    );
    // Record delivery
    await axios.post(
      `${API_BASE}/jobs/${jobId}/pickup`,
      {
        customer_tested_device: true,
        customer_acceptance_confirmed: true,
        delivery_notes: 'Phone handed over in perfect working condition',
        channels: [],
      },
      authHeaders
    );

    const deliveredJob = (await axios.get(`${API_BASE}/jobs/${jobId}`, authHeaders)).data.data.job;
    console.log(`✅ Job #${deliveredJob.job_number} is now DELIVERED!\n`);

    // 7. Test Reopening Job for Warranty Claim
    console.log('7. Testing Reopen Job Endpoint (POST /api/jobs/:id/reopen)...');
    const warrantyReason = 'Customer returned after 4 days: Touchscreen unresponsive intermittently in top left corner (Warranty Claim)';
    const reopenRes = await axios.post(
      `${API_BASE}/jobs/${jobId}/reopen`,
      {
        reason: warrantyReason,
        target_status: 'DIAGNOSING',
        notes: 'Priority rework under 90-day warranty policy',
      },
      authHeaders
    );

    const reopenedJob = reopenRes.data.data.job;
    console.log(`- Status: ${reopenedJob.status} (Expected: DIAGNOSING)`);
    console.log(`- Is Warranty Claim: ${reopenedJob.is_warranty_claim}`);
    console.log(`- Reopen Count: ${reopenedJob.reopen_count}`);
    console.log(`- Last Warranty Issue: ${reopenedJob.last_warranty_issue}`);
    console.log(`- Customer Acceptance Reset: ${reopenedJob.customer_acceptance_confirmed}`);

    if (reopenedJob.status !== 'DIAGNOSING') {
      throw new Error(`Expected reopened status to be DIAGNOSING, got ${reopenedJob.status}`);
    }
    if (!reopenedJob.is_warranty_claim) {
      throw new Error(`Expected is_warranty_claim to be true`);
    }
    if (reopenedJob.reopen_count !== 1) {
      throw new Error(`Expected reopen_count to be 1, got ${reopenedJob.reopen_count}`);
    }
    if (reopenedJob.last_warranty_issue !== warrantyReason) {
      throw new Error(`Expected last_warranty_issue to match entered reason`);
    }

    console.log('✅ Reopen Job successfully verified and all warranty fields populated!\n');

    // 8. Verify timeline entry exists in status history
    const timeline = reopenedJob.history || [];
    const reopenEvent = timeline.find((e) => e.action_title?.includes('Warranty Claim'));
    if (!reopenEvent) {
      throw new Error('Warranty reopen event not found in activity history');
    }
    console.log(`✅ Reopen timeline audit event verified: "${reopenEvent.action_title}"`);
    console.log(`- Event Notes: "${reopenEvent.notes}"\n`);

    console.log('🎉 ALL REOPEN & DISCOUNT TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
