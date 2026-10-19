import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../../data/baileys_auth');

// In-memory state tracking
let sock = null;
let currentStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED'
let currentQrDataUrl = null;
let connectedUser = null;
let initPromise = null;
let reconnectTimer = null;

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/**
 * Clean & format Indian phone number to WhatsApp JID format
 * e.g. "8758152507" -> "918758152507@s.whatsapp.net"
 */
export const formatJid = (phone) => {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  return `${digits}@s.whatsapp.net`;
};

/**
 * Internal worker for Baileys WhatsApp Web Socket instance
 */
async function _doInitBaileys(forceRestart = false) {
  if (sock && currentStatus === 'CONNECTED' && !forceRestart) {
    return { status: currentStatus, user: connectedUser };
  }

  // Clear any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Gracefully close any existing socket to avoid port/event leaks
  if (sock) {
    try {
      sock.ev?.removeAllListeners();
      sock.end?.();
    } catch (e) {
      // silent cleanup
    }
    sock = null;
  }

  currentStatus = 'CONNECTING';

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const currentSock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: ['Mobotech Care', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    sock = currentSock;

    currentSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentStatus = 'SCAN_QR';
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 300 });
          console.log('📱 [Baileys] New QR code ready. Scan via Dashboard or Terminal.');
        } catch (e) {
          console.error('Error generating QR data URL:', e);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`⚠️ [Baileys] Connection closed. Reason code: ${statusCode}`);

        currentStatus = 'DISCONNECTED';
        currentQrDataUrl = null;

        // If user logged out from their phone, clear stored session credentials
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('🚪 [Baileys] Session logged out. Clearing auth credentials.');
          connectedUser = null;
          sock = null;
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
              fs.mkdirSync(AUTH_DIR, { recursive: true });
            }
          } catch (err) {
            console.error('Error clearing auth dir:', err);
          }
          return;
        }

        // If connection was replaced by another session, do NOT auto-reconnect to avoid loops
        if (statusCode === DisconnectReason.connectionReplaced) {
          console.log('⚠️ [Baileys] Session replaced by another connection. Pausing auto-reconnect.');
          return;
        }

        // Reconnect on network drops, timeouts (408), restart required (515)
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          currentStatus = 'CONNECTING';
          const delay = statusCode === DisconnectReason.restartRequired ? 1500 : 3500;
          reconnectTimer = setTimeout(() => {
            initBaileys(false).catch((e) => console.error('Auto-reconnect error:', e.message));
          }, delay);
        }
      } else if (connection === 'open') {
        currentStatus = 'CONNECTED';
        currentQrDataUrl = null;

        // Safe extraction from currentSock closure
        const userJid = currentSock?.user?.id || sock?.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0];
        connectedUser = {
          jid: userJid,
          phone: phone,
          name: currentSock?.user?.name || sock?.user?.name || 'Mobotech Care',
        };

        console.log('========================================================');
        console.log(`✅ [Baileys] WhatsApp Connected Successfully as: +${phone} (${connectedUser.name})`);
        console.log('========================================================');
      }
    });

    currentSock.ev.on('creds.update', saveCreds);

    return { status: currentStatus, qrDataUrl: currentQrDataUrl };
  } catch (err) {
    currentStatus = 'DISCONNECTED';
    console.error('❌ [Baileys] Initialization failed:', err);
    throw err;
  }
}

/**
 * Public singleton-guarded initializer
 */
export async function initBaileys(forceRestart = false) {
  if (sock && currentStatus === 'CONNECTED' && !forceRestart) {
    return { status: currentStatus, user: connectedUser };
  }

  if (initPromise && !forceRestart) {
    return initPromise;
  }

  initPromise = _doInitBaileys(forceRestart).finally(() => {
    initPromise = null;
  });

  return initPromise;
}

/**
 * Returns the current Baileys connection status & QR code
 */
export function getBaileysStatus() {
  return {
    status: currentStatus,
    isConnected: currentStatus === 'CONNECTED',
    qrDataUrl: currentQrDataUrl,
    user: connectedUser,
  };
}

/**
 * Disconnects and logs out from WhatsApp Web session
 */
export async function logoutBaileys() {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (err) {
    console.warn('Warning during Baileys logout:', err.message);
  } finally {
    sock = null;
    currentStatus = 'DISCONNECTED';
    currentQrDataUrl = null;
    connectedUser = null;
    isInitializing = false;

    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('Error clearing auth dir:', e);
    }
  }

  return { success: true, message: 'WhatsApp session logged out.' };
}

/**
 * Sends a message (Text or PDF Document) directly through the connected WhatsApp instance
 */
export async function sendBaileysMessage({
  phone,
  message,
  mediaUrl,
  documentFilename,
  documentBuffer,
  caption,
}) {
  if (currentStatus !== 'CONNECTED' || !sock) {
    throw new Error('WhatsApp is not connected. Please scan the QR code in Settings first.');
  }

  const jid = formatJid(phone);
  if (!jid) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  try {
    // 1. Sending PDF Document Attachment
    if (documentBuffer) {
      const sentMsg = await sock.sendMessage(jid, {
        document: documentBuffer,
        mimetype: 'application/pdf',
        fileName: documentFilename || 'Document.pdf',
        caption: caption || message || '',
      });
      return { success: true, provider: 'BAILEYS_LOCAL', messageId: sentMsg.key?.id };
    }

    if (mediaUrl) {
      const sentMsg = await sock.sendMessage(jid, {
        document: { url: mediaUrl },
        mimetype: 'application/pdf',
        fileName: documentFilename || 'Document.pdf',
        caption: caption || message || '',
      });
      return { success: true, provider: 'BAILEYS_LOCAL', messageId: sentMsg.key?.id };
    }

    // 2. Sending Standard Text Message
    const sentMsg = await sock.sendMessage(jid, {
      text: message,
    });

    return {
      success: true,
      provider: 'BAILEYS_LOCAL',
      messageId: sentMsg.key?.id,
    };
  } catch (err) {
    console.error(`❌ [Baileys] Failed to send message to ${jid}:`, err);
    throw new Error(err.message || 'Failed to send WhatsApp message via Baileys.');
  }
}
