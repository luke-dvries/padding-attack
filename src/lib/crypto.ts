/**
 * crypto.ts
 *
 * Self-contained AES-CBC + PKCS#7 simulation for the padding oracle visualizer.
 * Uses the browser's native Web Crypto API (window.crypto.subtle) for real AES,
 * so the simulation is cryptographically accurate.
 *
 * NOTE: This module is intentionally a closed, sandboxed simulator. The key is
 * generated inside the app and never exported. The oracle only works on blocks
 * produced by this module. There is no network access or external ciphertext input.
 */

export const BLOCK_SIZE = 16; // AES block size in bytes

// ---------------------------------------------------------------------------
// PKCS#7 padding utilities
// ---------------------------------------------------------------------------

/**
 * Add PKCS#7 padding so that data.length is a multiple of blockSize.
 *
 * Rule: pad with n bytes each having value n, where n = blockSize - (len % blockSize).
 * If len is already a multiple of blockSize, a full extra block of padding is added.
 * This guarantees that padding can always be unambiguously removed.
 *
 * Examples (blockSize = 16):
 *   "HELLO" (5 bytes) → "HELLO" + [0x0b * 11]
 *   "1234567890123456" (16 bytes) → "1234567890123456" + [0x10 * 16]
 */
export function addPKCS7Padding(data: Uint8Array, blockSize = BLOCK_SIZE): Uint8Array {
  const padLen = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  padded.fill(padLen, data.length);
  return padded;
}

/**
 * Validate and strip PKCS#7 padding.
 * Returns the unpadded data, or null if padding is invalid.
 *
 * Validation checks:
 *   1. Last byte value v must satisfy 1 ≤ v ≤ blockSize
 *   2. The last v bytes must all equal v
 */
export function stripPKCS7Padding(data: Uint8Array, blockSize = BLOCK_SIZE): Uint8Array | null {
  if (data.length === 0 || data.length % blockSize !== 0) return null;
  const v = data[data.length - 1];
  if (v < 1 || v > blockSize) return null;
  for (let i = data.length - v; i < data.length; i++) {
    if (data[i] !== v) return null;
  }
  return data.slice(0, data.length - v);
}

/**
 * Check if a 16-byte block ends with valid PKCS#7 padding.
 * This is what the "padding oracle" checks internally.
 */
export function hasValidPadding(block: Uint8Array): boolean {
  return stripPKCS7Padding(block) !== null;
}

// ---------------------------------------------------------------------------
// AES-CBC helpers using Web Crypto API
// ---------------------------------------------------------------------------

/** Generate a random AES-128 key using Web Crypto. */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-CBC', length: 128 },
    true,  // extractable (needed for raw export in debug mode)
    ['encrypt', 'decrypt']
  );
}

/**
 * Copy a Uint8Array into a fresh ArrayBuffer so TypeScript 5's strict
 * Uint8Array<ArrayBufferLike> constraint doesn't conflict with the Web Crypto
 * API which requires ArrayBufferView<ArrayBuffer>.
 */
function toArrayBuffer(src: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(src.byteLength);
  new Uint8Array(buf).set(src);
  return buf;
}

/** Import a raw 16-byte array as an AES-CBC key. */
export async function importKey(rawBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(rawBytes),
    { name: 'AES-CBC' },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-CBC encrypt.
 * Web Crypto automatically adds PKCS#7 padding, so input need not be padded.
 * Returns raw ciphertext bytes (no IV prepended).
 */
export async function aesCbcEncrypt(
  key: CryptoKey,
  iv: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext)
  );
  return new Uint8Array(ct);
}

/**
 * AES-CBC decrypt.
 * Returns the decrypted plaintext (PKCS#7 padding stripped).
 * Throws DOMException (OperationError) if padding is invalid — this is exactly
 * what the padding oracle exploits.
 */
export async function aesCbcDecrypt(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext)
  );
  return new Uint8Array(pt);
}

// ---------------------------------------------------------------------------
// Padding oracle (the core of the simulation)
// ---------------------------------------------------------------------------

/**
 * The padding oracle function.
 *
 * Given a (prevBlock, targetBlock) pair, this function decrypts targetBlock
 * using prevBlock as the CBC IV and returns whether the resulting plaintext
 * has valid PKCS#7 padding.
 *
 * In a real attack, this would be a server endpoint that leaks this bit of
 * information via an error message, HTTP status code, or timing difference.
 * Here it is implemented locally and transparently for educational purposes.
 *
 * The oracle does NOT reveal:
 *   - the decrypted bytes (only valid/invalid)
 *   - the key
 *   - the intermediate state D(targetBlock)
 *
 * @returns true  = valid PKCS#7 padding (oracle says "OK")
 *          false = invalid padding     (oracle says "error")
 */
export async function paddingOracle(
  key: CryptoKey,
  prevBlock: Uint8Array,
  targetBlock: Uint8Array
): Promise<boolean> {
  try {
    // AES-CBC decrypt: decryptedByte[j] = AES_block_decrypt(targetBlock)[j] XOR prevBlock[j]
    // Web Crypto validates PKCS#7 and throws OperationError if invalid.
    await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: toArrayBuffer(prevBlock) },
      key,
      toArrayBuffer(targetBlock)
    );
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Scenario data structure
// ---------------------------------------------------------------------------

export interface ScenarioData {
  name: string;
  description: string;
  key: CryptoKey;

  /** Random 16-byte IV */
  iv: Uint8Array;

