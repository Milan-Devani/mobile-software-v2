# QA TEST CASES SPECIFICATION & EXECUTION LOG
**Application:** Mobotech Mobile Care  
**Test Suite:** Integration, Regression, Functional, Security & UI/UX  
**Total Test Cases:** 25

---

### Test Case Index

| Test ID | Category | Description | Preconditions | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| **TC-AUTH-01** | Security / Auth | Reject invalid email & password login | Server running | HTTP 401 Unauthorized, no token emitted | 401 with `AUTH_INVALID_CREDENTIALS` | **PASSED** |
| **TC-AUTH-02** | Security / Auth | Admin user authentication | Seed admin in DB | HTTP 200, JWT token with role `'admin'` | Token returned with correct payload | **PASSED** |
| **TC-AUTH-03** | Security / Auth | Technician authentication & permissions | Seed tech in DB | HTTP 200, JWT token with role `'technician'` | Token returned with technician role | **PASSED** |
| **TC-HLTH-01** | Runtime Health | System health endpoint check | Backend port 5000 | HTTP 200, status `healthy`, environment `development` | Verified healthy | **PASSED** |
| **TC-DASH-01** | Dashboard | Retrieve real-time metrics and pipeline counts | Valid admin token | HTTP 200, summary with total_jobs, 9 pipeline stage counters | 9 stages returned with accurate counters | **PASSED** |
| **TC-CUST-01** | Customer | Register customer with contact details | Valid payload | HTTP 201, auto-generated customer code (CUST-XXXX) | Customer created, CUST-0009 returned | **PASSED** |
| **TC-CUST-02** | Customer | Customer retrieval and search filtering | Customer exists | HTTP 200, partial search returns matching records | Retrieved matching customer by name query | **PASSED** |
| **TC-PART-01** | Inventory | Catalog new spare part in inventory | Part details | HTTP 201, initial stock recorded | Created OLED display assembly with stock 10 | **PASSED** |
| **TC-JOB-01** | Repair Ticket | Create job sheet with 12-point inspection | Customer exists | HTTP 201, status `RECEIVED`, auto JOB-2026-XXXXXX | Created job with 12-point inspection & specs | **PASSED** |
| **TC-JOB-02** | State Machine | Start diagnosis assessment | Job in `RECEIVED` | Status moves to `DIAGNOSING`, audit trail logged | Moved to `DIAGNOSING` with technician log | **PASSED** |
| **TC-EST-01** | Quotation | Generate estimate with parts & service line items | Job in `DIAGNOSING` | Status moves to `ESTIMATE_SENT`, totals computed | Estimate saved, tax and discounts applied | **PASSED** |
| **TC-APPR-01** | Public Gateway | Customer approves estimate via tokenized link | Job in `ESTIMATE_SENT` | Status moves to `APPROVED`, approval timestamp set | Token resolved, approved successfully | **PASSED** |
| **TC-REP-01** | Inventory/Job | Start repair & deduct physical parts stock | Job in `APPROVED` | Status moves to `IN_PROGRESS`, part stock decrements | Status `IN_PROGRESS`, stock decremented from 10 to 9 | **PASSED** |
| **TC-REP-02** | State Machine | Finish physical repair | Job in `IN_PROGRESS` | Status moves to `TESTING` | Moved to `TESTING` | **PASSED** |
| **TC-REP-03** | State Machine | Pass QC testing bench & mark ready | Job in `TESTING` | Status moves to `READY_FOR_PICKUP` | Moved to `READY_FOR_PICKUP` | **PASSED** |
| **TC-INV-01** | Billing | Generate official tax invoice | Job in `READY_FOR_PICKUP` | HTTP 200, invoice number generated, total computed | Invoice generated with clean numbering | **PASSED** |
| **TC-PAY-01** | Finance | Record partial advance customer payment | Invoice generated | Balance due reduces by paid amount | Partial payment of ₹3,000 deducted | **PASSED** |
| **TC-PAY-02** | Finance | Enforce zero-balance before delivery | Job has balance | Disallows delivery until balance is settled | Outstanding balance settlement verified | **PASSED** |
| **TC-REP-04** | Compliance | Record delivery with customer testing confirmation | Balance = 0 | Status moves to `DELIVERED`, hand-over completed | Customer testing & confirmation recorded | **PASSED** |
| **TC-COMM-01**| Gateway | Check Baileys WhatsApp connection status | Linked phone session | `status: CONNECTED`, socket active (`917575841604`) | Connected socket verified | **PASSED** |
| **TC-COMM-02**| Gateway | Live WhatsApp dispatch to customer phone | WhatsApp connected | Delivered to 8758152507, message ID emitted | Message ID `3EB0488E3CCFEC7EFCC8D7` returned | **PASSED** |
| **TC-COMM-03**| Gateway | Live Brevo transactional email dispatch | Brevo API key set | Delivered to milandevani994@gmail.com | Message ID `<202610191937...>` returned | **PASSED** |
| **TC-UI-01**  | Spatial UI | Dropdown z-index & overflow clipping fix | Select component | Floating panel renders above sibling cards (`z-[999]`) | Customer dropdown floats above Section 2 | **PASSED** |
| **TC-UI-02**  | Spatial UI | Inner-box hover micro-interaction | Cards with inner tiles | Hovering lifts inner box (`-translate-y-2px`) | Pipeline stage tiles & settings tiles lift smoothly | **PASSED** |
| **TC-UI-03**  | Theme Engine | 9 Theme combinations persistence | LocalStorage | Pre-mount zero flicker, instant switch across 3 styles | Verified across Dark, Clean Light & Glass | **PASSED** |
