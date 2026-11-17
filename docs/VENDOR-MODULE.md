# VENDOR MODULE

Two-way sub-contract repair tracking with a double-entry ledger.

The shop both **sends devices out** to specialist vendors and **receives devices
in** from partner shops for repair. Both directions carry money — this document
explains exactly which table holds which amount.

---

## 1. Two flows

### Flow A — We send a device to a vendor (`SENT_TO_VENDOR`)

```
POST /api/vendors/transactions/send
        │
        ├── vendor_transactions  (master chalan, txn_type = SEND)
        ├── vendor_mobiles       (per device: flow_type = SENT_TO_VENDOR)
        └── vendor_ledger        (debit when a payment is made)
```

When the device comes back:

```
POST /api/vendors/transactions/receive
        │
        ├── vendor_transactions  (receive chalan: total_cost, paid_amount)
        ├── vendor_mobiles       (actual_cost + payment_status PAID/PENDING)
        ├── vendor_ledger        REPAIR_CHARGE (credit) — money we owe them
        └── vendor_payments      PAYMENT_TO_VENDOR (if paid at receive time)
```

**Money direction:** we **pay** the vendor.
Dashboard fields: `repairs_by_vendor_cost`, `paid_to_vendors`, `vendor_payable`.

### Flow B — A vendor sends us a device (`RECEIVED_FROM_VENDOR`)

```
POST /api/vendors/transactions/vendor-job-inward
        │
        ├── vendor_transactions  (txn_type = VENDOR_JOB_INWARD)
        ├── vendor_mobiles       (flow_type = RECEIVED_FROM_VENDOR)
        ├── vendor_ledger        (credit: we earned)
        └── vendor_payments      PAYMENT_FROM_VENDOR (advance, optional)
```

When we return the repaired device:

```
POST /api/vendors/transactions/vendor-job-return
        │
        ├── vendor_mobiles       (actual_cost = charge, payment_status)
        ├── vendor_ledger        REPAIR_CHARGE
        └── vendor_payments      PAYMENT_FROM_VENDOR (money received from them)
```

**Money direction:** the vendor **pays us**.
Dashboard fields: `vendor_job_revenue`, `received_from_vendors`,
`vendor_receivable`.

> Legacy alias: `VENDOR_JOB_INWARD` is treated as `RECEIVED_FROM_VENDOR` by the
> vendor list filter and by the dashboard.

---

## 2. Tables

| Table | Holds |
|---|---|
| `vendors` | Master: `vendor_code`, name, mobile, GST, `opening_balance`, `current_balance` |
| `vendor_transactions` | Chalans/trips: `txn_number`, `txn_type`, `total_mobiles`, `total_cost`, `paid_amount`, `payment_mode`, `parent_txn_id` |
| `vendor_mobiles` | One row per device: `flow_type`, `current_status`, `estimated_cost`, `actual_cost`, `payment_status`, `sent_date`, `received_date`, `returned_date`, `vendor_id` |
| `vendor_status_history` | Every status change (`previous_status`, `new_status`, `remarks`) |
| `vendor_ledger` | Double-entry book: `entry_type`, `debit`, `credit`, `running_balance`, `date` |
| `vendor_payments` | Payment vouchers: `voucher_no`, `payment_type`, `amount`, `payment_mode`, `reference_no`, `date` |

### Ledger sign convention

| Entry | Debit | Credit |
|---|---|---|
| `OPENING_BALANCE` | as configured | as configured |
| `REPAIR_CHARGE` | — | amount |
| `PAYMENT_MADE` (we paid the vendor) | amount | — |
| `PAYMENT_RECEIVED` (vendor paid us) | — | amount |

`vendor_reports.getSummary()` computes:

```
total_paid_to_vendors       = Σ vendor_payments.amount WHERE payment_type = 'PAYMENT_TO_VENDOR'
total_received_from_vendors = Σ vendor_payments.amount WHERE payment_type = 'PAYMENT_FROM_VENDOR'
```

`vendors.getStats()` computes `total_vendor_payable` / `total_vendor_receivable`
from each vendor's ledger balance (credit − debit).

---

## 3. Device statuses

`PENDING` → `IN_REPAIR` → `WAITING_PARTS` → `READY_FOR_RETURN` → `COMPLETED`
(closed as `RETURNED`), or `CANCELLED`.

```http
PATCH /api/vendors/mobiles/:id/status         { status, remarks }
PATCH /api/vendors/mobiles/:id/payment-status { payment_status: "PAID" | "PENDING" }
```

---

## 4. Payments

```http
POST /api/vendors/payments
{
  "vendor_id": "uuid",
  "payment_type": "PAYMENT_TO_VENDOR",   // or PAYMENT_FROM_VENDOR
  "amount": 5000,
  "payment_mode": "CASH",                // CASH | CARD | UPI | BANK_TRANSFER | OTHER
  "reference_no": "TXN123",
  "notes": "partial",
  "date": "2026-11-16"
}
```

A voucher automatically:
1. inserts into `vendor_payments` with a generated `voucher_no`;
2. writes the matching `vendor_ledger` entry (`PAYMENT_MADE` / `PAYMENT_RECEIVED`);
3. recalculates the vendor's `current_balance`.

---

## 5. How the dashboard consumes this

| Dashboard figure | Computation |
|---|---|
| `mobiles_sent` | count `vendor_mobiles` where `flow_type = SENT_TO_VENDOR` |
| `repairs_by_vendor_cost` | Σ `amount_of()` over sent mobiles |
| `paid_to_vendors` | Σ `vendor_payments` `PAYMENT_TO_VENDOR` (ledger fallback) |
| `vendor_payable` | `vendors.getStats().total_vendor_payable`, else Σ unpaid sent mobiles |
| `mobiles_received` | count where `flow_type ∈ {RECEIVED_FROM_VENDOR, VENDOR_JOB_INWARD}` |
| `vendor_job_revenue` | Σ `amount_of()` over received mobiles |
| `received_from_vendors` | Σ `vendor_payments` `PAYMENT_FROM_VENDOR` |
| `vendor_receivable` | `getStats().total_vendor_receivable`, else Σ unpaid received mobiles |
| `net_vendor_position` | (revenue + received) − (cost + paid) |
| `pending_devices_at_vendor` | `getStats().mobiles_currently_at_vendors` |

`amount_of(m)` = `actual_cost > 0 ? actual_cost : estimated_cost`.

---

## 6. Common gotchas

- **`vendor_mobiles.actual_cost` is often 0** for devices still out for repair.
  The dashboard therefore falls back to `estimated_cost`; other reports may show
  0 until the device is received and costed.
- **Expect ₹0 "Paid To Vendors"** until a `PAYMENT_TO_VENDOR` voucher exists.
  Receiving a device with no `paid_amount` creates the charge but not a payment.
- **`vendor_ledger` has no global list()** — use `getVendorStatement(id)`
  (per-vendor) or `vendor_payments` for aggregates.
- **Deleting a vendor cascades** to transactions, mobiles, status history and
  ledger; `vendor_payments` is `RESTRICT`ed, so remove vouchers first (or use the
  recycle bin, which snapshots data for lossless restore).
