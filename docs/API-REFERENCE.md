# API REFERENCE

Base URL: `http://localhost:5050/api` (configure `VITE_API_URL` for the client).

**Conventions**

- All successful responses: `{ "success": true, "data": { ... }, "message"?: "..." }`
- All errors: `{ "success": false, "message": "...", "code": "ERROR_CODE", "errors"?: [] }`
- Auth: `Authorization: Bearer <JWT>` header (except routes marked **public**)
- Roles: `admin` · `technician` · `staff` (see role column)
- Pagination: `?limit=&offset=` (defaults 50/0) — response includes `total`

---

## 1. Auth — `/api/auth`
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/login` | public (rate-limited) | Email + password → JWT. Body: `{ email, password, rememberMe? }`. Returns `{ token, user }` |
| GET | `/me` | any | Current user profile |
| GET | `/users` | admin | List users |
| POST | `/users` | admin | Create user `{ email, password, full_name, role_id, phone? }` |
| POST | `/users/bulk-delete` | admin | Body `{ ids: [] }` |
| DELETE | `/users/:id` | admin | Delete (cannot delete self) |

---

## 2. Customers — `/api/customers`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | any | List (search, date range, pagination) |
| GET | `/:id` | any | Customer + devices + jobs |
| POST | `/` | any | Create customer |
| PUT | `/:id` | any | Update customer |
| DELETE | `/:id` | any | Soft delete → recycle bin |
| POST | `/bulk-delete` | any | Body `{ ids: [] }` |

---

## 3. Repair Jobs — `/api/jobs`

### Public (no login)
| Method | Path | Purpose |
|---|---|---|
| GET | `/public/approval/:tokenOrJobNumber` | Customer approval page data |
| POST | `/public/approval/:tokenOrJobNumber` | `{ decision: 'APPROVED'\|'REJECTED', reason? }` |
| GET | `/public/:jobId/download-jobsheet-pdf` | Printable job sheet |

### Protected
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | any | List — `status, customerId, technicianId, search, startDate, endDate, sortBy, sortDir, limit, offset` |
| GET | `/:id` | any | Full job graph (customer, device, technician, diagnosis, estimate+items, parts, labour, tests, payments, invoice, attachments, history) |
| POST | `/` | staff/admin | Create job sheet (auto `mobo-YYYY-NNNN` + approval token) |
| PUT | `/:id` | any | Update job |
| DELETE | `/:id` | any | Soft delete |
| POST | `/bulk-delete` | any | `{ ids: [] }` |
| POST | `/bulk-status` | any | `{ ids: [], status, notes? }` |
| GET | `/:jobId/download-jobsheet-pdf` | any | Job sheet PDF |

### Lifecycle transitions
| Method | Path | Access | Effect |
|---|---|---|---|
| POST | `/:id/start-diagnosis` | tech/admin | → `DIAGNOSING` |
| POST | `/:id/diagnosis` | tech/admin | Save diagnosis |
| POST | `/:id/estimate` | tech/admin | Save estimate → `ESTIMATE_SENT` |
| POST | `/:id/start-repair` | tech/admin | → `IN_PROGRESS`, deduct parts |
| POST | `/:id/complete-repair` | tech/admin | → `TESTING` |
| POST | `/:id/testing` | tech/admin | Save 16-point QC `{ tests }` |
| POST | `/:id/ready-for-pickup` | tech/admin | → `READY_FOR_PICKUP` |
| POST | `/:id/pickup` | staff/admin | → `DELIVERED` + generate invoice |
| POST | `/:id/cancel` | staff/admin | → `CANCELLED` `{ reason }` |
| POST | `/:id/reopen` | staff/admin | Reopen delivered job |
| POST/PUT | `/:id/status` | staff/admin | Manual status change |
| POST | `/:id/discount` | staff/admin | `{ discount_type, discount_value, notes? }` |
| POST/PATCH | `/:id/final-cost` | staff/admin | `{ final_cost, notes? }` |

### Warranty
| Method | Path | Access |
|---|---|---|
| POST | `/:id/warranty-authorize` | staff/admin |
| POST/PATCH | `/:id/warranty-details` | staff/admin |
| PUT/POST | `/:id/warranty-parts` | tech/admin |
| DELETE | `/:id/warranty-parts/:partId` | tech/admin |

---

## 4. Parts — `/api/parts`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | any | List (`category, search, lowStockOnly, startDate, endDate`) |
| GET | `/:id` | any | Part detail |
| POST | `/` | any | Create part |
| PUT | `/:id` | any | Update part |
| POST | `/:id/adjust-stock` | any | `{ quantity, movement_type, notes }` |
| DELETE | `/:id` | any | Delete |
| POST | `/bulk-delete` | any | `{ ids: [] }` |
| GET | `/categories` | any | Distinct categories |
| POST | `/categories` | any | Create category |
| DELETE | `/categories/:name` | any | Delete category |
| POST | `/categories/bulk-delete` | any | `{ names: [] }` |

---

## 5. Payments — `/api/payments`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | any | List all payments |
| GET | `/job/:jobId` | any | Payments for a job |
| POST | `/` | any | `{ jobId, amount, paymentMethod, transactionReference?, notes?, finalTotalAmount? }` — recalculates `paid_amount` / `balance_due` / `payment_status` |
| DELETE | `/:id` | any | Delete payment |
| POST | `/bulk-delete` | any | `{ ids: [] }` |

---

## 6. Invoices — `/api/invoices`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/job/:jobId` | any | Invoice for a job |
| POST | `/job/:jobId/generate` | any | Generate / regenerate invoice |
| POST | `/job/:jobId/resend` | any | Re-send invoice notifications |
| GET | `/job/:jobId/download-pdf` | any | Invoice PDF |
| GET | `/public/:jobId/download-pdf` | **public** | Customer invoice PDF |

