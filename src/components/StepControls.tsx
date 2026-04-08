/**
 * StepControls.tsx
 * Bottom navigation bar: ← → arrows, skip, play/pause, speed, and toggles.
 */

import { AttackState } from '../lib/attackEngine';
import { byteToHex } from '../lib/format';

interface StepControlsProps {
  state: AttackState;
  canBack: boolean;
  isPlaying: boolean;
  speed: number;
  showIntermediate: boolean;
  onBack: () => void;
  onForward: () => void;
  onSkip: () => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetSpeed: (ms: number) => void;
  onToggleIntermediate: () => void;
}

const SPEEDS = [
  { label: 'Slow', ms: 700 },
  { label: 'Med', ms: 300 },
  { label: 'Fast', ms: 80 },
];

export default function StepControls({
  state,
  canBack,
  isPlaying,
  speed,
  showIntermediate,
  onBack,
  onForward,
  onSkip,
  onPlay,
  onPause,
  onReset,
  onSetSpeed,
  onToggleIntermediate,
}: StepControlsProps) {
  const { phase, totalOracleCalls, currentBytePos, currentGuess, knownPlaintext } = state;
  const done = phase === 'block_complete';
  const recoveredCount = knownPlaintext.filter(b => b !== null).length;

  return (
    <div className="step-controls">

      {/* Left: back + step info */}
      <div className="ctrl-left">
        <button
          className="nav-btn nav-back"
          onClick={onBack}
          disabled={!canBack || isPlaying}
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
          disabled={isPlaying || done}
          title="Step forward (one oracle query)"
          aria-label="Step forward"
        >
          →
        </button>

        <button
          className="nav-btn nav-skip"
          onClick={onSkip}
          disabled={isPlaying || done || phase === 'idle'}
          title="Skip to next byte found (jump over failed guesses)"
          aria-label="Skip to next byte found"
        >
          →|
        </button>

        {isPlaying ? (
          <button className="nav-btn nav-play active" onClick={onPause} title="Pause auto-play">
            ⏸
          </button>
        ) : (
          <button
            className="nav-btn nav-play"
            onClick={onPlay}
            disabled={done}
            title="Auto-play"
          >
            ▶
          </button>
        )}

        <button
          className="nav-btn nav-reset"
          onClick={onReset}
          title="Reset attack"
          disabled={isPlaying}
        >
          ↺
        </button>
      </div>

      {/* Right: speed + options */}
      <div className="ctrl-right">
        <div className="speed-group">
          {SPEEDS.map(s => (
            <button
              key={s.ms}
              className={`speed-btn ${speed === s.ms ? 'active' : ''}`}
              onClick={() => onSetSpeed(s.ms)}
              title={`${s.label} speed`}
            >
              {s.label}
            </button>
          ))}
        </div>

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
