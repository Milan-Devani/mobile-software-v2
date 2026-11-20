# Browser QA Run — 2026-11-18

Target: Mobotech Mobile Care in the visible browser. Mutating checks ran only against the isolated copy at `http://localhost:5174` with API `http://localhost:5001`; the configured app/Supabase data was not used for mutations. This follow-up fixes the issues below. Pre-existing staged and modified workspace changes were preserved.

## Test boundaries and setup

The isolated server used an in-memory database, no Supabase credentials, and no live messaging provider. The browser remained visible during testing. The follow-up server restart cleared earlier disposable records; the follow-up created one valid dummy customer and one dummy vendor to recheck forms and pagination. No job, payment, or live message was created during the follow-up.

Per request, Backup/Restore, live WhatsApp/email delivery, test-email/test-WhatsApp buttons, and QR pairing were not exercised. No external messages were sent. No staff account was created or deleted; the staff form was inspected without submitting it.

## Browser and viewport coverage

Loaded 26 paths at each of these viewport sizes (130 route/viewport loads total): 390×844, 768×1024, 1280×832, 1440×900, and 1710×1112. The sweep covered `/dashboard`, `/customers`, customer detail, `/jobs`, `/jobs/new`, job detail, `/parts`, `/sales`, `/sales/new`, `/payments`, `/notifications`, `/reviews`, `/recycle-bin`, `/settings`, `/vendors` and its list/send/receive/transactions/pending/ledger/reports/detail pages, invalid public approval/review links, and `/dashboard/repair-jobs`. The login screen was exercised separately during the technician/admin role checks.

At all five sizes, document and body widths stayed within the viewport; no page-wide horizontal overflow was detected. Representative screenshots were inspected for the mobile repair intake form and desktop retail invoice form. Browser console error log was empty after the route sweep. `/vendors/ledger` added its selected `vendorId` query parameter as expected. `/dashboard/repair-jobs` went through the app's catch-all redirect to `/dashboard`; it is not a registered route and is not counted as a defect.

## Issues found in baseline and follow-up status

| ID | Baseline finding | Follow-up change and verification | Status |
|---|---|---|---|
| QA-001 | Technician UI blocked `/payments`, but baseline `GET /api/payments?limit=10&offset=0` returned the global payment list. A per-job read also worked. | Global `GET /api/payments` now requires staff/admin. Focused API regression returned 403 for technician and 200 for staff/admin. The per-job route remains available to authenticated roles because the Job Detail screen has a Payments & Invoice tab and shows job payment history to technicians; it was not restricted to avoid breaking that workflow. | **Resolved** for global listing; per-job read is intentional product behavior. |
| QA-002 | A 20-digit phone number saved successfully in the customer form. | Shared client validation and server-side validation now allow 6–15 digits with phone formatting characters, reject letters/overlong values, and cap entry at 25 characters. Regression checks: formatted valid number and 15 digits accepted; 20 digits, letters, and 5 digits rejected. API checks rejected an invalid primary and optional phone and accepted a formatted valid number. | **Resolved** |
| QA-003 | `ABC123` was accepted in the edit modal field labeled “15-digit IMEI.” | The edit modal now labels the field “15-digit IMEI or device serial number,” matching supported serial-number values. The dedicated new-job IMEI field and create API now require exactly 15 digits when provided; the separate serial field remains available. Browser verification confirmed `ABC123` is blocked in the dedicated new-job IMEI input. | **Resolved by clarifying serial support and validating the dedicated IMEI field.** |
| QA-004 | Vendor list footer showed zero despite one visible row because the page passed incorrect pagination prop names. | Vendor list, vendor transactions, and sales now pass `currentPage` and `totalItems` to `SpatialPagination`. Recreated a dummy vendor in the browser; the row and footer both showed “Showing 1 to 1 of 1 entries.” The empty sales page showed its zero-result state correctly; a sales record was not created solely to exercise its pagination footer. | **Resolved; sales non-empty footer not re-exercised.** |
| QA-005 | Shop Profile advertised SVG, but the upload API rejects SVG. | Removed SVG from both file-input accept lists and the client MIME allowlist. The visible Shop Profile guidance now reads “PNG, JPG, WEBP (Max 5MB).” No upload was performed in this follow-up. | **Resolved; no upload side effect used for verification.** |

