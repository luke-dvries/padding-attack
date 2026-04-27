import type React from 'react';
import './AttackTab.css';

export default function AttackTab() {
  return (
    <div className="lp-section">
      <h2>How the Padding Oracle Attack Works</h2>

      <p>
        The padding oracle attack recovers the plaintext of any AES-CBC ciphertext block, one
        byte at a time, from right to left. It requires only the oracle&#39;s yes/no responses —
        no key material is ever needed.
      </p>

      <h3>Setup</h3>
      <p>
        To recover block <code>P<sub>i</sub></code>, the attacker constructs a <em>modified previous
        block</em> <code>C&#x27;<sub>i-1</sub></code> and sends the pair <code>(C&#x27;<sub>i-1</sub>,&nbsp;C<sub>i</sub>)</code>
        to the oracle. The oracle decrypts using its AES key and treats <code>C&#x27;<sub>i-1</sub></code>
        as the preceding block:
      </p>

      <div className="lp-formula-box">
        <div className="lp-formula">
          <span className="lp-f-lbl">Result</span>
          <code>P&#x27;<sub>i</sub> = AES_D(C<sub>i</sub>) ⊕ C&#x27;<sub>i-1</sub></code>
        </div>
        <div className="lp-formula" style={{ marginTop: 8 }}>
          <span className="lp-f-lbl">Key insight</span>
          <code>AES_D(C<sub>i</sub>)</code>
          <span className="lp-f-note">is fixed — it only depends on C<sub>i</sub> and the AES key, not on C&#x27;<sub>i-1</sub></span>
        </div>
      </div>

      <p>
        Because <code>AES_D(C<sub>i</sub>)</code> is fixed, the attacker fully controls the decrypted output
        by choosing <code>C&#x27;<sub>i-1</sub></code>. The goal is to craft <code>C&#x27;<sub>i-1</sub></code>
        such that the oracle returns &#34;valid,&#34; then use that confirmation to derive the
        true plaintext bytes.
      </p>

      <AttackSetupSVG />

      <h3>Recovering One Byte — Step by Step</h3>

      <div className="atk-steps">
        <Step n={1} title="Choose the target position j (start at j = 15, the rightmost byte)">
          The target padding value is <code>pad = 16 − j</code>.
          For <code>j = 15</code>: <code>pad = 0x01</code>.
          For <code>j = 14</code>: <code>pad = 0x02</code>. And so on.
        </Step>

        <Step n={2} title="Fix all bytes to the right of j (already-recovered positions)">
          For each position <code>k &gt; j</code> where <code>AES_D(C<sub>i</sub>)[k]</code> is already known,
          set:
          <div className="lp-formula-box inline">
            <code>C&#x27;[k] = pad ⊕ AES_D(C<sub>i</sub>)[k]</code>
          </div>
          This forces <code>P&#x27;<sub>i</sub>[k] = AES_D(C<sub>i</sub>)[k] ⊕ C&#x27;[k] = pad</code> — the correct
          trailing-padding value — for every byte to the right of the current target.
        </Step>

        <Step n={3} title="Try all 256 possible values for position j">
          Set <code>C&#x27;[j] = guess</code>, cycling through <code>0x00</code> to
          <code> 0xFF</code>. For all positions to the left of <code>j</code>, leave
          <code> C&#x27;[k] = C<sub>i-1</sub>[k]</code> (unchanged — they don&#39;t yet affect
          the padding check).
        </Step>

        <Step n={4} title={<>Query the oracle with (C&#x27;<sub>i-1</sub>, C<sub>i</sub>)</>}>
          The oracle decrypts and checks whether the last <code>(16 − j)</code> bytes all equal
          <code> pad</code>.
          <ul className="lp-list" style={{ marginTop: 8 }}>
            <li><strong>Invalid</strong> — <code>AES_D(C<sub>i</sub>)[j] ⊕ guess ≠ pad</code>. Increment guess and try again.</li>
            <li><strong>Valid</strong> — all trailing bytes produce the correct padding. Found it!</li>
          </ul>
        </Step>

        <Step n={5} title={<>Derive AES_D(C<sub>i</sub>)[j]</>}>
          When the oracle confirms valid padding:
          <div className="lp-formula-box inline">
            <code>pad = AES_D(C<sub>i</sub>)[j] ⊕ guess  →  AES_D(C<sub>i</sub>)[j] = pad ⊕ guess</code>
          </div>
        </Step>

        <Step n={6} title={<>Recover the plaintext byte P<sub>i</sub>[j]</>}>
          XOR the recovered decryption byte with the <em>original</em> (unmodified) previous ciphertext byte:
          <div className="lp-formula-box inline">
            <code>P<sub>i</sub>[j] = AES_D(C<sub>i</sub>)[j] ⊕ C<sub>i-1</sub>[j]</code>
          </div>
        </Step>

        <Step n={7} title="Move left and repeat">
          Decrement <code>j</code> by 1 (increment the target padding by 1) and return to step 2.
          After 16 iterations the complete 16-byte block is recovered.
        </Step>
      </div>

      <h3>False Positives</h3>
      <p>
        Occasionally the oracle returns &#34;valid&#34; for an incorrect guess — when an
        unintended padding pattern (e.g., two bytes of <code>0x02</code>) satisfies PKCS#7 by
        coincidence. This is detected by slightly modifying one of the preceding bytes in
        <code> C&#x27;<sub>i-1</sub></code> and re-querying: a false positive disappears while the true
        answer persists.
      </p>

      <h3>Attack Cost</h3>
      <div className="atk-stats">
        <div className="atk-stat">
          <div className="atk-stat-num">≤ 256</div>
          <div className="atk-stat-lbl">queries per byte</div>
        </div>
        <div className="atk-stat">
          <div className="atk-stat-num">~128</div>
          <div className="atk-stat-lbl">average per byte</div>
        </div>
        <div className="atk-stat">
          <div className="atk-stat-num">≤ 4 096</div>
          <div className="atk-stat-lbl">queries per block</div>
        </div>
        <div className="atk-stat">
          <div className="atk-stat-num">0</div>
          <div className="atk-stat-lbl">key bits needed</div>
        </div>
      </div>

      <div className="lp-callout">
        <strong>See it live:</strong> Switch to the <em>Attack Visualizer</em> to watch this
        process animated byte-by-byte, with every oracle query logged and plaintext bytes
        filling in from right to left in real time.
      </div>
    </div>
  );
}

// ── Attack setup SVG ──────────────────────────────────────────────────────────

function AttackSetupSVG() {
  // 16 cells: width=24, gap=2 → step=26
  const cw = 24, ch = 28, step = 26;
  const xOff = 88;

  // Row definitions
  const rows: Array<{ y: number; label: React.ReactNode }> = [
    { y: 10,  label: <>C<tspan dy="3" fontSize="8">i-1</tspan></> },
    { y: 58,  label: <>C&#x27;<tspan dy="3" fontSize="8">i-1</tspan></> },
    { y: 106, label: <>C<tspan dy="3" fontSize="8">i</tspan></> },
  ];

  function fill(ri: number, ci: number) {
    if (ri !== 1) return '#0c2340';
    if (ci === 15) return '#ca8a04';
    if (ci === 14) return '#2d1a00';
    return '#111827';
  }
  function stroke(ri: number, ci: number) {
    if (ri !== 1) return '#3b82f6';
    if (ci === 15) return '#eab308';
    if (ci === 14) return '#f97316';
    return '#374151';
  }
  function textColor(ri: number, ci: number) {
    if (ri !== 1) return '#60a5fa';
    if (ci === 15) return '#0d1117';
    if (ci === 14) return '#fb923c';
    return '#4b5563';
  }
  function label(ri: number, ci: number) {
    if (ri !== 1) return '??';
    if (ci === 15) return '?';
    if (ci === 14) return 'F';
    return '  ';
  }

  const totalW = xOff + 16 * step - 2;

  return (
    <figure className="lp-diagram">
      <figcaption>
        Block layout when recovering byte 14 (target padding = 0x02).&ensp;
        <span className="atk-legend-unchanged">■ unchanged</span>&ensp;
        <span className="atk-legend-forced">■ forced (F)</span>&ensp;
        <span className="atk-legend-guess">■ guess (?)</span>
      </figcaption>
      <svg viewBox={`0 0 ${totalW + 60} 160`} className="lp-svg" aria-label="Attack block layout">
        <defs>
          <marker id="atk-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0,8 3,0 6" fill="#6b7280" />
          </marker>
        </defs>

        {rows.map((row, ri) => (
          <g key={ri}>
            <text
              x={xOff - 6} y={row.y + ch / 2}
              textAnchor="end" dominantBaseline="central"
              fill="#94a3b8" fontSize={11} fontFamily="Consolas,monospace" fontWeight="bold"
            >
              {row.label}
            </text>

            {Array.from({ length: 16 }, (_, ci) => {
              const x = xOff + ci * step;
              return (
                <g key={ci}>
                  <rect x={x} y={row.y} width={cw} height={ch} rx={3}
                    fill={fill(ri, ci)} stroke={stroke(ri, ci)} strokeWidth={1} />
                  <text
                    x={x + cw / 2} y={row.y + ch / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fill={textColor(ri, ci)} fontSize={8} fontFamily="Consolas,monospace" fontWeight="bold"
                  >
                    {label(ri, ci)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {/* Byte index ticks for selected positions */}
        {[0, 8, 14, 15].map(ci => (
          <text
            key={ci}
            x={xOff + ci * step + cw / 2} y={rows[2].y + ch + 11}
            textAnchor="middle" fill="#4b5563" fontSize={8} fontFamily="Consolas,monospace"
          >
            {ci}
          </text>
        ))}

        {/* Oracle bracket */}
        <line x1={totalW + 4} y1={rows[1].y + 4}  x2={totalW + 4} y2={rows[2].y + ch - 4} stroke="#374151" strokeWidth={1} />
        <line x1={totalW + 1} y1={rows[1].y + 4}  x2={totalW + 8} y2={rows[1].y + 4}  stroke="#374151" strokeWidth={1} />
        <line x1={totalW + 1} y1={rows[2].y + ch - 4} x2={totalW + 8} y2={rows[2].y + ch - 4} stroke="#374151" strokeWidth={1} />
        <text
          x={totalW + 12} y={(rows[1].y + rows[2].y + ch) / 2}
          textAnchor="start" dominantBaseline="central"
          fill="#64748b" fontSize={10} fontStyle="italic"
        >
          oracle
        </text>
      </svg>
    </figure>
  );
}

function Step({ n, title, children }: { n: number; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="atk-step">
      <div className="atk-step-num">{n}</div>
      <div className="atk-step-body">
        <div className="atk-step-title">{title}</div>
        <div className="atk-step-content">{children}</div>
      </div>
    </div>
  );
}
