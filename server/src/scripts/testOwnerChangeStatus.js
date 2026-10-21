import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testOwnerChangeStatus() {
  console.log('🧪 Starting Shop Owner Change Status Test Suite...\n');

  try {
    // 1. Authenticate as Admin (Shop Owner)
    console.log('1. Authenticating as Admin (Shop Owner)...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@mobotech.com',
      password: 'Admin@123456',
    });
    const token = loginRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✅ Authenticated successfully.\n');

    // 2. Create customer and job
    console.log('2. Creating customer and job sheet...');
    const custRes = await axios.post(
      `${API_BASE}/customers`,
      {
        full_name: 'Status Override Test Customer',
        phone: '9876500112',
      },
      authHeaders
    );
    const customerId = custRes.data.data.customer.id;

    const jobRes = await axios.post(
      `${API_BASE}/jobs`,
      {
        customer_id: customerId,
        customer_complaint: 'Testing Owner Status Change',
        device_data: {
          brand: 'OnePlus',
          model: '11 Pro',
          imei: '861122334455667',
        },
      },
      authHeaders
    );
    const job = jobRes.data.data.job;
    const jobId = job.id;
    console.log(`✅ Job created: #${job.job_number} (Status: ${job.status})\n`);

    // 3. Test changing status to APPROVED directly
    console.log('3. Testing Owner Override: Change status directly to APPROVED...');
    const statusRes1 = await axios.post(
      `${API_BASE}/jobs/${jobId}/status`,
      {
        status: 'APPROVED',
        notes: 'Customer called owner and approved repair verbally over phone',
        send_notification: false,
      },
      authHeaders
    );
    const updated1 = statusRes1.data.data.job;
    console.log(`- New Status: ${updated1.status}`);
    if (updated1.status !== 'APPROVED') {
      throw new Error(`Expected status APPROVED, got ${updated1.status}`);
    }
    console.log('✅ Status updated to APPROVED successfully!\n');

    // 4. Test changing status to IN_PROGRESS
    console.log('4. Testing Owner Override: Change status to IN_PROGRESS...');
    const statusRes2 = await axios.post(
      `${API_BASE}/jobs/${jobId}/status`,
      {
        status: 'IN_PROGRESS',
        notes: 'Owner expedited directly to technician workbench',
      },
      authHeaders
    );
    const updated2 = statusRes2.data.data.job;
    console.log(`- New Status: ${updated2.status}`);
    if (updated2.status !== 'IN_PROGRESS') {
      throw new Error(`Expected status IN_PROGRESS, got ${updated2.status}`);
    }
    console.log('✅ Status updated to IN_PROGRESS successfully!\n');

    // 5. Test changing status via PUT /api/jobs/:id (Job Sheet Edit)
    console.log('5. Testing status change via Job Sheet Edit (PUT /api/jobs/:id)...');
    const editRes = await axios.put(
      `${API_BASE}/jobs/${jobId}`,
      {
        status: 'TESTING',
        priority: 'URGENT',
      },
      authHeaders
    );
    const updated3 = editRes.data.data.job;
    console.log(`- New Status via Edit: ${updated3.status}`);
    if (updated3.status !== 'TESTING') {
      throw new Error(`Expected status TESTING, got ${updated3.status}`);
    }
    console.log('✅ Status updated via Job Sheet Edit successfully!\n');

    // 6. Test timeline audit history entries
    console.log('6. Verifying timeline audit history...');
    const fullJobRes = await axios.get(`${API_BASE}/jobs/${jobId}`, authHeaders);
    const fullJob = fullJobRes.data.data.job;
    const history = fullJob.history || [];
    console.log(`- Total Timeline Events: ${history.length}`);
    const ownerOverrideEvent = history.find((h) => h.action_title?.includes('Owner Override'));
    if (!ownerOverrideEvent) {
      throw new Error('Owner override event not found in timeline history');
    }
    console.log(`✅ Found timeline entry: "${ownerOverrideEvent.action_title}"`);
    console.log(`- Notes: "${ownerOverrideEvent.notes}"\n`);

    // 7. Verify invalid status is rejected
    console.log('7. Testing rejection of invalid status...');
    try {
      await axios.post(
        `${API_BASE}/jobs/${jobId}/status`,
        { status: 'INVALID_STATUS_FOOBAR' },
        authHeaders
      );
      throw new Error('Invalid status should have been rejected');
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('✅ Invalid status properly rejected with 400 Bad Request.\n');
      } else {
        throw err;
      }
    }

    console.log('🎉 ALL SHOP OWNER CHANGE STATUS TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

testOwnerChangeStatus();
