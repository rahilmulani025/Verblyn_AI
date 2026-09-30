/**
 * Secure Device-Bound Local Persistence for Gemini BYOK API Keys
 * Uses Web Crypto API (AES-GCM 256-bit with PBKDF2 key derivation)
 * 
 * Guarantees:
 * 1. Raw API key is NEVER stored in plaintext in localStorage.
 * 2. Raw API key is NEVER sent to Supabase or stored in profiles.
 * 3. Decrypted key exists solely in runtime memory.
 * 4. Stored encrypted payload survives browser refresh and restart.
 */

const STORAGE_KEY = '_vb_byok_vault_v1';
const SALT_STORAGE_KEY = '_vb_byok_salt_v1';
const PBKDF2_ITERATIONS = 100000;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Retrieves or initializes a persistent device-bound salt
 */
function getDeviceSalt(): Uint8Array {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Uint8Array(16);
  }

  const existingSalt = localStorage.getItem(SALT_STORAGE_KEY);
  if (existingSalt) {
    try {
      return base64ToBuffer(existingSalt);
    } catch {
      // Regenerate on corruption
    }
  }

  const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_STORAGE_KEY, bufferToBase64(newSalt));
  return newSalt;
}

/**
 * Derives an AES-GCM CryptoKey using PBKDF2 with device-specific entropy
 */
async function deriveEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
  const entropy = `${window.location.origin}_verblyn_byok_device_envelope_${navigator.userAgent || 'env'}`;
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(entropy),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

interface EncryptedPayload {
  v: number;
  iv: string;
  data: string;
}

/**
 * Encrypts and persists the Gemini API key locally
 */
export async function persistEncryptedGeminiKey(rawKey: string): Promise<boolean> {
  const trimmed = rawKey.trim();
  if (!trimmed || typeof window === 'undefined' || !window.crypto?.subtle) {
    return false;
  }

  try {
    const salt = getDeviceSalt();
    const cryptoKey = await deriveEncryptionKey(salt);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();

    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      cryptoKey,
      enc.encode(trimmed)
    );

    const payload: EncryptedPayload = {
      v: 1,
      iv: bufferToBase64(iv),
      data: bufferToBase64(encryptedContent),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BYOK Storage] Failed to encrypt and persist API key:', err);
    }
    return false;
  }
}

/**
 * Loads and decrypts the persisted Gemini API key into runtime memory
 */
export async function loadPersistedGeminiKey(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.localStorage || !window.crypto?.subtle) {
    return null;
  }

  const rawPayload = localStorage.getItem(STORAGE_KEY);
  if (!rawPayload) return null;

  try {
    const payload: EncryptedPayload = JSON.parse(rawPayload);
    if (!payload.iv || !payload.data) return null;

    const salt = getDeviceSalt();
    const cryptoKey = await deriveEncryptionKey(salt);
    const iv = base64ToBuffer(payload.iv);
    const encryptedData = base64ToBuffer(payload.data);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      cryptoKey,
      encryptedData as BufferSource
    );

    const dec = new TextDecoder();
    const decryptedKey = dec.decode(decryptedBuffer).trim();
    return decryptedKey.length > 5 ? decryptedKey : null;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BYOK Storage] Failed to decrypt persisted API key:', err);
    }
    // Clean up corrupted storage
    removePersistedGeminiKey();
    return null;
  }
}

/**
 * Explicitly removes the persisted encrypted Gemini API key from local storage
 */
export function removePersistedGeminiKey(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Checks whether an encrypted key exists in storage without decrypting
 */
export function hasPersistedGeminiKey(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  return Boolean(localStorage.getItem(STORAGE_KEY));
}
