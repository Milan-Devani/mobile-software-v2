# PROJECT DOCUMENTATION — Mobotech Mobile Care

> **Mobile Repair Management System** — full-stack shop management platform for
> single-location mobile repair centres: job sheets, repair lifecycle, retail
> sales & GST invoicing, vendor (sub-contract) ledger, inventory, notifications,
> AI-assisted Google reviews, encrypted backups, and a full business dashboard.

| | |
|---|---|
| **Product name** | Mobotech Mobile Care |
| **Repo root** | `software v2/` |
| **Backend** | Node.js + Express 4 (ES Modules) |
| **Frontend** | React 19 + Vite 8 + Tailwind 3 |
| **Database** | Supabase PostgreSQL (31 tables) |
| **Server code** | ~20,300 lines JS |
| **Client code** | ~38,700 lines JS/JSX |

---

## 1. What the system does

Mobotech runs a mobile phone repair shop end-to-end:

1. **Intake** — staff create a job sheet for a customer's device.
2. **Diagnosis** — technician records findings and root cause.
3. **Estimate** — parts + labour priced, sent to the customer via a public link.
4. **Approval** — customer approves/rejects online (no login).
5. **Repair** — parts deducted from inventory, technician works the job.
6. **QC** — 16-point quality checklist.
7. **Pickup & payment** — cash / card / UPI / bank, partial payments supported.
8. **Invoice** — numbered tax invoice + 90-day warranty.
9. **After-sales** — warranty claims, job reopen, AI-assisted Google review invite.

Alongside repairs the shop also sells phones/parts (**Sales & Invoicing**),
sends devices to **other vendors** for specialist repair and receives devices
**from vendors** for B2B repair work, tracked with a double-entry vendor ledger.

---

## 2. Architecture

**Shape:** two separate apps in one repository, coordinated by the root
`package.json` (`concurrently`). Not a formal monorepo — no workspaces — just
three independent `package.json` files (root, `client/`, `server/`).

```
Browser (React SPA, Vite :5173)
        │  axios  /api/*  (Bearer JWT)
        ▼
Express API (:5000)  ── server/src/index.js
        │
        ├── Supabase PostgreSQL  (primary source of truth, 31 tables)
        ├── In-memory mirror (localDb) re-synced every ≤5 s
        ├── Supabase Storage     (attachments, falls back to server/uploads)
        ├── Brevo                (transactional email)
        ├── Baileys / Fast2SMS   (WhatsApp)
        ├── MSG91                (SMS)
        ├── Gemini→Groq→OpenRouter (AI review text)
        └── Google Drive         (encrypted DB backups)
```

### The dual-mode data layer (important)

`server/src/db/db.js` exposes one `db` façade object. Every method checks
`isSupabaseConfigured()`:

- **Supabase configured** (normal): Supabase is the primary store. An in-memory
  mirror (`localDb`) is loaded at boot and re-synced every ≤5 s via
  `ensureFreshSync()`. Writes go to Supabase through `safeSupabaseInsert /
  Update / Delete / Upsert`, which auto-drop unknown columns so schema drift
  never breaks a write.
- **No Supabase credentials**: the app still runs from seed data in memory
  (`seedData.js`) — fine for demos, but nothing persists.

There is **no `db.json` file** (older README claim) and **no ORM**
(no Prisma / Sequelize / TypeORM / Mongoose).

### Repository layout

```
.
├── package.json            root scripts (dev / server / client / build / test)
├── render.yaml             Render deploy config (backend)
├── .env.example            environment template
├── server/
│   ├── src/index.js        ★ BACKEND ENTRY POINT
│   ├── src/config/         env.js, supabase.js
│   ├── src/db/             db.js (repo façade), vendorRepo.js, seedData.js, migrations/
│   ├── src/controllers/    17 controllers
│   ├── src/routes/         18 routers
│   ├── src/middleware/     auth.js, roleGuard.js, errorHandler.js, rateLimiter.js
│   ├── src/services/       15 services
│   ├── src/scripts/        ~30 CLI scripts (QA, migration, backup, tests)
│   ├── data/baileys_auth/  WhatsApp session keys
│   └── uploads/            local attachment storage
├── client/
│   ├── index.html          ★ FRONTEND ENTRY POINT
│   ├── vite.config.js      dev server :5173, proxies /api + /uploads → :5000
│   └── src/
│       ├── main.jsx → App.jsx → routes/AppRouter.jsx
│       ├── pages/          jobs, vendors, sales, parts, settings, dashboard, public
│       ├── components/     common (Spatial UI), dashboard, print, jobs, vendors
│       ├── services/       axios wrappers per domain
│       ├── store/          Redux Toolkit (auth, jobs, settings)
│       ├── context/        ThemeContext (3 visual styles × light/dark/system)
│       ├── hooks/          useDebounce, useAsyncAction
│       └── utils/          billFormatters, warrantyUtils, checklistConstants
├── supabase/               schema.sql (31 tables), seed.sql
├── server/src/db/migrations/  001..004 incremental SQL
├── tests/e2e.js            root `npm test`
└── docs/                   QA plans + this documentation set
```

---

## 3. Tech stack

