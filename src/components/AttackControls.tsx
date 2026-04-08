/**
 * AttackControls.tsx
 * Left panel: scenario selection, block selection, and playback controls.
 */

import { ScenarioData } from '../lib/crypto';

interface AttackControlsProps {
  scenarioName: string;
  scenarioLoading: boolean;
  scenario: ScenarioData | null;
  targetBlockIndex: number;
  showIntermediate: boolean;
  showTeacherNotes: boolean;
  isPlaying: boolean;
  canStepBack: boolean;
  speed: number;
  attackPhase: string;
  onSelectScenario: (name: string) => void;
  onSelectBlock: (i: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onToggleIntermediate: () => void;
  onToggleTeacher: () => void;
  onSetSpeed: (ms: number) => void;
}

const SPEED_OPTIONS = [
  { label: 'Very Slow', ms: 1200 },
  { label: 'Slow', ms: 700 },
  { label: 'Normal', ms: 300 },
  { label: 'Fast', ms: 100 },
  { label: 'Instant', ms: 20 },
];

export default function AttackControls({
  scenarioName,
  scenarioLoading,
  scenario,
  targetBlockIndex,
  showIntermediate,
  showTeacherNotes,
  isPlaying,
  canStepBack,
  speed,
  attackPhase,
  onSelectScenario,
  onSelectBlock,
  onStepForward,
  onStepBackward,
  onPlay,
  onPause,
  onReset,
  onToggleIntermediate,
  onToggleTeacher,
  onSetSpeed,
}: AttackControlsProps) {
  const isComplete = attackPhase === 'block_complete';
  const numBlocks = scenario?.ciphertextBlocks.length ?? 0;

  return (
    <aside className="attack-controls">
      {/* ── Scenario selection ── */}
      <section className="control-section">
        <h3 className="control-heading">Scenario</h3>
        <div className="radio-group">
          {['preset1', 'preset2', 'random'].map(name => (
            <label key={name} className="radio-label">
              <input
                type="radio"
                name="scenario"
                value={name}
                checked={scenarioName === name}
                onChange={() => onSelectScenario(name)}
              />
              <span>
                {name === 'preset1' && 'Short Secret (1 data block)'}
                {name === 'preset2' && 'Multi-block Message (2 blocks)'}
                {name === 'random' && 'Randomize'}
              </span>
            </label>
          ))}
        </div>
        {scenarioLoading && <div className="loading-indicator">Generating scenario…</div>}
        {scenario && !scenarioLoading && (
          <div className="scenario-info">
            <strong>{scenario.name}</strong>
            <p>{scenario.description}</p>
            <div className="scenario-stat">
              {scenario.plaintextBlocks.length} block{scenario.plaintextBlocks.length !== 1 ? 's' : ''} ×
              16 bytes = {scenario.paddedPlaintext.length} bytes (with padding)
            </div>
          </div>
        )}
      </section>

      {/* ── Block selection ── */}
      {numBlocks > 0 && (
        <section className="control-section">
          <h3 className="control-heading">Target Block</h3>
          <div className="block-selector">
            {Array.from({ length: numBlocks }, (_, i) => (
              <button
                key={i}
                className={`block-btn ${targetBlockIndex === i ? 'active' : ''}`}
                onClick={() => onSelectBlock(i)}
                title={`Attack ciphertext block C[${i}]`}
              >
                C[{i}]
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Playback controls ── */}
      <section className="control-section">
        <h3 className="control-heading">Playback</h3>
        <div className="playback-controls">
          <button
            className="ctrl-btn"
            onClick={onStepBackward}
            disabled={!canStepBack || isPlaying}
            title="Step backward (undo last oracle query)"
          >
            ◀ Back
          </button>
          {isPlaying ? (
            <button className="ctrl-btn primary" onClick={onPause} title="Pause auto-play">
              ⏸ Pause
            </button>
          ) : (
            <button
              className="ctrl-btn primary"
              onClick={onPlay}
              disabled={isComplete}
              title="Auto-play the attack"
            >
              ▶ Play
            </button>
          )}
          <button
            className="ctrl-btn"
            onClick={onStepForward}
            disabled={isPlaying || isComplete}
            title="Step forward (one oracle query)"
          >
            Step ▶
          </button>
        </div>
        <button
          className="ctrl-btn full-width"
          onClick={onReset}
          title="Reset attack to beginning"
        >
          ↺ Reset Attack
        </button>
      </section>

      {/* ── Speed slider ── */}
      <section className="control-section">
        <h3 className="control-heading">
          Speed: {SPEED_OPTIONS.find(o => o.ms === speed)?.label ?? 'Custom'}
        </h3>
        <div className="speed-options">
          {SPEED_OPTIONS.map(opt => (
            <button
              key={opt.ms}
              className={`speed-btn ${speed === opt.ms ? 'active' : ''}`}
              onClick={() => onSetSpeed(opt.ms)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Display toggles ── */}
      <section className="control-section">
        <h3 className="control-heading">Display Options</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showIntermediate}
            onChange={onToggleIntermediate}
          />
          <span>Show intermediate state I[i]</span>
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showTeacherNotes}
            onChange={onToggleTeacher}
          />
          <span>Teacher mode (reveal all)</span>
        </label>
        {showTeacherNotes && (
          <div className="teacher-warning">
            ⚠ Teacher mode reveals the secret plaintext and intermediate state. Turn off for learner mode.
          </div>
        )}
      </section>

      {/* ── Color legend ── */}
      <section className="control-section">
        <h3 className="control-heading">Color Legend</h3>
        <div className="legend">
          <LegendItem role="ciphertext" label="Ciphertext byte" />
          <LegendItem role="original-prev" label="Original prev block" />
          <LegendItem role="modified-prev" label="Attacker-modified" />
          <LegendItem role="current-guess" label="Current guess" />
          <LegendItem role="valid-guess" label="Valid padding found!" />
          <LegendItem role="padding-target" label="Forced padding byte" />
          <LegendItem role="intermediate" label="Intermediate I[i]" />
          <LegendItem role="recovered" label="Recovered plaintext" />
          <LegendItem role="padding-byte" label="PKCS#7 padding" />
          <LegendItem role="unknown" label="Unknown" />
        </div>
      </section>
    </aside>
  );
}

function LegendItem({ role, label }: { role: string; label: string }) {
  return (
    <div className="legend-item">
      <div className={`legend-swatch role-${role}`}>ab</div>
      <span>{label}</span>
    </div>
  );
}
