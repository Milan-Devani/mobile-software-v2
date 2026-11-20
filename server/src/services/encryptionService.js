import crypto from 'crypto';
import fs from 'fs';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';

const MAGIC_HEADER = Buffer.from('SUPABACKUP', 'ascii'); // 10 bytes
const ARCHIVE_VERSION_V1 = 0x01; // legacy: direct AES-256-GCM with a single key
const ARCHIVE_VERSION_V2 = 0x02; // multi-recipient: Data Encryption Key wrapped per recipient
const IV_LENGTH = 12; // 12 bytes for AES-256-GCM
const TAG_LENGTH = 16; // 16 bytes auth tag
const HEADER_PREFIX_LENGTH = MAGIC_HEADER.length + 1 + IV_LENGTH; // 10 + 1 + 12 = 23 bytes (v1)

// Multi-recipient (v2) envelope layout constants
const DEK_LENGTH = 32; // 256-bit Data Encryption Key
const RECIPIENT_ID_LENGTH = 1;
const WRAP_IV_LENGTH = 12;
const WRAPPED_DEK_LENGTH = DEK_LENGTH; // 32
const WRAP_TAG_LENGTH = 16;
const SLOT_LENGTH = RECIPIENT_ID_LENGTH + WRAP_IV_LENGTH + WRAPPED_DEK_LENGTH + WRAP_TAG_LENGTH; // 61 bytes per recipient slot
const V2_MIN_FILE_SIZE = MAGIC_HEADER.length + 2 + SLOT_LENGTH + IV_LENGTH + TAG_LENGTH; // 10 + 2 + 61 + 12 + 16 = 101

export const RECIPIENT_IDS = {
  OWNER: 0x01,
  SHOPKEEPER: 0x02,
  DEVELOPER: 0x03,
};

export const RECIPIENT_LABELS = {
  [RECIPIENT_IDS.OWNER]: 'Owner',
  [RECIPIENT_IDS.SHOPKEEPER]: 'Shopkeeper',
  [RECIPIENT_IDS.DEVELOPER]: 'Developer',
};

/**
 * Derives a consistent 32-byte (256-bit) encryption key from the configured key string.
 * Supports 64-character hex strings or arbitrary passphrases via scrypt.
 */
export function deriveKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
    throw new Error('BACKUP_ENCRYPTION_KEY is required and must not be empty.');
  }

  const clean = rawKey.trim();
  // If exactly 64 hex characters, use directly as 32-byte Buffer
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return Buffer.from(clean, 'hex');
  }

  // Otherwise deterministically derive using scrypt with fixed application salt
  return crypto.scryptSync(clean, 'repairos-db-backup-v1-salt', 32);
}

/**
 * Generates a cryptographically strong 256-bit (64-character hex) key for user configuration.
 */
export function generateRandomEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypts a Readable stream into an authenticated AES-256-GCM encrypted file.
 * Pipeline: inputStream -> Gzip -> AES-256-GCM Cipher -> temp output -> finalized file with AuthTag
 *
 * File Structure:
 * [MAGIC: 10 bytes "SUPABACKUP"]
 * [VERSION: 1 byte (0x01)]
 * [IV: 12 bytes]
 * [CIPHERTEXT: N bytes]
 * [AUTH_TAG: 16 bytes]
 */
export async function encryptStreamToFile(inputStream, outputFilePath, rawKey) {
  const key = deriveKey(rawKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const gzip = zlib.createGzip({ level: 9 });

  const tempEncPath = `${outputFilePath}.tmp_enc`;
  const fileWriteStream = fs.createWriteStream(tempEncPath);

  // Write header prefix: MAGIC + VERSION + IV
  fileWriteStream.write(MAGIC_HEADER);
  fileWriteStream.write(Buffer.from([ARCHIVE_VERSION_V1]));
  fileWriteStream.write(iv);

  try {
    // Pipe input -> gzip -> cipher -> file
    await pipeline(inputStream, gzip, cipher, fileWriteStream);

    // Retrieve the 16-byte authentication tag calculated by AES-GCM
    const authTag = cipher.getAuthTag();

    // Append the auth tag to the end of the file
    await fs.promises.appendFile(tempEncPath, authTag);

    // Atomic rename to final output
    await fs.promises.rename(tempEncPath, outputFilePath);

    const stats = await fs.promises.stat(outputFilePath);
    return {
      outputFilePath,
      fileSizeBytes: stats.size,
    };
  } catch (err) {
    if (fs.existsSync(tempEncPath)) {
      try { await fs.promises.unlink(tempEncPath); } catch (_) {}
    }
    throw new Error(`Encryption failed: ${err.message}`);
  }
}

/**
 * Encrypts an existing file on disk into an encrypted archive.
 */
export async function encryptFileToFile(inputFilePath, outputFilePath, rawKey) {
  const readStream = fs.createReadStream(inputFilePath);
  return encryptStreamToFile(readStream, outputFilePath, rawKey);
}

/**
 * Normalizes recipient input into [{ id, key }].
 * Accepts a single key string (treated as Owner) or an array of { id, key } entries.
 */
function normalizeRecipients(recipients) {
  if (typeof recipients === 'string') {
    return [{ id: RECIPIENT_IDS.OWNER, key: recipients }];
  }
  if (!Array.isArray(recipients)) return [];
  return recipients
    .filter((r) => r && typeof r.key === 'string' && r.key.trim().length > 0)
    .map((r) => ({ id: r.id ?? RECIPIENT_IDS.OWNER, key: r.key }));
}

/**
 * Wraps (encrypts) the 32-byte Data Encryption Key with a recipient's key using AES-256-GCM.
 */
function wrapDataKey(dataKey, recipientKey) {
  const iv = crypto.randomBytes(WRAP_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', recipientKey, iv);
  const wrapped = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, wrapped, tag };
}

/**
 * Unwraps (decrypts) a recipient-wrapped Data Encryption Key.
 * Throws if the recipient key is wrong (GCM auth tag verification fails).
 */
function unwrapDataKey(wrapped, tag, iv, recipientKey) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', recipientKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(wrapped), decipher.final()]);
}

