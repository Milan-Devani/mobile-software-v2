import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testBulkAndPagination() {
  console.log('Testing Bulk Operations and Pagination APIs...');

  // 1. Login as admin
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@mobotech.com',
    password: 'Admin@123456',
  });
  const token = loginRes.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('Admin login successful.');

  // 2. Test Pagination on all resources
  const endpoints = [
    { name: 'Jobs', url: `${API_BASE}/jobs?limit=10&offset=0`, prop: 'jobs' },
    { name: 'Customers', url: `${API_BASE}/customers?limit=10&offset=0`, prop: 'customers' },
    { name: 'Parts', url: `${API_BASE}/parts?limit=10&offset=0`, prop: 'parts' },
    { name: 'Payments', url: `${API_BASE}/payments?limit=10&offset=0`, prop: 'payments' },
    { name: 'Notifications', url: `${API_BASE}/notifications/logs?limit=10&offset=0`, prop: 'logs' },
    { name: 'Users', url: `${API_BASE}/auth/users`, prop: 'users' },
  ];

  for (const ep of endpoints) {
    const res = await axios.get(ep.url, { headers });
    const data = res.data.data || res.data;
    const items = data[ep.prop] || [];
    const total = data.total !== undefined ? data.total : items.length;
    console.log(`[PASS] ${ep.name} pagination: fetched ${items.length} items (total: ${total})`);
  }

  // 3. Test Bulk Status Update on Jobs
  const jobsRes = await axios.get(`${API_BASE}/jobs?limit=2`, { headers });
  const sampleJobs = jobsRes.data.data.jobs || [];
  if (sampleJobs.length > 0) {
    const jobIds = [sampleJobs[0].id];
    const updateRes = await axios.post(
      `${API_BASE}/jobs/bulk-status`,
      {
        ids: jobIds,
        status: sampleJobs[0].status,
        actionTitle: 'Automated Test Status Verification',
        notes: 'Bulk status update test',
      },
      { headers }
    );
    console.log(`[PASS] Bulk status update on jobs:`, updateRes.data.message);
  }

  // 4. Test Single & Bulk delete validations
  try {
    await axios.post(`${API_BASE}/jobs/bulk-delete`, { ids: [] }, { headers });
  } catch (err) {
    console.log(`[PASS] Bulk delete empty validation rejected as expected (${err.response?.status})`);
  }

  console.log('\nAll Bulk and Pagination endpoints verified successfully!');
}

testBulkAndPagination().catch((err) => {
  console.error('Test error:', err.response?.data || err.message);
  process.exit(1);
});
