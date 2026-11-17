# ENVIRONMENT CONFIGURATION

All server keys are read through **`server/src/config/env.js`**, which loads
`server/.env` first, then the repo-root `.env` (both with `override: true`).
Only a few scripts and `pdfService`/`dashboardPdfService` read `process.env`
directly for Chrome paths.

The **client** only uses `VITE_API_URL`.

---

## 1. Server

| Key | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | `development` | `production` changes the CLIENT_URL fallback; `test` disables morgan |
| `API_URL` | `http://localhost:5000` | Own base URL (upload links, keep-alive) |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowlist + links in messages |
| `APP_URL` | falls back to `CLIENT_URL` | Alternate public app URL |

## 2. Auth

| Key | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | *(hardcoded dev fallback)* | HS256 signing key — **must** be set in production |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime (`rememberMe` → `30d`) |

## 3. Supabase (primary database + storage)

| Key | Default | Purpose |
|---|---|---|
| `SUPABASE_URL` | *(empty)* | Project URL. **Empty ⇒ local in-memory mode** |
| `SUPABASE_ANON_KEY` | *(empty)* | Fallback key when the service role key is absent |
| `SUPABASE_SERVICE_ROLE_KEY` | *(empty)* | Preferred server key (bypasses RLS) |
| `SUPABASE_STORAGE_BUCKET` | `repair-assets` | Upload bucket (auto-created public) |
| `DATABASE_URL` | *(empty)* | Direct/pooler Postgres URL — used **only** by backup/restore (`pg_dump`/`psql`) |

> `isSupabaseConfigured()` = `SUPABASE_URL` **and** (`SERVICE_ROLE_KEY` or
> `ANON_KEY`). Without it the app runs from `seedData.js` in memory.

## 4. Email — Brevo

| Key | Purpose |
|---|---|
| `BREVO_API_KEY` | Brevo REST v3 key (primary channel) |
| `BREVO_SENDER_NAME` | Display name (default `MoboTech Mobile Care`) |
| `EMAIL_FROM` | From address |
| `EMAIL_HOST` | SMTP fallback host (default `smtp-relay.brevo.com`) |
| `EMAIL_PORT` | SMTP port (default `587`) |
| `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP credentials (fallback path) |

## 5. WhatsApp

| Key | Purpose |
|---|---|
| `OPENWA_API_URL` | Legacy OpenWA gateway (mostly superseded by Baileys) |
| `OPENWA_API_KEY` | Legacy gateway key |
| `OPENWA_SESSION_ID` | Legacy session id |

Baileys needs **no env keys** — the session lives in
`server/data/baileys_auth/` and is linked by scanning a QR code
(`POST /api/whatsapp/connect`).

## 6. SMS

| Key | Purpose |
|---|---|
| `MSG91_AUTH_KEY` | MSG91 auth key |
| `MSG91_FLOW_ID` | MSG91 flow template id |
| `MSG91_SENDER_ID` | Default `TCHFIX` |
| `MSG91_TEST_MODE` | `true` ⇒ no real SMS sent (auto-true without a key) |
| `FAST2SMS_API_KEY` | Fast2SMS key (WhatsApp/SMS fallback) |
| `FAST2SMS_PHONE_NUMBER_ID` | Fast2SMS sender id |

## 7. Backups (Google Drive + AES-256-GCM)

| Key | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client |
| `GOOGLE_CLIENT_SECRET` | OAuth secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token (`scripts/setupGoogleDriveAuth.js`) |
| `GOOGLE_DRIVE_FOLDER_ID` | Target folder (auto-creates "Supabase Database Backups" if blank) |
| `BACKUP_ENCRYPTION_KEY` | AES-256-GCM key (64 hex chars or passphrase) — **back this up separately** |
| `BACKUP_RETENTION_DAYS` | Default `30` |
| `BACKUP_TEMP_DIR` | Optional staging dir (defaults to OS temp) |
| `BACKUP_TIMEOUT_MS` | Default `300000` (5 min) |
| `BACKUP_SCHEDULE` | Cron documentation, default `0 2 * * *` |

## 8. AI review assistant

| Key | Default | Purpose |
|---|---|---|
| `AI_PRIMARY_PROVIDER` | `gemini` | First provider tried |
| `AI_FALLBACK_PROVIDERS` | `groq,openrouter` | Comma-separated fallback order |
| `GEMINI_API_KEY` | *(empty)* | Google Gemini key |
| `GEMINI_TEXT_MODEL` | `gemini-2.5-flash` | Model id |
| `GROQ_API_KEY` | *(empty)* | Groq key |
| `GROQ_TEXT_MODEL` | `qwen/qwen3.8-27b` | Model id |
| `OPENROUTER_API_KEY` | *(empty)* | OpenRouter key |
| `OPENROUTER_TEXT_MODEL` | `nvidia/nemotron-3.5-lightning:free` | Model id |
| `AI_REQUEST_TIMEOUT` | `20000` | ms per provider attempt |
| `AI_MAX_RETRIES` | `1` | Retries |
| `AI_REVIEW_MAX_WORDS` | `55` | Output length cap |

Configure at least one provider key; otherwise AI generation returns a friendly
"providers unavailable" message and the customer can still submit manually.

## 9. PDF rendering / misc (read outside `env.js`)

| Key | Purpose |
|---|---|
| `CHROME_BIN` | Explicit Chrome/Chromium path for PDF generation |
| `PUPPETEER_EXECUTABLE_PATH` | Alternate Chrome path |
| `LOCALAPPDATA` | Used to locate Chrome on Windows / adb path fallback |
| `RENDER_EXTERNAL_URL` | Injected by Render; enables the self keep-alive pinger |

Chrome resolution order: `CHROME_BIN` → `PUPPETEER_EXECUTABLE_PATH` → standard
Windows/macOS/Linux paths → downloaded `chrome/` folder (`@puppeteer/browsers`,
installed by `postinstall`).

## 10. Client

| Key | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL (client appends `/api` if missing) |

---

## 11. Minimal working sets

| Scenario | Required |
|---|---|
| Local demo (no persistence) | *(nothing — defaults work)* |
| Local with Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Email notifications | `BREVO_API_KEY`, `EMAIL_FROM` |
| WhatsApp | link the Baileys QR (no keys) |
| AI reviews | `GEMINI_API_KEY` (or `GROQ_API_KEY` / `OPENROUTER_API_KEY`) |
| Backups | `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN`, `BACKUP_ENCRYPTION_KEY` |
| Production | everything above + a strong `JWT_SECRET` + `CLIENT_URL` |

---

## 12. `.env.example` gaps (fix these)

Consumed by code but **missing** from `.env.example`:

```
FAST2SMS_API_KEY=
FAST2SMS_PHONE_NUMBER_ID=
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=
GROQ_API_KEY=
GROQ_TEXT_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_TEXT_MODEL=
AI_PRIMARY_PROVIDER=
AI_FALLBACK_PROVIDERS=
AI_REQUEST_TIMEOUT=
AI_MAX_RETRIES=
AI_REVIEW_MAX_WORDS=
BREVO_SENDER_NAME=
CHROME_BIN=
```

Also: root `.env.example` line 38 contains a stray `uuu` token — remove it.

---

## 13. Security notes

- `server/.env` is gitignored — never commit real keys.
- Losing `BACKUP_ENCRYPTION_KEY` makes backups unrecoverable; keep an offline copy.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — server-side only, never ship it to the client.
- Rotating `JWT_SECRET` invalidates all sessions (everyone must log in again).
