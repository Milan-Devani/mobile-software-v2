-- ============================================================================
-- SEED: MULTIPLE SAMPLE DATASETS
-- ============================================================================
-- Project : Mobotech Mobile Care
-- Run AFTER RESET-all-data.sql
--
-- Creates a realistic, fully-linked dataset:
--   1 shop · 5 users · 3 vendors · 6 parts · 8 customers · 9 devices
--   10 repair jobs (every lifecycle stage) · invoices · payments
--   1 retail sale · stock movements · review records
--
-- LOGIN ACCOUNTS (password in brackets)
--   admin@mobotech.com     (Admin@123456)   → Admin / Owner
--   tech@mobotech.com      (Tech@123456)    → Lead Technician
--   tech2@mobotech.com     (Tech@123456)    → Technician
--   staff@mobotech.com     (Staff@123456)   → Front Desk
--   manager@mobotech.com   (Admin@123456)   → Admin
--
-- SAFE TO RE-RUN?  Yes — every insert uses ON CONFLICT DO NOTHING on fixed
-- UUIDs, so re-running will not duplicate rows.
--
-- IDs are hard-coded UUIDs so relationships are deterministic and readable.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. ROLES (reference data — inserted if the reset removed nothing)
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (id, name, description) VALUES
  ('admin',      'Admin / Shop Owner',      'Full administrative access'),
  ('technician', 'Technician',              'Diagnose, repair, QC testing'),
  ('staff',      'Shop Staff / Receptionist','Check-in, job sheets, payments')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1. SHOP
