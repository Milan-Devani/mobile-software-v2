# OPERATIONS

Deployment, backups, testing and troubleshooting.

---

## 1. Deployment

### Backend → Render
1. `render.yaml` at the repo root describes the service.
2. Build: `npm --prefix server install` (the `postinstall` hook downloads
   `chrome-headless-shell` for PDF generation).
3. Start: `node src/index.js`.
4. Set every required env var in the Render dashboard (see ENVIRONMENT.md).
5. The server self-pings `RENDER_EXTERNAL_URL/health` every 9 minutes to avoid
   idle sleep.

### Frontend → Vercel
1. Root directory: `client`.
2. Build command: `npm run build` (output `dist`).
3. Set `VITE_API_URL=https://<your-render-service>.onrender.com/api`.
4. `client/vercel.json` provides SPA rewrites.

### First-deploy checklist
- [ ] `server/.env` present with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Strong `JWT_SECRET` (not the dev fallback)
- [ ] `CLIENT_URL` points at the Vercel URL (CORS + message links)
- [ ] `supabase/schema.sql` + `supabase/seed.sql` applied
- [ ] Migrations `001`–`004` applied
- [ ] `VITE_API_URL` set in Vercel
- [ ] Login works with `admin@mobotech.com` / `Admin@123456`
- [ ] Replace the seeded admin account with a real one

---

## 2. Backups & restore

**Scope:** full logical dump via `pg_dump` using `DATABASE_URL`.

```
POST /api/backups            (admin)   → run now
GET  /api/backups            (admin)   → history (backup_logs)
GET  /api/backups/status     (admin)   → progress
POST /api/backups/restore    (admin)   → restore from a backup
```

Pipeline: `pg_dump` → AES-256-GCM encrypt (`BACKUP_ENCRYPTION_KEY`) → upload to
Google Drive (`GOOGLE_DRIVE_FOLDER_ID`) → log to `backup_logs` → prune files
older than `BACKUP_RETENTION_DAYS`.

CLI helpers:
```bash
node server/src/scripts/setupGoogleDriveAuth.js   # one-time OAuth consent
node server/src/scripts/runScheduledBackup.js     # cron entry point
node server/src/scripts/restoreBackup.js          # manual restore
node server/src/scripts/testBackupSystem.js       # verify end-to-end
```

**Restore drills are mandatory.** A restore is only verified when the app boots
against the restored DB and a known job/invoice is present.

---

## 3. Testing

| Command | What it does |
|---|---|
| `npm test` | Runs `tests/e2e.js` against a live server |
| `node server/src/scripts/runMasterTestSuite.js` | 20+ API integration tests |
| `node server/src/scripts/testDeliveredJobLocking.js` | Delivered-job immutability |
| `node server/src/scripts/testReopenAndDiscount.js` | Reopen + discount rules |
| `node server/src/scripts/testBulkAndPagination.js` | Bulk ops + pagination |
| `node server/src/scripts/qaComprehensiveVerification.js` | Full QA sweep |
| `node server/src/scripts/testReviewAssistantE2E.js` | AI review flow |
| `node server/src/scripts/testSupabaseConnection.js` | Connectivity |

Manual smoke test after any change:
1. `npm run dev`
2. Log in → `/dashboard` loads every card (no console errors)
3. `/dashboard/repair-jobs` still loads the classic view
4. Create a job → diagnosis → estimate → start repair → QC → pickup → invoice PDF
5. Create a sale → download PDF
6. Vendor: send → receive → record payment → ledger updates
7. `/api/dashboard/stats` and `/api/dashboard/analytics` both return 200

---

## 4. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ERR_CONNECTION_REFUSED` on first load | Render cold start | Client auto-retries 3×; the `App.jsx` `/health` ping wakes the server |
| 401 loop / instant logout | `JWT_SECRET` changed, or token expired | Log in again; keep `JWT_SECRET` stable |
| Data appears stale for a few seconds | In-memory mirror (≤5 s) | Wait, or force a sync |
| Job/invoice writes succeed but vanish | Supabase write dropped an unknown column | Check logs for `Could not find the 'x' column`; add the column via migration |
| Recycle bin empty in the dashboard | It is not mirrored — read live | Verify `db.recycleBinStats.findAll()` reachability |
| PDF download 500 | No Chrome binary found | Set `CHROME_BIN`, or re-run `npm --prefix server install` |
| Invoice PDF text not found by grep | Chrome compresses content streams | Verify visually, not by string search |
| WhatsApp status `DISCONNECTED` | Session expired | `POST /api/whatsapp/connect` and rescan the QR |
| Emails not delivered | Bad Brevo key / unverified sender | Check `notification_logs.error_message` |
| AI review says "providers unavailable" | No provider key, or all quotas hit | Set `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` |
| Sales invoice numbers skip | Sequence also scans recycle bin + Supabase | By design — prevents re-use |
| Vendor "Paid To Vendors" is ₹0 | No `PAYMENT_TO_VENDOR` vouchers | Record a vendor payment |
| Dashboard totals look low | Range filter is "This Month" | Switch to "All Time" |

**Log locations**
- Server stdout — morgan (HTTP), `[AI Review]`, `⚠️ Supabase [table] …`
- Render → Logs tab
- `notification_logs` table — per-message provider responses

---

## 5. Monitoring

| Signal | Where |
|---|---|
| Uptime | `GET /api/health` |
| Errors | Render logs / `errorHandler` output |
| Notification failures | `notification_logs` where `status = 'FAILED'` |
| Backup health | `backup_logs` + `/api/backups/status` |
| WhatsApp connection | `GET /api/whatsapp/status` |
| AI fallback rate | logs `🤖 [AI Review] … succeeded` vs `⚠️ … failed` |

---

## 6. Housekeeping

- **Recycle bin** auto-purges records older than 30 days (hourly interval).
- **Backup retention** prunes files older than `BACKUP_RETENTION_DAYS` (30).
- **Vendor session** files in `server/data/baileys_auth/` are sensitive — back
  them up or be prepared to re-link WhatsApp.
- **`server/uploads/`** holds local attachments when Supabase Storage fails;
  back it up or migrate to storage.
- **Dependency updates** — Vite/React majors move fast; build + smoke test after
  each upgrade.

---

## 7. Security hardening backlog

1. Restrict the CORS callback to `allowedOrigins` only (currently permissive).
2. Remove the hardcoded `JWT_SECRET` fallback — fail fast if unset in production.
3. Serve `/uploads` behind auth (or signed URLs).
4. Add request-schema validation (zod) to every mutating route.
5. Rotate seeded default passwords; enforce a minimum password policy.
6. Add structured audit logging for destructive actions (bulk delete, restore).
