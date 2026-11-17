# DATABASE

Schema reference for the Supabase PostgreSQL database.

- **Canonical DDL:** `supabase/schema.sql` (31 tables)
- **Incremental migrations:** `server/src/db/migrations/001…004_*.sql`
- **Seed data:** `supabase/seed.sql`, plus `server/src/db/seedData.js` (runtime fallback)
- **No ORM** — access goes through the `db` façade in `server/src/db/db.js`

---

## 1. Entity-relationship overview

```
shops ─┬─< customers ─┬─< devices
       │              └─< repair_jobs ─┬─< job_status_history
       │                               ├─< diagnoses            (1:1)
       │                               ├─< repair_estimates ───< repair_estimate_items
       │                               ├─< repair_job_parts ──> parts
       │                               ├─< repair_job_labor
       │                               ├─< repair_tests
       │                               ├─< payments
       │                               ├─< invoices ───< invoice_items
       │                               ├─< attachments
       │                               ├─< notifications ───< notification_logs
       │                               └──< review_requests   (1:1)
       │
       ├─< parts ───< part_stock_movements
       ├─< sales                    (retail / GST invoices)
       ├─< backup_logs
       ├─< review_settings
       └─< dashboard_saved_views, dashboard_widget_preferences,
           dashboard_report_logs                    (migration 004)

roles ──< users ─┬─ repair_jobs.assigned_technician_id / created_by_user_id
                 ├─ payments.received_by_user_id
                 ├─ invoices.issued_by_user_id
                 ├─ sales.issued_by_user_id
                 └─ backup_logs.created_by_user_id

vendors ─┬─< vendor_transactions
         ├─< vendor_mobiles ───< vendor_status_history
         ├─< vendor_ledger
         └─< vendor_payments

recycle_bin   (standalone soft-delete store, polymorphic by entity_type)
```

`settings` is a standalone JSON key/value store used for shop profile extras,
notification config and dashboard-preference fallback.

---

## 2. Table catalogue

### Core identity
| # | Table | Purpose |
|---|---|---|
| 1 | `shops` | Shop profile: name, address, currency/symbol, tax number, warranty & terms text |
| 2 | `roles` | Seeded `admin`, `technician`, `staff` |
| 3 | `users` | Employees; bcrypt `password_hash`, `is_active`, `last_login_at` |

### Customers & devices
| # | Table | Purpose |
|---|---|---|
| 4 | `customers` | Directory: `customer_code` (unique), phone, WhatsApp, alternate contacts, gender, `user_type`, address |
| 5 | `devices` | `customer_id`, brand, model, colour, storage, IMEI, serial, passcode, OS, invoice/expiry dates |

### Repair lifecycle
| # | Table | Purpose |
|---|---|---|
| 6 | `repair_jobs` | **Central hub.** `job_number` (`mobo-YYYY-NNNN`), status, priority, `service_type`, `customer_complaint`, `device_condition` JSONB, `accessories_received` JSONB, financial cache (`subtotal`, `discount`, `tax`, `total_amount`, `paid_amount`, `balance_due`, `payment_status`), warranty/reopen fields, `approval_token` + `approval_status`, pickup/acceptance fields, `warranty_days` |
| 7 | `job_status_history` | Audit trail of every status transition (from/to, action title, user) |
| 8 | `diagnoses` | Reported complaint, findings, root cause, recommended fix |
| 11 | `repair_estimates` | Estimate with `labor_charge`, discount, tax, totals |
| 12 | `repair_estimate_items` | Line items (part, qty, unit price, warranty) |
| 13 | `repair_job_parts` | Parts physically installed |
| 14 | `repair_job_labor` | Billable labour lines |
| 15 | `repair_tests` | 16-point QC results (`PASS` / `FAIL` / `NOT_TESTED`) |

### Money
| # | Table | Purpose |
|---|---|---|
| 16 | `payments` | `payment_number`, job, amount, `payment_method` (CASH/CARD/UPI/BANK_TRANSFER/OTHER), `payment_status`, reference, `paid_at` |
| 17 | `invoices` | `invoice_number` (`INV-YYYY-NNNNNN`), job, parts/labour amounts, discount, tax, totals, `payment_status`, `warranty_period`, `pdf_url` |
| 18 | `invoice_items` | Itemised invoice charges (LABOR / PART) |
| 24 | `sales` | Retail & GST invoices; `items` JSONB, GST split (IGST / CGST+SGST), `payment_mode`, `payment_status`, bank details, terms |

