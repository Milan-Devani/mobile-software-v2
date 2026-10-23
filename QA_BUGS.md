# QA DEFECT REGISTER & BUG TRIAGE (QA_BUGS.md)
**Application:** Mobotech Mobile Care  
**Audit Date:** October 20, 2026  
**Auditor:** Senior QA & Software Test Architect

---

## Severity & Priority Guidelines
- **P0 — Critical:** Unrecoverable application failure, severe security exposure, data loss, or core workflow blocked.
- **P1 — High:** Significant business flow blocked, serious data inconsistency, or major feature broken.
- **P2 — Medium:** Significant UI, usability, or workflow defect with existing workaround.
- **P3 — Low:** Minor visual polish, small animation inconsistencies, or non-critical edge cases.

---

## Confirmed Defect Register

### BUG-001: React Rules of Hooks Violation in InvoicePrintable
- **Bug ID:** `BUG-001`
- **Title:** Early conditional return before `useState` and `useEffect` in `InvoicePrintable.jsx`
- **Severity:** `P0 — Critical`
- **Priority:** `Urgent`
- **Affected Module:** `MOD-09 (Billing & Invoices)` / `src/components/print/InvoicePrintable.jsx`
- **Preconditions:** Attempting to render InvoicePrintable modal or preview before job data is fully loaded.
- **Exact Reproduction Steps:**
  1. Open a Job Sheet.
  2. Click "Print Invoice / Service Record".
  3. While `job` is momentarily undefined or transitioning, `if (!job) return null;` executes.
  4. On subsequent render with populated `job`, React encounters 4 new `useState` calls and 1 `useEffect`.
- **Expected Result:** Hooks must be called unconditionally on every render in exact sequence.
- **Actual Result:** Runtime React error: *"Rendered more hooks than during the previous render"*, causing blank page / component crash.
- **Root Cause:** Line 177 had `if (!job) return null;` placed directly before lines 179-193 where state hooks for PDF generation and WhatsApp status were defined.
- **Fix Implemented:** Reordered hooks to the top of the component above `if (!job) return null;`. Guarded `useEffect` internally with `if (!job) return;`.
- **Verification Evidence:** `oxlint` reported 0 errors (down from 5). Production bundle builds clean with 0 errors.
- **Fix Status:** **Retest Passed**

---

### BUG-002: Dropdown Menu Clipped at Card Boundary & Stacking Context Collision
- **Bug ID:** `BUG-002`
- **Title:** Customer & Brand select dropdowns clipped by parent card and obscured by subsequent sibling sections
- **Severity:** `P2 — Medium`
- **Priority:** `High`
- **Affected Module:** `MOD-05 (Device & Ticket Intake)` / `src/pages/jobs/JobCreate.jsx`, `SpatialSelect.jsx`, `Card.jsx`
- **Preconditions:** Opening Customer dropdown in Section 1 of Job Sheet Creation.
- **Exact Reproduction Steps:**
  1. Navigate to `/jobs/new`.
  2. Click `-- Select Customer or Search by Name / Phone --`.
  3. Observe dropdown panel extending downwards.
- **Expected Result:** Dropdown panel should float gracefully above Section 2 without clipping or truncation.
- **Actual Result:** Dropdown panel was sliced off at the bottom border of Card 1 due to `overflow-hidden`, and sibling Card 2's backdrop-filter stacking context painted on top.
- **Root Cause:**
  1. Hardcoded `overflow-hidden` on `Card.jsx`.
  2. Backdrop-filter CSS isolated stacking context on `.spatial-card` preventing child `z-50` from exceeding parent bounds.
- **Fix Implemented:**
  1. Configured `Card.jsx` to default to `overflow-visible`.
  2. Dynamically elevated `parentCard.style.zIndex = '50'` during `isOpen` state in `SpatialSelect.jsx`.
  3. Increased dropdown panel z-index to `z-[999]`.
  4. Added smart vertical placement (auto-flips to `bottom-full` if space below is `< 250px`).
  5. Established descending stacking order (`relative z-30`, `z-20`, `z-10`) on form section cards in `JobCreate.jsx`.
- **Verification Evidence:** Dropdown floats over subsequent cards without clipping.
- **Fix Status:** **Retest Passed**

---

### BUG-003: Monolithic Container Card Hover Lift on Dashboard Pipeline Grid
- **Bug ID:** `BUG-003`
- **Title:** Entire Repair Lifecycle Pipeline card lifts on hover instead of individual stage tiles
- **Severity:** `P2 — Medium`
- **Priority:** `Normal`
- **Affected Module:** `MOD-03 (Dashboard)` / `src/pages/dashboard/Dashboard.jsx`, `Card.jsx`, `index.css`
- **Preconditions:** Hovering cursor over any of the 10 pipeline stage buttons.
- **Exact Reproduction Steps:**
  1. Open Dashboard (`/dashboard`).
  2. Move cursor over "Received / Intake" or "Ready for Pickup" stage buttons.
