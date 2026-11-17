# DOCUMENTATION INDEX

Complete documentation set for the **Mobotech Mobile Care** repair management
system.

---

## Read in this order

| # | Document | Read it when you want to… |
|---|---|---|
| 1 | **[PROJECT.md](./PROJECT.md)** | Get the 10-minute overview: what it does, stack, layout, how to run it |
| 2 | **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Understand the design: request lifecycle, data layer, routing, security |
| 3 | **[DATABASE.md](./DATABASE.md)** | Work with tables, relationships, statuses, or run a migration |
| 4 | **[API-REFERENCE.md](./API-REFERENCE.md)** | Call or debug an endpoint |
| 5 | **[DASHBOARD.md](./DASHBOARD.md)** | Understand the business dashboard and every metric formula |
| 6 | **[VENDOR-MODULE.md](./VENDOR-MODULE.md)** | Work on two-way vendor money flows and the ledger |
| 7 | **[ENVIRONMENT.md](./ENVIRONMENT.md)** | Configure `.env`, keys, and integrations |
| 8 | **[OPERATIONS.md](./OPERATIONS.md)** | Deploy, back up, test, or troubleshoot |
| 9 | **[CHANGELOG-DASHBOARD.md](./CHANGELOG-DASHBOARD.md)** | Review the dashboard work and its safety proof |

---

## Quick answers

| Question | Short answer | Detail |
|---|---|---|
| What's the backend entry point? | `server/src/index.js` | PROJECT.md §2 |
| Frontend entry point? | `client/index.html` → `main.jsx` → `App.jsx` | ARCHITECTURE.md §4 |
| Where is the schema? | `supabase/schema.sql` (31 tables) + migrations 001–004 | DATABASE.md |
| Is there Prisma? | No. No ORM at all — a `db` façade over Supabase | ARCHITECTURE.md §3 |
| Where's Stripe? | **Nowhere.** Payments are recorded manually | PROJECT.md §6 |
| Where are S3 uploads? | **No S3.** Supabase Storage, local fallback | ARCHITECTURE.md §5 |
| Socket.io? | **No server websockets.** Baileys WhatsApp socket only | PROJECT.md §6 |
| Which AI providers? | Gemini → Groq → OpenRouter | ARCHITECTURE.md §5 |
| Is there a Coupon model? | No — only job/sale discounts | PROJECT.md §6 |
| JWT created / verified? | `authController.login` / `middleware/auth.js` | ARCHITECTURE.md §6 |
| Old dashboard still there? | Yes — `/dashboard/repair-jobs` | DASHBOARD.md |
| Do I need migration 004? | No (optional, additive) | CHANGELOG-DASHBOARD.md §6 |

---

## Document conventions

- Paths are relative to the repository root (`software v2/`).
- `code` formatting is used for files, tables, columns, env keys and routes.
- Figures like ₹220,400 come from live data at the time of writing; treat them
  as examples, not constants.
- Anything marked **legacy** or **unchanged** is preserved deliberately — do not
  "clean it up" without checking who depends on it.

---

## Related documents (pre-existing)

These were in the repo before this documentation set:

- `README.md` — original setup guide *(note: it references a `db.json` layer and
  a 22-table schema that no longer match reality; prefer PROJECT.md)*
- `docs/QA-TEST-PLAN.md`, `docs/QA-TEST-RESULTS.md`, `docs/QA-REGRESSION-REPORT.md`
- `QA_AUDIT_REPORT.md`, `QA_BUGS.md`, `QA_COVERAGE.md`, `QA_TEST_CASES.md`,
  `QA_REGRESSION_RESULTS.md`

---

## Keeping this set current

When you change the system, update the matching document in the same commit:

| Change | Update |
|---|---|
| New table/column | DATABASE.md (+ a migration file) |
| New route | API-REFERENCE.md |
| New env key | ENVIRONMENT.md **and** `.env.example` |
| New metric/card | DASHBOARD.md |
| Vendor money logic | VENDOR-MODULE.md |
| Deploy/ops step | OPERATIONS.md |
| Notable feature work | CHANGELOG-*.md |
