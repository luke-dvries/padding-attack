/**
 * AttackView.tsx
 *
 * The central visualization: five aligned rows showing what the attacker
 * sees and controls at each step of the padding oracle attack.
 *
 *  Row 1: C[prev]     — original previous ciphertext block (or IV)
 *  Row 2: C'[prev]    — attacker-modified previous block (changes each step)
 *  Row 3: C[i]        — target ciphertext block (never changes)
 *  Row 4: I[i]        — intermediate state (revealed byte-by-byte)
 *  Row 5: P[i]        — recovered plaintext (fills in right-to-left)
 *
 * Every cell is color-coded by role so relationships are immediately visible.
 */

import type { ReactNode } from 'react';
import { AttackState } from '../lib/attackEngine';
import { BLOCK_SIZE } from '../lib/crypto';
import { byteToHex, byteToAscii } from '../lib/format';

interface AttackViewProps {
  attackState: AttackState;
  showIntermediate: boolean;
}

// ---------------------------------------------------------------------------
// Role type
// ---------------------------------------------------------------------------

type Role =
  | 'unknown'        // ??  not yet known
  | 'cipher'         // ciphertext byte — static
  | 'orig'           // original previous block byte
  | 'unchanged'      // orig prev byte that hasn't been touched (dimmed)
  | 'forced'         // byte set to force the desired padding suffix
  | 'guess'          // the current candidate byte (animating)
  | 'found'          // the guess that returned valid padding
  | 'intermediate'   // discovered intermediate state byte
  | 'recovered'      // recovered plaintext byte
  | 'pad-byte'       // plaintext padding byte (PKCS#7 value)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AttackView({ attackState, showIntermediate }: AttackViewProps) {
  const {
    targetBlockIndex,
    cipherBlock,
    originalPrevBlock,
    modifiedPrevBlock,
    knownIntermediate,
    knownPlaintext,
    truePlaintext,
    currentBytePos: pos,
    currentGuess: guess,
    targetPadding: pad,
    phase,
  } = attackState;

  const prevLabel: ReactNode = targetBlockIndex === 0 ? 'IV' : <>C<sub>{targetBlockIndex - 1}</sub></>;
  const targetLabel: ReactNode = <>C<sub>{targetBlockIndex}</sub></>;

  // Build display values and roles for each row
  const { vals: modVals, roles: modRoles } = buildModifiedRow(
    modifiedPrevBlock, originalPrevBlock, knownIntermediate, pos, pad, phase, guess
  );

  const intermediateVals = Array.from({ length: BLOCK_SIZE }, (_, j) =>
    knownIntermediate[j] ?? null
  );
  const intermediateRoles = buildIntermediateRoles(knownIntermediate, pos, phase);

  const plaintextRoles = buildPlaintextRoles(knownPlaintext, truePlaintext);

  const recoveredCount = knownPlaintext.filter(b => b !== null).length;

  return (
    <div className="attack-view">

      {/* ── Attack title bar ── */}
      <div className="attack-title">
        <span className="attack-title-main">
          Attacking {targetLabel}
        </span>
        {phase !== 'idle' && (
          <span className="attack-title-detail">
            {phase === 'block_complete'
              ? `✓ All ${BLOCK_SIZE} bytes recovered`
              : phase === 'byte_found'
              ? `Byte ${pos} found — press → to continue`
              : phase === 'awaiting_input'
              ? `Byte ${pos} — oracle found valid padding! Compute the values.`
              : `Recovering byte ${pos} · trying guess ${toHex(guess)} · target padding ${toHex(pad)}`}
          </span>
        )}
        <span className="attack-progress-pill">
          {recoveredCount}/{BLOCK_SIZE} bytes
        </span>
      </div>

      {/* ── Index header row ── */}
      <div className="byte-index-row">
        <div className="row-label" />
        <div className="byte-cells">
          {Array.from({ length: BLOCK_SIZE }, (_, j) => (
            <div key={j} className={`byte-index-cell ${j === pos && phase !== 'idle' ? 'idx-active' : ''}`}>
              {j}
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 1: original previous block ── */}
      <BlockRow
        label={<>{prevLabel} original</>}
        sublabel="original previous ciphertext block"
        rowClass="row-orig"
        values={Array.from(originalPrevBlock)}
        roles={Array(BLOCK_SIZE).fill('orig') as Role[]}
        activePos={pos}
        phase={phase}
      />

      {/* Connector: modification arrow */}
      <Connector type="modify" pos={pos} blockSize={BLOCK_SIZE} phase={phase} />

      {/* ── Row 2: attacker-modified previous block ── */}
      <BlockRow
        label={<>C'<sub>prev</sub> attacker</>}
        sublabel="modified by attacker — controls what plaintext decrypts to"
        rowClass="row-modified"
        values={modVals}
        roles={modRoles}
        activePos={pos}
        phase={phase}
        showCurrentGuess={phase === 'attacking' ? guess : undefined}
        currentGuessPos={phase === 'attacking' ? pos : undefined}
      />

      {/* Connector: XOR symbol + AES decrypt arrow (combined) */}
      <Connector type="xor-aes" pos={pos} blockSize={BLOCK_SIZE} phase={phase} />

      {/* ── Row 3: target ciphertext block ── */}
      <BlockRow
        label={<>{targetLabel} ciphertext</>}
        sublabel="target block — never modified"
        rowClass="row-cipher"
        values={Array.from(cipherBlock)}
        roles={Array(BLOCK_SIZE).fill('cipher') as Role[]}
        activePos={pos}
        phase={phase}
      />

      {/* Connector: AES block decrypt arrow */}
      <Connector type="aes" pos={pos} blockSize={BLOCK_SIZE} phase={phase} />

      {/* ── Row 4: intermediate state (optional) ── */}
      {showIntermediate && (
        <>
          <BlockRow
            label={<>I<sub>i</sub> intermediate</>}
            sublabel={<>I<sub>i</sub> = AES_D(C<sub>i</sub>) — revealed as attack progresses</>}
            rowClass="row-intermediate"
            values={intermediateVals}
            roles={intermediateRoles}
            activePos={pos}
            phase={phase}
          />

          <Connector type="xor-only" pos={pos} blockSize={BLOCK_SIZE} phase={phase} />
        </>
      )}

      {/* ── Row 5: recovered plaintext ── */}
      <BlockRow
        label={<>P<sub>i</sub> plaintext</>}
        sublabel={<>P<sub>i</sub>[j] = I<sub>i</sub>[j] ⊕ {prevLabel}[j] — recovered right-to-left</>}
        rowClass="row-plaintext"
        values={Array.from({ length: BLOCK_SIZE }, (_, j) => knownPlaintext[j] ?? null)}
        roles={plaintextRoles}
        activePos={pos}
        phase={phase}
        showAscii
      />

    </div>
  );
}

// ---------------------------------------------------------------------------
// BlockRow
// ---------------------------------------------------------------------------

function BlockRow({
  label,
  sublabel,
  rowClass,
  values,
  roles,
  activePos,
  phase,
  showAscii = false,
  showCurrentGuess,
  currentGuessPos,
}: {
  label: ReactNode;
  sublabel: ReactNode;
  rowClass: string;
  values: (number | null)[];
  roles: Role[];
  activePos: number;
  phase: string;
  showAscii?: boolean;
  showCurrentGuess?: number;
  currentGuessPos?: number;
}) {
  return (
    <div className={`block-row ${rowClass}`}>
      <div className="row-label">
        <span className="row-label-main">{label}</span>
        <span className="row-label-sub">{sublabel}</span>
      </div>
      <div className="byte-cells">
        {values.map((v, j) => {
          const isCurrentPos = j === currentGuessPos;
          const displayVal = isCurrentPos && showCurrentGuess !== undefined ? showCurrentGuess : v;
          const role = roles[j];
          const active = j === activePos && phase !== 'idle';

          return (
            <ByteCell
              key={j}
              value={displayVal}
              role={role}
              active={active}
              showAscii={showAscii}
              pulsing={isCurrentPos && showCurrentGuess !== undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ByteCell
// ---------------------------------------------------------------------------

function ByteCell({
  value,
  role,
  active,
  showAscii,
  pulsing,
}: {
  value: number | null;
  role: Role;
  active: boolean;
  showAscii: boolean;
  pulsing: boolean;
}) {
  const hex = value !== null ? byteToHex(value) : '??';
  const ascii = value !== null ? byteToAscii(value) : '';

  return (
    <div
      className={[
        'bcell',
        `bcell-${role}`,
        active ? 'bcell-active' : '',
        pulsing ? 'bcell-pulse' : '',
      ].filter(Boolean).join(' ')}
      title={`${hex}${ascii && ascii !== '·' ? ` '${ascii}'` : ''}`}
    >
      <span className="bcell-hex">{hex}</span>
      {showAscii && <span className="bcell-ascii">{ascii}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connector row (shows XOR / AES decrypt relationship between rows)
// ---------------------------------------------------------------------------

function Connector({ type, pos, blockSize, phase }: {
  type: 'modify' | 'xor-aes' | 'aes' | 'xor-only';
  pos: number;
  blockSize: number;
  phase: string;
}) {
  const labels: Record<typeof type, ReactNode> = {
    'modify':   '↕ attacker modifies these bytes',
    'xor-aes':  '⊕ XOR  +  AES CBC decryption',
    'aes':      '▼ AES block decrypt (key hidden)',
    'xor-only': <>⊕ XOR with C'<sub>prev</sub>  →  decrypted output</>,
  };
  const label = labels[type];

  return (
    <div className={`row-conn row-conn-${type}`}>
      <div className="row-label" />
      <div className="conn-cells">
        {Array.from({ length: blockSize }, (_, j) => (
          <div
            key={j}
            className={`conn-cell ${j === pos && phase !== 'idle' ? 'conn-active' : ''}`}
          />
        ))}
        <span className="conn-label">{label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role builders
// ---------------------------------------------------------------------------

function buildModifiedRow(
  modified: number[],
  original: number[],
  knownIntermediate: (number | null)[],
  pos: number,
  pad: number,
  phase: string,
  guess: number
): { vals: (number | null)[]; roles: Role[] } {
  const vals: (number | null)[] = [];
  const roles: Role[] = [];

  for (let j = 0; j < BLOCK_SIZE; j++) {
    if (phase === 'idle') {
      vals.push(original[j]);
      roles.push('unchanged');
      continue;
    }

    if (j < pos) {
      // Not yet targeted — show original value, dimmed
      vals.push(original[j]);
      roles.push('unchanged');
    } else if (j === pos) {
      // Current guess byte
      const v = phase === 'attacking' ? guess : modified[j];
      vals.push(v);
      roles.push(phase === 'byte_found' || phase === 'block_complete' || phase === 'awaiting_input' ? 'found' : 'guess');
    } else {
      // Already-solved suffix — forced to produce target padding value
      const known = knownIntermediate[j];
      if (known !== null) {
        vals.push(pad ^ known);
        roles.push('forced');
      } else {
        vals.push(modified[j]);
        roles.push('unchanged');
      }
    }
  }

  return { vals, roles };
}

function buildIntermediateRoles(
  knownIntermediate: (number | null)[],
  pos: number,
  phase: string
): Role[] {
  return knownIntermediate.map((b, j) => {
    if (b !== null) return 'intermediate';
    if (j === pos && phase !== 'idle') return 'unknown';
    return 'unknown';
  });
}

function buildPlaintextRoles(
  knownPlaintext: (number | null)[],
  truePlaintext: number[]
): Role[] {
  const padVal = truePlaintext[BLOCK_SIZE - 1];
  const padStart = BLOCK_SIZE - padVal;
  return knownPlaintext.map((b, j) => {
    if (b === null) return 'unknown';
    if (j >= padStart && truePlaintext[j] === padVal) return 'pad-byte';
    return 'recovered';
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toHex(n: number): string { return `0x${byteToHex(n)}`; }