### Backend (`server/package.json`)
| Purpose | Library |
|---|---|
| Runtime / server | Node.js 18+, Express 4, ES Modules |
| Security | helmet, cors, express-rate-limit |
| Auth | jsonwebtoken, bcryptjs |
| Database | @supabase/supabase-js (REST), pg (raw SQL for backups) |
| Uploads | multer (memory storage, 10 MB, images + PDF) |
| Files/PDF | headless Chrome via child_process, @puppeteer/browsers |
| Email | Brevo REST API + nodemailer |
| WhatsApp | @whiskeysockets/baileys, Fast2SMS |
| SMS | MSG91 |
| Backups | googleapis (Drive), AES-256-GCM, pg_dump/psql |
| Validation | zod |
| Logging | morgan, pino |

### Frontend (`client/package.json`)
| Purpose | Library |
|---|---|
| Framework | React 19, Vite 8 |
| Routing | react-router-dom v7 |
| State | @reduxjs/toolkit, react-redux |
| Styling | Tailwind CSS 3 + custom "Spatial" design system (`index.css`) |
| Forms | react-hook-form + zod |
| HTTP | axios (JWT attach, cold-start retry, 401 redirect) |
| Icons / alerts | lucide-react, sweetalert2, react-hot-toast |
| Print/PDF | jsPDF, html2canvas, dedicated print components |

- Backend deploys to **Render** (`render.yaml`), with a self keep-alive ping
  every 9 minutes to avoid idle sleep.
- Frontend deploys to **Vercel** (`client/vercel.json`).

---

## 4. Running the project

```bash
# 1. install (root, then each app)
npm install
npm --prefix server install
npm --prefix client install

# 2. environment
cp .env.example server/.env   # then fill in credentials

# 3. dev — both apps together
npm run dev        # server :5000 + client :5173

# individually
npm run server      # backend only
npm run client      # frontend only

# 4. production build / tests
npm run build       # builds client → client/dist
npm test            # tests/e2e.js
```

**Default accounts** (from `seedData.js`):

| Role | Email | Password |
|---|---|---|
| Admin / Owner | `admin@mobotech.com` | `Admin@123456` |
| Technician | `tech@mobotech.com` | `Tech@123456` |
| Staff / Reception | `staff@mobotech.com` | `Staff@123456` |

> Legacy accounts `admin@fixitrepair.com`, `tech@fixitrepair.com`, and `staff@fixitrepair.com` also exist (same passwords) for backward compatibility in local mode.

---

## 5. Documentation index

| Document | Contents |
|---|---|
| **[README-DOCS.md](./README-DOCS.md)** | Index + how to use the doc set |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System design, request lifecycle, security, roles |
| **[DATABASE.md](./DATABASE.md)** | All 31 tables, relationships, ERD, migration guide |
| **[API-REFERENCE.md](./API-REFERENCE.md)** | Every endpoint, auth, payloads, errors |
| **[DASHBOARD.md](./DASHBOARD.md)** | Business dashboard: metrics, formulas, money flow |
| **[VENDOR-MODULE.md](./VENDOR-MODULE.md)** | Two-way vendor flows + ledger rules |
| **[ENVIRONMENT.md](./ENVIRONMENT.md)** | Every env key, what breaks without it |
| **[OPERATIONS.md](./OPERATIONS.md)** | Deploy, backups, troubleshooting, testing |
| **[CHANGELOG-DASHBOARD.md](./CHANGELOG-DASHBOARD.md)** | Exact record of dashboard work + safety proof |

---

## 6. Known constraints & technical debt

- **Oversized files** — `jobController.js` (~68 KB), `db.js` (~142 KB),
  `vendorRepo.js` (~96 KB), `pdfService.js` (~104 KB), and client
  `JobDetail.jsx` (~185 KB) are hard to navigate; good refactor candidates.
- **In-memory mirror** — a write to Supabase may be briefly stale in `localDb`
  (≤5 s). Design assumption: single shop, low concurrency.
- **No realtime push** — there is no Socket.io / WebSocket *server*. WhatsApp
  (Baileys) is an outbound socket; the UI polls `GET /api/whatsapp/status`.
- **No Stripe / AWS S3 / Prisma / OpenAI / DeepSeek / Straico** — none of these
  exist here. Payments are recorded manually; uploads use Supabase Storage;
  AI is Gemini → Groq → OpenRouter only.
- **Coupon** — no coupon model/table/route/UI. Nearest features are job-level
  and sale-level discounts.
- **CORS** is permissive (the callback always allows); tighten before public use.
- **Env hygiene** — `.env.example` has a stray `uuu` line; `GEMINI_*`, `GROQ_*`,
  `OPENROUTER_*`, `FAST2SMS_*` are consumed by code but missing from the template.

---

## 7. Status of the dashboard redesign

The classic repair-job dashboard is **preserved unchanged** at
`/dashboard/repair-jobs`. The new **Business Dashboard** at `/dashboard` covers
repairs, sales, invoices, payments, parts, customers, vendors (both directions),
reviews, notifications and the recycle bin, with date filters and PDF export.
Full detail: [DASHBOARD.md](./DASHBOARD.md) and
[CHANGELOG-DASHBOARD.md](./CHANGELOG-DASHBOARD.md).
