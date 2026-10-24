import { db, initDb } from '../db/db.js';

async function test() {
  await initDb();
  console.log('Testing db.customers.list()...');
  const custs = await db.customers.list({ limit: 5 });
  console.log('Customers count:', custs.total, 'Sample:', custs.customers[0]?.full_name);

  console.log('Testing db.repair_jobs.list()...');
  const jobs = await db.repair_jobs.list({ limit: 5 });
  console.log('Jobs count:', jobs.total, 'Sample:', jobs.jobs[0]?.job_number);

  console.log('Testing db.parts.list()...');
  const parts = await db.parts.list({ limit: 5 });
  console.log('Parts count:', parts.total, 'Sample:', parts.parts[0]?.name);
}

test().catch(console.error);
