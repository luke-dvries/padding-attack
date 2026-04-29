/**
 * StepInfo.tsx
 * Shows the oracle result and math for the current step.
 * Updates every time the user presses an arrow.
 */

import { AttackState } from '../lib/attackEngine';
import { byteToHex, byteToAscii } from '../lib/format';

interface StepInfoProps {
  attackState: AttackState;
}

export default function StepInfo({ attackState }: StepInfoProps) {
  const { phase, oracleLog, originalPrevBlock } = attackState;

  // Find the most recent entry to display
  const lastEntry = oracleLog.length > 0 ? oracleLog[oracleLog.length - 1] : null;
  if (phase === 'idle' || !lastEntry) {
    return (
      <div className="step-info step-info-idle">
        <span>Use the arrows below to step through the attack one oracle query at a time.</span>
      </div>
    );
  }

  if (phase === 'block_complete') {
    const { knownPlaintext, truePlaintext } = attackState;
    return (
      <div className="step-info step-info-complete">
        <span className="si-icon">✓</span>
        <div className="si-content">
          <div className="si-headline">Block fully decrypted!</div>
          <div className="si-ascii-reveal">
            {knownPlaintext.map((b, j) => (
              <span key={j} className={`si-char ${truePlaintext[j] === truePlaintext[15] && j >= 16 - truePlaintext[15] ? 'si-pad' : ''}`}>
                {b !== null ? byteToAscii(b) : '?'}
              </span>
            ))}
          </div>
          <div className="si-bytes-reveal">
            {knownPlaintext.map((b, j) => (
              <span key={j} className="si-byte-recovered">
                {b !== null ? byteToHex(b) : '??'}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'awaiting_input') {
    const { guess, bytePos, targetPadding: pad } = lastEntry;
    return (
      <div className="step-info step-info-valid">
        <div className="si-badge badge-valid">VALID</div>
        <div className="si-math">
          <span className="si-math-line">
            Byte {bytePos}: guess&nbsp;
            <code>0x{byteToHex(guess)}</code>
            &nbsp;with target padding&nbsp;
            <code>0x{byteToHex(pad)}</code>
            &nbsp;&mdash; oracle returned VALID!
          </span>
          <span className="si-math-line" style={{ color: '#f59e0b', marginTop: '0.25rem' }}>
            Use the XOR calculator above to compute I<sub>i</sub>[{bytePos}] and P<sub>i</sub>[{bytePos}].
          </span>
        </div>
      </div>
    );
  }

  if (lastEntry.type === 'start' || lastEntry.type === 'advance') {
    return (
      <div className="step-info step-info-advance">
        <span className="si-icon">→</span>
        <span className="si-msg">{lastEntry.message}</span>
      </div>
    );
  }

  const isValid = lastEntry.oracleResult;
  const { guess, bytePos, targetPadding: pad, intermediateFound, plaintextFound, isFalsePositive } = lastEntry;
  const origByte = originalPrevBlock[bytePos];

  return (
    <div className={`step-info ${isValid ? 'step-info-valid' : 'step-info-invalid'}`}>
      {/* Oracle result badge */}
      <div className={`si-badge ${isValid ? 'badge-valid' : 'badge-invalid'}`}>
        {isValid ? '✓ VALID' : '✗ INVALID'}
        {isFalsePositive && ' (FP)'}
      </div>

      {/* Math trace */}
      <div className="si-math">
        {!isValid ? (
          <span className="si-math-line">
            Byte {bytePos}: guess&nbsp;
            <code>0x{byteToHex(guess)}</code>
            &nbsp;→ <code>I<sub>i</sub>[{bytePos}] ⊕ 0x{byteToHex(guess)} ≠ 0x{byteToHex(pad)}</code>
            &nbsp;— try next
          </span>
        ) : intermediateFound !== undefined && plaintextFound !== undefined ? (
          <div className="si-math-found">
            <span className="si-math-line">
              <code>I<sub>i</sub>[{bytePos}]</code> = target&nbsp;⊕&nbsp;guess =&nbsp;
              <code>0x{byteToHex(pad)} ⊕ 0x{byteToHex(guess)} = 0x{byteToHex(intermediateFound)}</code>
            </span>
            <span className="si-math-arrow">→</span>
            <span className="si-math-line">
              <code>P<sub>i</sub>[{bytePos}]</code> = <code>I<sub>i</sub>[{bytePos}] ⊕ C<sub>prev</sub>[{bytePos}]</code> =&nbsp;
              <code>0x{byteToHex(intermediateFound)} ⊕ 0x{byteToHex(origByte)} =&nbsp;
                <strong>0x{byteToHex(plaintextFound)}</strong>
              </code>
              {plaintextFound >= 0x20 && plaintextFound <= 0x7e && (
                <span className="si-ascii">&nbsp;'{String.fromCharCode(plaintextFound)}'</span>
              )}
            </span>
          </div>
        ) : null}
      </div>

      {/* Recovered so far */}
      {attackState.knownPlaintext.some(b => b !== null) && (
        <div className="si-recovered">
          {attackState.knownPlaintext.map((b, j) => (
            <span key={j} className={`si-rchar ${b !== null ? 'known' : 'unknown'}`}>
              {b !== null ? byteToAscii(b) : '·'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