- **Expected Result:** The specific stage button should lift and highlight; the outer container card should remain stable.
- **Actual Result:** The entire large container card performed `transform: translateY(-2px)`, creating visual jitter and diminishing interactive focus on the stage buttons.
- **Root Cause:** `Card.jsx` had `hover = true` enabled by default, applying `.spatial-card-hover` to all container cards.
- **Fix Implemented:**
  1. Changed `Card.jsx` default to `hover = false`.
  2. Created `.spatial-inner-box` CSS utility in `index.css` with responsive micro-elevation (`-translate-y-2px`), cyan glow (`rgba(56, 189, 248, 0.55)`), and dark/light mode shadow adaptation.
  3. Applied `.spatial-inner-box` to all pipeline stage buttons in `Dashboard.jsx`, settings color/animation mode cards, and checklist tiles in `JobCreate.jsx`.
- **Verification Evidence:** Verified individual inner tile hover lifts smoothly while container card stays anchored.
- **Fix Status:** **Retest Passed**

---

### BUG-004: Fast2SMS Provider Wallet Balance Exhaustion (External Service)
- **Bug ID:** `BUG-004`
- **Title:** Live SMS notifications fail with upstream provider error
- **Severity:** `P3 — Low (External)`
- **Priority:** `Low`
- **Affected Module:** `MOD-11 (Communication Gateway)` / `src/services/fast2smsService.js`
- **Preconditions:** Triggering status transitions with SMS channel enabled.
- **Exact Reproduction Steps:**
  1. Transition job to READY_FOR_PICKUP or DELIVERED.
  2. Fast2SMS API responds with HTTP 200 containing `"You don't have sufficient wallet balance"`.
- **Expected Result:** SMS delivered or fallback gracefully without breaking business workflow.
- **Actual Result:** System catches error, records notification log as `status: 'FAILED'`, and completes the primary repair workflow without crashing.
- **Root Cause:** Fast2SMS account balance is 0.
- **Recommendation:** Recharge Fast2SMS wallet in Fast2SMS portal if SMS is desired. WhatsApp and Email channels remain fully functional and operational.
- **Fix Status:** **Open (External Dependency)**

---

### BUG-005: Duplicate Job Ticket Numbers on Rapid Multi-Job Creation
- **Bug ID:** `BUG-005`
- **Title:** Sequential ticket generator `generateNextJobNumber` returned duplicate job numbers (e.g. `mobo-2026-0004`)
- **Severity:** `P1 — High`
- **Priority:** `Urgent`
- **Affected Module:** `MOD-05 (Job Intake & Ticket Generation)` / `server/src/db/db.js`
- **Preconditions:** Creating multiple jobs while Supabase is configured.
- **Exact Reproduction Steps:**
  1. Create Job Sheet 1 -> received `mobo-2026-0004`.
  2. Create Job Sheet 2 -> received `mobo-2026-0004` (duplicate!).
  3. Query `db.jobs.findById('mobo-2026-0004')` -> ambiguous match, shadows subsequent jobs.
- **Expected Result:** Every created job sheet must receive a strictly unique, sequential number (`mobo-2026-0004`, `mobo-2026-0005`, `mobo-2026-0006`, etc.).
- **Actual Result:** Generator queried Supabase alone and returned early without inspecting `localDb`, leading to sequence collisions.
- **Root Cause:** `generateNextJobNumber` returned early on the Supabase branch without reconciling local engine records with remote records.
- **Fix Implemented:** Updated `generateNextJobNumber` and `generateNextInvoiceNumber` to inspect both `localDb` and Supabase and take `Math.max(localSeq, supabaseSeq) + 1`. Cleaned and re-sequenced past duplicate records in `db.json`.
- **Verification Evidence:** `qaComprehensiveVerification.js` verified 3 back-to-back jobs received `mobo-2026-0008`, `mobo-2026-0009`, `mobo-2026-0010`.
- **Fix Status:** **Retest Passed**

---

### BUG-006: Raw Password Hash Leaked in `createUser` API & Database Response
- **Bug ID:** `BUG-006`
- **Title:** `POST /api/auth/users` and `db.users.create` leaked `password_hash` in JSON response body
- **Severity:** `P1 — High (Security)`
- **Priority:** `High`
- **Affected Module:** `MOD-01 (Authentication & User Management)` / `server/src/controllers/authController.js`, `server/src/db/db.js`
- **Preconditions:** Creating a staff or technician user as an admin.
- **Exact Reproduction Steps:**
  1. Call `POST /api/auth/users` with user details.
  2. Inspect HTTP 201 response payload.
