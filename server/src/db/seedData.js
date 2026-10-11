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
        name: 'TechFix Pro Repairs',
        tagline: 'Professional Smartphone & Tablet Repair Services',
        logo_url: '',
        phone: '+1 (555) 789-0123',
        email: 'support@techfixpro.com',
        address: '742 Evergreen Terrace, Suite 12',
        city: 'Springfield',
        state: 'OR',
        postal_code: '97477',
        country: 'USA',
        tax_number: 'TX-98745612',
        website: 'https://techfixpro.example.com',
        currency: 'USD',
        currency_symbol: '$',
        warranty_terms: 'All repairs are covered by our standard 90-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.',
        terms_conditions: 'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to state salvage regulations.',
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
        full_name: 'Alex Mercer (Owner)',
        email: 'admin@fixitrepair.com',
        password_hash: adminPasswordHash,
        phone: '+1 (555) 789-0101',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: techId,
        role_id: 'technician',
        full_name: 'Marcus Vance (Lead Tech)',
        email: 'tech@fixitrepair.com',
        password_hash: techPasswordHash,
        phone: '+1 (555) 789-0102',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: staffId,
        role_id: 'staff',
        full_name: 'Elena Rostova (Front Desk)',
        email: 'staff@fixitrepair.com',
        password_hash: staffPasswordHash,
        phone: '+1 (555) 789-0103',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    customers: [
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        shop_id: shopId,
        customer_code: 'CUST-0001',
        full_name: 'David Miller',
        email: 'david.miller@example.com',
        phone: '+1 (555) 432-1098',
        whatsapp_number: '+1 (555) 432-1098',
        address: '124 Maple Street',
        city: 'Springfield',
        state: 'OR',
        postal_code: '97477',
        notes: 'Frequent customer, prefers WhatsApp notifications',
        created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'c0000000-0000-0000-0000-000000000002',
        shop_id: shopId,
        customer_code: 'CUST-0002',
        full_name: 'Sarah Connor',
        email: 'sarah.connor@example.com',
        phone: '+1 (555) 876-5432',
        whatsapp_number: '+1 (555) 876-5432',
        address: '458 Highland Park Way',
        city: 'Springfield',
        state: 'OR',
        postal_code: '97477',
        notes: 'Requested urgent repair turnaround',
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    devices: [
      {
        id: 'd0000000-0000-0000-0000-000000000001',
        customer_id: 'c0000000-0000-0000-0000-000000000001',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        color: 'Space Black',
        storage_capacity: '256GB',
        imei: '356987123456789',
        serial_number: 'F2LLQ89NMD6T',
        passcode: '2580',
        operating_system: 'iOS 17.5',
        created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'd0000000-0000-0000-0000-000000000002',
        customer_id: 'c0000000-0000-0000-0000-000000000002',
        brand: 'Samsung',
        model: 'Galaxy S23 Ultra',
        color: 'Phantom Black',
        storage_capacity: '512GB',
        imei: '358941098765432',
        serial_number: 'R5CW109KXYZ',
        passcode: '1234',
        operating_system: 'Android 14',
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    parts: [
      {
        id: 'p0000000-0000-0000-0000-000000000001',
        shop_id: shopId,
        part_code: 'PART-001',
        name: 'OLED Display Assembly (Original)',
        part_number: 'DSP-IP14P-BLK',
        brand: 'Apple',
        category: 'Display',
        compatible_models: 'iPhone 14 Pro',
        purchase_cost: 65.00,
        selling_price: 159.00,
        stock_quantity: 8,
        minimum_stock: 2,
        supplier: 'iFixDirect Wholesale',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p0000000-0000-0000-0000-000000000002',
        shop_id: shopId,
        part_code: 'PART-002',
        name: 'High Capacity Li-Ion Battery 3200mAh',
        part_number: 'BAT-IP14P',
        brand: 'Apple',
        category: 'Battery',
        compatible_models: 'iPhone 14, iPhone 14 Pro',
        purchase_cost: 16.00,
        selling_price: 49.00,
        stock_quantity: 14,
        minimum_stock: 4,
        supplier: 'PowerCell Tech',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p0000000-0000-0000-0000-000000000003',
        shop_id: shopId,
        part_code: 'PART-003',
        name: 'Dynamic AMOLED 2X Display + Frame',
        part_number: 'DSP-S23U-BLK',
        brand: 'Samsung',
        category: 'Display',
        compatible_models: 'Galaxy S23 Ultra',
        purchase_cost: 85.00,
        selling_price: 199.00,
        stock_quantity: 5,
        minimum_stock: 2,
        supplier: 'Korea Tech Supply',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p0000000-0000-0000-0000-000000000004',
        shop_id: shopId,
        part_code: 'PART-004',
        name: 'OEM USB-C Fast Charging Port Sub-Board',
        part_number: 'PRT-S23U-USB',
        brand: 'Samsung',
        category: 'Charging Port',
        compatible_models: 'Galaxy S23 Ultra, Galaxy S23+',
        purchase_cost: 11.00,
        selling_price: 39.00,
        stock_quantity: 18,
        minimum_stock: 5,
        supplier: 'MicroParts Hub',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p0000000-0000-0000-0000-000000000005',
        shop_id: shopId,
        part_code: 'PART-005',
        name: 'Triple Camera Glass Lens Protector Cover',
        part_number: 'GLS-CAM-IP14P',
        brand: 'Apple',
        category: 'Camera',
        compatible_models: 'iPhone 14 Pro, iPhone 14 Pro Max',
        purchase_cost: 4.50,
        selling_price: 24.99,
        stock_quantity: 25,
        minimum_stock: 5,
        supplier: 'OpticsFix Labs',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
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
          shop_name: 'TechFix Pro Repairs',
          phone: '+1 (555) 789-0123',
          email: 'support@techfixpro.com',
          address: '742 Evergreen Terrace, Suite 12, Springfield, OR 97477',
          tax_number: 'TX-98745612',
          currency: 'USD',
          currency_symbol: '$',
          default_tax_rate: 8.25,
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
