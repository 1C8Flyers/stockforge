import crypto from 'node:crypto';

const ENCRYPTION_VERSION = 'v1';

function getEncryptionKey() {
  const raw = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY || '';
  if (!raw.trim()) {
    throw new Error('EMAIL_SETTINGS_ENCRYPTION_KEY is not configured.');
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    throw new Error('EMAIL_SETTINGS_ENCRYPTION_KEY must be valid base64.');
  }

  if (key.length !== 32) {
    throw new Error('EMAIL_SETTINGS_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM.');
  }

  return key;
}

export function encryptSecret(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_VERSION}:${iv.toString('base64')}:${ciphertext.toString('base64')}:${authTag.toString('base64')}`;
}

export function decryptSecret(enc: string) {
  const [version, ivB64, ciphertextB64, authTagB64] = enc.split(':');
  if (version !== ENCRYPTION_VERSION || !ivB64 || !ciphertextB64 || !authTagB64) {
    throw new Error('Encrypted value format is invalid.');
  }

  try {
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Unable to decrypt email settings secret.');
  }
}
