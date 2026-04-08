/**
 * BlockVisualizer.tsx
 *
 * The central visualization panel for the attack.
 * Shows:
 *   1. Ciphertext overview — all blocks, with the target block highlighted
 *   2. Attack detail view — three aligned rows:
 *        Row A: C[i-1]  original previous ciphertext block (or IV)
 *        Row B: C'[i-1] attacker-modified previous block
 *        Row C: C[i]    target ciphertext block (never changes)
 *        Row D: I[i]    intermediate state (shown in teacher mode)
 *        Row E: P[i]    recovered plaintext bytes (revealed as attack progresses)
 *
 * Arrows and XOR annotations show the CBC relationships between rows.
 */

import ByteCell, { ByteRole } from './ByteCell';
import { AttackState } from '../lib/attackEngine';
import { ScenarioData, BLOCK_SIZE } from '../lib/crypto';
import { byteToHex } from '../lib/format';

interface BlockVisualizerProps {
  scenario: ScenarioData;
  attackState: AttackState;
  showIntermediate: boolean;
  showTeacherNotes: boolean;
  onSelectBlock: (i: number) => void;
}

export default function BlockVisualizer({
  scenario,
  attackState,
  showIntermediate,
  showTeacherNotes,
  onSelectBlock,
}: BlockVisualizerProps) {
  return (
    <div className="block-visualizer">
      {/* ── Ciphertext overview ── */}
      <CiphertextOverview
        scenario={scenario}
        targetBlockIndex={attackState.targetBlockIndex}
        onSelectBlock={onSelectBlock}
      />

      {/* ── Divider ── */}
      <div className="viz-divider">
        <span>Attacking block {attackState.targetBlockIndex}</span>
      </div>

      {/* ── Attack detail ── */}
      <AttackDetail
        attackState={attackState}
        showIntermediate={showIntermediate}
        showTeacherNotes={showTeacherNotes}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ciphertext overview strip
// ---------------------------------------------------------------------------

function CiphertextOverview({
  scenario,
  targetBlockIndex,
  onSelectBlock,
}: {
  scenario: ScenarioData;
  targetBlockIndex: number;
  onSelectBlock: (i: number) => void;
}) {
  const allBlocks = [scenario.iv, ...scenario.ciphertextBlocks];
  const labels = ['IV', ...scenario.ciphertextBlocks.map((_, i) => `C[${i}]`)];

  return (
    <div className="cipher-overview">
      <div className="cipher-overview-label">Full ciphertext (click a block to attack it):</div>
      <div className="cipher-overview-blocks">
        {allBlocks.map((block, idx) => {
          const isIV = idx === 0;
          const blockIdx = idx - 1; // actual ciphertext block index (IV = -1)
          const isTarget = !isIV && blockIdx === targetBlockIndex;
          const isPrev = !isIV && blockIdx === targetBlockIndex - 1;
          const isIVPrev = isIV && targetBlockIndex === 0;

          return (
            <div
              key={idx}
              className={[
                'cipher-overview-block',
                isTarget ? 'target-block' : '',
                isPrev || isIVPrev ? 'prev-block' : '',
                isIV ? 'iv-block' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !isIV && onSelectBlock(blockIdx)}
              role={isIV ? undefined : 'button'}
              tabIndex={isIV ? undefined : 0}
              onKeyDown={e => !isIV && e.key === 'Enter' && onSelectBlock(blockIdx)}
              title={isIV ? 'IV (not a ciphertext block)' : `Block ${blockIdx} — click to attack`}
            >
              <div className="cipher-block-label">{labels[idx]}</div>
              <div className="cipher-block-bytes">
                {Array.from(block).map((b, j) => (
                  <span key={j} className="cipher-mini-byte">
                    {byteToHex(b)}
                  </span>
                ))}
              </div>
              {isTarget && <div className="cipher-block-badge attack">TARGET</div>}
              {(isPrev || isIVPrev) && <div className="cipher-block-badge prev">PREV</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attack detail view
// ---------------------------------------------------------------------------

function AttackDetail({
  attackState,
  showIntermediate,
  showTeacherNotes,
}: {
  attackState: AttackState;
  showIntermediate: boolean;
  showTeacherNotes: boolean;
}) {
  const {
    originalPrevBlock,
    modifiedPrevBlock,
    cipherBlock,
    knownIntermediate,
    knownPlaintext,
    trueIntermediate,
    truePlaintext,
    currentBytePos,
    currentGuess,
    targetPadding,
    phase,
  } = attackState;

  const prevLabel = attackState.targetBlockIndex === 0 ? 'IV' : `C[${attackState.targetBlockIndex - 1}]`;
  const targetLabel = `C[${attackState.targetBlockIndex}]`;

  // Build role arrays for each row
  const originalPrevRoles = buildOriginalPrevRoles(originalPrevBlock, currentBytePos, phase);
  const modifiedPrevRoles = buildModifiedPrevRoles(modifiedPrevBlock, originalPrevBlock, currentBytePos, targetPadding, knownIntermediate, phase, currentGuess);
  const cipherRoles: ByteRole[] = Array(BLOCK_SIZE).fill('ciphertext');
  const intermediateRoles = buildIntermediateRoles(knownIntermediate, currentBytePos, phase);
  const plaintextRoles = buildPlaintextRoles(knownPlaintext, truePlaintext, currentBytePos, phase);

  // Values for intermediate row: show truth if teacher mode, else known or null
  const intermediateValues = Array.from({ length: BLOCK_SIZE }, (_, j) =>
    showTeacherNotes ? trueIntermediate[j] : (knownIntermediate[j] ?? null)
  );

  const plaintextValues = Array.from({ length: BLOCK_SIZE }, (_, j) =>
    showTeacherNotes ? truePlaintext[j] : (knownPlaintext[j] ?? null)
  );

  return (
    <div className="attack-detail">

      {/* ── Status banner ── */}
      <StatusBanner attackState={attackState} />

      {/* ── Block rows ── */}
      <div className="block-rows">

        {/* Row: Original previous block */}
        <BlockRow
          label={`${prevLabel} (original)`}
          sublabel="Original previous ciphertext block — never sent to oracle"
          values={Array.from(originalPrevBlock)}
          roles={originalPrevRoles}
          rowClass="row-original-prev"
          showAscii={false}
        />

        {/* Diff indicator between original and modified */}
        <DiffIndicator original={originalPrevBlock} modified={modifiedPrevBlock} />

        {/* Row: Modified previous block (attacker-crafted) */}
        <BlockRow
          label={`C'[prev] (attacker-crafted)`}
          sublabel="Modified previous block sent to oracle — attacker controls these bytes"
          values={modifiedPrevBlock}
          roles={modifiedPrevRoles}
          rowClass="row-modified-prev"
          showAscii={false}
          currentGuess={phase === 'attacking' ? currentGuess : undefined}
          currentPos={phase === 'attacking' ? currentBytePos : undefined}
        />

        {/* Arrow: C'[prev] → oracle → decrypts through AES */}
        <div className="row-connector">
          <div className="connector-line" />
          <div className="connector-label">
            <span className="xor-symbol">⊕</span>
            <span>XOR (CBC step)</span>
          </div>
          <div className="connector-line" />
        </div>

        {/* Row: Target ciphertext block */}
        <BlockRow
          label={`${targetLabel} (target ciphertext)`}
          sublabel="Ciphertext block being attacked — never modified"
          values={Array.from(cipherBlock)}
          roles={cipherRoles}
          rowClass="row-cipher"
          showAscii={false}
        />

        {/* AES decrypt arrow */}
        <div className="row-connector">
          <div className="connector-line" />
          <div className="connector-label aes-label">
            <span>▼ AES block decrypt (key hidden)</span>
          </div>
          <div className="connector-line" />
        </div>

        {/* Row: Intermediate state (optional) */}
        {showIntermediate && (
          <>
            <BlockRow
              label="I[i] = AES_block_decrypt(C[i])"
              sublabel={
                showTeacherNotes
                  ? 'True intermediate state — shown because teacher mode is ON'
                  : 'Intermediate state — revealed as bytes are discovered'
              }
              values={intermediateValues}
              roles={intermediateRoles}
              rowClass="row-intermediate"
              showAscii={false}
              teacherRow={showTeacherNotes && knownIntermediate.some(b => b === null)}
            />

            <div className="row-connector">
              <div className="connector-line" />
              <div className="connector-label">
                <span className="xor-symbol">⊕</span>
                <span>XOR with C'[prev]</span>
              </div>
              <div className="connector-line" />
            </div>
          </>
        )}

        {/* Row: Recovered plaintext */}
        <BlockRow
          label="P[i] recovered plaintext"
          sublabel="Recovered byte-by-byte — each byte derived from one oracle-valid guess"
          values={plaintextValues}
          roles={plaintextRoles}
          rowClass="row-plaintext"
          showAscii={true}
          teacherRow={showTeacherNotes && knownPlaintext.some(b => b === null)}
        />
      </div>

      {/* ── Teacher legend ── */}
      {showTeacherNotes && (
        <div className="teacher-note">
          <strong>Teacher note:</strong> Teacher mode is showing the true intermediate state (I[i]) and full plaintext. The attacker does <em>not</em> know these values — they are derived purely from oracle responses.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block row
// ---------------------------------------------------------------------------

function BlockRow({
  label,
  sublabel,
  values,
  roles,
  rowClass,
  showAscii,
  currentGuess,
  currentPos,
  teacherRow = false,
}: {
  label: string;
  sublabel?: string;
  values: (number | null)[];
  roles: ByteRole[];
  rowClass: string;
  showAscii: boolean;
  currentGuess?: number;
  currentPos?: number;
  teacherRow?: boolean;
}) {
  return (
    <div className={`block-row ${rowClass} ${teacherRow ? 'teacher-row' : ''}`}>
      <div className="block-row-label">
        <span className="block-row-name">{label}</span>
        {sublabel && <span className="block-row-sub">{sublabel}</span>}
        {teacherRow && <span className="teacher-tag">TEACHER</span>}
      </div>
      <div className="block-row-bytes">
        {values.map((v, j) => {
          const isCurrentPos = j === currentPos;
          const displayValue = isCurrentPos && currentGuess !== undefined ? currentGuess : v;
          return (
            <ByteCell
              key={j}
              value={displayValue}
              role={roles[j]}
              index={j}
              showAscii={showAscii}
              animate={isCurrentPos && currentGuess !== undefined}
              tooltip={buildTooltip(j, displayValue, roles[j])}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diff indicator (shows changed bytes between original and modified prev)
// ---------------------------------------------------------------------------

function DiffIndicator({
  original,
  modified,
}: {
  original: number[];
  modified: number[];
}) {
  const changedCount = original.filter((b, i) => b !== modified[i]).length;
  if (changedCount === 0) return null;

  return (
    <div className="diff-indicator">
      {original.map((orig, j) => {
        const mod = modified[j];
        const changed = orig !== mod;
        return (
          <div key={j} className={`diff-cell ${changed ? 'diff-changed' : 'diff-same'}`}>
            {changed ? '↑' : '·'}
          </div>
        );
      })}
      <span className="diff-label">{changedCount} byte{changedCount !== 1 ? 's' : ''} modified</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status banner
// ---------------------------------------------------------------------------

function StatusBanner({ attackState }: { attackState: AttackState }) {
  const { phase, currentBytePos, currentGuess, targetPadding, totalOracleCalls, knownPlaintext } = attackState;
  const recoveredCount = knownPlaintext.filter(b => b !== null).length;

  let message = '';
  let statusClass = '';

  switch (phase) {
    case 'idle':
      message = 'Press Step or Play to start the attack';
      statusClass = 'status-idle';
      break;
    case 'attacking':
      message = `Recovering byte ${currentBytePos} — trying guess ${byteToHex(currentGuess)} (target padding: 0x${targetPadding.toString(16).padStart(2,'0')}) — ${totalOracleCalls} oracle calls so far`;
      statusClass = 'status-attacking';
      break;
    case 'byte_found':
      message = `Byte ${currentBytePos} recovered! (${recoveredCount}/${BLOCK_SIZE} bytes) — press Step to continue to byte ${currentBytePos - 1}`;
      statusClass = 'status-found';
      break;
    case 'block_complete':
      message = `Block fully recovered in ${totalOracleCalls} oracle calls — average ${(totalOracleCalls / BLOCK_SIZE).toFixed(1)} queries per byte`;
      statusClass = 'status-complete';
      break;
  }

  // Progress bar
  const progress = (recoveredCount / BLOCK_SIZE) * 100;

  return (
    <div className={`status-banner ${statusClass}`}>
      <div className="status-message">{message}</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
        <span className="progress-label">{recoveredCount}/{BLOCK_SIZE} bytes recovered</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role computation helpers
// ---------------------------------------------------------------------------

function buildOriginalPrevRoles(
  original: number[],
  currentBytePos: number,
  phase: string
): ByteRole[] {
  return original.map((_, j) => {
    if (phase === 'idle') return 'original-prev';
    if (j === currentBytePos) return 'original-prev';
    if (j > currentBytePos) return 'dimmed'; // will be overridden
    return 'original-prev';
  });
}

function buildModifiedPrevRoles(
  modified: number[],
  original: number[],
  currentBytePos: number,
  _targetPadding: number,
  knownIntermediate: (number | null)[],
  phase: string,
  _currentGuess: number
): ByteRole[] {
  return modified.map((modByte, j) => {
    if (phase === 'idle') return 'dimmed';

    if (j === currentBytePos && phase === 'attacking') {
      return 'current-guess';
    }
    if (j === currentBytePos && phase === 'byte_found') {
      return 'valid-guess';
    }
    if (j > currentBytePos && knownIntermediate[j] !== null) {
      // These bytes are set to force the desired padding value
      return 'padding-target';
    }
    if (modByte === original[j]) {
      return 'dimmed'; // Unchanged byte
    }
    return 'modified-prev';
  });
}

function buildIntermediateRoles(
  knownIntermediate: (number | null)[],
  currentBytePos: number,
  phase: string
): ByteRole[] {
  return knownIntermediate.map((b, j) => {
    if (b !== null) return 'intermediate';
    if (j === currentBytePos && phase !== 'idle') return 'unknown';
    return 'unknown';
  });
}

function buildPlaintextRoles(
  knownPlaintext: (number | null)[],
  truePlaintext: number[],
  currentBytePos: number,
  phase: string
): ByteRole[] {
  return knownPlaintext.map((b, j) => {
    if (b !== null) {
      // Distinguish padding bytes from actual data
      const padVal = truePlaintext[BLOCK_SIZE - 1];
      const padStart = BLOCK_SIZE - padVal;
      if (j >= padStart && truePlaintext[j] === padVal) {
        return 'padding-byte';
      }
      return 'recovered';
    }
    if (j === currentBytePos && phase !== 'idle') return 'unknown';
    return 'unknown';
  });
}

function buildTooltip(j: number, value: number | null, role: ByteRole): string {
  const hex = value !== null ? `0x${byteToHex(value)}` : '??';
  const roleLabel: Record<ByteRole, string> = {
    'unknown': 'Unknown — not yet recovered',
    'ciphertext': 'Ciphertext byte — never modified',
    'original-prev': 'Original previous ciphertext byte',
    'modified-prev': 'Modified byte — attacker-crafted',
    'current-guess': 'Current candidate byte being tested',
    'valid-guess': 'This guess yielded valid padding!',
    'padding-target': 'Set to force the desired padding value',
    'intermediate': 'Discovered intermediate state byte',
    'recovered': 'Recovered plaintext byte',
    'padding-byte': 'PKCS#7 padding byte (known from structure)',
    'dimmed': 'Not relevant for this step',
  };
  return `Byte ${j}: ${hex} — ${roleLabel[role]}`;
}
