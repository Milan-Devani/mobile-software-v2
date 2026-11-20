/**
 * Birthday Wishes Service
 * ------------------------------------------------------------------
 * Sends a warm, personal "Happy Birthday" message (WhatsApp + Email) to every
 * customer whose date_of_birth (day + month) matches today's date in IST.
 *
 * Scheduling: started from index.js after DB init. It ticks every 10 minutes
 * and only sends between BIRTHDAY_SEND_FROM_HOUR and BIRTHDAY_SEND_UNTIL_HOUR
 * (IST, default 09:00–21:00), so wishes arrive at a polite time of day.
 *
 * Duplicate protection: a per-day tracker is stored in the `settings` table
 * (key: birthday_wish_tracker) and re-read from Supabase right before each
 * customer is processed, so restarts or a second running server instance
 * (e.g. local + Render) never wish the same customer twice on the same day.
 *
 * Retries: if a channel fails (e.g. WhatsApp disconnected), it is retried on
 * later ticks the same day, up to MAX_ATTEMPTS_PER_CHANNEL.
 *
 * Disable completely with env BIRTHDAY_WISHES_ENABLED=false.
 */
import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';
import { sendBrevoEmail } from './brevoEmailService.js';
import { sendFast2SmsWhatsApp } from './fast2smsService.js';
import { sendOpenWaMessage } from './openWaService.js';
import { getBaileysStatus, sendBaileysMessage } from './baileysService.js';

export const BIRTHDAY_MESSAGE_TYPE = 'BIRTHDAY_WISH';
const TIME_ZONE = 'Asia/Kolkata';
const TRACKER_KEY = 'birthday_wish_tracker';
const TICK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const FIRST_TICK_DELAY_MS = 45 * 1000; // let Baileys reconnect after boot
const MAX_ATTEMPTS_PER_CHANNEL = 3;

const toHour = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 && n <= 24 ? n : fallback;
};
const SEND_FROM_HOUR = toHour(process.env.BIRTHDAY_SEND_FROM_HOUR, 9);
const SEND_UNTIL_HOUR = toHour(process.env.BIRTHDAY_SEND_UNTIL_HOUR, 21);

let schedulerStarted = false;
let runInProgress = false;
let missingColumnWarned = false;

/* ------------------------------------------------------------------ */
/* Date helpers (all "today" logic is in IST)                          */
/* ------------------------------------------------------------------ */

export const getIstNow = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value, 10);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    year,
    month,
    day,
    hour: get('hour'),
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
};

const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Parses 'YYYY-MM-DD' (or an ISO timestamp starting with it). Returns null if invalid. */
export const parseDateOfBirth = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day > daysInMonth) return null;
  return { year, month, day };
};

/**
 * True when the DOB's day+month is "today". Customers born on 29 Feb are
 * wished on 28 Feb in non-leap years so they never miss their wish.
 */
export const isBirthdayToday = (dobValue, today = getIstNow()) => {
  const dob = parseDateOfBirth(dobValue);
  if (!dob) return false;
  if (dob.month === today.month && dob.day === today.day) return true;
  return dob.month === 2 && dob.day === 29 && today.month === 2 && today.day === 28 && !isLeapYear(today.year);
};

/* ------------------------------------------------------------------ */
/* Message composition                                                  */
/* ------------------------------------------------------------------ */

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const firstNameOf = (fullName) => {
  const first = String(fullName || '').trim().split(/\s+/)[0] || '';
  if (!first) return 'Friend';
  return first.charAt(0).toUpperCase() + first.slice(1);
};

/** Small stable hash so a customer gets a different (but deterministic) template each year. */
const pickVariant = (seed, count) => {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % count;
};

const relationshipLine = (customer, today) => {
  const since = customer?.created_at ? new Date(customer.created_at) : null;
  if (!since || Number.isNaN(since.getTime())) {
    return 'Thank you for choosing us and for being such a wonderful part of our journey.';
  }
  const startYear = getIstNow(since).year;
  const years = today.year - startYear;
  if (years >= 2) {
    return `It has been ${years} years since you first trusted us, and we are truly grateful you have stayed with us all this time.`;
  }
  if (years === 1) {
    return 'It has been over a year since you first walked into our shop, and we are grateful you chose to stay with us.';
  }
  return 'We are so happy you became part of our family this year, and we look forward to many more years together.';
};

