# QA TEST PLAN: MOBOTECH MOBILE CARE

**Target Version:** v2.0  
**Test Types:** Functional, Integration, State-Machine Regression, CRUD, UI/UX, Security  
**Environment:** Client (React 19 / Vite / Tailwind) • Server (Express / Supabase PostgreSQL / Local Cache)

---

## 1. Scope & System Architecture

Mobotech Mobile Care is a specialized repair workshop management and invoicing system managing the complete repair lifecycle from hardware intake to diagnosis, quotation, customer approval, repair bench execution, 16-point quality testing, payment settlement, and delivery handover.

### Core Modules Audited:
1. **Authentication & Role-Based Access Control (RBAC):** Admin, Technician, Staff.
2. **Dashboard & KPIs:** 9-stage pipeline tracking, revenue totals, urgent ticket dispatch.
3. **Customer Management (CRM):** Customer registry, WhatsApp/Email synchronization, alternate phone checks.
4. **Repair Job Sheets (Service Lifecycle):**
   - Stage 1: `RECEIVED` (Intake & 12-point initial checklist)
   - Stage 2: `DIAGNOSING` (Inspection & root cause analysis)
   - Stage 3: `ESTIMATE_SENT` (Parts quotation & labor calculation)
   - Stage 4: `APPROVED` / `REJECTED` (Customer tokenized authorization link)
   - Stage 5: `IN_PROGRESS` (Bench hardware work & automatic parts inventory deduction)
   - Stage 6: `TESTING` (16-point hardware quality assurance checklist)
   - Stage 7: `READY_FOR_PICKUP` (Notification dispatch to customer)
   - Stage 8: `DELIVERED` (Settlement confirmation, warranty activation, invoice generation)
   - Stage 9: `REOPENED` / `WARRANTY_CLAIM` (Free same-issue rework or new billable repair)
5. **Inventory & Spare Parts:** Stock tracking, min-stock alerts, auto-deduction on repair start.
6. **Billing & Tax Invoices:** Sales bill generation, GST computation, multi-mode payment ledger.
7. **B2B Vendor Management:** Outward device dispatch, inward repair reception, debit/credit ledger.
8. **Hardware Device Bridge (USB):** Auto-detection of iPhone (libimobiledevice) and Android (ADB) with IMEI/Serial autofill.

---

## 2. Test Strategy & Acceptance Criteria

### A. State Machine & Terminal State Integrity
- **Terminal State Locking:** Once a job reaches `DELIVERED` or `CANCELLED`, all modification actions (`Update Estimate`, `Edit Diagnosis`, `Edit Job Sheet`, `Save Quality Tests`) must be strictly disabled on the UI and rejected with HTTP 400 (`JOB_LOCKED`) on the API.
- **Warranty Reopen:** To modify a closed job sheet, the operator must explicitly click `Reopen Job (Warranty)`. Once reopened, the status transitions to active repair and updates become unlocked.

### B. CRUD Operations
- **Create:** Valid input persistence, error handling on malformed payloads, rate-limit protection.
- **Read:** Fast queries, pagination, search by Job #, Customer, Phone, IMEI, Part SKU.
- **Update:** Partial updates, transaction safety, audit trail logging.
- **Delete:** Soft/hard delete with confirmation modals, cascade protection.

### C. UI/UX & Spatial Design System
- Standardized `w-full` page width across all tabs and views matching Dashboard.
- Zero layout blink / jerk ("jatka") using CSS keyframe cubic-bezier transitions.
- TopLoadingBar visual feedback during async navigation.
- Double-click debounce lock on action buttons.

---

## 3. Test Suites & Execution Matrix

| Test Suite | Coverage Area | Tool / Runner | Target Pass Rate |
|---|---|---|---|
| **Suite 1: Auth & RBAC** | Login, Token verify, Role gates | Node Axios / Jest | 100% |
| **Suite 2: State Machine Lifecycle** | Full 9-stage job flow | `tests/e2e.js` | 100% |
| **Suite 3: Terminal Job Locking** | Delivered job locking & reopen | `testDeliveredJobLocking.js` | 100% |
| **Suite 4: USB Device Bridge** | iOS/Android/Windows PnP USB | `testDeviceDetection.js` | 100% |
| **Suite 5: Inventory & Invoicing** | Stock deduction & balance check | Master Integration Suite | 100% |
| **Suite 6: Responsive Layout** | 320px to 1920px viewports | Vite Build & Layout Audit | 100% |
