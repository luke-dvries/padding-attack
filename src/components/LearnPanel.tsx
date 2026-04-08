/**
 * LearnPanel.tsx
 * Educational introduction covering CBC mode, PKCS#7 padding, and the oracle.
 * Uses inline SVG diagrams and styled byte grids for visual teaching.
 */

import { useState } from 'react';
import GlossaryTooltip from './GlossaryTooltip';

type LearnTab = 'cbc' | 'padding' | 'oracle' | 'attack';

export default function LearnPanel() {
  const [activeTab, setActiveTab] = useState<LearnTab>('cbc');

  const tabs: { id: LearnTab; label: string }[] = [
    { id: 'cbc', label: '1. AES-CBC' },
    { id: 'padding', label: '2. PKCS#7 Padding' },
    { id: 'oracle', label: '3. Padding Oracle' },
    { id: 'attack', label: '4. The Attack' },
  ];

  return (
    <div className="learn-panel">
      <div className="learn-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`learn-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="learn-content">
        {activeTab === 'cbc' && <CBCSection />}
        {activeTab === 'padding' && <PaddingSection />}
        {activeTab === 'oracle' && <OracleSection />}
        {activeTab === 'attack' && <AttackOverviewSection />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: AES-CBC
// ---------------------------------------------------------------------------

function CBCSection() {
  return (
    <div className="learn-section">
      <h2>AES in Cipher Block Chaining (CBC) Mode</h2>

      <p>
        <strong>AES</strong> is a <GlossaryTooltip term="block cipher">block cipher</GlossaryTooltip>
        {' '}— it encrypts exactly 16 bytes at a time using a secret key.
        To encrypt a longer message, we need a <em>mode of operation</em> that chains multiple blocks together.
      </p>

      <h3>CBC Encryption</h3>
      <p>
        Before encrypting each plaintext block, it is <GlossaryTooltip term="XOR">XOR</GlossaryTooltip>&#39;d
        with the previous ciphertext block.
        The first block uses a random <GlossaryTooltip term="IV">IV</GlossaryTooltip> instead of a previous block.
      </p>

      <div className="learn-formula-box">
        <div className="learn-formula">
          <span className="lf-label">Encrypt:</span>
          <span className="lf-eq">C[i] = AES_encrypt(P[i] ⊕ C[i-1])</span>
          <span className="lf-note">where C[-1] = IV</span>
        </div>
        <div className="learn-formula">
          <span className="lf-label">Decrypt:</span>
          <span className="lf-eq">P[i] = AES_decrypt(C[i]) ⊕ C[i-1]</span>
          <span className="lf-note">where C[-1] = IV</span>
        </div>
      </div>

      {/* CBC diagram */}
      <CBCDiagram />

      <h3>Key Insight for the Attack</h3>
      <div className="learn-callout">
        <p>
          Let <code>I[i] = AES_decrypt(C[i])</code> — called the <strong>intermediate state</strong>.
          Then:
        </p>
        <div className="learn-formula-box inline">
          <div className="learn-formula">
            <span className="lf-eq">P[i] = I[i] ⊕ C[i-1]</span>
          </div>
        </div>
        <p>
          If we can change <code>C[i-1]</code> (the previous ciphertext block), we can control what
          value <code>P[i]</code> gets — <strong>without touching C[i] at all, and without knowing the key</strong>.
          The key is only used internally to compute <code>I[i]</code>.
        </p>
      </div>

      <h3>Why This Matters</h3>
      <p>
        AES-CBC provides <em>confidentiality</em> but not <em>authentication</em>.
        Nothing stops an attacker from modifying ciphertext blocks. If the server
        reveals whether a modified ciphertext decrypts correctly, information leaks.
      </p>
    </div>
  );
}

function CBCDiagram() {
  // Visual CBC chain: IV → C[0] → C[1]
  return (
    <div className="cbc-diagram">
      <div className="cbc-diagram-label">CBC Decryption Chain</div>

      <div className="cbc-chain">
        {/* IV */}
        <div className="cbc-node cbc-iv">
          <div className="cbc-node-label">IV</div>
          <div className="cbc-node-box">00 01 … 0f</div>
        </div>
        <div className="cbc-arrow">→</div>

        {/* Block 0 */}
        <div className="cbc-block">
          <div className="cbc-ct-box">C[0]</div>
          <div className="cbc-aes-arrow">↓ AES Decrypt</div>
          <div className="cbc-xor">⊕</div>
          <div className="cbc-pt-box">P[0]</div>
        </div>

        <div className="cbc-arrow cbc-chain-arrow">
          <div className="cbc-arrow-line" />
          <div className="cbc-arrow-label">feeds into</div>
        </div>

        {/* Block 1 */}
        <div className="cbc-block">
          <div className="cbc-ct-box">C[1]</div>
          <div className="cbc-aes-arrow">↓ AES Decrypt</div>
          <div className="cbc-xor">⊕</div>
          <div className="cbc-pt-box">P[1]</div>
        </div>

        <div className="cbc-arrow">→ …</div>
      </div>

      <div className="cbc-legend">
        <div>C[i] = ciphertext block</div>
        <div>P[i] = plaintext block</div>
        <div>⊕ = XOR with previous ciphertext block</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2: PKCS#7 Padding
// ---------------------------------------------------------------------------

function PaddingSection() {
  return (
    <div className="learn-section">
      <h2>PKCS#7 Padding</h2>

      <p>
        AES works on 16-byte blocks. What if the message isn't a multiple of 16 bytes?
        We add <strong>PKCS#7 padding</strong> to the end.
      </p>

      <div className="learn-formula-box">
        <strong>Rule:</strong> If <em>n</em> bytes of padding are needed, append <em>n</em> bytes
        each with value <em>n</em>.<br />
        If the message is already a multiple of 16, add a full extra block of 16 bytes (value 0x10).
      </div>

      <h3>Valid Padding Examples</h3>

      <PaddingExample
        label="1 byte of padding"
        data={['41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', '01']}
        padStart={15}
        padValue={1}
        description="Last byte = 0x01 — exactly 1 byte of padding value 1"
      />

      <PaddingExample
        label="4 bytes of padding"
        data={['48', '65', '6c', '6c', '6f', '20', '57', '6f', '72', '6c', '64', '21', '04', '04', '04', '04']}
        padStart={12}
        padValue={4}
        description='Last 4 bytes = 0x04 — "Hello World!" padded to 16 bytes'
      />

      <PaddingExample
        label="Full block of padding"
        data={['10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10']}
        padStart={0}
        padValue={16}
        description="All 16 bytes = 0x10 — message was exactly a multiple of 16, so a full padding block is added"
      />

      <h3>Invalid Padding Examples</h3>

      <PaddingExample
        label="Wrong count"
        data={['41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '0f', '0f', '04']}
        padStart={-1}
        padValue={0}
        description="Last byte = 0x04 but only 2 bytes before it equal 0x0f — INVALID, doesn't match"
        invalid
      />

      <PaddingExample
        label="Zero byte"
        data={['41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', '00']}
        padStart={-1}
        padValue={0}
        description="Last byte = 0x00 — INVALID, padding value must be 1–16"
        invalid
      />

      <h3>Why Does the Padding Check Matter?</h3>
      <div className="learn-callout warning">
        <p>
          After decryption, the recipient checks whether the padding is valid.
          If the decrypted last block doesn't end with correct PKCS#7 padding, it's treated as an error.
        </p>
        <p>
          This error response — even just an error code, timing difference, or distinct error message —
          tells an attacker: <em>"your modified ciphertext decrypted to something with invalid padding."</em>
        </p>
        <p>
          That single bit of information per query is enough to recover the full plaintext.
        </p>
      </div>
    </div>
  );
}

function PaddingExample({
  label,
  data,
  padStart,
  padValue: _padValue,
  description,
  invalid = false,
}: {
  label: string;
  data: string[];
  padStart: number;
  padValue?: number;
  description: string;
  invalid?: boolean;
}) {
  return (
    <div className={`padding-example ${invalid ? 'padding-invalid' : 'padding-valid'}`}>
      <div className="padding-example-label">
        {invalid ? '✗' : '✓'} {label}
      </div>
      <div className="padding-example-bytes">
        {data.map((b, i) => (
          <div
            key={i}
            className={`pe-byte ${!invalid && i >= padStart ? 'pad-byte' : ''} ${invalid && i >= data.length - 2 ? 'bad-byte' : ''}`}
          >
            {b}
          </div>
        ))}
      </div>
      <div className="padding-example-desc">{description}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Padding Oracle
// ---------------------------------------------------------------------------

function OracleSection() {
  return (
    <div className="learn-section">
      <h2>What Is a Padding Oracle?</h2>

      <p>
        An <GlossaryTooltip term="oracle">oracle</GlossaryTooltip> is any system that answers questions.
        A <GlossaryTooltip term="padding oracle">padding oracle</GlossaryTooltip> specifically answers:
      </p>

      <div className="learn-oracle-box">
        <div className="oracle-question">
          "Does this ciphertext, when decrypted, end with valid PKCS#7 padding?"
        </div>
        <div className="oracle-answers">
          <div className="oracle-yes">✓ YES — valid padding</div>
          <div className="oracle-no">✗ NO — invalid padding</div>
        </div>
      </div>

      <p>
        In real-world systems, this oracle can appear as:
      </p>
      <ul className="learn-list">
        <li><strong>A different HTTP status code</strong> — 200 OK vs 403 Forbidden vs 500 Error</li>
        <li><strong>A distinct error message</strong> — "Decryption failed" vs "Message corrupted"</li>
        <li><strong>A timing difference</strong> — padding check takes measurably longer or shorter</li>
        <li><strong>A redirect</strong> — goes to login page vs error page</li>
      </ul>

      <div className="learn-callout danger">
        <strong>The Shocking Part:</strong> Just knowing <em>valid or invalid</em> — one bit per query
        — is sufficient to fully decrypt any block, one byte at a time, using at most 256 oracle queries
        per byte (on average ~128).
      </div>

      <h3>Historical Context</h3>
      <p>
        This vulnerability class was first described by Serge Vaudenay in 2002 and has appeared in:
      </p>
      <ul className="learn-list">
        <li><strong>ASP.NET</strong> (2010) — Padding oracle via HTTP 500 vs 200 responses on ViewState</li>
        <li><strong>SSL/TLS</strong> — POODLE (2014) forced SSL 3.0 fallback, Lucky 13 (2013) timing attack on CBC</li>
        <li><strong>Various web frameworks</strong> — any system that decrypts CBC-encrypted cookies without MAC</li>
      </ul>

      <h3>Why The Attacker Doesn't Need the Key</h3>
      <div className="learn-callout">
        <p>The key is used inside <code>AES_block_decrypt(C[i])</code> to compute <code>I[i]</code>.</p>
        <p>
          The attacker never needs to know <code>I[i]</code> directly. Instead, they figure out what
          <code>I[i][j]</code> <em>must be</em> based on which modified previous block byte makes
          the oracle return "valid."
        </p>
        <p>
          The AES operation is a black box. The oracle's yes/no answer is enough to reverse the XOR
          relationship and recover the plaintext without ever breaking AES.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Attack Overview
// ---------------------------------------------------------------------------

function AttackOverviewSection() {
  return (
    <div className="learn-section">
      <h2>How the Attack Works</h2>

      <p>
        To recover byte at position <code>j</code> of plaintext block <code>P[i]</code>:
      </p>

      <div className="attack-steps">
        <AttackStep number={1} title="Choose a target padding value">
          Working from right to left, the target padding is <code>16 − j</code>.
          For the last byte (<code>j = 15</code>), the target is <code>0x01</code>.
          For the second-to-last (<code>j = 14</code>), it's <code>0x02</code>, etc.
        </AttackStep>

        <AttackStep number={2} title="Craft a modified previous block C'[i-1]">
          <p>Build C'[i-1] so that:</p>
          <ul>
            <li>For already-known bytes at positions <code>&gt; j</code>:
              set <code>C'[k] = pad ⊕ I[i][k]</code> to force those bytes to the target padding value.</li>
            <li>For position <code>j</code>:
              set <code>C'[j] = guess</code> (a candidate byte, 0x00 to 0xFF).</li>
          </ul>
        </AttackStep>

        <AttackStep number={3} title="Query the oracle">
          Send (C'[i-1], C[i]) to the oracle. It decrypts and checks padding.
          If invalid: <code>I[i][j] ⊕ guess ≠ pad</code> — try the next guess.
          If valid: found it!
        </AttackStep>

        <AttackStep number={4} title="Derive the intermediate byte">
          When oracle says valid:
          <div className="mini-formula">
            I[i][j] ⊕ guess = pad<br />
            ∴ I[i][j] = pad ⊕ guess
          </div>
        </AttackStep>

        <AttackStep number={5} title="Recover the plaintext byte">
          <div className="mini-formula">
            P[i][j] = I[i][j] ⊕ C[i-1][j]
          </div>
          (using the <em>original</em> C[i-1], not the modified one)
        </AttackStep>

        <AttackStep number={6} title="Repeat for the next byte">
          Move to position <code>j − 1</code>, increment the target padding, and repeat.
          After 16 iterations, the entire block is recovered.
        </AttackStep>
      </div>

      <h3>Cost of the Attack</h3>
      <div className="learn-stats">
        <div className="stat-box">
          <div className="stat-number">≤ 256</div>
          <div className="stat-label">oracle queries per byte</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">~128</div>
          <div className="stat-label">expected queries per byte</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">≤ 4096</div>
          <div className="stat-label">queries per 16-byte block</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">0</div>
          <div className="stat-label">key bits needed</div>
        </div>
      </div>

      <div className="learn-callout">
        <strong>Switch to the Attack tab</strong> to see this process animated, byte-by-byte,
        with the actual oracle responses shown in real-time.
      </div>
    </div>
  );
}

function AttackStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="attack-step">
      <div className="step-number">{number}</div>
      <div className="step-body">
        <div className="step-title">{title}</div>
        <div className="step-content">{children}</div>
      </div>
    </div>
  );
}
