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
  skipToByte: () => void;
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
  const [speed, setSpeed] = useState(300);

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

  // ── Core step: use functional setState to always read the latest state ────
  const executeStep = useCallback((): Promise<AttackState | null> => {
    if (!scenario) return Promise.resolve(null);

    return new Promise<AttackState | null>((resolve) => {
      setState(prev => {
        if (!prev) { resolve(null); return prev; }
        if (prev.phase === 'block_complete') { resolve(prev); return prev; }

        if (prev.phase === 'idle') {
          const next = startAttack(prev);
          setHistory(h => [...h, prev]);
          resolve(next);
          return next;
        }

        if (prev.phase === 'byte_found') {
          const next = advanceToNextByte(prev);
          setHistory(h => [...h, prev]);
          resolve(next);
          return next;
        }

        // phase === 'attacking' — need an async oracle query.
        // We can't await inside setState, so kick off the oracle call and
        // return the current state unchanged. The oracle callback will
        // apply the result via a second setState.
        const s = prev;
        const modPrev = buildModifiedPrevBlock(s, s.currentGuess);
        scenario.oracle(
          new Uint8Array(modPrev),
          new Uint8Array(s.cipherBlock)
        ).then(oracleResult => {
          setState(cur => {
            // Guard: if state was reset while the oracle was in flight, bail
            if (!cur || cur !== s) { resolve(cur); return cur; }
            const next = applyOracleResult(s, oracleResult, modPrev);
            setHistory(h => [...h, s]);
            resolve(next);
            return next;
          });
        });

        // Return prev unchanged — the real update happens in the .then()
        return prev;
      });
    });
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

  // ── Auto-play: schedule one step at a time via setTimeout ─────────────────
  // Each state update triggers a re-render → effect re-runs → next step scheduled.
  // This avoids stale-ref issues from a long-running async while loop.
  useEffect(() => {
    if (!isPlaying || !state) return;
    if (state.phase === 'block_complete') {
      setIsPlaying(false);
      playRef.current = false;
      return;
    }

    const delay = state.phase === 'idle' ? 0 : speedRef.current;
    const timer = setTimeout(() => {
      if (!playRef.current) return;
      executeStep();
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, state, executeStep]);

  return {
    state, canStepBack: history.length > 0, isPlaying, speed,
    stepForward, stepBackward, skipToByte, play, pause, reset, setSpeed: handleSetSpeed,
  };
}

export function isBlockFullyRecovered(knownPlaintext: (number | null)[], blockSize = BLOCK_SIZE): boolean {
  return knownPlaintext.slice(0, blockSize).every(b => b !== null);
}
