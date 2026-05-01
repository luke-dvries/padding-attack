/**
 * StepControls.tsx
 * Bottom navigation bar: ← → arrows, skip, play/pause, speed, and toggles.
 */

import { AttackState } from '../lib/attackEngine';
import { byteToHex } from '../lib/format';

interface StepControlsProps {
  state: AttackState;
  canBack: boolean;
  showIntermediate: boolean;
  onBack: () => void;
  onForward: () => void;
  onSkip: () => void;
  onReset: () => void;
  onToggleIntermediate: () => void;
}

export default function StepControls({
  state,
  canBack,
  showIntermediate,
  onBack,
  onForward,
  onSkip,
  onReset,
  onToggleIntermediate,
}: StepControlsProps) {
  const { phase, totalOracleCalls, currentBytePos, currentGuess, knownPlaintext } = state;
  const done = phase === 'block_complete';
  const awaitingInput = phase === 'awaiting_input';
  const recoveredCount = knownPlaintext.filter(b => b !== null).length;

  return (
    <div className="step-controls">

      {/* Left: back + step info */}
      <div className="ctrl-left">
        <button
          className="nav-btn nav-back"
          onClick={onBack}
          disabled={!canBack}
          title="Step backward"
          aria-label="Step backward"
        >
          ←
        </button>

        <div className="step-info-compact">
          {phase === 'idle' && <span className="step-hint">Press → to begin the attack</span>}
          {phase === 'attacking' && (
            <>
              <span className="step-counter">{totalOracleCalls + 1} oracle calls</span>
              <span className="step-sep">·</span>
              <span className="step-byte">byte {currentBytePos}</span>
              <span className="step-sep">·</span>
              <span className="step-guess">guess 0x{byteToHex(currentGuess)}</span>
            </>
          )}
          {phase === 'awaiting_input' && (
            <span className="step-hint found">Byte {currentBytePos} — complete the XOR calculator to continue</span>
          )}
          {phase === 'byte_found' && (
            <span className="step-hint found">Byte {currentBytePos} found — press → to continue</span>
          )}
          {done && (
            <span className="step-hint done">
              ✓ Block decrypted in {totalOracleCalls} oracle calls
              (avg {(totalOracleCalls / 16).toFixed(1)}/byte)
            </span>
          )}
        </div>
      </div>

      {/* Center: main action buttons */}
      <div className="ctrl-center">
        <button
          className="nav-btn nav-forward"
          onClick={onForward}
          disabled={done || awaitingInput}
          title="Step forward (one oracle query)"
          aria-label="Step forward"
        >
          →
        </button>

        <button
          className="nav-btn nav-skip"
          onClick={onSkip}
          disabled={done || phase === 'idle' || awaitingInput}
          title="Brute force the current byte (jump over failed guesses)"
          aria-label="Brute force next byte"
        >
          Brute Force Next Byte
        </button>

        <button
          className="nav-btn nav-reset"
          onClick={onReset}
          title="Reset attack"
        >
          ↺
        </button>
      </div>

      {/* Right: options */}
      <div className="ctrl-right">
        <label className="toggle-pill" title="Show/hide intermediate state row">
          <input
            type="checkbox"
            checked={showIntermediate}
            onChange={onToggleIntermediate}
          />
          <span>Intermediate</span>
        </label>

        <div className="progress-pill">
          {recoveredCount}/16 bytes
        </div>
      </div>

    </div>
  );
}