## Validation and workflow checks

- Customer form: malformed email and too-short phone were rejected. A 20-digit phone was accepted and persisted (QA-002).
- Repair intake: empty submission showed required-field errors; short complaint text was rejected. The USB auto-detect flow ended with a clear no-device message when no phone was connected. In the baseline run, `ABC123` saved in the edit modal; follow-up clarified serial support there and verified the separate IMEI field rejects non-15-digit values (QA-003).
- Vendor forms: blank dispatch was blocked; vendor phone input constrained typed data to 10 digits; malformed optional email was rejected; advance amount was capped at ₹9,999,999.99. Dummy dispatch and inward receipt appeared in read-back lists.
- Sales form: price capped at ₹9,999,999.99 and percentage discount capped at 100%. The earlier retail bill/PDF workflow completed. The sales pagination prop mismatch was corrected; its non-empty footer was not re-exercised because the isolated sales list is empty in the follow-up.
- Inventory form: prices above ₹9,999,999.99 and quantities above 9,999,999 were blocked by browser validity checks; no invalid part was saved.
- Recycle bin: soft-deleted the dummy phone-probe customer, verified it in the bin, restored it, and confirmed it returned to Customers.
- Repair workflow from the earlier pass: customer/job intake, estimate and discount, public approval, repair stages, 16-point QC, payment, and delivery completed. Sales PDF download also completed.
- Role check: technician UI was restricted from Payments; the corresponding API read exposure is QA-001. The technician could not access `/api/auth/users` (403) in the earlier role check.

## Post-fix regression checks

- Browser: saved a disposable vendor using a test contact and verified the list row, count card, and pagination footer all updated to one entry.
- Browser: checked the empty Sales & Quick Billing state and verified it reports zero matching bills without a broken footer.
- Browser: Shop Profile now advertises PNG/JPG/WEBP only; upload was not triggered.
- API: admin/staff global payment list reads remained allowed; technician global list read returned 403. The per-job payment route remains available to support job-detail payment history.
- API: invalid customer phone values and invalid IMEI on job creation returned 400; valid formatted phone accepted.
- Client helper: five phone cases checked, with zero mismatches.
- Build: `npm --prefix client run build` passed after the fixes. `node --check` passed for the changed payment route and customer/job controllers, plus vendor controller syntax.
- No full E2E/master suite was rerun after the fixes; its earlier baseline results are listed below. The targeted checks avoided backup/restore and all live notification paths.

## Automated and local checks

| Check | Result |
|---|---|
| `node --check` for all 16 server controllers (baseline) | Pass |
| `npm --prefix client run build` (post-fix) | Pass; bundle-size advisory only |
| Isolated `GET /api/health` | Pass (200) |
| Unauthenticated protected reads | Pass (401) |
| Repair workflow E2E (baseline) | Pass (19 phases) |
| Delivered-job locking, reopen/discount, bulk/pagination (baseline) | Pass |
| Comprehensive verification script (baseline) | Pass (20 checks) |
| Master test suite (baseline) | 19 pass, 1 expected failure because Baileys was deliberately disabled in the isolated sandbox; live messaging was excluded from this QA run |

## Not reproduced or excluded

- Sales pagination's corrected props were verified by source/component contract and build, but not with a bill row after the sandbox reset.
- An earlier vendor-transaction discrepancy was not reproduced in the isolated workflow; dispatch and receipt records appeared on their read-back surfaces.
- Live provider delivery and Backup/Restore were not tested, as requested.

## Overall result

**PASS — 5 baseline issues addressed, with one behavior intentionally retained.** The full route set listed above was checked at five viewport sizes in the baseline pass, and targeted browser/API/build regressions passed after the fixes. Per-job payment reads remain enabled for the job-detail workflow; global payment listing is restricted to staff/admin. This does not cover every possible input combination or every state at every viewport. Backup/restore and live messaging/email remain intentionally untested.
