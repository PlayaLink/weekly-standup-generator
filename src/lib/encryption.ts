import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Missing TOKEN_ENCRYPTION_KEY environment variable');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypts a token using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (all hex encoded)
 */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(16);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a token encrypted with encryptToken
 */
export function decryptToken(encrypted: string): string {
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted token format');
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a new encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
