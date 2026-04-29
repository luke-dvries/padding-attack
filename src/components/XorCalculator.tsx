/**
 * XorCalculator.tsx
 *
 * Interactive equation builder for the padding oracle attack.
 * After the oracle returns "valid padding", the user must:
 *   Step 1: Build the equation to derive I[pos] — pick the right operands & operation
 *   Step 2: Build the equation to derive P[pos] — pick the right operands & operation
 *
 * The user selects values from a bank and chooses an operation, learning
 * *what* to compute and *why*, not just doing arithmetic.
 */

import { useState, useCallback } from 'react';
import { byteToHex } from '../lib/format';
import './XorCalculator.css';

interface XorCalculatorProps {
  bytePos: number;
  targetPadding: number;
  guess: number;
  originalPrevByte: number;
  cipherByte: number;
  onCommit: (intermediateValue: number, plaintextValue: number) => void;
}

interface ValueChip {
  id: string;
  label: string;
  sublabel: string;
  value: number;
}

type Operation = 'XOR' | 'AND' | 'OR' | 'ADD' | 'SUB';

const OPERATIONS: { id: Operation; symbol: string }[] = [
  { id: 'XOR', symbol: '\u2295' },
  { id: 'AND', symbol: '&' },
  { id: 'OR',  symbol: '|' },
  { id: 'ADD', symbol: '+' },
  { id: 'SUB', symbol: '\u2212' },
];

function computeOp(a: number, b: number, op: Operation): number {
  switch (op) {
    case 'XOR': return (a ^ b) & 0xff;
    case 'AND': return (a & b) & 0xff;
    case 'OR':  return (a | b) & 0xff;
    case 'ADD': return (a + b) & 0xff;
    case 'SUB': return (a - b) & 0xff;
  }
}