/**
 * Encrypts a file into a multi-recipient AES-256-GCM archive (ARCHIVE_VERSION_V2).
 *
 * A fresh random 256-bit Data Encryption Key (DEK) encrypts the data, and that DEK is
 * then wrapped (encrypted) separately with each recipient key. Any one recipient key
 * can therefore independently unlock and decrypt the same archive.
 *
 * recipients: string (single Owner key) or [{ id, key }] entries using RECIPIENT_IDS.
 */
export async function encryptFileToFileMultiRecipient(inputFilePath, outputFilePath, recipients) {
  const normalized = normalizeRecipients(recipients);
  if (normalized.length === 0) {
    throw new Error('At least one recipient key is required for multi-recipient encryption.');
  }

  const dataKey = crypto.randomBytes(DEK_LENGTH);
  const dataIv = crypto.randomBytes(IV_LENGTH);

  const slots = [];
  for (const recipient of normalized) {
    const recipientKey = deriveKey(recipient.key);
    const { iv, wrapped, tag } = wrapDataKey(dataKey, recipientKey);
    slots.push({ id: recipient.id, iv, wrapped, tag });
  }

  const readStream = fs.createReadStream(inputFilePath);
  return encryptStreamToFileV2(readStream, outputFilePath, dataKey, dataIv, slots);
}

/**
 * Streams plaintext -> gzip -> AES-256-GCM (DEK) into the multi-recipient v2 file layout:
 * [MAGIC:10][VERSION:1 (0x02)][SLOT_COUNT:1][SLOT*N][DATA_IV:12][CIPHERTEXT][DATA_AUTH_TAG:16]
 */
async function encryptStreamToFileV2(inputStream, outputFilePath, dataKey, dataIv, slots) {
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, dataIv);
  const gzip = zlib.createGzip({ level: 9 });
  const tempEncPath = `${outputFilePath}.tmp_enc`;
  const fileWriteStream = fs.createWriteStream(tempEncPath);

  fileWriteStream.write(MAGIC_HEADER);
  fileWriteStream.write(Buffer.from([ARCHIVE_VERSION_V2]));
  fileWriteStream.write(Buffer.from([slots.length]));

  for (const slot of slots) {
    const slotBuf = Buffer.alloc(SLOT_LENGTH);
    slotBuf.writeUInt8(slot.id, 0);
    slot.iv.copy(slotBuf, RECIPIENT_ID_LENGTH);
    slot.wrapped.copy(slotBuf, RECIPIENT_ID_LENGTH + WRAP_IV_LENGTH);
    slot.tag.copy(slotBuf, RECIPIENT_ID_LENGTH + WRAP_IV_LENGTH + WRAPPED_DEK_LENGTH);
    fileWriteStream.write(slotBuf);
  }

  fileWriteStream.write(dataIv);

  try {
    await pipeline(inputStream, gzip, cipher, fileWriteStream);
    const authTag = cipher.getAuthTag();
    await fs.promises.appendFile(tempEncPath, authTag);
    await fs.promises.rename(tempEncPath, outputFilePath);
    const stats = await fs.promises.stat(outputFilePath);
    return {
      outputFilePath,
      fileSizeBytes: stats.size,
    };
  } catch (err) {
    if (fs.existsSync(tempEncPath)) {
      try { await fs.promises.unlink(tempEncPath); } catch (_) {}
    }
    throw new Error(`Encryption failed: ${err.message}`);
  }
}

