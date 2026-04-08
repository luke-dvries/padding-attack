/**
 * attackEngine.ts
 *
 * Pure state machine for the CBC padding oracle attack on a single ciphertext block.
 *
 * Attack summary
 * ═══════════════
 * Goal: Recover the plaintext P[i] of ciphertext block C[i] without knowing the key.
 *
 * CBC decryption identity:
 *   P[i] = AES_block_decrypt(C[i])  XOR  C[i-1]
 *         ────────────────────────
 *             Intermediate I[i]
 *
 * So: P[i][j] = I[i][j] XOR C[i-1][j]   for each byte j in [0, 15]
 *
 * Attack per byte (working right-to-left, pos = 15 down to 0):
 * ─────────────────────────────────────────────────────────────
 * 1. Choose target padding value: pad = 16 − pos  (e.g. pos=15 → pad=0x01)
 * 2. Build a modified previous block C'[i-1]:
 *      C'[j]  = pad XOR I[j]        for j > pos  (already known)
 *      C'[pos] = guess              (candidate byte, 0x00..0xFF)
 *      C'[j]  = C[i-1][j]          for j < pos  (don't care / keep original)
 * 3. Ask the oracle: does AES_CBC_decrypt(C[i], IV=C'[i-1]) have valid padding?
 * 4. When oracle returns true:
 *      I[pos] XOR guess = pad
 *      ⟹ I[pos] = pad XOR guess
 *      ⟹ P[pos] = I[pos] XOR C[i-1][pos]  ← original C[i-1], not modified
 * 5. Repeat for pos = pos − 1.
 *
 * False-positive note (pos = 15 only):
 *   If the unmodified C[i-1][14] happens to cause the byte at position 14 of the
 *   decrypted output to equal 0x02 AND position 15 also equals 0x02, the oracle
 *   returns true for the wrong guess. In practice this is handled by re-testing
 *   with a different C'[14]. The simulator detects and flags this case.
 */

import { BLOCK_SIZE } from './crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttackPhase =
  | 'idle'           // Not yet started
  | 'attacking'      // Trying candidate bytes (oracle queries)
  | 'byte_found'     // Last oracle call yielded valid padding — one byte solved
  | 'block_complete' // All 16 bytes recovered

export interface OracleLogEntry {
  id: number;
  type: 'attempt' | 'found' | 'advance' | 'start';
  bytePos: number;
  targetPadding: number;
  guess: number;
  modifiedPrevBlock: number[];
  oracleResult: boolean;
  isFalsePositive?: boolean;
  intermediateFound?: number;
  plaintextFound?: number;
  message: string;
}

export interface AttackState {
  // ── Static (set once per block and never changes) ──────────────────────
  targetBlockIndex: number;
  cipherBlock: number[];         // C[i]  — 16 bytes, never modified
  originalPrevBlock: number[];   // C[i-1] or IV — 16 bytes, never modified
  trueIntermediate: number[];    // I[i]  — teacher-only data, never shown by default
  truePlaintext: number[];       // P[i]  — teacher-only data (padded plaintext)

  // ── Dynamic (updated each step) ────────────────────────────────────────
  currentBytePos: number;        // byte position being recovered, 15 → 0
  currentGuess: number;          // candidate byte being tried, 0x00 → 0xFF
  targetPadding: number;         // desired padding value = 16 − currentBytePos

  /** Discovered intermediate bytes I[i][j]; null = not yet known to attacker */
  knownIntermediate: (number | null)[];

  /** Recovered plaintext bytes P[i][j]; null = not yet recovered */
  knownPlaintext: (number | null)[];

  /** C'[i-1]: the block sent to the oracle this step */
  modifiedPrevBlock: number[];

  oracleLog: OracleLogEntry[];
  totalOracleCalls: number;

  phase: AttackPhase;
  lastOracleResult: boolean | null;
}

// ---------------------------------------------------------------------------
// Initialize attack state
// ---------------------------------------------------------------------------

