/**
 * Sakku — Zero-Knowledge Encryption
 * 
 * AES-256-GCM encryption using the browser's built-in Web Crypto API.
 * The developer never sees the user's passphrase or decrypted data.
 * 
 * How it works:
 * 1. User provides a passphrase
 * 2. Passphrase is stretched using PBKDF2 (100K iterations, SHA-256)
 * 3. Data is encrypted with AES-256-GCM
 * 4. Result is downloaded as a .enc file
 * 5. To restore, user provides the same passphrase to decrypt
 */

/**
 * Derive an AES-256 key from a passphrase using PBKDF2
 * @param {string} passphrase - User's secret passphrase
 * @param {Uint8Array} salt - Random salt (16 bytes)
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {string} passphrase - User's secret passphrase
 * @returns {Promise<ArrayBuffer>} - Encrypted data (salt + iv + ciphertext)
 */
export async function encrypt(plaintext, passphrase) {
  const encoder = new TextEncoder();
  
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive key from passphrase
  const key = await deriveKey(passphrase, salt);
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine: salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);
  
  return combined.buffer;
}

/**
 * Decrypt data with AES-256-GCM
 * @param {ArrayBuffer} encryptedData - Encrypted data (salt + iv + ciphertext)
 * @param {string} passphrase - User's secret passphrase
 * @returns {Promise<string>} - Decrypted plaintext
 */
export async function decrypt(encryptedData, passphrase) {
  const data = new Uint8Array(encryptedData);
  
  // Extract salt, iv, ciphertext
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const ciphertext = data.slice(28);
  
  // Derive key from passphrase
  const key = await deriveKey(passphrase, salt);
  
  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(plaintext);
}

/**
 * Convert ArrayBuffer to base64 string (for storage)
 */
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer (for decryption)
 */
export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if a file is an encrypted Sakku backup
 * @param {string} content - File content
 * @returns {boolean}
 */
export function isEncryptedBackup(content) {
  try {
    // Encrypted backups start with base64 of salt+iv+ciphertext
    // They should be valid base64 and long enough
    if (!content || content.length < 100) return false;
    // Try to decode as base64
    const decoded = atob(content.trim());
    // Minimum size: 16 (salt) + 12 (iv) + 16 (AES tag) + some data
    return decoded.length >= 44;
  } catch {
    return false;
  }
}