export default function XorCalculator({
  bytePos,
  targetPadding,
  guess,
  originalPrevByte,
  cipherByte,
  onCommit,
}: XorCalculatorProps) {
  const correctIntermediate = targetPadding ^ guess;
  const correctPlaintext = correctIntermediate ^ originalPrevByte;

  const [step, setStep] = useState<1 | 2>(1);
  const [intermediateResult, setIntermediateResult] = useState<number | null>(null);

  // Equation builder state
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  // Available values for each step
  const step1Values: ValueChip[] = [
    { id: 'pad',    label: `0x${byteToHex(targetPadding)}`, sublabel: 'target padding',     value: targetPadding },
    { id: 'guess',  label: `0x${byteToHex(guess)}`,         sublabel: 'successful guess',    value: guess },
    { id: 'cprev',  label: `0x${byteToHex(originalPrevByte)}`, sublabel: `C_prev[${bytePos}]`, value: originalPrevByte },
    { id: 'ctarg',  label: `0x${byteToHex(cipherByte)}`,    sublabel: `C_i[${bytePos}]`,     value: cipherByte },
  ];

  const step2Values: ValueChip[] = intermediateResult !== null ? [
    { id: 'inter',  label: `0x${byteToHex(intermediateResult)}`, sublabel: `I_i[${bytePos}]`,   value: intermediateResult },
    { id: 'cprev',  label: `0x${byteToHex(originalPrevByte)}`,   sublabel: `C_prev[${bytePos}]`, value: originalPrevByte },
    { id: 'ctarg',  label: `0x${byteToHex(cipherByte)}`,         sublabel: `C_i[${bytePos}]`,    value: cipherByte },
    { id: 'pad',    label: `0x${byteToHex(targetPadding)}`,      sublabel: 'target padding',     value: targetPadding },
    { id: 'guess',  label: `0x${byteToHex(guess)}`,              sublabel: 'successful guess',    value: guess },
  ] : [];

  const values = step === 1 ? step1Values : step2Values;

  const handleSelectValue = useCallback((id: string) => {
    setFeedback(null);
    if (selectedA === null) {
      setSelectedA(id);
    } else if (selectedA === id) {
      setSelectedA(null);
    } else if (selectedB === null) {
      setSelectedB(id);
    } else if (selectedB === id) {
      setSelectedB(null);
    } else {
      // Replace B
      setSelectedB(id);
    }
  }, [selectedA, selectedB]);

  const handleSelectOp = useCallback((op: Operation) => {
    setFeedback(null);
    setSelectedOp(prev => prev === op ? null : op);
  }, []);

  const clearEquation = useCallback(() => {
    setSelectedA(null);
    setSelectedOp(null);
    setSelectedB(null);
    setFeedback(null);
  }, []);

  const getChip = (id: string): ValueChip | undefined => values.find(v => v.id === id);

  const handleSubmit = useCallback(() => {
    if (!selectedA || !selectedOp || !selectedB) {
      setFeedback({ type: 'error', msg: 'Build a complete equation: pick two values and an operation.' });
      return;
    }

    const chipA = getChip(selectedA);
    const chipB = getChip(selectedB);
    if (!chipA || !chipB) return;

    const result = computeOp(chipA.value, chipB.value, selectedOp);

    if (step === 1) {
      if (result === correctIntermediate) {
        setFeedback({ type: 'success', msg: `Correct! I_i[${bytePos}] = 0x${byteToHex(result)}` });
        setIntermediateResult(result);
        // Auto-advance to step 2 after a brief moment
        setTimeout(() => {
          setStep(2);
          setSelectedA(null);
          setSelectedOp(null);
          setSelectedB(null);
          setFeedback(null);
        }, 800);
      } else {
        // Give a contextual hint based on what they got wrong
        const hint = getStep1Hint(selectedA, selectedB, selectedOp);
        setFeedback({ type: 'error', msg: hint });
      }
    } else {
      if (result === correctPlaintext) {
        setFeedback({ type: 'success', msg: `Correct! P_i[${bytePos}] = 0x${byteToHex(result)}` });
        setTimeout(() => {
          onCommit(correctIntermediate, correctPlaintext);
        }, 600);
      } else {
        const hint = getStep2Hint(selectedA, selectedB, selectedOp);
        setFeedback({ type: 'error', msg: hint });
      }
    }
  }, [selectedA, selectedOp, selectedB, step, values, correctIntermediate, correctPlaintext, bytePos, onCommit]);

  const chipA = selectedA ? getChip(selectedA) : null;
  const chipB = selectedB ? getChip(selectedB) : null;
  const equationComplete = selectedA && selectedOp && selectedB;

  return (
    <div className="xor-calc">
      <div className="xor-calc-header">
        Derive the Values &mdash; Byte {bytePos}
      </div>

      {/* Context prompt */}
      <div className="xor-calc-prompt">
        {step === 1 ? (
          <>
            The oracle returned <strong>valid padding</strong> for guess <code>0x{byteToHex(guess)}</code> with
            target padding <code>0x{byteToHex(targetPadding)}</code>.
            <br />
            Build the equation to find <strong>I<sub>i</sub>[{bytePos}]</strong> (the intermediate byte).
          </>
        ) : (
          <>
            You found I<sub>i</sub>[{bytePos}] = <code>0x{byteToHex(intermediateResult!)}</code>.
            <br />
            Now build the equation to recover <strong>P<sub>i</sub>[{bytePos}]</strong> (the plaintext byte).
          </>
        )}
      </div>

      {/* Step indicator */}
      <div className="xor-calc-steps-bar">
        <div className={`step-dot ${step >= 1 ? 'done' : ''}`}>1</div>
        <div className="step-line" />
        <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
      </div>

      {/* Value bank */}
      <div className="xor-calc-section-label">Available values — click to select operands:</div>
      <div className="value-bank">
        {values.map(chip => {
          const isA = selectedA === chip.id;
          const isB = selectedB === chip.id;
          return (
            <button
              key={chip.id}
              className={`value-chip ${isA ? 'selected-a' : ''} ${isB ? 'selected-b' : ''}`}
              onClick={() => handleSelectValue(chip.id)}
              title={chip.sublabel}
            >
              <span className="chip-value">{chip.label}</span>
              <span className="chip-label">{chip.sublabel}</span>
              {isA && <span className="chip-badge">A</span>}
              {isB && <span className="chip-badge">B</span>}
            </button>
          );
        })}
      </div>

      {/* Operation picker */}
      <div className="xor-calc-section-label">Operation:</div>
      <div className="op-bank">
        {OPERATIONS.map(op => (
          <button
            key={op.id}
            className={`op-chip ${selectedOp === op.id ? 'selected' : ''}`}
            onClick={() => handleSelectOp(op.id)}
          >
            <span className="op-symbol">{op.symbol}</span>
            <span className="op-name">{op.id}</span>
          </button>
        ))}
      </div>

      {/* Equation display */}
      <div className="equation-display">
        <div className="eq-slot">
          {chipA ? (
            <span className="eq-filled eq-a">{chipA.label}</span>
          ) : (
            <span className="eq-empty">A</span>
          )}
        </div>
        <div className="eq-op-slot">
          {selectedOp ? (
            <span className="eq-op-filled">{OPERATIONS.find(o => o.id === selectedOp)?.symbol}</span>
          ) : (
            <span className="eq-empty">op</span>
          )}
        </div>
        <div className="eq-slot">
          {chipB ? (
            <span className="eq-filled eq-b">{chipB.label}</span>
          ) : (
            <span className="eq-empty">B</span>
          )}
        </div>
        <span className="eq-equals">=</span>
        <div className="eq-result-slot">
          {equationComplete && chipA && chipB && selectedOp ? (
            <span className="eq-result">0x{byteToHex(computeOp(chipA.value, chipB.value, selectedOp))}</span>
          ) : (
            <span className="eq-empty">?</span>
          )}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`xor-calc-feedback ${feedback.type}`}>
          {feedback.msg}
        </div>
      )}

      {/* Action buttons */}
      <div className="xor-calc-actions">
        <button className="xor-calc-btn secondary" onClick={clearEquation}>Clear</button>
        <button
          className="xor-calc-btn primary"
          onClick={handleSubmit}
          disabled={!equationComplete}
        >
          {step === 1 ? 'Check' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hints — guide the user toward the right reasoning without giving it away
// ---------------------------------------------------------------------------

function getStep1Hint(a: string, b: string, op: Operation): string {
  const usedPad = a === 'pad' || b === 'pad';
  const usedGuess = a === 'guess' || b === 'guess';

  if (op !== 'XOR') {
    return 'Think about CBC decryption. The relationship between intermediate bytes and ciphertext uses XOR, not ' + op + '.';
  }
  if (!usedPad || !usedGuess) {
    return 'The oracle told us that I[pos] XOR guess = target_padding. Which two values should you XOR to isolate I[pos]?';
  }
  // Right operands, right operation, but somehow wrong? Shouldn't happen with XOR being commutative
  return 'Almost! Check which values you selected — you need the target padding and the successful guess.';
}

function getStep2Hint(a: string, b: string, op: Operation): string {
  const usedInter = a === 'inter' || b === 'inter';
  const usedCprev = a === 'cprev' || b === 'cprev';

  if (op !== 'XOR') {
    return 'Remember: CBC decryption is P[i] = I[i] XOR C_prev[i]. What operation is that?';
  }
  if (!usedInter) {
    return 'You just found the intermediate value I[pos]. You need it to compute the plaintext.';
  }
  if (!usedCprev) {
    return 'In CBC mode, plaintext = intermediate XOR previous_ciphertext_block. Which value is the previous block byte?';
  }
  return 'Check your selections — you need I[pos] and the original C_prev[pos].';
}
