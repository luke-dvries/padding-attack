/**
 * useAttack.ts — manages the attack state machine, async oracle queries,
 * step history for back-navigation, auto-play, and skip-to-byte-found.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AttackState,
  advanceToNextByte,
  applyOracleResult,
  buildModifiedPrevBlock,
  initAttackState,
  startAttack,
} from '../lib/attackEngine';
import { ScenarioData, BLOCK_SIZE } from '../lib/crypto';

export interface UseAttackReturn {
  state: AttackState | null;
  canStepBack: boolean;
  isPlaying: boolean;
  speed: number;
  stepForward: () => void;
  stepBackward: () => void;
  skipToByte: () => void;   // fast-forward to next byte found (next valid oracle response)
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (ms: number) => void;
}

export function useAttack(
  scenario: ScenarioData | null,
  targetBlockIndex: number
): UseAttackReturn {
  const [state, setState] = useState<AttackState | null>(null);
  const [history, setHistory] = useState<AttackState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(400);

  const playRef = useRef(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // ── Re-initialize when scenario or target block changes ───────────────────
  useEffect(() => {
    setIsPlaying(false);
    playRef.current = false;
    if (!scenario) { setState(null); setHistory([]); return; }

    const prevBlock =
      targetBlockIndex === 0
        ? scenario.iv
        : scenario.ciphertextBlocks[targetBlockIndex - 1];

    const initial = initAttackState(
      targetBlockIndex,
      scenario.ciphertextBlocks[targetBlockIndex],
      prevBlock,
      scenario.intermediateBlocks[targetBlockIndex],
      scenario.plaintextBlocks[targetBlockIndex]
    );
    setState(initial);
    setHistory([]);
  }, [scenario, targetBlockIndex]);

  // ── Core step (returns next state) ───────────────────────────────────────
  const executeStep = useCallback(async (): Promise<AttackState | null> => {
    if (!scenario) return null;

    // Capture current state synchronously
    let current: AttackState | null = null;
    setState(prev => { current = prev; return prev; });
    if (!current) return null;

    const s = current as AttackState;
    if (s.phase === 'block_complete') return s;

    if (s.phase === 'idle') {
      const next = startAttack(s);
      setHistory(h => [...h, s]);
      setState(next);
      return next;
    }

    if (s.phase === 'byte_found') {
      const next = advanceToNextByte(s);
      setHistory(h => [...h, s]);
      setState(next);
      return next;
    }

    // phase === 'attacking' — make one oracle query
    const modPrev = buildModifiedPrevBlock(s, s.currentGuess);
    const oracleResult = await scenario.oracle(
      new Uint8Array(modPrev),
      new Uint8Array(s.cipherBlock)
    );
    const next = applyOracleResult(s, oracleResult, modPrev);
    setHistory(h => [...h, s]);
    setState(next);
    return next;
  }, [scenario]);

  // ── Public controls ───────────────────────────────────────────────────────
  const stepForward = useCallback(() => { executeStep(); }, [executeStep]);

  const stepBackward = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      setState(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  /** Fast-forward through failing oracle guesses until the next byte is found */
  const skipToByte = useCallback(async () => {
    let guard = 0;
    while (guard++ < 300) {
      const next = await executeStep();
      if (!next) break;
      if (next.phase === 'byte_found' || next.phase === 'block_complete') break;
    }
  }, [executeStep]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    playRef.current = false;
    if (!scenario) return;
    const prevBlock =
      targetBlockIndex === 0
        ? scenario.iv
        : scenario.ciphertextBlocks[targetBlockIndex - 1];
    const initial = initAttackState(
      targetBlockIndex,
      scenario.ciphertextBlocks[targetBlockIndex],
      prevBlock,
      scenario.intermediateBlocks[targetBlockIndex],
      scenario.plaintextBlocks[targetBlockIndex]
    );
    setState(initial);
    setHistory([]);
  }, [scenario, targetBlockIndex]);

  const play = useCallback(() => { setIsPlaying(true); playRef.current = true; }, []);
  const pause = useCallback(() => { setIsPlaying(false); playRef.current = false; }, []);
  const handleSetSpeed = useCallback((ms: number) => { setSpeed(ms); speedRef.current = ms; }, []);

  // ── Auto-play loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;
    const runLoop = async () => {
      while (playRef.current && !cancelled) {
        const next = await executeStep();
        if (!next || next.phase === 'block_complete') {
          setIsPlaying(false); playRef.current = false; break;
        }
        if (next.phase === 'attacking' || next.phase === 'byte_found') {
          await sleep(speedRef.current);
        }
      }
    };
    runLoop();
    return () => { cancelled = true; };
  }, [isPlaying, executeStep]);

  return {
    state, canStepBack: history.length > 0, isPlaying, speed,
    stepForward, stepBackward, skipToByte, play, pause, reset, setSpeed: handleSetSpeed,
  };
}

export function isBlockFullyRecovered(knownPlaintext: (number | null)[], blockSize = BLOCK_SIZE): boolean {
  return knownPlaintext.slice(0, blockSize).every(b => b !== null);
}

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