/**
 * Decrypts an encrypted archive file into a plaintext output file.
 * Verifies Magic Header, Version, IV, and AES-256-GCM Authentication Tag.
 * Fails safely if corrupted, wrong key, or tampered.
 */
export async function decryptFileToFile(encryptedFilePath, outputFilePath, rawKey) {
  const stats = await fs.promises.stat(encryptedFilePath);
  if (stats.size < HEADER_PREFIX_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted archive is invalid or truncated: file size is too small.');
  }

  const fd = await fs.promises.open(encryptedFilePath, 'r');
  let version;
  try {
    const magicBuf = Buffer.alloc(MAGIC_HEADER.length);
    await fd.read(magicBuf, 0, MAGIC_HEADER.length, 0);
    if (!magicBuf.equals(MAGIC_HEADER)) {
      throw new Error('Invalid backup archive: missing SUPABACKUP magic header.');
    }
    const versionBuf = Buffer.alloc(1);
    await fd.read(versionBuf, 0, 1, MAGIC_HEADER.length);
    version = versionBuf[0];
  } finally {
    try { await fd.close(); } catch (_) {}
  }

  if (version === ARCHIVE_VERSION_V1) {
    return decryptFileToFileV1(encryptedFilePath, outputFilePath, rawKey);
  }
  if (version === ARCHIVE_VERSION_V2) {
    return decryptFileToFileV2(encryptedFilePath, outputFilePath, rawKey);
  }
  throw new Error(`Unsupported backup archive version: ${version}.`);
}

/**
 * Legacy single-key decrypt path (ARCHIVE_VERSION_V1). Kept for backward
 * compatibility with backups created before multi-recipient encryption.
 */
async function decryptFileToFileV1(encryptedFilePath, outputFilePath, rawKey) {
  const key = deriveKey(rawKey);

  const stats = await fs.promises.stat(encryptedFilePath);
  if (stats.size < HEADER_PREFIX_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted archive is invalid or truncated: file size is too small.');
  }

  const fd = await fs.promises.open(encryptedFilePath, 'r');
  try {
    // 1. Read header prefix (23 bytes)
    const headerPrefixBuf = Buffer.alloc(HEADER_PREFIX_LENGTH);
    await fd.read(headerPrefixBuf, 0, HEADER_PREFIX_LENGTH, 0);

    const magic = headerPrefixBuf.subarray(0, MAGIC_HEADER.length);
    if (!magic.equals(MAGIC_HEADER)) {
      throw new Error('Invalid backup archive: missing SUPABACKUP magic header.');
    }

    const version = headerPrefixBuf[MAGIC_HEADER.length];
    if (version !== ARCHIVE_VERSION_V1) {
      throw new Error(`Unsupported backup archive version: ${version}. Expected ${ARCHIVE_VERSION_V1}.`);
    }

    const iv = headerPrefixBuf.subarray(MAGIC_HEADER.length + 1, HEADER_PREFIX_LENGTH);

    // 2. Read AuthTag from the last 16 bytes of the file
    const authTag = Buffer.alloc(TAG_LENGTH);
    await fd.read(authTag, 0, TAG_LENGTH, stats.size - TAG_LENGTH);

    await fd.close();

    // 3. Setup Decipher with verified AuthTag
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const gunzip = zlib.createGunzip();

    // 4. Create readable stream for ciphertext between header and tag
    const ciphertextStream = fs.createReadStream(encryptedFilePath, {
      start: HEADER_PREFIX_LENGTH,
      end: stats.size - TAG_LENGTH - 1,
    });

    const outStream = fs.createWriteStream(outputFilePath);

    // Pipe ciphertext -> decipher -> gunzip -> output
    await pipeline(ciphertextStream, decipher, gunzip, outStream);

    return {
      outputFilePath,
      verified: true,
    };
  } catch (err) {
    if (fs.existsSync(outputFilePath)) {
      try { await fs.promises.unlink(outputFilePath); } catch (_) {}
    }
    const msg = err.message || '';
    if (
      msg.includes('Unsupported state') ||
      msg.includes('auth') ||
      msg.includes('decryption') ||
      msg.includes('incorrect header check') ||
      msg.includes('unexpected end of file') ||
      msg.includes('invalid distance') ||
      msg.includes('invalid code lengths') ||
      msg.includes('invalid block type')
    ) {
      throw new Error('Decryption failed: wrong key or corrupted backup archive.');
    }
    throw err;
  }
}

/**
 * Multi-recipient decrypt path (ARCHIVE_VERSION_V2).
 * Unwraps the Data Encryption Key using the provided recipient key, then decrypts the data.
 */