  /** Full padded plaintext (length is a multiple of BLOCK_SIZE) */
  paddedPlaintext: Uint8Array;

  /** Full ciphertext output from AES-CBC encrypt (same length as paddedPlaintext) */
  ciphertext: Uint8Array;

  /** Plaintext split into 16-byte blocks (includes PKCS#7 padding in last block) */
  plaintextBlocks: Uint8Array[];

  /** Ciphertext split into 16-byte blocks */
  ciphertextBlocks: Uint8Array[];

  /**
   * Intermediate state blocks: I[i] = AES_block_decrypt(C[i]) = P[i] XOR C[i-1]
   * where C[-1] = IV.
   *
   * These are the "hidden" values that the attacker recovers byte-by-byte.
   * They are computed from the known plaintext during scenario creation and
   * only revealed via the teacher-notes toggle.
   */
  intermediateBlocks: Uint8Array[];

  /** Convenience oracle bound to this scenario's key */
  oracle: (prevBlock: Uint8Array, targetBlock: Uint8Array) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Scenario factory
// ---------------------------------------------------------------------------

/**
 * Create a scenario from a plaintext string.
 *
 * @param name        Display name
 * @param description One-sentence description shown in the UI
 * @param plaintextStr The secret message to encrypt
 * @param fixedKey    Optional 16-byte raw key (for preset reproducible scenarios)
 * @param fixedIV     Optional 16-byte IV  (for preset reproducible scenarios)
 */
export async function createScenario(
  name: string,
  description: string,
  plaintextStr: string,
  fixedKey?: number[],
  fixedIV?: number[]
): Promise<ScenarioData> {
  // Encode text → bytes
  const rawBytes = new TextEncoder().encode(plaintextStr);

  // Generate (or import) key
  const key = fixedKey
    ? await importKey(new Uint8Array(fixedKey))
    : await generateKey();

  // Generate (or use) IV
  const iv = fixedIV
    ? new Uint8Array(fixedIV)
    : crypto.getRandomValues(new Uint8Array(BLOCK_SIZE));

  // Encrypt (Web Crypto adds PKCS#7 padding automatically)
  const ciphertextBytes = await aesCbcEncrypt(key, iv, rawBytes);

  // Reconstruct the padded plaintext (we know it, so we derive it)
  const paddedPlaintext = addPKCS7Padding(rawBytes);

  // Split into 16-byte blocks
  const numBlocks = paddedPlaintext.length / BLOCK_SIZE;
  const plaintextBlocks: Uint8Array[] = [];
  const ciphertextBlocks: Uint8Array[] = [];
  const intermediateBlocks: Uint8Array[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const ptBlock = paddedPlaintext.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE);
    const ctBlock = ciphertextBytes.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE);

    // I[i] = P[i] XOR C[i-1]   (C[-1] = IV)
    const prevCtBlock = i === 0 ? iv : ciphertextBytes.slice((i - 1) * BLOCK_SIZE, i * BLOCK_SIZE);
    const intermediate = new Uint8Array(BLOCK_SIZE);
    for (let j = 0; j < BLOCK_SIZE; j++) {
      intermediate[j] = ptBlock[j] ^ prevCtBlock[j];
    }

    plaintextBlocks.push(ptBlock);
    ciphertextBlocks.push(ctBlock);
    intermediateBlocks.push(intermediate);
  }

  const oracle = (prev: Uint8Array, target: Uint8Array) => paddingOracle(key, prev, target);

  return {
    name,
    description,
    key,
    iv,
    paddedPlaintext,
    ciphertext: ciphertextBytes,
    plaintextBlocks,
    ciphertextBlocks,
    intermediateBlocks,
    oracle,
  };
}

// ---------------------------------------------------------------------------
// Preset scenarios
// ---------------------------------------------------------------------------

/**
 * Preset 1 — "Short Secret"
 * 16 bytes of plaintext → 1 data block + 1 full padding block
 * Shows a full 0x10-byte padding block.
 */
export async function createPreset1(): Promise<ScenarioData> {
  return createScenario(
    'Short Secret',
    'A 16-byte message — the last block is entirely PKCS#7 padding (0x10×16)',
    'SECRET MESSAGE!',  // exactly 16 bytes
    // Fixed key so the scenario is reproducible
    [0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6,
     0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c],
    [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
     0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]
  );
}

/**
 * Preset 2 — "Multi-Block"
 * 28 bytes of plaintext → 1 full block (16 bytes) + 12-byte block with 4 bytes of padding (0x04×4)
 * Demonstrates a multi-byte padding value and two ciphertext blocks to attack.
 */
export async function createPreset2(): Promise<ScenarioData> {
  return createScenario(
    'Multi-Block Message',
    'A 28-byte message across 2 blocks — the last 4 bytes of the final block are 0x04 PKCS#7 padding',
    'Hello, Crypto World! Attack!',  // 28 bytes: padding = 4 bytes of 0x04
    // "Hello, Crypto World! Attack!" = 28 chars, padding = 4 bytes of 0x04
    [0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
     0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81],
    [0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
     0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]
  );
}

/**
 * Create a fully randomized scenario with random key, IV, and a random plaintext
 * chosen from a set of example messages.
 */
export async function createRandomScenario(): Promise<ScenarioData> {
  const messages = [
    'Top Secret: launch at dawn',
    'Password: hunter2',
    'Meet me at the usual place',
    'The quick brown fox jumps',
    'Admin token: abc123xyz',
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  return createScenario('Random Scenario', `"${msg}" — randomized key and IV`, msg);
}
