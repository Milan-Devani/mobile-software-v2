-- ============================================================================
-- SEED DATA FOR MOBILE REPAIR MANAGEMENT SYSTEM
-- Default passwords:
-- Admin: Admin@123456 (bcrypt: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi is 'password' - let's use standard bcrypt for 'Admin@123456' which is $2b$10$rQ021L30Mh7hWzH6kPzCfu3jA6rLekYy1h6yQ1m5fFj7YyV/iR/0y)
-- We will also handle seeds in the server initialization code with real bcrypt hashing!
-- ============================================================================

-- 1. Default Shop
INSERT INTO shops (
    id, name, tagline, phone, email, address, city, state, postal_code, tax_number, website, currency, currency_symbol, warranty_terms
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Mobotech mobile care',
    'Expert Smartphone & Tablet Service Center',
    '080000 24439',
    'support@mobotech.com',
    'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar',
    'Surat',
    'Gujarat',
    '395006',
    '24ABCDE1234F1Z5',
    'https://mobotechcare.com',
    'INR',
    '₹',
    '90 days warranty on replaced screens & genuine components. Liquid damage voids warranty.'
) ON CONFLICT (id) DO NOTHING;

-- 2. System Settings
INSERT INTO settings (key, value, description) VALUES
('shop_profile', '{
    "shop_name": "Mobotech mobile care",
    "phone": "080000 24439",
    "email": "support@mobotech.com",
    "address": "Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar, Surat, Gujarat 395006",
    "tax_number": "24ABCDE1234F1Z5",
    "currency": "INR",
    "currency_symbol": "₹",
    "default_tax_rate": 18,
    "default_warranty_days": 90
}'::jsonb, 'General shop information'),
('notification_config', '{
    "email_enabled": true,
    "sms_enabled": true,
    "whatsapp_enabled": true,
    "brevo_configured": false,
    "msg91_configured": false,
    "openwa_configured": false
}'::jsonb, 'Notification channels configuration')
ON CONFLICT (key) DO NOTHING;

-- 3. Sample Initial Parts Inventory
INSERT INTO parts (id, part_code, name, brand, category, compatible_models, purchase_cost, selling_price, stock_quantity, minimum_stock, supplier, status) VALUES
('p0000000-0000-0000-0000-000000000001', 'PART-001', 'OLED Display Assembly (Original)', 'Apple', 'Display', 'iPhone 13, iPhone 14', 45.00, 119.00, 12, 3, 'iFixDirect Wholesale', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000002', 'PART-002', 'OLED Display Assembly (Original)', 'Apple', 'Display', 'iPhone 15, iPhone 15 Pro', 65.00, 169.00, 8, 2, 'iFixDirect Wholesale', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000003', 'PART-003', 'High Capacity Li-Ion Battery 3240mAh', 'Apple', 'Battery', 'iPhone 13', 14.50, 49.99, 15, 4, 'PowerCell Tech', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000004', 'PART-004', 'Lightning / USB-C Charging Port Board', 'Apple', 'Charging Port', 'iPhone 14 / iPhone 15', 9.00, 39.00, 20, 5, 'MicroParts Hub', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000005', 'PART-005', 'Dynamic AMOLED 2X Display (Original)', 'Samsung', 'Display', 'Galaxy S23, Galaxy S23 Ultra', 75.00, 189.00, 6, 2, 'Korea Tech Supply', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000006', 'PART-006', 'OEM Battery 5000mAh', 'Samsung', 'Battery', 'Galaxy S22 Ultra, Galaxy S23 Ultra', 16.00, 54.00, 10, 3, 'PowerCell Tech', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000007', 'PART-007', 'Main Rear Camera Module (48MP)', 'Apple', 'Camera', 'iPhone 14 Pro, iPhone 15 Pro', 38.00, 95.00, 5, 2, 'OpticsFix Labs', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000008', 'PART-008', 'Loudspeaker Buzzer Assembly', 'Universal', 'Speaker', 'Multiple iOS & Android Models', 5.00, 25.00, 25, 5, 'MicroParts Hub', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000009', 'PART-009', 'Rear Glass Housing Replacement', 'Apple', 'Housing', 'iPhone 13, iPhone 14 (Midnight)', 18.00, 59.00, 7, 2, 'GlassPro USA', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
