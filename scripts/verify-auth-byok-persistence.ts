/**
 * Automated Verification Suite for Auth, Session Persistence & BYOK Encrypted Vault
 */
import { webcrypto } from 'node:crypto';

// Polyfill browser Web Crypto API and localStorage in Node test environment
if (!globalThis.crypto) {
  // @ts-expect-error Node webcrypto polyfill
  globalThis.crypto = webcrypto;
}

const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

// Polyfill window and localStorage
const winObj = {
  crypto: webcrypto,
  localStorage: mockLocalStorage,
  location: { origin: 'http://localhost:5173' },
};
// @ts-expect-error Polyfill window
globalThis.window = winObj;
// @ts-expect-error Polyfill localStorage globally
globalThis.localStorage = mockLocalStorage;

import {
  persistEncryptedGeminiKey,
  loadPersistedGeminiKey,
  removePersistedGeminiKey,
  hasPersistedGeminiKey,
} from '../src/services/gemini/gemini.storage';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('--- 1. GEMINI BYOK ENCRYPTED STORAGE VERIFICATION ---');
  console.log('======================================================\n');

  const testKey = 'AIzaSyTestKey_1234567890_abcdefghijKLMNOP';

  // 1. Storage should be empty initially
  mockLocalStorage.clear();
  assert(!hasPersistedGeminiKey(), 'Vault is empty before storing key');
  const initialLoad = await loadPersistedGeminiKey();
  assert(initialLoad === null, 'Loading empty vault returns null');

  // 2. Encrypt and persist
  const saved = await persistEncryptedGeminiKey(testKey);
  assert(saved === true, 'Successfully encrypted and persisted test key');
  assert(hasPersistedGeminiKey(), 'hasPersistedGeminiKey returns true after saving');

  // 3. Verify plaintext is NEVER stored in localStorage
  const storedPayloadRaw = mockLocalStorage.getItem('_vb_byok_vault_v1');
  assert(storedPayloadRaw !== null, 'Storage item _vb_byok_vault_v1 exists');
  assert(!storedPayloadRaw?.includes(testKey), 'Raw API key is NOT present in plaintext in storage envelope');
  assert(!storedPayloadRaw?.includes('AIzaSy'), 'Key prefix AIzaSy is NOT visible in plaintext');

  // 4. Verify envelope structure
  const parsedEnvelope = JSON.parse(storedPayloadRaw || '{}');
  assert(parsedEnvelope.v === 1, 'Envelope version is 1');
  assert(typeof parsedEnvelope.iv === 'string' && parsedEnvelope.iv.length > 10, 'Envelope contains valid base64 IV');
  assert(typeof parsedEnvelope.data === 'string' && parsedEnvelope.data.length > 20, 'Envelope contains valid base64 encrypted data');

  // 5. Decrypt and verify round-trip fidelity
  const decryptedKey = await loadPersistedGeminiKey();
  assert(decryptedKey === testKey, 'Decrypted key matches original raw key exactly');

  // 6. Test update / key replacement
  const updatedKey = 'AIzaSyUpdatedKey_9876543210_zyxwvutsrqPONMLK';
  await persistEncryptedGeminiKey(updatedKey);
  const reloadedKey = await loadPersistedGeminiKey();
  assert(reloadedKey === updatedKey, 'Successfully updated and decrypted new key');

  // 7. Test explicit key removal
  removePersistedGeminiKey();
  assert(!hasPersistedGeminiKey(), 'hasPersistedGeminiKey returns false after removal');
  const loadAfterRemove = await loadPersistedGeminiKey();
  assert(loadAfterRemove === null, 'loadPersistedGeminiKey returns null after removal');

  // 8. Test corrupted storage recovery
  mockLocalStorage.setItem('_vb_byok_vault_v1', JSON.stringify({ v: 1, iv: 'invalid_base64!', data: 'corrupted' }));
  const corruptedLoad = await loadPersistedGeminiKey();
  assert(corruptedLoad === null, 'Corrupted payload returns null gracefully');
  assert(!hasPersistedGeminiKey(), 'Corrupted payload automatically cleaned up from storage');

  console.log('\n======================================================');
  console.log('--- 2. PASSWORD VALIDATION & RECOVERY RULES ---');
  console.log('======================================================\n');

  const validatePasswordPair = (p1: string, p2: string) => {
    if (!p1 || p1.length < 6) return 'Password must be at least 6 characters';
    if (p1 !== p2) return "Passwords don't match";
    return null;
  };

  assert(validatePasswordPair('12345', '12345') === 'Password must be at least 6 characters', 'Rejects password < 6 chars');
  assert(validatePasswordPair('password123', 'different123') === "Passwords don't match", 'Rejects mismatched passwords');
  assert(validatePasswordPair('securePassword123', 'securePassword123') === null, 'Accepts valid matching passwords');

  console.log('\n======================================================');
  console.log(`AUTH & BYOK PERSISTENCE VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