export function initAttackState(
  targetBlockIndex: number,
  cipherBlock: Uint8Array,
  originalPrevBlock: Uint8Array,
  trueIntermediate: Uint8Array,
  truePlaintext: Uint8Array
): AttackState {
  return {
    targetBlockIndex,
    cipherBlock: Array.from(cipherBlock),
    originalPrevBlock: Array.from(originalPrevBlock),
    trueIntermediate: Array.from(trueIntermediate),
    truePlaintext: Array.from(truePlaintext),
    currentBytePos: BLOCK_SIZE - 1, // start at byte 15
    currentGuess: 0x00,
    targetPadding: 1,               // 16 - 15 = 1
    knownIntermediate: Array(BLOCK_SIZE).fill(null),
    knownPlaintext: Array(BLOCK_SIZE).fill(null),
    modifiedPrevBlock: Array.from(originalPrevBlock),
    oracleLog: [],
    totalOracleCalls: 0,
    phase: 'idle',
    lastOracleResult: null,
  };
}

// ---------------------------------------------------------------------------
// Build modified previous block for a given guess
// ---------------------------------------------------------------------------

/**
 * Construct C'[i-1] for the current attack step.
 *
 * For bytes at positions > currentBytePos (already solved):
 *   C'[j] = targetPadding XOR I[j]   so that P'[j] = targetPadding
 *
 * For the current byte position:
 *   C'[currentBytePos] = guess
 *
 * For bytes at positions < currentBytePos (not yet attacked):
 *   C'[j] = originalPrevBlock[j]     (doesn't affect oracle result for current check)
 */
export function buildModifiedPrevBlock(
  state: AttackState,
  guess: number
): number[] {
  const modified = Array.from(state.originalPrevBlock);
  const pos = state.currentBytePos;
  const pad = state.targetPadding;

  // Fix already-solved suffix bytes to produce the desired padding value
  for (let j = pos + 1; j < BLOCK_SIZE; j++) {
    const known = state.knownIntermediate[j];
    if (known !== null) {
      modified[j] = pad ^ known;
    }
  }

  // Set the current guess
  modified[pos] = guess;

  return modified;
}

// ---------------------------------------------------------------------------
// Process an oracle result
// ---------------------------------------------------------------------------

/**
 * Apply an oracle result to advance the attack state.
 *
 * If oracleResult is false: increment guess and record the failed attempt.
 * If oracleResult is true:  derive I[pos] and P[pos], record success.
 *
 * This function is PURE — it returns a new state without mutating the input.
 */
