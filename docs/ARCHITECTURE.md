# ARCHITECTURE

How the Mobotech system is put together, request by request.

---

## 1. High-level design

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENT — React 19 SPA (Vite 8)            localhost:5173     │
│  AppRouter → pages/  ·  Redux Toolkit  ·  Tailwind Spatial UI │
│  services/*.js  →  axios instance (services/api.js)           │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTP + Bearer JWT
┌───────────────────────────▼──────────────────────────────────┐
│ SERVER — Express 4 (ES Modules)           localhost:5000     │
│  index.js → helmet/cors/morgan → rateLimiter → /api routers   │
│           → authenticateToken → requireRoles → controller     │
│  controllers/  →  db façade (db/db.js)  →  Supabase or local  │
│  services/     →  email / WhatsApp / SMS / AI / PDF / backup  │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
  Supabase Postgres   External APIs        Local disk
   (31 tables)        Brevo · Baileys ·    uploads/
   Storage bucket     MSG91 · Fast2SMS ·   baileys_auth/
                      Gemini/Groq/OR ·     chrome/ (PDF)
                      Google Drive
```

---

## 2. Backend request lifecycle

`server/src/index.js` builds the pipeline in this exact order:

1. **Crash guards** — `uncaughtException` / `unhandledRejection` handlers keep
   the HTTP server alive when background sockets (Baileys, SMTP) error.
2. **helmet** — security headers (`crossOriginResourcePolicy: cross-origin` so
   uploaded files can be embedded).
3. **cors** — allowlist of localhost:5173/5174/3000 + `CLIENT_URL` + `APP_URL`;
   the callback currently allows all origins (see technical debt).
4. **Body parsing** — `express.json` and `urlencoded`, 10 MB limit each.
5. **morgan** logging (disabled when `NODE_ENV=test`).
6. **Static** — `/uploads` → `server/uploads`.
7. **Rate limit** — `apiRateLimiter` on all `/api` routes.
8. **DB readiness gate** — awaits `dbInitPromise` so requests wait for the
   initial Supabase sync while the port is already bound.
9. **Routers** — 18 mounted under `/api/*` (see API-REFERENCE.md).
10. **Catch-all 404** → `AppError('Route not found', 404, 'NOT_FOUND')`.
11. **`errorHandler`** — single JSON error shape:
    `{ success:false, message, code, errors }`.
12. **Startup** — `dbInitPromise = initDb()` then `app.listen(env.PORT)`;
    afterwards auto-connects Baileys if saved credentials exist and starts the
    9-minute self keep-alive ping (Render).

### Route-level middleware chain

```
router.use(authenticateToken)        → 401 if token missing/invalid/expired
  └── requireRoles(['admin', ...])   → 403 if role not allowed
        └── controller               → res.json({ success:true, data })
```

Role guards (`middleware/roleGuard.js`):
`requireAdmin` · `requireTechnicianOrAdmin` · `requireStaffOrAdmin` ·
`requireAnyRole`.

---

## 3. Data layer (`server/src/db/`)

### `db.js` — the single façade

Exposes nested repositories consumed by every controller:

| Repo | Responsibility |
|---|---|
| `db.users` | lookup by email/id, list, create, delete, bulk delete |
| `db.shops` | single shop profile (merged with `settings.shop_profile_extra`) |
| `db.customers`, `db.devices` | directory + devices |
| `db.jobs` | list (filters/sort/pagination + joins), findById (full graph), create, update |
| `db.diagnoses`, `db.estimates` | lifecycle records |
| `db.parts` | catalog, stock adjust, stock movements |
| `db.tests` | 16-point QC results |
| `db.payments` | payment ledger + job balance recalculation |
| `db.invoices` | invoice + invoice_items generation |
| `db.sales` | retail/GST invoices (JSONB items) |
| `db.notifications` | log + query notification_logs |
| `db.attachments` | upload metadata |
| `db.settings` | JSON key/value store (`get`/`set`, upserted on `key`) |
| `db.recycle_bin` | soft delete, restore, purge (30 days) |
| `db.recycleBinStats` | **read-only** aggregate helper (dashboard) |
| `db.reviewSettings`, `db.reviewRequests` | AI Google Review assistant |
| vendor repos | `db.vendors`, `db.vendor_mobiles`, `db.vendor_payments`, `db.vendor_ledger`, `db.vendor_transactions`, `db.vendor_reports` (built in `vendorRepo.js`) |

> **Naming note:** vendor repos are **snake_case** (`db.vendor_mobiles`), not
> camelCase. `db.vendor_ledger` has **no global `list()`** — only
> `getVendorStatement(vendorId)`.

### Sync model

- `initDb()` seeds the mirror, then `syncFromSupabase()` loads 30 core tables
  (limit 3000 rows each) into `localDb`.
- `ensureFreshSync(maxAgeMs)` re-syncs when data is older than the given age.
- A background `setInterval` re-syncs every 60 s.
- In-flight local records (created within 5 s of a sync) are preserved so a
  concurrent write is never lost by the sync.
- **`recycle_bin` is NOT in the sync list** — the dashboard reads it directly
  from Supabase through `db.recycleBinStats.findAll()`.

### Write helpers

`safeSupabaseInsert / Update / Delete / Upsert` retry up to 10×, each time
dropping the column named in `Could not find the 'x' column` — this keeps the
app running when the DB schema lags behind the code.

---

## 4. Frontend architecture

### Startup chain
`index.html` → `main.jsx` → `App.jsx`
(Redux `Provider` → `ThemeProvider` → `ErrorBoundary` → `BrowserRouter` →
`Toaster` → `AppRouter`).

`App.jsx` also fires a non-blocking `GET /health` ping to wake a sleeping
Render instance.

### Routing (`routes/AppRouter.jsx`)

| Path | Page | Access |
|---|---|---|
| `/login` | `Login` | public |
| `/repair/:tokenOrJobNumber/approval` | `CustomerApprovalPage` | public, no login |
| `/review/:uniqueToken` | `CustomerReviewPage` | public, no login |
| `/dashboard` | **`DashboardOverview`** (business dashboard) | any role |
| `/dashboard/repair-jobs` | `Dashboard` (classic, unchanged) | any role |
| `/customers`, `/customers/:id` | CustomerList / CustomerDetail | any role |
| `/jobs`, `/jobs/new`, `/jobs/:id` | JobList / JobCreate / JobDetail | any role |
| `/parts` | PartsList | any role |
| `/sales`, `/sales/new` | SalesList / SalesInvoiceCreate | any role |
| `/vendors` + `/vendors/list, send, receive, transactions, pending, ledger, reports, :id` | vendor module | any role |
| `/payments` | PaymentsList | **admin, staff** |
| `/notifications` | NotificationLogs | any role |
| `/reviews` | GoogleReviewsManagement | any role |
| `/recycle-bin` | RecycleBin | any role |
| `/settings` | Settings | **admin only** |

### HTTP layer (`services/api.js`)

- Base URL from `VITE_API_URL` (falls back to `http://localhost:5000/api`).
- **Request interceptor** attaches `Authorization: Bearer <localStorage.token>`.
- **Response interceptor**
  - returns `response.data` (callers receive the payload directly);
  - auto-retries up to 3× with backoff on `ECONNABORTED`, `ERR_NETWORK`,
    502/503/504 (Render cold starts);
  - on 401 outside public routes, clears storage and redirects to
    `/login?expired=true`;
  - rejects with a normalised `Error` carrying `.status`, `.code`, `.errors`.

### State
Redux Toolkit holds only cross-cutting state: `auth` (user/token), `jobs` (list
filters, search, sort) and `settings` (shop profile, notification toggles).
Everything else is local component state.

### Theming
`ThemeContext` stores three preferences in `localStorage`: `style`
(`dark-spatial` | `clean-light` | `futuristic-glass`), `mode`
(`light` | `dark` | `system`) and `animations`. It writes `data-spatial-style`,
`data-theme`, `data-animations` and the `dark` class onto `<html>`; components
style via CSS variables (`--spatial-*`) declared in `index.css`.

---

## 5. External integrations

| Concern | Implementation | Entry file |
|---|---|---|
| Email | Brevo REST v3 (+ SMTP fallback) | `services/brevoEmailService.js` |
| WhatsApp | Baileys local socket, Fast2SMS fallback, legacy OpenWA | `baileysService.js`, `fast2smsService.js`, `openWaService.js` |
| SMS | MSG91 flows | `services/msg91SmsService.js` |
| Notification orchestration | templates + channel dispatch + logging | `services/notificationService.js` |
| AI review text | Gemini → Groq → OpenRouter ordered fallback | `services/aiReview.service.js` |
| PDF (job sheet / invoice) | headless Chrome print | `services/pdfService.js` |
| PDF (dashboard report) | separate Chrome helper (never touches pdfService) | `services/dashboardPdfService.js` |
| Backups | pg_dump → AES-256-GCM → Google Drive | `backupService.js`, `encryptionService.js`, `googleDriveService.js`, `restoreService.js` |
| Device detection | adb bridge | `services/deviceBridgeService.js` |
| Uploads | Supabase Storage + local fallback | `config/supabase.js` → `uploadController.js` |

**AI provider design.** One service with a `providerCallers` map (`gemini`,
`groq`, `openrouter`) and an ordered fallback driven by `AI_PRIMARY_PROVIDER`
and `AI_FALLBACK_PROVIDERS`. Each caller is a raw `axios` call (no SDK). Errors
are categorised (`TIMEOUT`, `RATE_LIMIT`, `QUOTA_EXCEEDED`,
`INVALID_KEY_OR_AUTH`, `MODEL_NOT_FOUND`, …) and logged without leaking API keys
or customer PII.

Adding a new provider = add one caller function + one `providerCallers` entry +
env keys. No new subsystem required.

---

## 6. Security model

| Control | Detail |
|---|---|
| Passwords | bcrypt cost 10 (`bcryptjs`) |
| Tokens | JWT HS256; 7 days (`rememberMe` → 30 days); payload `{id,email,role_id,full_name}` |
| Verification | `middleware/auth.js` verifies signature, loads the user live, rejects inactive accounts |
| Authorization | role guards on every protected route |
| Public surfaces | customer approval, review page, public PDFs (by job/invoice id) |
| Uploads | multer memory storage, 10 MB, MIME allowlist (jpeg/png/webp/gif/pdf) |
| Rate limiting | `apiRateLimiter` on `/api`, `authRateLimiter` on login, `publicReviewRateLimiter` on public review routes |
| Error responses | never expose stack traces; structured codes |
| Backups | AES-256-GCM using `BACKUP_ENCRYPTION_KEY` |

**Gaps to address before public exposure:** permissive CORS, the JWT secret has
a hardcoded fallback in `env.js`, and `/uploads` static files are public.

---

## 7. Repair lifecycle state machine

```
RECEIVED ──start-diagnosis──▶ DIAGNOSING ──estimate──▶ ESTIMATE_SENT
    │                                                    │
    │                                       (customer)  ▼
    │                                          APPROVED / REJECTED
    │                                                    │
    └──cancel──▶ CANCELLED          start-repair ◀───────┘
                                          ▼
                                     IN_PROGRESS ──complete-repair──▶ TESTING
                                          │                            │
                                          │                 testing (16-point QC)
                                          ▼                            ▼
                                       READY_FOR_PICKUP ──pickup──▶ DELIVERED
                                                                       │
                                                       reopen / warranty claim
                                                                       ▼
                                                              (IN_PROGRESS …)
```

`job_status_history` records every transition. Deliverable transitions are
locked once a job is `DELIVERED`. Inventory is deducted when parts are consumed,
with an audit row in `part_stock_movements`.

---

## 8. Design decisions worth knowing

1. **Dual-mode data layer** — lets the app demo without Supabase while using
   Supabase as the real store in production.
2. **Auto-drop unknown columns** — deliberate resilience against schema drift,
   at the cost of silently ignoring misspelled fields.
3. **Numbers computed in app code, not SQL** — the dashboard and reports
   aggregate the in-memory mirror, keeping logic in one language and behaving
   identically with or without Supabase. Trade-off: not suited to very large
   datasets (sync caps at 3000 rows/table; aggregates request up to 10 000).
4. **Additive-only migrations** — every migration uses `IF NOT EXISTS`; nothing
   is dropped or altered, so deploys never require a data reset.
5. **Two dashboards, one route each** — the new dashboard is a sibling page, not
   a rewrite, so the proven repair view can never regress.