async function decryptFileToFileV2(encryptedFilePath, outputFilePath, rawKey) {
  const key = deriveKey(rawKey);

  const stats = await fs.promises.stat(encryptedFilePath);
  if (stats.size < V2_MIN_FILE_SIZE) {
    throw new Error('Encrypted archive is invalid or truncated: file size is too small.');
  }

  const fd = await fs.promises.open(encryptedFilePath, 'r');
  try {
    const magicBuf = Buffer.alloc(MAGIC_HEADER.length);
    await fd.read(magicBuf, 0, MAGIC_HEADER.length, 0);
    if (!magicBuf.equals(MAGIC_HEADER)) {
      throw new Error('Invalid backup archive: missing SUPABACKUP magic header.');
    }

    const versionBuf = Buffer.alloc(1);
    await fd.read(versionBuf, 0, 1, MAGIC_HEADER.length);
    if (versionBuf[0] !== ARCHIVE_VERSION_V2) {
      throw new Error(`Unsupported backup archive version: ${versionBuf[0]}. Expected ${ARCHIVE_VERSION_V2}.`);
    }

    const slotCountBuf = Buffer.alloc(1);
    await fd.read(slotCountBuf, 0, 1, MAGIC_HEADER.length + 1);
    const slotCount = slotCountBuf[0];
    if (slotCount < 1 || slotCount > 8) {
      throw new Error('Invalid backup archive: bad recipient slot count.');
    }

    const slots = [];
    for (let i = 0; i < slotCount; i++) {
      const slotBuf = Buffer.alloc(SLOT_LENGTH);
      await fd.read(slotBuf, 0, SLOT_LENGTH, MAGIC_HEADER.length + 2 + i * SLOT_LENGTH);
      slots.push({
        id: slotBuf[0],
        iv: Buffer.from(slotBuf.subarray(RECIPIENT_ID_LENGTH, RECIPIENT_ID_LENGTH + WRAP_IV_LENGTH)),
        wrapped: Buffer.from(slotBuf.subarray(RECIPIENT_ID_LENGTH + WRAP_IV_LENGTH, RECIPIENT_ID_LENGTH + WRAP_IV_LENGTH + WRAPPED_DEK_LENGTH)),
        tag: Buffer.from(slotBuf.subarray(RECIPIENT_ID_LENGTH + WRAP_IV_LENGTH + WRAPPED_DEK_LENGTH, SLOT_LENGTH)),
      });
    }

    const dataIvOffset = MAGIC_HEADER.length + 2 + slotCount * SLOT_LENGTH;
    const dataIv = Buffer.alloc(IV_LENGTH);
    await fd.read(dataIv, 0, IV_LENGTH, dataIvOffset);

    const authTag = Buffer.alloc(TAG_LENGTH);
    await fd.read(authTag, 0, TAG_LENGTH, stats.size - TAG_LENGTH);

    await fd.close();

    // Unwrap the DEK with the provided key (try every recipient slot until one matches)
    let dataKey = null;
    let matchedRecipientId = null;
    for (const slot of slots) {
      try {
        dataKey = unwrapDataKey(slot.wrapped, slot.tag, slot.iv, key);
        matchedRecipientId = slot.id;
        break;
      } catch (_) {
        // Wrong key for this slot — try the next recipient slot
      }
    }
    if (!dataKey) {
      throw new Error('Decryption key is wrong. Please check the key and try again.');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, dataIv);
    decipher.setAuthTag(authTag);

    const gunzip = zlib.createGunzip();

    const ciphertextStream = fs.createReadStream(encryptedFilePath, {
      start: dataIvOffset + IV_LENGTH,
      end: stats.size - TAG_LENGTH - 1,
    });

    const outStream = fs.createWriteStream(outputFilePath);

    await pipeline(ciphertextStream, decipher, gunzip, outStream);

    return {
      outputFilePath,
      verified: true,
      recipientId: matchedRecipientId,
      recipientLabel: RECIPIENT_LABELS[matchedRecipientId] || `Recipient ${matchedRecipientId}`,
    };
  } catch (err) {
    if (fs.existsSync(outputFilePath)) {
      try { await fs.promises.unlink(outputFilePath); } catch (_) {}
    }
    const msg = err.message || '';
    if (
      msg.includes('Unsupported state') ||
      msg.includes('auth') ||
      msg.includes('decryption') ||
      msg.includes('invalid key') ||
      msg.includes('bad recipient') ||
      msg.includes('incorrect header check') ||
      msg.includes('unexpected end of file') ||
      msg.includes('invalid distance') ||
      msg.includes('invalid code lengths') ||
      msg.includes('invalid block type')
    ) {
      throw new Error('Decryption failed: wrong key or corrupted backup archive.');
    }
    throw err;
  }
}
