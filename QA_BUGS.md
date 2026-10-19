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
