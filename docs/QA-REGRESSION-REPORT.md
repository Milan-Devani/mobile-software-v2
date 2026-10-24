# QA REGRESSION & DEFECT AUDIT REPORT

**Project:** Mobotech Mobile Care v2.0  
**Audit Date:** 2026-10-24  
**Audit Lead:** Senior QA / Full-Stack Quality Engineer  
**Status:** All Critical & High Defects Verified and Resolved

---

## Executive Summary

| Total Bugs Identified | Fixed & Verified | Open / Blocked | Severity Breakdown |
|---|---|---|---|
| **3** | **3** | **0** | **1 P1 High, 1 P2 Medium, 1 P2 Medium** |

---

## Detailed Bug Findings & Resolutions

### BUG-2026-01: Update Estimate Button Enabled on Delivered Job Sheet
- **Bug ID:** `BUG-2026-01`
- **Module:** Repair Jobs / Quotation (`JobDetail.jsx`)
- **Severity:** High (P1)
- **Status:** **FIXED & VERIFIED**
- **Reported By:** User Screenshot (`mobo-2026-0015` in status `Delivered`)
- **Description:** On the Job Detail page (`/jobs/:id`), when a job is marked `DELIVERED` or `CANCELLED`, the "Update Estimate" button in the "Parts & Estimate" tab remained enabled and clickable.
- **Root Cause:** In [`JobDetail.jsx`](file:///e:/New%20folder/software%20v2/client/src/pages/jobs/JobDetail.jsx#L1205-L1211), the button action only checked `['admin', 'technician'].includes(user?.role_id) && !isFreeWarranty`, without verifying `job.status`. While the backend API correctly rejected the call with HTTP 400 (`JOB_LOCKED`), the UI allowed clicking, which could confuse technicians and invite unintended modification attempts on historical delivered invoices.
- **Steps to Reproduce:**
  1. Open any completed repair job in status `Delivered` (e.g., `mobo-2026-0015`).
  2. Click the "Parts & Estimate" tab.
  3. Notice the blue "Update Estimate" button was active and clickable.
- **Expected Result:** The button should be disabled with an explanatory tooltip ("Job is delivered & closed. Reopen job sheet to modify estimate.") and a warning banner explaining that the job sheet must be reopened under warranty before quotation changes are permitted.
- **Fix Applied:**
  1. Defined `isJobClosed = ['DELIVERED', 'CANCELLED'].includes(job.status)` in [`JobDetail.jsx`](file:///e:/New%20folder/software%20v2/client/src/pages/jobs/JobDetail.jsx).
  2. Added `disabled={isJobClosed}` and descriptive `title` to "Update Estimate", "Edit Diagnosis", and "Edit Job Sheet" buttons.
  3. Added an informative banner in the Estimate tab alerting staff that delivered jobs require reopening before modification.
  4. Strengthened backend [`jobController.js`](file:///e:/New%20folder/software%20v2/server/src/controllers/jobController.js) with explicit status locks on `saveDiagnosis` and `saveTests` in addition to `saveEstimate`.
- **Verification:** Verified via automated regression script [`testDeliveredJobLocking.js`](file:///e:/New%20folder/software%20v2/server/src/scripts/testDeliveredJobLocking.js). Both UI and API reject modifications on delivered tickets.

---

### BUG-2026-02: Inner Page Container Width Inconsistency vs. Dashboard
- **Bug ID:** `BUG-2026-02`
- **Module:** UI/UX / Layout Alignment
- **Severity:** Medium (P2)
- **Status:** **FIXED & VERIFIED**
- **Description:** Settings, Job Create, and Vendor Management screens had hardcoded constraints (`max-w-5xl`, `max-w-4xl`, `max-w-7xl`), causing sudden container width jumps and jarring empty margins when navigating from the full-width Dashboard.
- **Root Cause:** Inconsistent outer container classes on top-level page components.
- **Fix Applied:** Standardized outer containers to `w-full` across all pages within the main layout wrapper (`max-w-[1680px]`).
- **Verification:** Visual inspection and build validation across all 14 views.

---

### BUG-2026-03: Route and Tab Switching Visual Blink / Jerk
- **Bug ID:** `BUG-2026-03`
- **Module:** Performance & Transitions
- **Severity:** Medium (P2)
- **Status:** **FIXED & VERIFIED**
- **Description:** Navigating between pages and tabs caused an instantaneous layout unmount and remount with zero easing, perceived by users as a flash or jerk ("jatka").
- **Root Cause:** Absence of route transition keying and lack of CSS cubic-bezier easing keyframes.
- **Fix Applied:**
  1. Created [`TopLoadingBar.jsx`](file:///e:/New%20folder/software%20v2/client/src/components/common/TopLoadingBar.jsx) showing an Apple System Blue progress bar at the top of the viewport during route transitions.
  2. Wrapped `<Outlet />` with `<div key={location.pathname} className="spatial-page-transition">`.
  3. Wrapped all tab contents with `.spatial-tab-pane` easing.
- **Verification:** Smooth 220ms page entry and 180ms tab entry verified with zero layout shift.
