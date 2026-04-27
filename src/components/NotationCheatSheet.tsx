import { useState, useRef, type ReactNode } from 'react';
import './NotationCheatSheet.css';

interface Entry {
  symbol: ReactNode;
  name: string;
  desc: string;
}

const ENTRIES: Entry[] = [
  {
    symbol: <><code>C<sub>i</sub></code></>,
    name: 'Ciphertext block',
    desc: 'The i-th 16-byte block output by AES encryption. C\u208b\u2081 is the IV.',
  },
  {
    symbol: <><code>C&#x27;<sub>i</sub></code></>,
    name: 'Modified ciphertext',
    desc: "The attacker's tampered copy of a ciphertext block, sent to the oracle in place of the real one.",
  },
  {
    symbol: <><code>P<sub>i</sub></code></>,
    name: 'Plaintext block',
    desc: 'The i-th 16-byte block of the original message.',
  },
  {
    symbol: <code>IV</code>,
    name: 'Initialization Vector',
    desc: 'A random 16-byte value prepended to the ciphertext. It acts as C\u208b\u2081 during decryption of the first block.',
  },
  {
    symbol: <code>AES_E</code>,
    name: 'AES Encryption',
    desc: 'The block cipher encryption function. Takes a 16-byte plaintext block and the secret key; outputs 16 bytes of ciphertext.',
  },
  {
    symbol: <code>AES_D</code>,
    name: 'AES Decryption',
    desc: 'The block cipher decryption function. Takes a 16-byte ciphertext block and the secret key; outputs 16 bytes. Its output is fixed for a given block — independent of surrounding blocks.',
  },
  {
    symbol: <code>⊕</code>,
    name: 'XOR (exclusive-or)',
    desc: 'Bitwise XOR. In CBC mode, each plaintext block is XORed with the previous ciphertext block before encryption, and XORed again after decryption.',
  },
  {
    symbol: <code>i</code>,
    name: 'Block index',
    desc: 'Which block in the ciphertext, counting from 0. Appears as a subscript: C\u1d62 means the i-th ciphertext block.',
  },
  {
    symbol: <><code>j</code>, <code>k</code></>,
    name: 'Byte index',
    desc: 'Position of a byte within a 16-byte block (0 = leftmost, 15 = rightmost). j is the current target byte; k refers to already-recovered positions to the right.',
  },
  {
    symbol: <code>pad</code>,
    name: 'PKCS#7 padding value',
    desc: 'The expected trailing-byte value for valid padding. When targeting byte j, pad = 16 \u2212 j. For example, targeting byte 15 expects pad = 0x01.',
  },
  {
    symbol: <code>guess</code>,
    name: 'Candidate byte',
    desc: 'The value the attacker tries for C\'[j]. Cycles 0x00\u20130xFF until the oracle confirms valid padding.',
  },
  {
    symbol: <code>PKCS#7</code>,
    name: 'Padding scheme',
    desc: 'Appends n bytes each with value n to pad a message to a 16-byte boundary. The server checks this on decryption — a mismatch is the signal the oracle uses.',
  },
];

export default function NotationCheatSheet() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="ncs-container" ref={containerRef}>
      <button
        className="ncs-trigger"
        onClick={() => setOpen(v => !v)}
        aria-label="Notation cheat sheet"
        aria-expanded={open}
        title="Notation cheat sheet"
      >
        ?
      </button>

      {open && (
        <>
          <div className="ncs-backdrop" onClick={() => setOpen(false)} />
          <div className="ncs-sidebar" role="dialog" aria-label="Notation cheat sheet">
            <div className="ncs-header">
              <span>Notation Cheat Sheet</span>
              <button className="ncs-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <ul className="ncs-list">
              {ENTRIES.map((e, i) => (
                <li key={i} className="ncs-entry">
                  <div className="ncs-symbol">{e.symbol}</div>
                  <div className="ncs-body">
                    <div className="ncs-name">{e.name}</div>
                    <div className="ncs-desc">{e.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
