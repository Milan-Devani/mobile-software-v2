# Mobotech mobile care — Mobile Repair Management Web Application

A production-ready, full-stack **Mobile Repair Management Web Application** engineered specifically for single-shop mobile repair centers and electronics technicians.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Routing**: React Router v7
- **Styling**: Tailwind CSS + Custom Design System
- **State Management**: Redux Toolkit & React-Redux
- **Icons**: Lucide React
- **Forms & Validation**: React Hook Form + Zod
- **Dialogs & Toasts**: SweetAlert2 + React Hot Toast
- **Printing**: Clean CSS Print templates for Job Sheets and Invoices

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js REST API
- **Authentication**: JWT & bcrypt password hashing
- **Security**: Helmet, CORS, Express Rate Limiting
- **Centralized Error Handling**: Structured JSON responses (`{ success, message, code, errors }`)

### Database & Storage
- **Database**: Supabase PostgreSQL (Full SQL schema provided in `supabase/schema.sql` with 22 normalized tables, relations, triggers, indexes)
- **Storage**: Supabase Storage with local file storage fallback (`server/uploads`)
- **Persistence**: Dual-mode data repository layer that seamlessly connects to Supabase when credentials are provided in `.env`, and automatically utilizes an embedded JSON storage engine (`server/data/db.json`) during zero-config local testing.

### Notifications
- **Email**: [Brevo](https://www.brevo.com/) (formerly Sendinblue) Transactional REST API v3 + SMTP Nodemailer
- **WhatsApp**: [OpenWA Gateway](https://github.com/rmyndharis/OpenWA) integration (`OPENWA_API_URL`)
- **SMS**: [MSG91](https://msg91.com/) Flow / Transactional SMS API

---

## 🔄 Repair Lifecycle Workflow

```
Customer submits mobile
        ↓
Create Job Sheet (Unique JOB-YYYY-000001 generated)
        ↓
Status: RECEIVED (Intake condition, accessories, and customer complaint recorded)
        ↓
Status: DIAGNOSING (Technician inspects device, records root cause & recommended fix)
        ↓
Status: ESTIMATE_SENT (Parts selected from catalog, labor fee calculated, taxes applied)
        ↓
Customer receives notification + online approval link (/repair/:jobNumber/approval)
        ↓
Customer Decision: APPROVED or REJECTED
        ↓
Status: IN_PROGRESS (Repair starts; parts stock automatically deducted from inventory)
        ↓
Status: TESTING (Technician executes mandatory 16-point Quality Check checklist)
        ↓
Status: READY_FOR_PICKUP (Notifications dispatched to customer via Email, WhatsApp & SMS)
        ↓
Customer Pickup (Customer tests device: YES; Customer confirms working: YES)
        ↓
Payment (Cash, Card, UPI, Bank Wire; supports partial payments & balance due tracking)
        ↓
Invoice Generated (Unique INV-YYYY-000001 with 90-day hardware warranty)
        ↓
Status: DELIVERED
```

---

## 👥 User Roles & Default Test Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin / Owner** | `admin@fixitrepair.com` | `Admin@123456` | Full administrative access, settings, user management, financials |
| **Technician** | `tech@fixitrepair.com` | `Tech@123456` | Diagnosis, parts inventory, repairs, 16-point QC testing |
| **Staff / Reception** | `staff@fixitrepair.com` | `Staff@123456` | Customer check-in, Job Sheet creation, pickups, payments |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+

### 2. Installation
Clone repository and install dependencies:
```bash
# Install root dependencies
npm install

# Install backend dependencies
npm --prefix server install

# Install frontend dependencies
npm --prefix client install
```

### 3. Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Configure your credentials:
```env
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=super_secure_jwt_secret_key_fixit_repair_system_2026_xyz987

# Supabase (Optional in dev; if omitted, operates in local persistent mode)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=repair-assets

# Brevo Email Service
BREVO_API_KEY=
EMAIL_FROM=Mobotech mobile care <notifications@mobotech.com>

# OpenWA WhatsApp Gateway (https://github.com/rmyndharis/OpenWA)
OPENWA_API_URL=http://localhost:8000
OPENWA_API_KEY=

# MSG91 SMS Service
MSG91_AUTH_KEY=
MSG91_FLOW_ID=
MSG91_SENDER_ID=TCHFIX
MSG91_TEST_MODE=true
```

### 4. Running the Application
To run both backend server and frontend client concurrently:
```bash
npm run dev
```

Or run them individually:
```bash
# Terminal 1: Backend Server (http://localhost:5000)
npm run server

# Terminal 2: Frontend Client (http://localhost:5173)
npm run client
```

### 5. Running Automated Verification Tests
Verify all 19 workflow stages from intake to payment and invoice delivery:
```bash
npm test
```

---

## 🗄️ Database Architecture (`supabase/schema.sql`)

The database contains 22 normalized relational tables:
1. `shops` — Shop profile, currency, warranty policies
2. `roles` — Role-based access control (`admin`, `technician`, `staff`)
3. `users` — Employees with bcrypt password hashes
4. `customers` — Customer contact directory with unique `customer_code`
5. `devices` — Device brand, model, color, IMEI, serial number, passcode
6. `repair_jobs` — Core job tickets with unique `job_number` (`JOB-YYYY-000001`)
7. `job_status_history` — Comprehensive audit trail of every status transition
8. `diagnoses` — Reported complaint, findings, root cause, recommended fix
9. `parts` — Parts catalog, wholesale cost, selling price, live inventory stock
10. `part_stock_movements` — Stock audit log (purchases, repair job deductions, adjustments)
11. `repair_estimates` — Estimates with labor fee, discount, tax calculations
12. `repair_estimate_items` — Itemized parts in quotation
13. `repair_job_parts` — Parts installed on workbench
14. `repair_job_labor` — Labor rates and billable hours
15. `repair_tests` — 16-point Quality Check checklist (`PASS`, `FAIL`, `NOT_TESTED`)
16. `payments` — Transaction ledger (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`)
17. `invoices` — Tax invoice tickets (`INV-YYYY-000001`)
18. `invoice_items` — Itemized invoice charges
19. `attachments` — Device check-in photos and documentation
20. `notifications` — Triggered alert records
21. `notification_logs` — External delivery logs (Brevo, OpenWA, MSG91)
22. `settings` — System-wide JSON settings

---

## 📄 License & Attribution
Designed for commercial production deployment in mobile device service centers.
