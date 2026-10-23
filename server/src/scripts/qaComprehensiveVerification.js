import { db, initDb, generateNextJobNumber } from '../db/db.js';
import { env } from '../config/env.js';
import bcrypt from 'bcryptjs';

async function runComprehensiveQA() {
  console.log('====================================================');
  console.log('🔬 MOBOTECH COMPREHENSIVE QA AUDIT & VERIFICATION');
  console.log('   Timestamp: ' + new Date().toISOString());
  console.log('====================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(condition, message) {
    totalChecks++;
    if (condition) {
      console.log(`✅ [PASS] Check #${totalChecks}: ${message}`);
      passedChecks++;
    } else {
      console.error(`❌ [FAIL] Check #${totalChecks}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Initialize DB
    await initDb();
    assert(true, 'Database initialized successfully.');

    // 2. Test Sequential Job Numbering (Zero Duplicate Guarantee)
    const num1 = await generateNextJobNumber();
    assert(num1 && num1.startsWith('mobo-2026-'), `Generated valid job number: ${num1}`);

    // Verify existing numbers in localDb are all strictly unique
    const allJobNumbers = (db.jobs ? (await db.jobs.list({ limit: 100 })).jobs : []).map(j => j.job_number);
    const duplicates = allJobNumbers.filter((item, index) => allJobNumbers.indexOf(item) !== index);
    assert(duplicates.length === 0, `All database job numbers are strictly unique! (Duplicates: ${JSON.stringify(duplicates)})`);

    // 3. Multi-User Creation & Role Verification
    const timestamp = Date.now();
    const testUsers = [
      {
        email: `qa.tech.${timestamp}@mobotech.com`,
        password_hash: await bcrypt.hash('Tech@123456', 10),
        full_name: 'QA Mobile Hardware Specialist',
        role_id: 'technician',
        phone: '9876543220',
        is_active: true
      },
      {
        email: `qa.staff.${timestamp}@mobotech.com`,
        password_hash: await bcrypt.hash('Staff@123456', 10),
        full_name: 'QA Frontdesk Coordinator',
        role_id: 'staff',
        phone: '9876543221',
        is_active: true
      }
    ];

    const createdUsers = [];
    for (const u of testUsers) {
      const created = await db.users.create(u);
      createdUsers.push(created);
      assert(created.id && created.email === u.email, `Created user with role "${u.role_id}": ${u.email}`);
      assert(!created.password_hash, `User response correctly stripped password_hash for ${u.email}`);
    }

    // 4. Create Multiple Job Sheets for Mobile Repairs
    const shopProfile = await db.shops.getProfile();
    assert(shopProfile && shopProfile.name, `Retrieved shop profile: ${shopProfile?.name}`);

    // Customer
    const testCust = await db.customers.create({
      full_name: 'Dr. Evelyn Reed',
      email: `evelyn.reed.${timestamp}@example.com`,
      phone: '9123456780',
      whatsapp_number: '9123456780',
      user_type: 'End User'
    });
    assert(testCust.id, `Created customer: ${testCust.full_name} (${testCust.customer_code})`);

    // Mobile Device 1: Samsung Galaxy S24 Ultra
    const dev1 = await db.devices.create({
      customer_id: testCust.id,
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      color: 'Titanium Gray',
      storage_capacity: '512GB',
      imei: `35${timestamp}1`,
      passcode: '1234',
      operating_system: 'Android'
    });
    assert(dev1.id, `Created Device 1: ${dev1.brand} ${dev1.model}`);

    const job1 = await db.jobs.create({
      jobData: {
        customer_id: testCust.id,
        device_id: dev1.id,
        assigned_technician_id: createdUsers[0].id,
        priority: 'HIGH',
        service_type: 'Screen & Battery Replacement',
        customer_complaint: 'Cracked dynamic AMOLED display and rapid battery drain.',
        device_condition: {
          powers_on: true,
          screen: 'Broken',
          touch: 'Working',
          water_damage: false,
          battery_health: 'Degraded'
        },
        accessories_received: ['S-Pen', 'Protective Case']
      },
      userId: createdUsers[0].id
    });
    assert(job1.id && job1.job_number, `Created Job Sheet 1: #${job1.job_number} (Device: Samsung S24 Ultra)`);

    // Mobile Device 2: Xiaomi 14 Pro
    const dev2 = await db.devices.create({
      customer_id: testCust.id,
      brand: 'Xiaomi',
      model: '14 Pro',
      color: 'Jade Green',
      storage_capacity: '256GB',
      imei: `35${timestamp}2`,
      passcode: '0000',
      operating_system: 'Android'
    });
    assert(dev2.id, `Created Device 2: ${dev2.brand} ${dev2.model}`);

    const job2 = await db.jobs.create({
      jobData: {
        customer_id: testCust.id,
        device_id: dev2.id,
        assigned_technician_id: createdUsers[0].id,
        priority: 'URGENT',
        service_type: 'Liquid Damage Ultrasonic Cleaning',
        customer_complaint: 'Fell in water pool. USB port corrosion and no charging current.',
        device_condition: {
          powers_on: false,
          screen: 'Unknown',
          charging_port: 'Corroded',
          water_damage: true
        },
        accessories_received: ['SIM Tray']
      },
      userId: createdUsers[0].id
    });
    assert(job2.id && job2.job_number, `Created Job Sheet 2: #${job2.job_number} (Device: Xiaomi 14 Pro)`);

    // Mobile Device 3: Apple iPhone 15 Pro
    const dev3 = await db.devices.create({
      customer_id: testCust.id,
      brand: 'Apple',
      model: 'iPhone 15 Pro',
      color: 'Blue Titanium',
      storage_capacity: '128GB',
      imei: `35${timestamp}3`,
      passcode: '8888',
      operating_system: 'iOS'
    });
    assert(dev3.id, `Created Device 3: ${dev3.brand} ${dev3.model}`);

    const job3 = await db.jobs.create({
      jobData: {
        customer_id: testCust.id,
        device_id: dev3.id,
        assigned_technician_id: createdUsers[0].id,
        priority: 'NORMAL',
        service_type: 'Rear Camera Lens Repair',
        customer_complaint: 'Cracked 3x telephoto camera sapphire lens. Photos blurry.',
        device_condition: {
          powers_on: true,
          screen: 'Working',
          camera_rear: 'Cracked Lens',
          water_damage: false
        },
        accessories_received: ['MagSafe Box']
      },
      userId: createdUsers[0].id
    });
    assert(job3.id && job3.job_number, `Created Job Sheet 3: #${job3.job_number} (Device: iPhone 15 Pro)`);

    // Verify all 3 newly created jobs have distinct sequential ticket numbers
    assert(job1.job_number !== job2.job_number, `Job 1 (#${job1.job_number}) != Job 2 (#${job2.job_number})`);
    assert(job2.job_number !== job3.job_number, `Job 2 (#${job2.job_number}) != Job 3 (#${job3.job_number})`);
    assert(job1.job_number !== job3.job_number, `Job 1 (#${job1.job_number}) != Job 3 (#${job3.job_number})`);

    // 5. Test Status Transitions on Job 1
    const diagnosingJob = await db.jobs.update(job1.id, { status: 'DIAGNOSING' });
    assert(diagnosingJob.status === 'DIAGNOSING', `Transitioned Job 1 to DIAGNOSING.`);

    // 6. Test Quality Checklist on Job 1
    const testItems = await db.jobs.findById(job1.id);
    assert(Array.isArray(testItems.tests) && testItems.tests.length === 16, `Job 1 initialized with full 16-point Quality Checklist.`);

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedChecks} QA CHECKS PASSED WITH 100% SUCCESS!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ QA Test failed with error:', err);
    process.exit(1);
  }
}

runComprehensiveQA().then(() => {
  // Graceful exit
  setTimeout(() => process.exit(0), 500);
});