---

## 7. Sales & Invoicing — `/api/sales`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | any | List sales (`search, status, sortBy, sortDir, startDate, endDate`) |
| GET | `/next-number` | any | Preview next invoice number |
| GET | `/:id` | any | Sale detail |
| POST | `/` | any | Create GST/retail invoice — body: `customer_name, customer_phone, customer_email?, customer_address?, place_of_supply?, customer_gstin?, items: [{ name, quantity, rate, item_type, imei?, warranty?, hsn? }], gst_enabled?, gst_type?, gst_rate?, discount_type?, discount_value?, payment_mode?, invoice_date?, notes?` |
| POST | `/:id/send-invoice` | any | Send invoice (WhatsApp/email) |
| GET | `/:id/download-pdf` | any | Sales invoice PDF |
| GET | `/public/:id/download-pdf` | **public** | Customer copy |
| DELETE | `/:id` | any | Soft delete |
| POST | `/bulk-delete` | any | `{ ids: [] }` |

> `createSale` decrements part stock automatically for `item_type: PART`.

---

## 8. Vendor module — `/api/vendors`

| Method | Path | Purpose |
|---|---|---|
| GET | `/stats` | Aggregate vendor KPIs (counts, payable/receivable) |
| GET | `/next-number` | Next transaction number |
| GET | `/reports/summary` | Report summary (`startDate`, `endDate`) |
| GET | `/` | List vendors (`search, status, date range`) |
| POST | `/` | Create vendor |
| GET | `/:id` | Vendor detail |
| PUT | `/:id` | Update vendor |
| DELETE | `/:id` | Delete (cascades ledger/mobiles) |
| POST | `/bulk-delete` | `{ ids: [] }` |
| GET | `/:vendorId/pending-mobiles` | Devices currently at this vendor |
| GET | `/:vendorId/ledger` | Vendor statement (debit/credit + running balance) |

### Transactions (chalans)
| Method | Path | Purpose |
|---|---|---|
| GET | `/transactions` | List transactions |
| GET | `/transactions/:id` | Transaction detail |
| POST | `/transactions/send` | Send devices **to** a vendor |
| POST | `/transactions/receive` | Receive devices **from** a vendor (+ optional payment) |
| POST | `/transactions/vendor-job-inward` | Vendor sends us a device to repair |
| POST | `/transactions/vendor-job-return` | Return a repaired device to the vendor (+ payment received) |

### Mobiles & payments
| Method | Path | Purpose |
|---|---|---|
| GET | `/mobiles` | List vendor devices (`vendorId, flowType, status, paymentStatus, imei, dates`) |
| GET | `/mobiles/:id` | Device detail |
| PATCH | `/mobiles/:id/status` | Change device status |
| PATCH | `/mobiles/:id/payment-status` | Mark `PAID` / `PENDING` |
| DELETE | `/mobiles/:id` | Delete device |
| POST | `/mobiles/bulk-delete` | `{ ids: [] }` |
| GET | `/payments` | List payment vouchers |
| POST | `/payments` | Record voucher — `payment_type: PAYMENT_TO_VENDOR \| PAYMENT_FROM_VENDOR` |

---

## 9. Dashboard — `/api/dashboard`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/stats` | any | **Legacy** repair-job metrics (unchanged; powers `/dashboard/repair-jobs`) |
| GET | `/analytics` | any | **Full business analytics** — see DASHBOARD.md. Query: `range, startDate, endDate` |
| GET | `/analytics/range` | any | Resolve a date range → `{ range, start_date, end_date }` |
| GET | `/analytics/report.pdf` | any | Business Performance Report PDF |
| GET | `/reports/report.pdf` | any | Same PDF (alternate mount) |