export const composeBirthdayMessage = ({ customer, shop, today = getIstNow() }) => {
  const shopName = (shop?.name || 'Mobotech Mobile Care').trim();
  const shopPhone = (shop?.phone || '').trim();
  const name = firstNameOf(customer?.full_name);
  const bond = relationshipLine(customer, today);
  const variant = pickVariant(`${customer?.id || name}-${today.year}`, 3);

  const variants = [
    {
      headline: `Happy Birthday, ${name}! 🎉🎂`,
      lines: [
        `Today is all about you. On behalf of everyone at ${shopName}, we wish you a year filled with good health, happiness and moments that make you smile.`,
        bond,
        'Thank you for your trust. It truly means a lot to our small team. 🙏',
        'Have a wonderful day and enjoy every moment of it!',
      ],
    },
    {
      headline: `Many Happy Returns of the Day, ${name}! 🎂🎈`,
      lines: [
        'May this new year of your life bring you success, peace of mind and plenty of reasons to celebrate.',
        bond,
        'You are not just a customer to us, you are part of our family. ❤️',
        'Wishing you a beautiful birthday with your loved ones!',
      ],
    },
    {
      headline: `Happy Birthday, ${name}! 🥳`,
      lines: [
        `A small message with big wishes from all of us at ${shopName}. We hope your day is as special as you are.`,
        bond,
        'May all your dreams come true this year, and may life keep giving you reasons to smile. 😊',
        'Stay happy, stay healthy, and keep shining!',
      ],
    },
  ][variant];

  const signature = `Warm wishes,\nTeam ${shopName}${shopPhone ? `\n📞 ${shopPhone}` : ''}`;

  const whatsapp = `*${variants.headline}*\n\n${variants.lines.join('\n\n')}\n\n${signature.replace(`Team ${shopName}`, `*Team ${shopName}*`)}`;
  const text = `${variants.headline}\n\n${variants.lines.join('\n\n')}\n\n${signature}`;
  const subject = `Happy Birthday, ${name}! 🎂 Warm wishes from ${shopName}`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f1e4d3; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #f59e0b, #ec4899); padding: 28px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 44px; line-height: 1;">🎂</div>
        <h1 style="margin: 12px 0 0; font-size: 24px;">${escapeHtml(variants.headline)}</h1>
      </div>
      <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.7;">
        <p style="margin: 0 0 14px;">Dear <strong>${escapeHtml(customer?.full_name || name)}</strong>,</p>
        ${variants.lines.map((l) => `<p style="margin: 0 0 14px;">${escapeHtml(l)}</p>`).join('')}
        <p style="margin: 22px 0 0;">Warm wishes,<br/><strong>Team ${escapeHtml(shopName)}</strong>${shopPhone ? `<br/><span style="color:#64748b; font-size: 13px;">📞 ${escapeHtml(shopPhone)}</span>` : ''}</p>
      </div>
    </div>`;

  return { subject, whatsapp, text, html };
};

/* ------------------------------------------------------------------ */
/* Tracker (duplicate protection)                                       */
/* ------------------------------------------------------------------ */

const emptyTracker = (dateKey) => ({ date: dateKey, customers: {} });

const readTracker = async (dateKey) => {
  let value = null;
  // Prefer a fresh read from Supabase so multiple server instances agree
  if (isSupabaseConfigured()) {
    try {
      const { data } = await getSupabase().from('settings').select('value').eq('key', TRACKER_KEY).maybeSingle();
      value = data?.value ?? null;
    } catch (_) {
      value = null;
    }
  }
  if (!value) value = await db.settings.get(TRACKER_KEY);
  if (!value || value.date !== dateKey || typeof value.customers !== 'object') {
    return emptyTracker(dateKey);
  }
  return value;
};

const writeTracker = (tracker) =>
  db.settings.set(TRACKER_KEY, tracker, 'Birthday wishes already sent today (auto-managed, resets daily)');

const isChannelDone = (entry) =>
  entry && (entry.status === 'SENT' || entry.status === 'SKIPPED' || (entry.attempts || 0) >= MAX_ATTEMPTS_PER_CHANNEL);

/* ------------------------------------------------------------------ */
/* Data access                                                          */
/* ------------------------------------------------------------------ */

const fetchCustomersWithDob = async () => {
  if (isSupabaseConfigured()) {
    const all = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await getSupabase()
        .from('customers')
        .select('*')
        .not('date_of_birth', 'is', null)
        .range(from, from + PAGE - 1);
      if (error) {
        if (/date_of_birth/i.test(error.message || '') && !missingColumnWarned) {
          missingColumnWarned = true;
          console.warn('[Birthday] ⚠️ customers.date_of_birth column missing. Run supabase/migrations/20261120_customer_date_of_birth.sql');
        }
        if (!/date_of_birth/i.test(error.message || '')) {
          console.warn('[Birthday] ⚠️ Could not load customers:', error.message);
        }
        return [];
      }
      all.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return all;
  }
  const { customers } = await db.customers.list({ limit: 100000, offset: 0 });
  return (customers || []).filter((c) => c.date_of_birth);
};

const getChannelConfig = async () => {
  const cfg = (await db.settings.get('notification_config')) || {};
  return {
    email: cfg.email_enabled !== false,
    whatsapp: cfg.whatsapp_enabled !== false,
  };
};

/* ------------------------------------------------------------------ */
/* Senders                                                              */
/* ------------------------------------------------------------------ */

/** Sends via the first LIVE WhatsApp provider. Returns null when none is available (retry later). */
const sendWhatsApp = async (phone, message) => {
  if (getBaileysStatus().isConnected) {
    const result = await sendBaileysMessage({ phone, message });
    return { provider: 'BAILEYS_LOCAL', result };
  }
  if (env.FAST2SMS_API_KEY && env.FAST2SMS_API_KEY.trim()) {
    const result = await sendFast2SmsWhatsApp({ phone, message });
    return { provider: result?.provider || 'FAST2SMS', result };
  }
  if (env.OPENWA_API_KEY) {
    const result = await sendOpenWaMessage({ phone, message });
    return { provider: 'OPENWA', result };
  }
  return null;
};

/**
 * Sends the birthday wish to one customer on the requested channels.
 * Returns { EMAIL?: {status, ...}, WHATSAPP?: {status, ...} }.
 * Status: SENT | FAILED | SKIPPED | RETRY (no live provider right now).
 */
export const sendBirthdayWish = async ({ customer, channels = ['EMAIL', 'WHATSAPP'], shop = null }) => {
  const shopProfile = shop || (await db.shops.getProfile());
  const msg = composeBirthdayMessage({ customer, shop: shopProfile });
  const outcome = {};

  if (channels.includes('EMAIL')) {
    const email = String(customer.email || '').trim();
    if (!email) {
      outcome.EMAIL = { status: 'SKIPPED', reason: 'No email address' };
    } else {
      try {
        const result = await sendBrevoEmail({
          toEmail: email,
          toName: customer.full_name,
          subject: msg.subject,
          htmlContent: msg.html,
          textContent: msg.text,
        });
        const ok = result?.success !== false;
        await db.notifications.log({
          customerId: customer.id,
          channel: 'EMAIL',
          messageType: BIRTHDAY_MESSAGE_TYPE,
          recipient: email,
          status: ok ? 'SENT' : 'FAILED',
          provider: result?.provider || 'BREVO',
          providerResponse: result,
        });
        outcome.EMAIL = { status: ok ? 'SENT' : 'FAILED', recipient: email };
      } catch (err) {
        await db.notifications.log({
          customerId: customer.id,
          channel: 'EMAIL',
          messageType: BIRTHDAY_MESSAGE_TYPE,
          recipient: email,
          status: 'FAILED',
          provider: 'BREVO',
          errorMessage: err.message,
        });
        outcome.EMAIL = { status: 'FAILED', recipient: email, error: err.message };
      }
    }
  }

  if (channels.includes('WHATSAPP')) {
    // Birthday wishes go to the customer's own WhatsApp (not the in-repair alternate number)
    const phone = String(customer.whatsapp_number || customer.phone || '').trim();
    if (!phone) {
      outcome.WHATSAPP = { status: 'SKIPPED', reason: 'No WhatsApp/phone number' };
    } else {
      try {
        const sent = await sendWhatsApp(phone, msg.whatsapp);
        if (!sent) {
          outcome.WHATSAPP = { status: 'RETRY', recipient: phone, reason: 'No live WhatsApp provider connected' };
        } else {
          const ok = sent.result?.success !== false;
          await db.notifications.log({
            customerId: customer.id,
            channel: 'WHATSAPP',
            messageType: BIRTHDAY_MESSAGE_TYPE,
            recipient: phone,
            status: ok ? 'SENT' : 'FAILED',
            provider: sent.provider,
            providerResponse: sent.result,
          });
          outcome.WHATSAPP = { status: ok ? 'SENT' : 'FAILED', recipient: phone };
        }
      } catch (err) {
        await db.notifications.log({
          customerId: customer.id,
          channel: 'WHATSAPP',
          messageType: BIRTHDAY_MESSAGE_TYPE,
          recipient: phone,
          status: 'FAILED',
          provider: 'WHATSAPP',
          errorMessage: err.message,
        });
        outcome.WHATSAPP = { status: 'FAILED', recipient: phone, error: err.message };
      }
    }
  }

  return outcome;
};

/* ------------------------------------------------------------------ */
/* Daily run                                                            */
/* ------------------------------------------------------------------ */

/**
 * Wishes every customer whose birthday is today (IST).
 * @param {object} opts
 * @param {boolean} [opts.dryRun]      only list who would be wished, send nothing
 * @param {boolean} [opts.ignoreWindow] skip the 09:00–21:00 time check (manual runs)
 */
export const runBirthdayWishes = async ({ dryRun = false, ignoreWindow = false, trigger = 'SCHEDULER' } = {}) => {
  const today = getIstNow();

  if (!ignoreWindow && (today.hour < SEND_FROM_HOUR || today.hour >= SEND_UNTIL_HOUR)) {
    return { skipped: true, reason: `Outside send window (${SEND_FROM_HOUR}:00–${SEND_UNTIL_HOUR}:00 IST)`, date: today.dateKey };
  }
  if (runInProgress) {
    return { skipped: true, reason: 'A birthday run is already in progress', date: today.dateKey };
  }

  runInProgress = true;
  try {
    const customers = (await fetchCustomersWithDob()).filter((c) => isBirthdayToday(c.date_of_birth, today));
    const channelCfg = await getChannelConfig();
    const enabledChannels = [
      ...(channelCfg.email ? ['EMAIL'] : []),
      ...(channelCfg.whatsapp ? ['WHATSAPP'] : []),
    ];

    if (dryRun) {
      const tracker = await readTracker(today.dateKey);
      return {
        date: today.dateKey,
        dryRun: true,
        channels: enabledChannels,
        customers: customers.map((c) => ({
          id: c.id,
          customer_code: c.customer_code,
          full_name: c.full_name,
          date_of_birth: c.date_of_birth,
          email: c.email || '',
          whatsapp: c.whatsapp_number || c.phone || '',
          already: tracker.customers[c.id] || null,
        })),
      };
    }

    const shop = await db.shops.getProfile();
    const results = [];

    for (const customer of customers) {
      // Re-read tracker right before each customer (protects against parallel instances)
      const tracker = await readTracker(today.dateKey);
      const entry = tracker.customers[customer.id] || {};
      const pending = enabledChannels.filter((ch) => !isChannelDone(entry[ch]));
      if (pending.length === 0) continue;

      const outcome = await sendBirthdayWish({ customer, channels: pending, shop });

      const fresh = await readTracker(today.dateKey);
      const merged = { ...(fresh.customers[customer.id] || {}) };
      for (const [ch, res] of Object.entries(outcome)) {
        const prevAttempts = merged[ch]?.attempts || 0;
        if (res.status === 'RETRY') {
          // No provider available yet: don't burn an attempt, try again next tick
          merged[ch] = { status: 'PENDING', attempts: prevAttempts };
        } else {
          merged[ch] = { status: res.status, attempts: prevAttempts + 1, at: new Date().toISOString() };
        }
      }
      fresh.customers[customer.id] = merged;
      await writeTracker(fresh);

      results.push({ customerId: customer.id, name: customer.full_name, outcome });
      console.log(`[Birthday] 🎂 ${customer.full_name} (${customer.customer_code || customer.id}):`, JSON.stringify(outcome));
    }

    return { date: today.dateKey, trigger, birthdaysToday: customers.length, processed: results.length, results };
  } finally {
    runInProgress = false;
  }
};

/** Starts the daily birthday "cron" (every 10 min, sends only inside the IST time window). */
export const startBirthdayScheduler = () => {
  if (schedulerStarted) return;
  if (String(process.env.BIRTHDAY_WISHES_ENABLED || '').toLowerCase() === 'false') {
    console.log('🎂 Birthday wishes scheduler disabled (BIRTHDAY_WISHES_ENABLED=false)');
    return;
  }
  if (env.NODE_ENV === 'test') return;
  schedulerStarted = true;

  const tick = () =>
    runBirthdayWishes({ trigger: 'SCHEDULER' }).catch((err) =>
      console.warn('[Birthday] ⚠️ Scheduled run failed:', err.message)
    );

  setTimeout(tick, FIRST_TICK_DELAY_MS);
  setInterval(tick, TICK_INTERVAL_MS);
  console.log(`🎂 Birthday wishes scheduler started (daily, ${SEND_FROM_HOUR}:00–${SEND_UNTIL_HOUR}:00 IST, checks every 10 min)`);
};
