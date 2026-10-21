import crypto from 'crypto';
import fs from 'fs';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';

const MAGIC_HEADER = Buffer.from('SUPABACKUP', 'ascii'); // 10 bytes
const ARCHIVE_VERSION = 0x01; // 1 byte
const IV_LENGTH = 12; // 12 bytes for AES-256-GCM
const TAG_LENGTH = 16; // 16 bytes auth tag
const HEADER_PREFIX_LENGTH = MAGIC_HEADER.length + 1 + IV_LENGTH; // 10 + 1 + 12 = 23 bytes

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
  fileWriteStream.write(Buffer.from([ARCHIVE_VERSION]));
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
 * Decrypts an encrypted archive file into a plaintext output file.
 * Verifies Magic Header, Version, IV, and AES-256-GCM Authentication Tag.
 * Fails safely if corrupted, wrong key, or tampered.
 */
export async function decryptFileToFile(encryptedFilePath, outputFilePath, rawKey) {
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
    if (version !== ARCHIVE_VERSION) {
      throw new Error(`Unsupported backup archive version: ${version}. Expected ${ARCHIVE_VERSION}.`);
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
    if (err.message.includes('Unsupported state') || err.message.includes('auth') || err.message.includes('decryption')) {
      throw new Error('Decryption integrity verification failed: invalid key or corrupted backup archive.');
    }
    throw err;
  }
}
