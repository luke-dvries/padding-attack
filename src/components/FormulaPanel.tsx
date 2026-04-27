/**
 * FormulaPanel.tsx
 * Shows the mathematical derivation for the current byte being recovered.
 * Updates in real-time as the attack progresses.
 */

import { AttackState } from '../lib/attackEngine';
import { byteToHex } from '../lib/format';

interface FormulaPanelProps {
  attackState: AttackState | null;
}

export default function FormulaPanel({ attackState }: FormulaPanelProps) {
  if (!attackState || attackState.phase === 'idle') {
    return (
      <div className="formula-panel">
        <div className="panel-header"><h3>Math Trace</h3></div>
        <div className="formula-idle">
          Start the attack to see the step-by-step math derivation here.
        </div>
      </div>
    );
  }

  const {
    currentBytePos: pos,
    currentGuess: guess,
    targetPadding: pad,
    originalPrevBlock,
    modifiedPrevBlock,
    knownIntermediate,
    knownPlaintext,
    phase,
  } = attackState;

  // What we're currently trying
  const h = (n: number) => `0x${byteToHex(n)}`;

  // Derived intermediate and plaintext for this byte (if found)
  const iFound = knownIntermediate[pos];
  const pFound = knownPlaintext[pos];
  const phaseDone = phase === 'byte_found' || phase === 'block_complete';

  return (
    <div className="formula-panel">
      <div className="panel-header">
        <h3>Math Trace</h3>
        <span className="formula-pos">byte {pos}</span>
      </div>

      <div className="formula-content">
        {/* Goal */}
        <div className="formula-section">
          <div className="formula-title">Goal</div>
          <div className="formula-line">
            Recover <code>P<sub>i</sub>[{pos}]</code> = <code>I<sub>i</sub>[{pos}] ⊕ C<sub>prev</sub>[{pos}]</code>
          </div>
          <div className="formula-line dim">
            where <code>I<sub>i</sub>[{pos}]</code> = <code>AES_D(C<sub>i</sub>)[{pos}]</code>
          </div>
        </div>

        {/* Strategy */}
        <div className="formula-section">
          <div className="formula-title">Strategy</div>
          <div className="formula-line">
            Target padding: <code className="highlight-pad">{h(pad)}</code>
            {' '}(= 16 − {pos})
          </div>
          <div className="formula-line">
            Set <code>C'[{pos}] = guess</code> and ask oracle if
          </div>
          <div className="formula-line indent">
            <code>I<sub>i</sub>[{pos}] ⊕ guess == {h(pad)}</code>
          </div>
        </div>

        {/* Current attempt */}
        <div className="formula-section">
          <div className="formula-title">Current Attempt</div>
          <div className="formula-line">
            <code>C'[{pos}]</code> = <code className="highlight-guess">{h(modifiedPrevBlock[pos])}</code>
          </div>
          {phase === 'attacking' && (
            <div className="formula-line">
              Testing: <code>I<sub>i</sub>[{pos}] ⊕ {h(guess)} =? {h(pad)}</code>
            </div>
          )}
          {phaseDone && iFound !== undefined && iFound !== null && (
            <>
              <div className="formula-line success">
                ✓ Oracle: VALID — <code>{h(iFound)} ⊕ {h(guess)} = {h(pad)}</code>
              </div>
              <div className="formula-line success">
                ∴ <code>I<sub>i</sub>[{pos}]</code> = <code>{h(pad)} ⊕ {h(guess)} = <strong>{h(iFound)}</strong></code>
              </div>
            </>
          )}
        </div>

        {/* Plaintext derivation (shown after byte is found) */}
        {phaseDone && iFound !== null && iFound !== undefined && pFound !== null && pFound !== undefined && (
          <div className="formula-section formula-result">
            <div className="formula-title">Result</div>
            <div className="formula-line">
              <code>P<sub>i</sub>[{pos}]</code> = <code>I<sub>i</sub>[{pos}] ⊕ C<sub>prev</sub>[{pos}]</code>
            </div>
            <div className="formula-line">
              <code>P<sub>i</sub>[{pos}]</code> = <code>{h(iFound)} ⊕ {h(originalPrevBlock[pos])}</code>
            </div>
            <div className="formula-line success big">
              <code>P<sub>i</sub>[{pos}]</code> = <strong>{h(pFound)}</strong>
              {pFound >= 0x20 && pFound <= 0x7e
                ? <span className="ascii-result"> = '{String.fromCharCode(pFound)}'</span>
                : ''}
            </div>
          </div>
        )}

        {/* Suffix bytes already set */}
        {pos < 15 && (
          <div className="formula-section">
            <div className="formula-title">Suffix Bytes (already solved)</div>
            <div className="formula-suffix">
              {Array.from({ length: 15 - pos }, (_, k) => {
                const j = pos + 1 + k;
                const known = knownIntermediate[j];
                const forced = known !== null ? (pad ^ known) : modifiedPrevBlock[j];
                return (
                  <div key={j} className="formula-line small">
                    <code>C'[{j}]</code> = {h(pad)} ⊕ <code>I<sub>i</sub>[{j}]</code>
                    {known !== null ? ` = ${h(pad)} ⊕ ${h(known)} = ${h(forced)}` : ' = ?'}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overall progress */}
        <div className="formula-section">
          <div className="formula-title">Block Progress</div>
          <div className="formula-progress">
            {Array.from({ length: 16 }, (_, j) => {
              const p = knownPlaintext[j];
              return (
                <div
                  key={j}
                  className={`progress-cell ${p !== null ? 'done' : j === pos ? 'current' : 'pending'}`}
                  title={p !== null ? `P_i[${j}] = ${h(p)}` : `byte ${j}`}
                >
                  {p !== null ? byteToHex(p) : j === pos ? '?' : '·'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
