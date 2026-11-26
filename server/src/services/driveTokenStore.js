// Central store for Google Drive OAuth refresh tokens.
//
// Google OAuth refresh tokens are dynamic secrets: they change whenever the
// user re-authorizes, and they can expire (e.g. an OAuth app in "Testing" mode
// issues tokens that last only 7 days). Writing them only to server/.env is
// fragile in production (Render's filesystem is ephemeral), so we also mirror
// them into the Supabase-backed `settings` table, which is reloaded into memory
// on every boot via syncFromSupabase().
import { db } from '../db/db.js';
import { env } from '../config/env.js';

const KEY_ACCOUNT_1 = 'google_drive_refresh_token';
const KEY_ACCOUNT_2 = 'google_drive_refresh_token_2';
const KEY_EMAIL_1 = 'google_drive_email';
const KEY_EMAIL_2 = 'google_drive_email_2';

/**
 * Persists a Google Drive refresh token for Account 1 or 2 into the database.
 */
export async function saveDriveRefreshToken(accountIndex, refreshToken) {
  if (!refreshToken) return;
  const isSecond = Number(accountIndex) === 2;
  const key = isSecond ? KEY_ACCOUNT_2 : KEY_ACCOUNT_1;
  const label = isSecond ? 2 : 1;
  try {
    await db.settings.set(
      key,
      String(refreshToken).trim(),
      `Google Drive OAuth refresh token (Account ${label})`,
    );
  } catch (err) {
    console.warn(`⚠️ Failed to persist Google Drive refresh token (Account ${label}) to DB:`, err.message);
  }
}

/**
 * Persists the connected Google Drive account email for Account 1 or 2 into the database
 * so it remains visible in the UI even if the token later expires or before a live fetch completes.
 */
export async function saveDriveAccountEmail(accountIndex, email) {
  const cleaned = typeof email === 'string' ? email.trim() : '';
  if (!cleaned) return;
  const isSecond = Number(accountIndex) === 2;
  const key = isSecond ? KEY_EMAIL_2 : KEY_EMAIL_1;
  const label = isSecond ? 2 : 1;
  try {
    await db.settings.set(
      key,
      cleaned,
      `Connected Google Drive email (Account ${label})`,
    );
  } catch (err) {
    console.warn(`⚠️ Failed to persist Google Drive email (Account ${label}) to DB:`, err.message);
  }
}

/**
 * Reads the last saved Google Drive account email for Account 1 or 2 from the database.
 */
export async function getSavedDriveAccountEmail(accountIndex) {
  const isSecond = Number(accountIndex) === 2;
  const key = isSecond ? KEY_EMAIL_2 : KEY_EMAIL_1;
  try {
    const val = await db.settings.get(key);
    return typeof val === 'string' && val.trim() ? val.trim() : null;
  } catch (_) {
    return null;
  }
}

/**
 * Loads any DB-persisted refresh tokens into the runtime env object when the
 * matching env var is not already set. Called at boot and before token checks.
 */
export async function hydrateDriveTokensFromDb() {
  try {
    if (!env.GOOGLE_REFRESH_TOKEN) {
      const t1 = await db.settings.get(KEY_ACCOUNT_1);
      if (typeof t1 === 'string' && t1.trim()) env.GOOGLE_REFRESH_TOKEN = t1.trim();
    }
    if (!env.GOOGLE_REFRESH_TOKEN_2) {
      const t2 = await db.settings.get(KEY_ACCOUNT_2);
      if (typeof t2 === 'string' && t2.trim()) env.GOOGLE_REFRESH_TOKEN_2 = t2.trim();
    }
  } catch (err) {
    console.warn('⚠️ Could not hydrate Google Drive refresh tokens from DB:', err.message);
  }
}