### Inventory
| # | Table | Purpose |
|---|---|---|
| 9 | `parts` | `part_code`, name, brand, category, compatible models, `purchase_cost`, `selling_price`, `stock_quantity`, `minimum_stock`, status |
| 10 | `part_stock_movements` | Audit log of purchases, repair deductions, adjustments |

### Vendors (sub-contract)
| # | Table | Purpose |
|---|---|---|
| 25 | `vendors` | `vendor_code`, name, shop name, mobile, GST, `opening_balance`, `current_balance`, status |
| 26 | `vendor_transactions` | Send / receive / inward / return chalans (`txn_type`, totals, paid amount, parent txn) |
| 27 | `vendor_mobiles` | Each device at/from a vendor: `flow_type` (`SENT_TO_VENDOR` / `RECEIVED_FROM_VENDOR`), `current_status`, `estimated_cost`, `actual_cost`, `payment_status` |
| 28 | `vendor_status_history` | Movement audit per device |
| 29 | `vendor_ledger` | Double-entry book: `entry_type`, `debit`, `credit`, `running_balance` |
| 30 | `vendor_payments` | Payment vouchers: `PAYMENT_TO_VENDOR` / `PAYMENT_FROM_VENDOR`, amount, mode, reference |

### Communications & system
| # | Table | Purpose |
|---|---|---|
| 19 | `attachments` | Uploaded files per job (`file_type`, path, URL, size, MIME) |
| 20 | `notifications` | Notification records per job/customer |
| 21 | `notification_logs` | Delivery log: channel, provider, status, response, retry count |
| 22 | `settings` | JSON key/value (`shop_profile`, `notification_config`, `google_review_settings`, …) |
| 23 | `backup_logs` | Backup runs (status, timings, created_by) |
| 31 | `recycle_bin` | Soft-deleted records (`entity_type`, `original_id`, `data` JSONB, `purge_at` = +30 days) |

### Review assistant (migration 001)
| Table | Purpose |
|---|---|
| `review_settings` | Google review URL, enable flags, invitation channel/message, AI toggle |
| `review_requests` | One per job (`UNIQUE(job_id)`): `unique_token` + `unique_token_hash`, rating, feedback, generated/edited review, `ai_provider`, invitation status, timestamps |

### Dashboard (migration 004 — optional)
| Table | Purpose |
|---|---|
| `dashboard_saved_views` | Reusable filter presets (range + module focus) |
| `dashboard_widget_preferences` | Per-user widget layout / hidden widgets |
| `dashboard_report_logs` | Audit trail of generated PDF reports |

---

## 3. Key relationships & delete behaviour

| Relationship | Cardinality | On delete |
|---|---|---|
| `customers` → `devices` | 1 : N | `CASCADE` |
| `customers` → `repair_jobs` | 1 : N | `SET NULL` |
| `devices` → `repair_jobs` | 1 : N | `SET NULL` |
| `repair_jobs` → `job_status_history`, `repair_tests`, `repair_job_parts`, `payments`, `notifications` | 1 : N | `CASCADE` |
| `repair_jobs` → `invoices` | 1 : N | `RESTRICT` (invoice is a legal document) |
| `invoices` → `invoice_items` | 1 : N | `CASCADE` |
| `parts` → `repair_job_parts`, `part_stock_movements` | 1 : N | `SET NULL` |
| `vendors` → `vendor_transactions` | 1 : N | `CASCADE` |
| `vendors` → `vendor_mobiles` | 1 : N | `CASCADE` |
| `vendors` → `vendor_payments` | 1 : N | `RESTRICT` |
| `vendor_mobiles` → `vendor_status_history` | 1 : N | `CASCADE` |
| `repair_jobs` → `review_requests` | 1 : 1 | `CASCADE`, `UNIQUE(job_id)` |
| `roles` → `users` | 1 : N | `RESTRICT` |
| `users` → any `*_user_id` column | 1 : N | `SET NULL` |