`range` values: `today` · `yesterday` · `last_7_days` · `this_month` (default) ·
`last_month` · `last_3_months` · `last_6_months` · `last_1_year` · `all` · `custom`
(`custom` requires `startDate` and `endDate`, both `YYYY-MM-DD`).

---

## 10. Reviews (AI Google Review Assistant) — `/api/reviews`

### Public — also mounted at `/api/public/reviews`
| Method | Path | Purpose |
|---|---|---|
| GET | `/public/:token` | Review page data |
| POST | `/public/:token/generate` | AI-generate review text (Gemini→Groq→OpenRouter) |
| POST | `/public/:token/feedback` | Save rating + feedback |
| POST | `/public/:token/continue` | Mark Google redirect |

### Admin
| Method | Path | Access |
|---|---|---|
| GET | `/settings` | admin, staff |
| PUT | `/settings` | admin |
| GET | `/dashboard` | admin, staff |
| GET | `/requests` | admin, staff |
| POST | `/requests/:id/retry` | admin, staff |
| POST | `/requests/:id/revoke` | admin |

---

## 11. Notifications — `/api/notifications`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/logs` | any | Notification logs (`jobId, channel, search, dates`) |
| POST | `/resend` | any | Re-dispatch a notification |
| DELETE | `/:id` | any | Delete log |
| POST | `/bulk-delete` | any | `{ ids: [] }` |

---

## 12. Settings — `/api/settings`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | any | Shop profile + notification config |
| PUT | `/profile` | admin | Update shop profile |
| PUT | `/notifications` | admin | Toggle channels |
| POST | `/test-whatsapp` | admin | Send test WhatsApp |
| POST | `/test-email` | admin | Send test email |

---

## 13. Uploads — `/api/upload`
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | any | `multipart/form-data` field `file` (+ optional `jobId`, `fileType`). Max 10 MB; jpeg/png/webp/gif/pdf. Stores to Supabase Storage, falls back to `server/uploads` |

---

## 14. WhatsApp — `/api/whatsapp`
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/status` | **public** | Baileys connection state (triggers background init if disconnected) |
| POST | `/connect` | any | Force reconnect / new QR |
| POST | `/disconnect` | any | Logout |
| POST | `/send-test` | any | `{ phone, message }` |
| POST | `/send-invoice/:jobId` | any | Send invoice PDF to the customer |

---

## 15. Backups — `/api/backups` (admin only)
| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Run a backup now (pg_dump → encrypt → Google Drive) |
| GET | `/` | List backup logs |
| GET | `/status` | Backup status |
| POST | `/restore` | Restore from a backup |

---

## 16. Recycle bin — `/api/recycle-bin`
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List deleted records (`entity_type` filter) |
| POST | `/:id/restore` | Restore one |
| POST | `/bulk-restore` | `{ ids: [] }` |
| POST | `/bulk-delete` | Permanently delete `{ ids: [] }` |
| POST | `/empty` | Empty bin (`{ type }`, default `ALL`) |
| DELETE | `/:id` | Permanently delete one |

---

## 17. Device bridge — `/api/device-bridge`
| Method | Path | Purpose |
|---|---|---|
| GET | `/detect` | Detect a connected Android device via adb |

---

## 18. Health
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{ success, message, timestamp, environment }` — used by the keep-alive pinger |

---

## 19. Error codes (most common)

| Code | HTTP | Meaning |
|---|---|---|
| `AUTH_TOKEN_MISSING` | 401 | No `Authorization` header |
| `AUTH_INVALID_TOKEN` | 401 | Bad/malformed JWT |
| `AUTH_TOKEN_EXPIRED` | 401 | Session expired — client redirects to `/login?expired=true` |
| `AUTH_USER_NOT_FOUND` | 401 | Token valid but user deleted |
| `AUTH_ACCOUNT_DISABLED` | 403 | `is_active = false` |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `AUTH_FORBIDDEN` | 403 | Role not allowed |
| `NOT_FOUND` | 404 | Unknown route |
| `VALIDATION_ERROR` | 400 | Missing/invalid body fields |
| `FILE_MISSING` / `INVALID_FILE_TYPE` | 400 | Upload problems |
| `LINE_TOTAL_LIMIT_EXCEEDED` | 400 | Sales line total above the cap |
| `INVALID_DATE_RANGE` | 400 | `startDate` after `endDate` |
| `IDS_REQUIRED` | 400 | Bulk action without ids |
| `CANNOT_DELETE_SELF` | 400 | Deleting your own account |
