/**
 * OracleLog.tsx
 * Scrollable log of every oracle query made during the attack,
 * with human-readable messages and result indicators.
 */

import { useEffect, useRef } from 'react';
import { OracleLogEntry } from '../lib/attackEngine';
import { byteToHex } from '../lib/format';

interface OracleLogProps {
  entries: OracleLogEntry[];
  totalCalls: number;
}

export default function OracleLog({ entries, totalCalls }: OracleLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new entries arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="oracle-log">
      <div className="panel-header">
        <h3>Oracle Log</h3>
        <span className="log-count">{totalCalls} calls</span>
      </div>

      <div className="log-entries">
        {entries.length === 0 && (
          <div className="log-empty">Oracle log will appear here once the attack starts.</div>
        )}
        {entries.map(entry => (
          <LogEntry key={entry.id} entry={entry} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function LogEntry({ entry }: { entry: OracleLogEntry }) {
  const { type, bytePos, targetPadding, guess, oracleResult, intermediateFound, plaintextFound, isFalsePositive, message } = entry;

  if (type === 'start' || type === 'advance') {
    return (
      <div className="log-entry log-info">
        <span className="log-icon">→</span>
        <span className="log-msg">{message}</span>
      </div>
    );
  }

  const resultClass = oracleResult
    ? (isFalsePositive ? 'log-false-positive' : 'log-valid')
    : 'log-invalid';

  return (
    <div className={`log-entry ${resultClass}`}>
      <div className="log-entry-header">
        <span className="log-icon">{oracleResult ? (isFalsePositive ? '⚠' : '✓') : '✗'}</span>
        <span className="log-byte-pos">byte {bytePos}</span>
        <span className="log-guess">guess: 0x{byteToHex(guess)}</span>
        <span className={`log-result ${oracleResult ? 'valid' : 'invalid'}`}>
          {oracleResult ? 'VALID' : 'INVALID'}
          {isFalsePositive && ' (FP!)'}
        </span>
      </div>
      {oracleResult && intermediateFound !== undefined && plaintextFound !== undefined && (
        <div className="log-derivation">
          <span className="log-derive-step">
            I[{bytePos}] = 0x{byteToHex(targetPadding)} ⊕ 0x{byteToHex(guess)} = 0x{byteToHex(intermediateFound)}
          </span>
          <span className="log-derive-step">
            P[{bytePos}] = 0x{byteToHex(intermediateFound)} ⊕ C[{bytePos}] = 0x{byteToHex(plaintextFound)}
            {plaintextFound >= 0x20 && plaintextFound <= 0x7e
              ? ` '${String.fromCharCode(plaintextFound)}'`
              : ''}
          </span>
        </div>
      )}
      {isFalsePositive && (
        <div className="log-fp-note">
          False positive detected (true intermediate differs). In a real attack, verify by modifying another byte.
        </div>
      )}
    </div>
  );
}