-- ---------------------------------------------------------------------------
INSERT INTO public.shops (
  id, name, tagline, logo_url, phone, email, address, city, state,
  postal_code, country, tax_number, website, currency, currency_symbol,
  warranty_terms, terms_conditions
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Mobotech mobile care',
  'Professional Smartphone & Tablet Repair Services',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Apple_logo_black.svg/120px-Apple_logo_black.svg.png',
  '080000 24439',
  'support@mobotech.com',
  'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar',
  'Surat', 'Gujarat', '395006', 'India',
  '24ABCDE1234F1Z5', 'https://mobotechcare.com', 'INR', '₹',
  'All repairs are covered by our standard 90-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.',
  'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to state salvage regulations.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. USERS  (bcrypt hashes generated with bcryptjs cost 10)
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, role_id, full_name, email, password_hash, phone, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin',      'Milan Devani',
   'admin@mobotech.com',
   '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO',
   '080000 24439', TRUE),

  ('10000000-0000-0000-0000-000000000002', 'technician', 'Rahul Patel',
   'tech@mobotech.com',
   '$2b$10$6l8WpKdtQMWEmUJcBTO5Y.LkHlrlh.n6f8EbmjtyT3TeTzWIsrirW',
   '9876500001', TRUE),

  ('10000000-0000-0000-0000-000000000003', 'staff',      'Priya Shah',
   'staff@mobotech.com',
   '$2b$10$nd.w13kHvhcFn0fkcB54dujgQna32CxiXo0TkQVX/LZ6sOVTmE6G.',
   '9876500002', TRUE),

  ('10000000-0000-0000-0000-000000000004', 'technician', 'Amit Desai',
   'tech2@mobotech.com',
   '$2b$10$6l8WpKdtQMWEmUJcBTO5Y.LkHlrlh.n6f8EbmjtyT3TeTzWIsrirW',
   '9876500003', TRUE),

  ('10000000-0000-0000-0000-000000000005', 'admin',      'Nisha Mehta',
   'manager@mobotech.com',
   '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO',
   '9876500004', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. PARTS CATALOG  (24 SKUs across common repair categories)
-- ---------------------------------------------------------------------------
INSERT INTO public.parts (id, shop_id, part_code, name, brand, category, compatible_models,
                          purchase_cost, selling_price, stock_quantity, minimum_stock, supplier, status) VALUES
  ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','PT-DSP-001','iPhone 13 Display Assembly (OLED)','Apple','Display','iPhone 13',6500,9500,8,2,'Shenzhen Mobile Parts','ACTIVE'),
  ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','PT-DSP-002','iPhone 14 Pro Display (120Hz)','Apple','Display','iPhone 14 Pro',12000,17500,4,2,'Shenzhen Mobile Parts','ACTIVE'),
  ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','PT-DSP-003','Samsung A54 AMOLED Display','Samsung','Display','Galaxy A54',3200,5200,10,3,'Delhi Spares Hub','ACTIVE'),
  ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','PT-BAT-001','iPhone 12 Battery (2815mAh)','Apple','Battery','iPhone 12',1100,2200,15,5,'Shenzhen Mobile Parts','ACTIVE'),
  ('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','PT-BAT-002','Samsung A54 Battery','Samsung','Battery','Galaxy A54',700,1500,3,5,'Delhi Spares Hub','LOW_STOCK'),
  ('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000001','PT-CHG-001','USB-C Charging Port Flex','Samsung','Charging Port','Galaxy A/S series',180,500,25,5,'Delhi Spares Hub','ACTIVE'),
  ('b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000001','PT-CHG-002','Lightning Charging Port Flex','Apple','Charging Port','iPhone 12/13',320,750,12,4,'Shenzhen Mobile Parts','ACTIVE'),
  ('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000001','PT-CAM-001','Rear Camera Module 48MP','Xiaomi','Camera','Redmi Note 13',900,1800,6,3,'Delhi Spares Hub','ACTIVE'),
  ('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000001','PT-SPK-001','Loudspeaker Buzzer','Apple','Speaker','iPhone 12/13',250,600,18,5,'Shenzhen Mobile Parts','ACTIVE'),
  ('b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000001','PT-MBD-001','Motherboard Logic Board (Refurb)','Samsung','Motherboard','Galaxy A54',5500,8500,2,2,'Mumbai Board Lab','ACTIVE'),
  ('b0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-000000000001','PT-GLS-001','Tempered Glass Screen Protector','Generic','Accessory','Universal 6.1"',40,250,60,20,'Local Supplier','ACTIVE'),
  ('b0000000-0000-0000-0000-00000000000c','a0000000-0000-0000-0000-000000000001','PT-ADP-001','20W USB-C Power Adapter','Apple','Accessory','Universal',650,1500,20,5,'Local Supplier','ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. VENDORS (specialist partners)
-- ---------------------------------------------------------------------------
INSERT INTO public.vendors (id, vendor_code, name, shop_name, mobile, whatsapp, address,
                            gst_number, opening_balance, current_balance, status) VALUES
  ('c0000000-0000-0000-0000-000000000001','VND-001','Harsh Trivedi','Chip Level Repair Lab',
   '9825000011','9825000011','Ring Road, Surat','24AAACS1234A1Z1',0,0,'ACTIVE'),
  ('c0000000-0000-0000-0000-000000000002','VND-002','Ronak Shah','Display Fix Experts',
   '9825000022','9825000022','Adajan, Surat','24AAACS5678B1Z2',0,0,'ACTIVE'),
  ('c0000000-0000-0000-0000-000000000003','VND-003','Jignesh Patel','Water Damage Specialists',
   '9825000033','9825000033','Katargam, Surat','24AAACS9012C1Z3',0,0,'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- `specialty` only exists after migration 005 — set it only when available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'specialty'
  ) THEN
    UPDATE public.vendors SET specialty = 'Motherboard / Chip-level'
      WHERE id = 'c0000000-0000-0000-0000-000000000001';
    UPDATE public.vendors SET specialty = 'Display / OLED lamination'
      WHERE id = 'c0000000-0000-0000-0000-000000000002';
    UPDATE public.vendors SET specialty = 'Water damage / Ultrasonic clean'
      WHERE id = 'c0000000-0000-0000-0000-000000000003';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. CUSTOMERS
-- ---------------------------------------------------------------------------
INSERT INTO public.customers (id, shop_id, customer_code, full_name, email, phone, whatsapp_number,
                              gender, user_type, address, city, state, postal_code, notes) VALUES
  ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','CUST-0001','Milan Devani','milandevani994@gmail.com','8758152507','8758152507','male','End User','Pasodara','Surat','Gujarat','395006','Regular customer'),
  ('d0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','CUST-0002','Sneha Joshi','sneha.joshi@example.com','9876500011','9876500011','female','End User','Varachha','Surat','Gujarat','395006','Prefers WhatsApp'),
  ('d0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','CUST-0003','Kiran Desai','kiran.desai@example.com','9876500012','9876500012','male','End User','Adajan','Surat','Gujarat','395009','Corporate account'),
  ('d0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','CUST-0004','Riya Patel','riya.patel@example.com','9876500013',NULL,'female','End User','Vesu','Surat','Gujarat','395007',NULL),
  ('d0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','CUST-0005','Arjun Mehta','arjun.mehta@example.com','9876500014','9876500014','male','End User','Katargam','Surat','Gujarat','395004','Walk-in'),
  ('d0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000001','CUST-0006','Pooja Shah','pooja.shah@example.com','9876500015',NULL,'female','Dealer','Ring Road','Surat','Gujarat','395002','Bulk buyer'),
  ('d0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000001','CUST-0007','Vikram Singh','vikram.singh@example.com','9876500016','9876500016','male','End User','Pal','Surat','Gujarat','395008',NULL),
  ('d0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000001','CUST-0008','Anjali Rana','anjali.rana@example.com','9876500017',NULL,'female','End User','Bhatar','Surat','Gujarat','395007','Repeat customer')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. DEVICES (one or more per customer)
-- ---------------------------------------------------------------------------
INSERT INTO public.devices (id, customer_id, brand, model, color, storage_capacity, imei,
                           serial_number, passcode, operating_system, cosmetic_condition) VALUES
  ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Apple','iPhone 13','Midnight','128GB','356789110011223','SN-iP13-0001','1234','iOS','Wear And Tear'),
  ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002','Samsung','Galaxy A54','Awesome Violet','256GB','356789110011224','SN-A54-0002','0000','Android','Good'),
  ('e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000003','Apple','iPhone 14 Pro','Deep Purple','256GB','356789110011225','SN-iP14P-0003','1998','iOS','Minor Scratches'),
  ('e0000000-0000-0000-0000-000000000004','d0000000-0000-0000-0000-000000000004','Xiaomi','Redmi Note 13','Ice Blue','128GB','356789110011226','SN-RN13-0004','7777','Android','Good'),
  ('e0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000005','Apple','iPhone 12','Blue','64GB','356789110011227','SN-iP12-0005','5555','iOS','Wear And Tear'),
  ('e0000000-0000-0000-0000-000000000006','d0000000-0000-0000-0000-000000000006','Samsung','Galaxy S23','Phantom Black','256GB','356789110011228','SN-S23-0006','1122','Android','Good'),
  ('e0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000007','OnePlus','Nord CE 3','Aqua Surge','128GB','356789110011229','SN-NORD-0007','3344','Android','Minor Scratches'),
  ('e0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-000000000008','Apple','iPhone 11','White','128GB','356789110011230','SN-iP11-0008','8899','iOS','Good'),
  ('e0000000-0000-0000-0000-000000000009','d0000000-0000-0000-0000-000000000001','Apple','iPad Air 5','Space Grey','64GB','356789110011231','SN-iPAD-0009','4321','iPadOS','Good')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. REPAIR JOBS  (10 jobs spanning every lifecycle stage)
-- ---------------------------------------------------------------------------
INSERT INTO public.repair_jobs (
  id, job_number, shop_id, customer_id, device_id, assigned_technician_id, created_by_user_id,
  status, priority, service_type, customer_complaint,
  subtotal, discount, discount_type, discount_value, tax_rate, tax_amount,
  total_amount, paid_amount, balance_due, payment_status,
  warranty_days, approval_token, approval_status, created_at
) VALUES
  -- 1. Fresh intake
  ('f0000000-0000-0000-0000-000000000001','mobo-2026-0001','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
   'RECEIVED','NORMAL','Display','Screen cracked after drop, touch not responding',
   0,0,'amount',0,18,0,0,0,0,'UNPAID',90,
   'aa000001-0000-0000-0000-000000000001','PENDING', NOW() - INTERVAL '1 day'),

  -- 2. Diagnosing
  ('f0000000-0000-0000-0000-000000000002','mobo-2026-0002','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
   'DIAGNOSING','HIGH','Battery','Battery drains within 2 hours',
   0,0,'amount',0,18,0,0,0,0,'UNPAID',90,
   'aa000001-0000-0000-0000-000000000002','PENDING', NOW() - INTERVAL '2 days'),

  -- 3. Estimate sent, awaiting customer approval
  ('f0000000-0000-0000-0000-000000000003','mobo-2026-0003','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
   'ESTIMATE_SENT','NORMAL','Display','Display has green line, needs replacement',
   17500,0,'amount',0,18,3150,20650,0,20650,'UNPAID',90,
   'aa000001-0000-0000-0000-000000000003','PENDING', NOW() - INTERVAL '3 days'),

  -- 4. Approved, ready to start
  ('f0000000-0000-0000-0000-000000000004','mobo-2026-0004','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003',
   'APPROVED','NORMAL','Camera','Rear camera not focusing after impact',
   1800,0,'amount',0,18,324,2124,0,2124,'UNPAID',90,
   'aa000001-0000-0000-0000-000000000004','APPROVED', NOW() - INTERVAL '4 days'),

  -- 5. In progress
  ('f0000000-0000-0000-0000-000000000005','mobo-2026-0005','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
   'IN_PROGRESS','HIGH','Battery','Battery health 68%, needs replacement',
   2200,0,'amount',0,18,396,2596,0,2596,'UNPAID',90,
   'aa000001-0000-0000-0000-000000000005','APPROVED', NOW() - INTERVAL '5 days'),

  -- 6. QC testing
  ('f0000000-0000-0000-0000-000000000006','mobo-2026-0006','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000006','e0000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003',
   'TESTING','NORMAL','Charging Port','Phone not charging with any cable',
   500,0,'amount',0,18,90,590,0,590,'UNPAID',90,
   'aa000001-0000-0000-0000-000000000006','APPROVED', NOW() - INTERVAL '6 days'),

  -- 7. Ready for pickup
  ('f0000000-0000-0000-0000-000000000007','mobo-2026-0007','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000007','e0000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
   'READY_FOR_PICKUP','NORMAL','Speaker','Loudspeaker distorted on calls',
   600,0,'amount',0,18,108,708,0,708,'UNPAID',90,
   'aa000001-0000-0000-0000-000000000007','APPROVED', NOW() - INTERVAL '7 days'),

  -- 8. Delivered & fully paid
  ('f0000000-0000-0000-0000-000000000008','mobo-2026-0008','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000008','e0000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
   'DELIVERED','NORMAL','Battery','Battery swelling, phone shutting down',
   2200,0,'amount',0,18,396,2596,2596,0,'PAID',90,
   'aa000001-0000-0000-0000-000000000008','APPROVED', NOW() - INTERVAL '12 days'),

  -- 9. Delivered with partial payment (balance due)
  ('f0000000-0000-0000-0000-000000000009','mobo-2026-0009','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003',
   'DELIVERED','LOW','Display','iPad screen scratched, replacement requested',
   5200,200,'amount',200,18,900,5900,3000,2900,'PARTIAL',90,
   'aa000001-0000-0000-0000-000000000009','APPROVED', NOW() - INTERVAL '15 days'),

  -- 10. Cancelled
  ('f0000000-0000-0000-0000-00000000000a','mobo-2026-0010','a0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
   'CANCELLED','NORMAL','Motherboard','Liquid damage, board repair quoted',
   8500,0,'amount',0,18,1530,10030,0,0,'UNPAID',90,
   'aa000001-0000-0000-0000-00000000000a','PENDING', NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. JOB STATUS HISTORY (timeline entries)
-- ---------------------------------------------------------------------------
INSERT INTO public.job_status_history (id, job_id, from_status, to_status, action_title, notes,
                                       performed_by_user_id, created_at) VALUES
  ('11000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day'),
  ('11000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '2 days'),
  ('11000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000002','RECEIVED','DIAGNOSING','Diagnosis Started','Technician opened device','10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),
  ('11000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000003',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '3 days'),
  ('11000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000003','DIAGNOSING','ESTIMATE_SENT','Estimate Sent','Quote sent to customer','10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days' + INTERVAL '5 hours'),
  ('11000000-0000-0000-0000-000000000006','f0000000-0000-0000-0000-000000000004',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days'),
  ('11000000-0000-0000-0000-000000000007','f0000000-0000-0000-0000-000000000004','ESTIMATE_SENT','APPROVED','Customer Approved','Approved online','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days' + INTERVAL '6 hours'),
  ('11000000-0000-0000-0000-000000000008','f0000000-0000-0000-0000-000000000005',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '5 days'),
  ('11000000-0000-0000-0000-000000000009','f0000000-0000-0000-0000-000000000005','APPROVED','IN_PROGRESS','Repair Started','Battery being replaced','10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days' + INTERVAL '3 hours'),
  ('11000000-0000-0000-0000-00000000000a','f0000000-0000-0000-0000-000000000006',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '6 days'),
  ('11000000-0000-0000-0000-00000000000b','f0000000-0000-0000-0000-000000000006','IN_PROGRESS','TESTING','QC Testing','Running 16-point checklist','10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days' + INTERVAL '4 hours'),
  ('11000000-0000-0000-0000-00000000000c','f0000000-0000-0000-0000-000000000007',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '7 days'),
  ('11000000-0000-0000-0000-00000000000d','f0000000-0000-0000-0000-000000000007','TESTING','READY_FOR_PICKUP','Ready for Pickup','Customer notified','10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '7 days' + INTERVAL '8 hours'),
  ('11000000-0000-0000-0000-00000000000e','f0000000-0000-0000-0000-000000000008',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 days'),
  ('11000000-0000-0000-0000-00000000000f','f0000000-0000-0000-0000-000000000008','READY_FOR_PICKUP','DELIVERED','Device Delivered','Customer collected & paid','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '10 days'),
  ('11000000-0000-0000-0000-000000000010','f0000000-0000-0000-0000-000000000009',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '15 days'),
  ('11000000-0000-0000-0000-000000000011','f0000000-0000-0000-0000-000000000009','READY_FOR_PICKUP','DELIVERED','Device Delivered','Partially paid, balance due','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '13 days'),
  ('11000000-0000-0000-0000-000000000012','f0000000-0000-0000-0000-00000000000a',NULL,'RECEIVED','Job Sheet Created','Device checked in','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '20 days'),
  ('11000000-0000-0000-0000-000000000013','f0000000-0000-0000-0000-00000000000a','DIAGNOSING','CANCELLED','Job Cancelled','Customer declined repair','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '19 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. DIAGNOSES
-- ---------------------------------------------------------------------------
INSERT INTO public.diagnoses (id, job_id, reported_issue, technician_findings, root_cause,
                              recommended_solution, diagnosed_by_user_id, created_at) VALUES
  ('12000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002','Battery drains within 2 hours','Battery health 61%, slight swelling','Degraded lithium cell','Replace battery assembly','10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
  ('12000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000003','Display has green line','OLED panel delamination along edge','Pressure damage','Replace full display assembly','10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days'),
  ('12000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000004','Rear camera not focusing','OIS motor jammed after drop','Impact damage','Replace rear camera module','10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '4 days'),
  ('12000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000005','Battery health 68%','Cycle count 812, capacity 68%','Normal wear','Replace battery assembly','10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days'),
  ('12000000-0000-0000-0000-000000000006','f0000000-0000-0000-0000-000000000006','Phone not charging','Charging port flex torn','Physical damage','Replace charging port flex','10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. ESTIMATES + ITEMS
-- ---------------------------------------------------------------------------
INSERT INTO public.repair_estimates (id, job_id, labor_charge, parts_subtotal,
                                     discount_type, discount_value, tax_rate, tax_amount,
                                     total_amount, status, notes, created_by_user_id) VALUES
  ('13000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000003',0,17500,'amount',0,18,3150,20650,'SENT','Display replacement quote','10000000-0000-0000-0000-000000000002'),
  ('13000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000004',0,1800,'amount',0,18,324,2124,'SENT','Camera module replacement','10000000-0000-0000-0000-000000000004'),
  ('13000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000005',0,2200,'amount',0,18,396,2596,'SENT','Battery replacement','10000000-0000-0000-0000-000000000002'),
  ('13000000-0000-0000-0000-000000000006','f0000000-0000-0000-0000-000000000006',0,500,'amount',0,18,90,590,'SENT','Charging port flex','10000000-0000-0000-0000-000000000004'),
  ('13000000-0000-0000-0000-000000000007','f0000000-0000-0000-0000-000000000007',0,600,'amount',0,18,108,708,'SENT','Speaker replacement','10000000-0000-0000-0000-000000000002'),
  ('13000000-0000-0000-0000-000000000008','f0000000-0000-0000-0000-000000000008',0,2200,'amount',0,18,396,2596,'APPROVED','Battery replacement','10000000-0000-0000-0000-000000000002'),
  ('13000000-0000-0000-0000-000000000009','f0000000-0000-0000-0000-000000000009',0,5200,'amount',200,18,900,5900,'APPROVED','iPad display replacement','10000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.repair_estimate_items (id, estimate_id, part_id, item_name, quantity,
                                          unit_price, total_price, warranty) VALUES
  ('14000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000002','iPhone 14 Pro Display (120Hz)',1,17500,17500,'90 Days'),
  ('14000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000008','Rear Camera Module 48MP',1,1800,1800,'90 Days'),
  ('14000000-0000-0000-0000-000000000003','13000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000004','iPhone 12 Battery (2815mAh)',1,2200,2200,'90 Days'),
  ('14000000-0000-0000-0000-000000000004','13000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000006','USB-C Charging Port Flex',1,500,500,'90 Days'),
  ('14000000-0000-0000-0000-000000000005','13000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000009','Loudspeaker Buzzer',1,600,600,'90 Days'),
  ('14000000-0000-0000-0000-000000000006','13000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000004','iPhone 12 Battery (2815mAh)',1,2200,2200,'90 Days'),
  ('14000000-0000-0000-0000-000000000007','13000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000001','iPhone 13 Display Assembly (OLED)',1,5200,5200,'90 Days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. PAYMENTS
-- ---------------------------------------------------------------------------
INSERT INTO public.payments (id, payment_number, job_id, customer_id, amount, payment_method,
                             payment_status, transaction_reference, received_by_user_id, notes, paid_at) VALUES
  ('15000000-0000-0000-0000-000000000001','PAY-2026-00001','f0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-000000000008',2596,'CASH','COMPLETED','','10000000-0000-0000-0000-000000000003','Full payment at pickup', NOW() - INTERVAL '10 days'),
  ('15000000-0000-0000-0000-000000000002','PAY-2026-00002','f0000000-0000-0000-0000-000000000009','d0000000-0000-0000-0000-000000000001',3000,'UPI','COMPLETED','UPI-9988776655','10000000-0000-0000-0000-000000000003','Part payment, balance 2900', NOW() - INTERVAL '13 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. INVOICES + ITEMS (for the two delivered jobs)
-- ---------------------------------------------------------------------------
INSERT INTO public.invoices (id, invoice_number, job_id, customer_id, shop_id, subtotal,
                             labor_amount, parts_amount, discount, discount_type, discount_value,
                             tax_rate, tax_amount, total_amount, paid_amount, balance_due,
                             payment_status, warranty_period, notes, issued_by_user_id, issued_at) VALUES
  ('16000000-0000-0000-0000-000000000001','INV-2026-000001','f0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000001',
   2200,0,2200,0,'amount',0,18,396,2596,2596,0,'PAID','90 Days Hardware Warranty',
   'Thank you for choosing Mobotech mobile care!','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '10 days'),
  ('16000000-0000-0000-0000-000000000002','INV-2026-000002','f0000000-0000-0000-0000-000000000009','d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',
   5200,0,5200,200,'amount',200,18,900,5900,3000,2900,'PARTIAL','90 Days Hardware Warranty',
   'Balance due on iPad display replacement','10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '13 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invoice_items (id, invoice_id, item_type, item_name, quantity, unit_price, total_price) VALUES
  ('17000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','PART','iPhone 12 Battery (2815mAh)',1,2200,2200),
  ('17000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000002','PART','iPhone 13 Display Assembly (OLED)',1,5200,5200)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. RETAIL SALE (walk-in counter sale)
-- ---------------------------------------------------------------------------
INSERT INTO public.sales (id, invoice_number, invoice_no_seq, invoice_date, customer_name,
                          customer_phone, customer_email, customer_address, place_of_supply,
                          items, subtotal, discount_type, discount_value, discount_amount,
                          taxable_amount, gst_enabled, gst_type, gst_rate,
                          cgst_rate, cgst_amount, sgst_rate, sgst_amount, total_tax, total_amount,
                          payment_mode, payment_status, issued_by_user_id, issued_by_name, notes) VALUES
  ('18000000-0000-0000-0000-000000000001','INV-2026-000003',3, CURRENT_DATE, 'Pooja Shah',
   '9876500015','pooja.shah@example.com','Ring Road, Surat','Gujarat',
   '[{"sr_no":1,"name":"Tempered Glass Screen Protector","item_type":"ACCESSORY","quantity":2,"rate":250,"taxable_value":500,"gst_rate":18,"line_total":590},{"sr_no":2,"name":"20W USB-C Power Adapter","item_type":"ACCESSORY","quantity":1,"rate":1500,"taxable_value":1500,"gst_rate":18,"line_total":1770}]'::jsonb,
   2000,'amount',0,0,2000,TRUE,'CGST_SGST',18,
   9,180,9,180,360,2360,
   'CASH','PAID','10000000-0000-0000-0000-000000000003','Priya Shah','Counter sale')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. VENDOR DEVICES (one currently out for repair)
-- ---------------------------------------------------------------------------
INSERT INTO public.vendor_mobiles (id, vendor_id, flow_type, brand, model, imei,
                                   customer_name, repair_problem, condition, estimated_cost, actual_cost,
                                   repair_result, current_status, sent_date, notes) VALUES
  ('19000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
   'SENT_TO_VENDOR','Apple','iPhone 14 Pro','356789110011225','Kiran Desai',
   'Display green line - needs OLED lamination','Minor Scratches',17500,0,'PENDING','IN_REPAIR',
   CURRENT_DATE - 2,'Sent for display lamination'),
  ('19000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
   'SENT_TO_VENDOR','Samsung','Galaxy S23','356789110011228','Pooja Shah',
   'Board-level repair needed','Good',5500,0,'PENDING','IN_REPAIR',
   CURRENT_DATE - 4,'Chip-level diagnosis')
ON CONFLICT (id) DO NOTHING;

-- Link the first vendor device to a repair job (column exists only after migration 005)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_mobiles' AND column_name = 'repair_job_id'
  ) THEN
    UPDATE public.vendor_mobiles
       SET repair_job_id = 'f0000000-0000-0000-0000-000000000003'
     WHERE id = '19000000-0000-0000-0000-000000000001';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 15. SETTINGS (shop profile + notification config + review assistant)
-- ---------------------------------------------------------------------------
INSERT INTO public.settings (key, value, description) VALUES
  ('shop_profile', '{"shop_name":"Mobotech mobile care","phone":"080000 24439","email":"support@mobotech.com","address":"Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar, Surat, Gujarat 395006","city":"Surat","state":"Gujarat","postal_code":"395006","country":"India","tax_number":"24ABCDE1234F1Z5","currency":"INR","currency_symbol":"₹","default_tax_rate":18,"default_warranty_days":90}'::jsonb, 'Shop profile and preferences'),
  ('notification_config', '{"email_enabled":true,"sms_enabled":false,"whatsapp_enabled":true}'::jsonb, 'Notification channels'),
  ('google_review_settings', '{"google_review_url":"https://g.page/r/CROHWMY3TX9dEBM/review","is_enabled":true,"invitation_channel":"WHATSAPP","ai_enabled":true}'::jsonb, 'Google Review Assistant')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ============================================================================
-- SEED COMPLETE
--   5 users · 12 parts · 3 vendors · 8 customers · 9 devices · 10 jobs
--   19 timeline entries · 5 diagnoses · 7 estimates + 7 items
--   2 payments · 2 invoices + 2 items · 1 sale · 2 vendor devices
--
--   Login: admin@mobotech.com / Admin@123456
-- ============================================================================








