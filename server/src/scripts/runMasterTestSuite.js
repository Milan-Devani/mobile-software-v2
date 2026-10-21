import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

async function test(name, fn) {
  try {
    process.stdout.write(`⏳ Running: ${name}... `);
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    console.log(`✅ PASSED`);
  } catch (err) {
    results.failed++;
    const msg = err.response?.data?.message || err.message;
    results.tests.push({ name, status: 'FAILED', error: msg });
    console.log(`❌ FAILED: ${msg}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function run() {
  console.log('===============================================================');
  console.log('🧪 MASTER QA AUTOMATED INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  let adminToken = '';
  let techToken = '';
  let testCustomerId = '';
  let testJobId = '';
  let testJobNumber = '';
  let testApprovalToken = '';
  let testPartId = '';
  let initialStock = 10;

  // 1. Health & Server Ping
  await test('API Health Check Endpoint (/api/health)', async () => {
    const res = await axios.get(`${API_BASE}/health`);
    assert(res.data.success === true, 'Response success flag not true');
    assert(res.data.environment === 'development', 'Environment mismatch');
  });

  // 2. Auth - Invalid Login
  await test('Authentication: Reject invalid credentials (401)', async () => {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@mobotech.com',
        password: 'WrongPassword123!',
      });
      assert(false, 'Expected 401 error but request succeeded');
    } catch (err) {
      assert(err.response?.status === 401, 'Status code should be 401');
    }
  });

  // 3. Auth - Admin Login
  await test('Authentication: Admin login and JWT token acquisition', async () => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@mobotech.com',
      password: 'Admin@123456',
    });
    assert(res.data.success === true, 'Login failed');
    assert(res.data.data.token, 'Token not present');
    assert(res.data.data.user.role_id === 'admin', 'Role not admin');
    adminToken = res.data.data.token;
  });

  // 4. Auth - Tech Login
  await test('Authentication: Technician login and role verification', async () => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'tech@mobotech.com',
      password: 'Tech@123456',
    });
    assert(res.data.success === true, 'Tech login failed');
    assert(res.data.data.user.role_id === 'technician', 'Role not technician');
    techToken = res.data.data.token;
  });

  const authHeader = () => ({ headers: { Authorization: `Bearer ${adminToken}` } });

  // 5. Dashboard Stats
  await test('Dashboard Metrics: Fetch summary KPIs & pipeline counts (/api/dashboard/stats)', async () => {
    const res = await axios.get(`${API_BASE}/dashboard/stats`, authHeader());
    assert(res.data.success === true, 'Failed to fetch dashboard stats');
    assert(typeof res.data.data.summary.total_jobs === 'number', 'total_jobs count missing');
    assert(Array.isArray(res.data.data.pipeline), 'Pipeline array missing');
    assert(res.data.data.pipeline.length === 9, 'Pipeline should have 9 stage groups');
  });

  // 6. Customers: Create Customer
  await test('Customers: Create new customer with phone & WhatsApp validation', async () => {
    const testCustData = {
      full_name: `QA Test User ${Date.now().toString().slice(-4)}`,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `qatest_${Date.now()}@example.com`,
      whatsapp_number: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      user_type: 'End User',
      gender: 'male',
      address: 'Shop 12, Varachha',
      city: 'Surat',
      state: 'Gujarat',
      postal_code: '395006',
    };
    const res = await axios.post(`${API_BASE}/customers`, testCustData, authHeader());
    assert(res.data.success === true, 'Customer creation failed');
    const cust = res.data.data.customer;
    assert(cust && cust.id, 'Customer ID missing in response');
    assert(cust.customer_code.startsWith('CUST-'), 'Customer code format invalid');
    testCustomerId = cust.id;
  });

  // 7. Customers: Retrieve & Search
  await test('Customers: Retrieve customer details and list search', async () => {
    const res = await axios.get(`${API_BASE}/customers/${testCustomerId}`, authHeader());
    assert(res.data.success === true, 'Failed to get customer');
    assert(res.data.data.customer.id === testCustomerId, 'Customer ID mismatch');

    const searchRes = await axios.get(`${API_BASE}/customers?search=QA Test`, authHeader());
    assert(searchRes.data.success === true, 'Failed to search customers');
    assert(searchRes.data.data.customers.length > 0, 'No customers found in search');
  });

  // 8. Parts Inventory: Create Part
  await test('Inventory: Create spare part catalog item', async () => {
    const partData = {
      name: `OLED Display Assembly Test ${Date.now().toString().slice(-4)}`,
      brand: 'Samsung',
      category: 'Screen / Display',
      purchase_cost: 3500,
      selling_price: 5200,
      stock_quantity: initialStock,
      minimum_stock: 2,
      compatible_models: 'Galaxy S23, S23 Plus',
      supplier: 'Direct Tech Imports',
    };
    const res = await axios.post(`${API_BASE}/parts`, partData, authHeader());
    assert(res.data.success === true, 'Part creation failed');
    const part = res.data.data.part;
    assert(part && part.id, 'Part ID missing');
    assert(part.stock_quantity === 10, 'Initial stock mismatch');
    testPartId = part.id;
  });

  // 9. Repair Jobs: Create Job Sheet
  await test('Repair Jobs: Create service ticket with dynamic checklist & device specs', async () => {
    const jobData = {
      customer_id: testCustomerId,
      priority: 'HIGH',
      service_type: 'Screen Replacement',
      customer_complaint: 'Screen shattered, touch unresponsive after drop.',
      device_data: {
        brand: 'Samsung',
        model: 'Galaxy S23 Ultra',
        color: 'Phantom Black',
        storage_capacity: '256GB',
        imei: '358941092837461',
        passcode: '1234',
        cosmetic_condition: 'Cracked Screen / Broken Glass',
      },
      device_condition: {
        power_on: 'Yes',
        display_touch: 'No',
        charging: 'Yes',
        camera: 'Yes',
        speakers: 'Yes',
        microphone: 'Yes',
        wifi_bluetooth: 'Yes',
        network: 'Yes',
        face_touch_id: 'Yes',
        physical_buttons: 'Yes',
        body_housing: 'Yes',
        water_damage: false,
        notes: 'Inward physical check complete',
      },
      accessories_received: ['Original Box', 'SIM Tray'],
    };
    const res = await axios.post(`${API_BASE}/jobs`, jobData, authHeader());
    assert(res.data.success === true, 'Job creation failed');
    const job = res.data.data.job;
    assert(job && job.id, 'Job ID missing');
    assert(job.job_number.startsWith('mobo-') || job.job_number.startsWith('JOB-'), 'Job number format invalid');
    assert(job.status === 'RECEIVED', 'Initial status not RECEIVED');
    testJobId = job.id;
    testJobNumber = job.job_number;
    testApprovalToken = job.approval_token;
  });

  // 10. Repair Jobs: Start Diagnosis -> DIAGNOSING
  await test('Repair Jobs: Start diagnostic assessment (RECEIVED -> DIAGNOSING)', async () => {
    const res = await axios.post(`${API_BASE}/jobs/${testJobId}/start-diagnosis`, {}, authHeader());
    assert(res.data.success === true, 'Start diagnosis failed');
    assert(res.data.data.job.status === 'DIAGNOSING', 'Status should be DIAGNOSING');
  });

  // 11. Estimates: Save Estimate -> ESTIMATE_SENT
  await test('Estimates: Save estimate with parts & labor (DIAGNOSING -> ESTIMATE_SENT)', async () => {
    const estimateData = {
      items: [
        {
          item_type: 'PART',
          part_id: testPartId,
          item_name: 'Samsung S23 Ultra AMOLED Display Assembly',
          quantity: 1,
          unit_price: 5200,
          total_price: 5200,
        },
        {
          item_type: 'SERVICE',
          item_name: 'Precision Frame Installation & Waterproof Seal',
          quantity: 1,
          unit_price: 800,
          total_price: 800,
        },
      ],
      tax_rate: 18,
      discount: 200,
      send_notification: false,
    };
    const res = await axios.post(`${API_BASE}/jobs/${testJobId}/estimate`, estimateData, authHeader());
    assert(res.data.success === true, 'Save estimate failed');
    assert(res.data.data.job.status === 'ESTIMATE_SENT', 'Status should be ESTIMATE_SENT');
    assert(res.data.data.estimate.total_amount > 0, 'Total amount should be > 0');
  });

  // 12. Public Approval Link: Customer Approves Estimate -> APPROVED
  await test('Public Approval Gateway: Customer approves estimate (ESTIMATE_SENT -> APPROVED)', async () => {
    const res = await axios.post(
      `${API_BASE}/jobs/public/approval/${testApprovalToken || testJobNumber}`,
      { decision: 'APPROVE', reason: 'Customer approved quotation online' }
    );
    assert(res.data.success === true, 'Public approval failed');
    assert(res.data.data.job.status === 'APPROVED', 'Status should be APPROVED');
  });

  // 13. Repair Jobs: Start Repair -> IN_PROGRESS & Auto Stock Deduction
  await test('Repair Jobs: Start hardware repair (APPROVED -> IN_PROGRESS & stock decrement)', async () => {
    const res = await axios.post(`${API_BASE}/jobs/${testJobId}/start-repair`, {}, authHeader());
    assert(res.data.success === true, 'Start repair failed');
    assert(res.data.data.job.status === 'IN_PROGRESS', 'Status should be IN_PROGRESS');

    // Verify stock was decremented from 10 to 9
    const partRes = await axios.get(`${API_BASE}/parts/${testPartId}`, authHeader());
    assert(partRes.data.data.part.stock_quantity === 9, 'Part stock was not decremented');
  });

  // 14. Repair Jobs: Complete Repair -> TESTING
  await test('Repair Jobs: Finish repair work (IN_PROGRESS -> TESTING)', async () => {
    const res = await axios.post(`${API_BASE}/jobs/${testJobId}/complete-repair`, {}, authHeader());
    assert(res.data.success === true, 'Complete repair failed');
    assert(res.data.data.job.status === 'TESTING', 'Status should be TESTING');
  });

  // 15. Repair Jobs: Mark Ready for Pickup -> READY_FOR_PICKUP
  await test('Repair Jobs: Pass QC testing & mark ready (TESTING -> READY_FOR_PICKUP)', async () => {
    const res = await axios.post(
      `${API_BASE}/jobs/${testJobId}/ready-for-pickup`,
      { send_notification: false },
      authHeader()
    );
    assert(res.data.success === true, 'Mark ready failed');
    assert(res.data.data.job.status === 'READY_FOR_PICKUP', 'Status should be READY_FOR_PICKUP');
  });

  // 16. Invoices: Generate Official Tax Invoice
  await test('Invoices: Generate official tax invoice with line items & balance', async () => {
    const res = await axios.post(`${API_BASE}/invoices/job/${testJobId}/generate`, {}, authHeader());
    assert(res.data.success === true, 'Generate invoice failed');
    assert(res.data.data.invoice.invoice_number, 'Invoice number missing');
    assert(res.data.data.invoice.total_amount > 0, 'Invoice total missing');
  });

  // 17. Payments: Record Customer Payments & Full Settlement
  await test('Payments: Record customer payment and verify balance update', async () => {
    // 1. Partial Advance payment of 3000
    const payData = {
      job_id: testJobId,
      amount: 3000,
      payment_method: 'UPI',
      transaction_reference: `UPI-TXN-${Date.now().toString().slice(-8)}`,
      notes: 'Customer paid partial advance via Google Pay UPI',
    };
    const res = await axios.post(`${API_BASE}/payments`, payData, authHeader());
    assert(res.data.success === true, 'Payment recording failed');
    assert(res.data.data.payment.amount === 3000, 'Payment amount mismatch');

    // 2. Settle remaining balance
    const jobRes = await axios.get(`${API_BASE}/jobs/${testJobId}`, authHeader());
    const remainingBalance = Number(jobRes.data.data.job.balance_due || 0);
    if (remainingBalance > 0) {
      await axios.post(
        `${API_BASE}/payments`,
        {
          job_id: testJobId,
          amount: remainingBalance,
          payment_method: 'CASH',
          transaction_reference: 'CASH-SETTLEMENT',
          notes: 'Full balance settled at delivery counter',
        },
        authHeader()
      );
    }
    const finalJobRes = await axios.get(`${API_BASE}/jobs/${testJobId}`, authHeader());
    assert(finalJobRes.data.data.job.balance_due === 0, 'Job balance should be 0 after settlement');
  });

  // 18. Repair Jobs: Final Customer Delivery -> DELIVERED
  await test('Repair Jobs: Record customer pickup (READY_FOR_PICKUP -> DELIVERED)', async () => {
    const res = await axios.post(
      `${API_BASE}/jobs/${testJobId}/pickup`,
      {
        customer_tested_device: true,
        customer_acceptance_confirmed: true,
        delivery_notes: 'Handed over in working order with warranty slip',
        channels: ['EMAIL', 'WHATSAPP'],
      },
      authHeader()
    );
    assert(res.data.success === true, 'Pickup failed');
    assert(res.data.data.job.status === 'DELIVERED', 'Status should be DELIVERED');
  });

  // 19. WhatsApp Gateway: Verify Socket Status
  await test('WhatsApp Gateway: Verify Baileys socket connection status', async () => {
    const res = await axios.get(`${API_BASE}/whatsapp/status`);
    assert(res.data.success === true, 'WhatsApp status failed');
    assert(res.data.data.status === 'CONNECTED', `Expected CONNECTED, got ${res.data.data.status}`);
  });

  // 20. Settings & Shop Profile
  await test('Settings: Retrieve shop profile configuration (/api/settings)', async () => {
    const res = await axios.get(`${API_BASE}/settings`, authHeader());
    assert(res.data.success === true, 'Failed to get settings');
    assert(res.data.data.shop.name.includes('Mobotech'), 'Shop name mismatch');
    assert(res.data.data.notifications.email_enabled !== undefined, 'Notification config missing');
  });

  console.log('\n===============================================================');
  console.log(`📊 EXECUTION SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('===============================================================');

  if (results.failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal test runner failure:', e);
  process.exit(1);
});