- **Expected Result:** `password_hash` must be omitted from all API responses and database entity returns.
- **Actual Result:** Response body contained `password_hash: "$2b$10$..."`.
- **Root Cause:** `authController.js` sent raw `createdUser` without destructuring, and `db.users.create` Supabase branch returned raw `data`.
- **Fix Implemented:** Added `const { password_hash: _ph, ...safeUser } = createdUser;` in `authController.js` and stripped hash in `db.users.create`.
- **Verification Evidence:** `qaComprehensiveVerification.js` check #5 and #7 confirmed `password_hash` is completely absent from user object.
- **Fix Status:** **Retest Passed**

---

### BUG-007: Dropdown Menu Hardcoded White/Slate Background & Missing CSS Class
- **Bug ID:** `BUG-007`
- **Title:** Hardcoded `bg-white dark:bg-slate-900` in Topbar and `SpatialSelect` causing theme background collision
- **Severity:** `P2 — Medium`
- **Priority:** `Normal`
- **Affected Module:** `MOD-02 (Design System & Theming)` / `Topbar.jsx`, `SpatialSelect.jsx`, `index.css`
- **Preconditions:** Switching to `clean-light` (dark mode) or `futuristic-glass` style.
- **Exact Reproduction Steps:**
  1. Switch to `futuristic-glass`.
  2. Open Style or Color Mode dropdown in Topbar or Customer dropdown in `JobCreate.jsx`.
- **Expected Result:** Dropdown panel should use `--spatial-bg-dropdown` with backdrop blur matching the active theme.
- **Actual Result:** Hardcoded `bg-white dark:bg-slate-900 border-slate-700` overridden theme CSS variables, and `.spatial-dropdown-panel` class was missing in `index.css`.
- **Fix Implemented:** Defined `.spatial-dropdown-panel` in `index.css` with `var(--spatial-bg-dropdown)` and `backdrop-filter: var(--spatial-glass-blur)`. Removed hardcoded slate classes in `Topbar.jsx` and `SpatialSelect.jsx`.
- **Verification Evidence:** Dropdowns now inherit cohesive styling in all 9 theme combinations.
- **Fix Status:** **Retest Passed**

---

### BUG-008: Hardcoded Light Theme in Global ErrorBoundary
- **Bug ID:** `BUG-008`
- **Title:** `ErrorBoundary.jsx` rendered hardcoded `bg-slate-50` and `bg-white` card on unhandled React crash
- **Severity:** `P2 — Medium`
- **Priority:** `Normal`
- **Affected Module:** `MOD-00 (Core Architecture)` / `ErrorBoundary.jsx`
- **Preconditions:** Unhandled render error while user is in Dark Spatial or Futuristic Glass mode.
- **Expected Result:** Error card should adapt to the active dark/spatial theme.
- **Actual Result:** User was presented with a blinding white full-page container.
- **Fix Implemented:** Replaced hardcoded classes with `var(--spatial-bg-app)`, `var(--spatial-bg-card)`, and spatial buttons.
- **Verification Evidence:** Verified dark-spatial aesthetic styling in `ErrorBoundary.jsx`.
- **Fix Status:** **Retest Passed**

---

### BUG-009: Dashboard Metric Fetch Failure Silently Suppressed
- **Bug ID:** `BUG-009`
- **Title:** `fetchStats()` in `Dashboard.jsx` suppressed API error without user feedback
- **Severity:** `P2 — Medium`
- **Priority:** `Normal`
- **Affected Module:** `MOD-03 (Dashboard)` / `Dashboard.jsx`
- **Preconditions:** Network interruption or API timeout while loading dashboard.
- **Actual Result:** Catch block logged to `console.error` without user toast or retry button.
- **Fix Implemented:** Added `toast.error('Failed to load dashboard statistics')`, `fetchError` state, and an empty state card with a "Retry Loading" action.
- **Verification Evidence:** Component now gracefully prompts retry on API failure.
- **Fix Status:** **Retest Passed**

---

### BUG-010: React Compiler Date Function Impurity Warning in InvoicePrintable
- **Bug ID:** `BUG-010`
- **Title:** Impure `new Date()` calls during component render in `InvoicePrintable.jsx`
- **Severity:** `P3 — Low`
- **Priority:** `Low`
- **Affected Module:** `MOD-09 (Billing & Invoices)` / `InvoicePrintable.jsx`
- **Root Cause:** Helper functions `formatSignatureDate` and `formatInwardDate` invoked `new Date()` directly if date parameter was falsy.
- **Fix Implemented:** Guarded `if (!dateVal) return '';` and verified timestamp validity before instantiation.
- **Verification Evidence:** Linter reports 0 purity errors in `InvoicePrintable.jsx`.
- **Fix Status:** **Retest Passed**