export function applyOracleResult(
  state: AttackState,
  oracleResult: boolean,
  modifiedPrevUsed: number[]
): AttackState {
  const pos = state.currentBytePos;
  const pad = state.targetPadding;
  const guess = state.currentGuess;

  const entryId = state.oracleLog.length;

  if (!oracleResult) {
    // Invalid padding — try the next candidate byte
    const entry: OracleLogEntry = {
      id: entryId,
      type: 'attempt',
      bytePos: pos,
      targetPadding: pad,
      guess,
      modifiedPrevBlock: modifiedPrevUsed,
      oracleResult: false,
      message: `Byte ${pos}: guess ${fmtHex(guess)} → oracle: INVALID`,
    };

    return {
      ...state,
      currentGuess: guess + 1,
      modifiedPrevBlock: modifiedPrevUsed,
      oracleLog: [...state.oracleLog, entry],
      totalOracleCalls: state.totalOracleCalls + 1,
      phase: 'attacking',
      lastOracleResult: false,
    };
  }

  // Valid padding found!
  // Derive: I[pos] = pad XOR guess  (because I[pos] XOR guess = pad)
  const intermediateFound = pad ^ guess;

  // Verify against truth (only for false-positive detection)
  const isFalsePositive = intermediateFound !== state.trueIntermediate[pos];

  // Even if it's a false positive, use the derived value — this is what a real
  // attacker would do. We flag it in the log so the learner understands.
  const plaintextFound = intermediateFound ^ state.originalPrevBlock[pos];

  const newIntermediate = [...state.knownIntermediate];
  const newPlaintext = [...state.knownPlaintext];
  newIntermediate[pos] = intermediateFound;
  newPlaintext[pos] = plaintextFound;

  const asciiChar = plaintextFound >= 0x20 && plaintextFound <= 0x7e
    ? ` ('${String.fromCharCode(plaintextFound)}')`
    : '';

  const entry: OracleLogEntry = {
    id: entryId,
    type: 'found',
    bytePos: pos,
    targetPadding: pad,
    guess,
    modifiedPrevBlock: modifiedPrevUsed,
    oracleResult: true,
    isFalsePositive,
    intermediateFound,
    plaintextFound,
    message: isFalsePositive
      ? `Byte ${pos}: guess ${fmtHex(guess)} → oracle: VALID (false positive!) — verify needed`
      : `Byte ${pos}: guess ${fmtHex(guess)} → VALID! I[${pos}] = ${fmtHex(pad)}⊕${fmtHex(guess)} = ${fmtHex(intermediateFound)}, P[${pos}] = ${fmtHex(intermediateFound)}⊕${fmtHex(state.originalPrevBlock[pos])} = ${fmtHex(plaintextFound)}${asciiChar}`,
  };

  const nextPhase: AttackPhase = pos === 0 ? 'block_complete' : 'byte_found';

  return {
    ...state,
    knownIntermediate: newIntermediate,
    knownPlaintext: newPlaintext,
    modifiedPrevBlock: modifiedPrevUsed,
    oracleLog: [...state.oracleLog, entry],
    totalOracleCalls: state.totalOracleCalls + 1,
    phase: nextPhase,
    lastOracleResult: true,
    currentGuess: guess,
  };
}

// ---------------------------------------------------------------------------
// Advance to the next byte after one is solved
// ---------------------------------------------------------------------------

/**
 * Transition from 'byte_found' to 'attacking' for the next byte position.
 * Must only be called when phase === 'byte_found'.
 */
export function advanceToNextByte(state: AttackState): AttackState {
  if (state.phase !== 'byte_found') return state;

  const nextPos = state.currentBytePos - 1;
  const nextPad = BLOCK_SIZE - nextPos;

  const entry: OracleLogEntry = {
    id: state.oracleLog.length,
    type: 'advance',
    bytePos: nextPos,
    targetPadding: nextPad,
    guess: 0,
    modifiedPrevBlock: state.modifiedPrevBlock,
    oracleResult: false,
    message: `→ Advancing to byte ${nextPos} (target padding: ${fmtHex(nextPad)})`,
  };

  // Pre-build the new modified prev block (previous suffix bytes set to nextPad ^ I[j])
  const newModPrev = Array.from(state.originalPrevBlock);
  for (let j = nextPos + 1; j < BLOCK_SIZE; j++) {
    const known = state.knownIntermediate[j];
    if (known !== null) newModPrev[j] = nextPad ^ known;
  }
  newModPrev[nextPos] = 0x00; // will be overwritten by first guess

  return {
    ...state,
    currentBytePos: nextPos,
    currentGuess: 0x00,
    targetPadding: nextPad,
    modifiedPrevBlock: newModPrev,
    oracleLog: [...state.oracleLog, entry],
    phase: 'attacking',
    lastOracleResult: null,
  };
}

/** Start the attack (transition from 'idle' to 'attacking') */
export function startAttack(state: AttackState): AttackState {
  if (state.phase !== 'idle') return state;
  const entry: OracleLogEntry = {
    id: 0,
    type: 'start',
    bytePos: state.currentBytePos,
    targetPadding: state.targetPadding,
    guess: 0,
    modifiedPrevBlock: state.modifiedPrevBlock,
    oracleResult: false,
    message: `Attack started on block ${state.targetBlockIndex}. Recovering byte 15 first (target padding: 0x01).`,
  };
  return { ...state, phase: 'attacking', oracleLog: [entry] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtHex(n: number): string {
  return `0x${n.toString(16).padStart(2, '0')}`;
}
