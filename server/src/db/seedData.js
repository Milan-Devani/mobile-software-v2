import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const createInitialSeedData = async () => {
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const techPasswordHash = await bcrypt.hash('Tech@123456', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123456', 10);

  const shopId = 'a0000000-0000-0000-0000-000000000001';
  const adminId = 'u0000000-0000-0000-0000-000000000001';
  const techId = 'u0000000-0000-0000-0000-000000000002';
  const staffId = 'u0000000-0000-0000-0000-000000000003';

  return {
    shops: [
      {
        id: shopId,
        name: 'Mobotech mobile care',
        tagline: 'Professional Smartphone & Tablet Repair Services',
        logo_url: '',
        phone: '080000 24439',
        email: 'support@mobotech.com',
        address: 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar',
        city: 'Surat',
        state: 'Gujarat',
        postal_code: '395006',
        country: 'India',
        tax_number: '24ABCDE1234F1Z5',
        website: 'https://mobotechcare.com',
        currency: 'INR',
        currency_symbol: '₹',
        warranty_terms: 'All repairs are covered by our standard 90-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.',
        terms_conditions: 'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to salvage regulations.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    roles: [
      { id: 'admin', name: 'Admin / Shop Owner', description: 'Full access to all system features and settings' },
      { id: 'technician', name: 'Technician', description: 'Diagnose devices, request parts, execute repairs, QC tests' },
      { id: 'staff', name: 'Shop Staff', description: 'Check-in, job sheets, customer pickup, payments' }
    ],
    users: [
      {
        id: adminId,
        role_id: 'admin',
        full_name: 'Shop Owner',
        email: 'admin@mobotech.com',
        password_hash: adminPasswordHash,
        phone: '080000 24439',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'u0000000-0000-0000-0000-000000000004',
        role_id: 'admin',
        full_name: 'Shop Owner (Legacy)',
        email: 'admin@fixitrepair.com',
        password_hash: adminPasswordHash,
        phone: '080000 24439',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: techId,
        role_id: 'technician',
        full_name: 'Lead Technician',
        email: 'tech@mobotech.com',
        password_hash: techPasswordHash,
        phone: '080000 24439',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: staffId,
        role_id: 'staff',
        full_name: 'Front Desk Staff',
        email: 'staff@mobotech.com',
        password_hash: staffPasswordHash,
        phone: '080000 24439',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    customers: [],
    devices: [],
    parts: [],
    repair_jobs: [],
    job_status_history: [],
    diagnoses: [],
    repair_estimates: [],
    repair_estimate_items: [],
    part_stock_movements: [],
    repair_job_parts: [],
    repair_job_labor: [],
    repair_tests: [],
    payments: [],
    invoices: [],
    invoice_items: [],
    attachments: [],
    notifications: [],
    notification_logs: [],
    settings: [
      {
        key: 'shop_profile',
        value: {
          shop_name: 'Mobotech mobile care',
          phone: '080000 24439',
          email: 'support@mobotech.com',
          address: 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar, Surat, Gujarat 395006',
          city: 'Surat',
          state: 'Gujarat',
          postal_code: '395006',
          country: 'India',
          tax_number: '24ABCDE1234F1Z5',
          currency: 'INR',
          currency_symbol: '₹',
          default_tax_rate: 18,
          default_warranty_days: 90
        },
        description: 'Shop profile and basic preferences',
        updated_at: new Date().toISOString()
      },
      {
        key: 'notification_config',
        value: {
          email_enabled: true,
          sms_enabled: true,
          whatsapp_enabled: true,
          brevo_configured: false,
          msg91_configured: false,
          openwa_configured: false
        },
        description: 'Notification channels and provider configurations',
        updated_at: new Date().toISOString()
      }
    ]
  };
};
