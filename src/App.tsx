/**
 * App.tsx — single-page CBC padding oracle attack visualizer.
 *
 * Flow:
 *   1. User types a message (or uses the default)
 *   2. Clicks "Encrypt" → AES-CBC encrypts it locally (no network)
 *   3. The attack visualization loads, showing all ciphertext blocks
 *   4. User steps through oracle queries with ← → arrows
 *   5. Bytes fill in one-by-one until the block is fully decrypted
 */

import { useCallback, useEffect, useState } from 'react';
import { ScenarioData, createScenario, BLOCK_SIZE } from './lib/crypto';
import { useAttack } from './hooks/useAttack';
import AttackView from './components/AttackView';
import StepControls from './components/StepControls';
import StepInfo from './components/StepInfo';
import LearnPage from './components/LearnPage';
import NotationCheatSheet from './components/NotationCheatSheet';
import XorCalculator from './components/XorCalculator';

type AppPage = 'attack' | 'learn';

const DEFAULT_MESSAGE = 'Attack at dawn!';

export default function App() {
  const [page, setPage] = useState<AppPage>('attack');
  const [inputMessage, setInputMessage] = useState(DEFAULT_MESSAGE);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetBlockIndex, setTargetBlockIndex] = useState(0);
  const [showIntermediate, setShowIntermediate] = useState(true);

  const attack = useAttack(scenario, targetBlockIndex);

  // Load a default scenario on first render so the page isn't blank
  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await createScenario('Default', DEFAULT_MESSAGE, DEFAULT_MESSAGE);
      setTargetBlockIndex(s.ciphertextBlocks.length - 1);
      setScenario(s);
      setLoading(false);
    })();
  }, []);

  const handleEncrypt = useCallback(async () => {
    const msg = inputMessage.trim();
    if (!msg) return;
    if (attack.isPlaying) attack.pause();
    setLoading(true);
    const s = await createScenario('Custom', msg, msg);
    // Default to the last block — it contains the PKCS#7 padding bytes, making it
    // the most illustrative target for a first-time viewer.
    setTargetBlockIndex(s.ciphertextBlocks.length - 1);
    setScenario(s);
    setLoading(false);
  }, [inputMessage, attack]);

  const handleSelectBlock = useCallback((i: number) => {
    if (attack.isPlaying) attack.pause();
    setTargetBlockIndex(i);
  }, [attack]);

  return (
    <div className="page">

      {/* ── Page header ── */}
      <header className="page-header">
        <div className="header-top">
          <div className="header-brand">
            <span className="brand-icon">🔐</span>
            <div>
              <h1>CBC Padding Oracle Attack</h1>
              <p>Encrypt a message, then step through the attack that recovers it without knowing the key.</p>
            </div>
          </div>

          <nav className="page-nav">
            <button
              className={`pnav-btn${page === 'attack' ? ' active' : ''}`}
              onClick={() => setPage('attack')}
            >
              Attack Visualizer
            </button>
            <button
              className={`pnav-btn${page === 'learn' ? ' active' : ''}`}
              onClick={() => setPage('learn')}
            >
              Learn
            </button>
            <NotationCheatSheet />
          </nav>
        </div>

        {page === 'attack' && (
          <form
            className="message-form"
            onSubmit={e => { e.preventDefault(); handleEncrypt(); }}
          >
            <label className="form-label" htmlFor="secret-input">Secret message:</label>
            <div className="form-row">
              <input
                id="secret-input"
                type="text"
                className="message-input"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Type your secret message…"
                maxLength={64}
                disabled={loading}
                autoComplete="off"
              />
              <button type="submit" className="encrypt-btn" disabled={loading || !inputMessage.trim()}>
                {loading ? <><span className="spinner" /> Encrypting…</> : '▶ Encrypt & Attack'}
              </button>
            </div>
          </form>
        )}
      </header>

      {/* ── Learn page ── */}
      {page === 'learn' && <LearnPage />}

      {/* ── Attack page ── */}
      {page === 'attack' && (
        <>
          {loading && !scenario && (
            <div className="page-loading">
              <div className="loading-spinner-big" />
              <p>Generating AES-128 key and encrypting…</p>
            </div>
          )}

          {scenario && attack.state && (
            <>
              <CiphertextChain
                scenario={scenario}
                targetBlockIndex={targetBlockIndex}
                onSelectBlock={handleSelectBlock}
              />
              <div className="attack-main">
                <div className="attack-left">
                  <AttackView
                    attackState={attack.state}
                    showIntermediate={showIntermediate}
                  />
                  <StepInfo attackState={attack.state} />
                </div>
                <div className="attack-right">
                  {attack.state.phase === 'awaiting_input' && attack.state.pendingFound ? (
                    <XorCalculator
                      key={`${targetBlockIndex}-${attack.state.pendingFound.bytePos}-${attack.state.pendingFound.guess}`}
                      bytePos={attack.state.pendingFound.bytePos}
                      targetPadding={attack.state.pendingFound.targetPadding}
                      guess={attack.state.pendingFound.guess}
                      originalPrevByte={attack.state.originalPrevBlock[attack.state.pendingFound.bytePos]}
                      cipherByte={attack.state.cipherBlock[attack.state.pendingFound.bytePos]}
                      onCommit={attack.commitValues}
                    />
                  ) : (
                    <div className="calc-idle-panel">
                      <div className="calc-idle-icon">⊕</div>
                      <p className="calc-idle-title">XOR Calculator</p>
                      <p className="calc-idle-msg">
                        When the oracle finds valid padding, the interactive calculator
                        will activate here to derive the intermediate and plaintext bytes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <StepControls
                state={attack.state}
                canBack={attack.canStepBack}
                showIntermediate={showIntermediate}
                onBack={attack.stepBackward}
                onForward={attack.stepForward}
                onSkip={attack.skipToByte}
                onReset={attack.reset}
                onToggleIntermediate={() => setShowIntermediate(v => !v)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ciphertext chain — shows IV + all ciphertext blocks in a row
// ---------------------------------------------------------------------------

import { byteToHex } from './lib/format';

function CiphertextChain({
  scenario,
  targetBlockIndex,
  onSelectBlock,
}: {
  scenario: ScenarioData;
  targetBlockIndex: number;
  onSelectBlock: (i: number) => void;
}) {
  const prevIdx = targetBlockIndex - 1; // -1 means IV is the previous block

  return (
    <div className="cipher-chain">
      <div className="cipher-chain-label">Ciphertext — click a block to attack it:</div>
      <div className="cipher-chain-blocks">

        {/* IV */}
        <div className="chain-block chain-iv">
          <div className="chain-block-name">IV</div>
          <div className="chain-block-bytes">
            {Array.from(scenario.iv).map((b, j) => (
              <span key={j} className="chain-byte">{byteToHex(b)}</span>
            ))}
          </div>
          {prevIdx === -1 && <div className="chain-badge chain-badge-prev">PREV</div>}
        </div>

        {/* Arrow */}
        <div className="chain-arrow">→</div>

        {/* Ciphertext blocks */}
        {scenario.ciphertextBlocks.map((block, i) => {
          const isTarget = i === targetBlockIndex;
          const isPrev = i === prevIdx;
          return (
            <div key={i} className="chain-block-group">
              <button
                className={`chain-block chain-ct ${isTarget ? 'chain-target' : ''} ${isPrev ? 'chain-prev' : ''}`}
                onClick={() => onSelectBlock(i)}
                title={`Attack block C_${i}`}
              >
                <div className="chain-block-name">C<sub>{i}</sub></div>
                <div className="chain-block-bytes">
                  {Array.from(block).map((b, j) => (
                    <span key={j} className="chain-byte">{byteToHex(b)}</span>
                  ))}
                </div>
                {isTarget && <div className="chain-badge chain-badge-target">TARGET ▼</div>}
                {isPrev && <div className="chain-badge chain-badge-prev">PREV</div>}
              </button>
              {i < scenario.ciphertextBlocks.length - 1 && (
                <div className="chain-arrow">→</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Plaintext length info */}
      <div className="cipher-chain-meta">
        {scenario.paddedPlaintext.length / BLOCK_SIZE} block{scenario.paddedPlaintext.length / BLOCK_SIZE !== 1 ? 's' : ''} ×
        16 bytes = {scenario.paddedPlaintext.length} bytes total
        (message: {scenario.paddedPlaintext.length - scenario.paddedPlaintext[scenario.paddedPlaintext.length - 1]} bytes +{' '}
        {scenario.paddedPlaintext[scenario.paddedPlaintext.length - 1]} bytes PKCS#7 padding)
      </div>
    </div>
  );
}