### Numbering conventions
| Document | Format | Generator |
|---|---|---|
| Job sheet | `mobo-YYYY-NNNN` | `generateNextJobNumber()` |
| Repair invoice | `INV-YYYY-NNNNNN` | `generateNextInvoiceNumber()` |
| Sales invoice | `INV-YYYY-NNNNNN` (shared sequence with `sale.invoice_no_seq`) | `generateNextSaleInvoiceNumber()` |
| Payment | `PAY-YYYY-NNNNN` | inside `db.payments.create` |
| Vendor code | sequential | `generateNextVendorCode()` |
| Vendor transaction | sequential | `generateNextVendorTxnNumber()` |
| Vendor voucher | sequential | `generateNextVendorVoucherNumber()` |

Sales-invoice numbering deliberately scans **sales + invoices + recycle_bin +
Supabase** so a restored or deleted invoice can never be re-issued.

---

## 4. Status vocabularies

**Repair job** (`repair_jobs.status`):
`RECEIVED`, `DIAGNOSING`, `ESTIMATE_SENT`, `AWAITING_APPROVAL`, `APPROVED`,
`REJECTED`, `IN_PROGRESS`, `TESTING`, `READY_FOR_PICKUP`, `DELIVERED`,
`CANCELLED` (plus `RETURNED_UNREPAIRED` handled in code).

**Payment status** (`repair_jobs.payment_status`, `invoices`, `sales`):
`UNPAID`, `PARTIAL`, `PAID`.

**Payment method:** `CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `OTHER`.

**QC result** (`repair_tests`): `PASS`, `FAIL`, `NOT_TESTED`.

**Vendor flow:** `SENT_TO_VENDOR`, `RECEIVED_FROM_VENDOR` (legacy alias
`VENDOR_JOB_INWARD`).

**Vendor device status:** `PENDING`, `IN_REPAIR`, `WAITING_PARTS`,
`READY_FOR_RETURN`, `COMPLETED`, `RETURNED`, `CANCELLED`.

**Vendor payment type:** `PAYMENT_TO_VENDOR`, `PAYMENT_FROM_VENDOR`.

**Vendor ledger entry:** `REPAIR_CHARGE`, `PAYMENT_MADE`, `PAYMENT_RECEIVED`,
`OPENING_BALANCE`.

**Roles:** `admin`, `technician`, `staff`.

---

## 5. Running migrations

All migrations are **additive and idempotent** — safe to re-run, no data loss.

| File | Adds |
|---|---|
| `001_create_google_review_tables.sql` | `review_settings`, `review_requests` (+ RLS policies) |
| `002_add_warranty_to_parts.sql` | warranty columns on `parts` |
| `003_add_serial_and_imei_to_parts.sql` | serial/IMEI columns on `parts` |
| `004_create_dashboard_analytics_tables.sql` | `dashboard_saved_views`, `dashboard_widget_preferences`, `dashboard_report_logs` + 4 perf indexes |

**How to run** (Supabase → SQL Editor → paste file → Run), or:

```bash
psql "$DATABASE_URL" -f server/src/db/migrations/004_create_dashboard_analytics_tables.sql
```

Fresh install: run `supabase/schema.sql` then `supabase/seed.sql`, then 001–004.

> **Note:** migrations exist as SQL only; they are not auto-applied at boot.
> The app tolerates missing migration 004 (the dashboard reads existing tables),
> and migration 001 tables are guarded in code with fallbacks to `settings`.

---

## 6. Data-access patterns & caveats

- **`recycle_bin` is not mirrored** — it is excluded from `syncFromSupabase()`;
  read it live (`db.recycleBinStats.findAll()` or via the recycle-bin routes).
- **Sync limit is 3000 rows per table** — very large tables will be truncated in
  the mirror. Dashboard aggregates request up to 10 000 rows through repo
  `list()` calls, which query Supabase where possible.
- **`sales.items` is JSONB** — line items are not relationally queryable;
  aggregate by reading the array in app code.
- **`vendor_ledger` has no global list method** — use `getVendorStatement(id)`
  or `vendor_payments` for totals.
- **Soft delete first** — deletes write to `recycle_bin` with `data` JSONB
  snapshots so restores are lossless (auto-purged after 30 days).
