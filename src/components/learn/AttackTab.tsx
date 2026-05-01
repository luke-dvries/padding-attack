import type React from 'react';
import './AttackTab.css';

export default function AttackTab() {
  return (
    <div className="lp-section">
      <h2>How the Padding Oracle Attack Works</h2>

      <p>
        The attack recovers plaintext one byte at a time, working right to left across
        the block. The only tool it uses is the oracle&#39;s yes/no answer to: &#34;does
        this ciphertext decrypt to valid PKCS#7 padding?&#34;
      </p>

      <h3>The Core Idea</h3>
      <p>
        To attack block <code>C<sub>i</sub></code>, the attacker sends a modified previous
        block <code>C&#x27;<sub>i-1</sub></code> alongside <code>C<sub>i</sub></code>. The
        server decrypts as:
      </p>
      <div className="lp-formula-box">
        <div className="lp-formula">
          <span className="lp-f-lbl">Decrypted</span>
          <code>P&#x27;<sub>i</sub>[k] = AES_D(C<sub>i</sub>)[k] ⊕ C&#x27;<sub>i-1</sub>[k]</code>
        </div>
        <div className="lp-formula" style={{ marginTop: 8 }}>
          <span className="lp-f-lbl">Key insight</span>
          <code>AES_D(C<sub>i</sub>)</code>
          <span className="lp-f-note">is fixed for a given block — the attacker controls the output entirely through C&#x27;<sub>i-1</sub></span>
        </div>
      </div>
      <p>
        The attacker doesn&#39;t know <code>AES_D(C<sub>i</sub>)</code> directly, but by
        watching which values of <code>C&#x27;<sub>i-1</sub></code> produce valid padding,
        they can solve for it byte by byte.
      </p>

      {/* ── Part 1 ── */}
      <h3>Part 1: Recovering the Last Byte (j&nbsp;=&nbsp;15)</h3>
      <p>
        PKCS#7 valid padding for a 1-byte tail requires exactly one byte equal to
        <code> 0x01</code>. That means the oracle only checks position 15 — all other
        positions are irrelevant. This makes byte 15 the simplest target.
      </p>

      <BlockDiagram target={15} />

      <div className="atk-steps">
        <Step n={1} title="Leave all bytes to the left unchanged">
          Set <code>C&#x27;[k] = C<sub>i-1</sub>[k]</code> for <code>k = 0…14</code>. The
          oracle ignores these during the padding check for <code>pad = 0x01</code>, so
          they don&#39;t matter yet.
        </Step>

        <Step n={2} title="Brute-force position 15">
          Try every value from <code>0x00</code> to <code>0xFF</code> for <code>C&#x27;[15]</code>.
          Each query asks the oracle: does <code>AES_D(C<sub>i</sub>)[15] ⊕ guess = 0x01</code>?
        </Step>

        <Step n={3} title="Wait for the oracle to say valid">
          The oracle responds &#34;valid&#34; for exactly one guess (barring the rare false
          positive). Call it <code>guess*</code>. At that moment:
          <div className="lp-formula-box inline">
            <code>AES_D(C<sub>i</sub>)[15] ⊕ guess* = 0x01</code>
            &ensp;→&ensp;
            <code>AES_D(C<sub>i</sub>)[15] = 0x01 ⊕ guess*</code>
          </div>
        </Step>

        <Step n={4} title={<>Recover P<sub>i</sub>[15]</>}>
          <div>XOR the result with the <em>original</em> (unmodified) ciphertext byte:</div>
          <div className="lp-formula-box" style={{ margin: '8px 0' }}>
            <code>P<sub>i</sub>[15] = AES_D(C<sub>i</sub>)[15] ⊕ C<sub>i-1</sub>[15]</code>
          </div>
          <div>One plaintext byte recovered. On to the next.</div>
        </Step>
      </div>

      <PlaintextRecoverySVG />

      {/* ── Part 2 ── */}
      <h3>Part 2: Recovering the Next Byte (j&nbsp;=&nbsp;14)</h3>
      <p>
        PKCS#7 valid padding for a 2-byte tail requires <em>both</em> bytes 14 and 15 to
        equal <code>0x02</code>. We already know <code>AES_D(C<sub>i</sub>)[15]</code>, so
        we can force byte 15 to <code>0x02</code> and then brute-force byte 14 the same way.
      </p>

      <BlockDiagram target={14} />

      <div className="atk-steps">
        <Step n={1} title="Force byte 15 to produce 0x02">
          We want <code>P&#x27;<sub>i</sub>[15] = AES_D(C<sub>i</sub>)[15] ⊕ C&#x27;[15] = 0x02</code>, so:
          <div className="lp-formula-box inline">
            <code>C&#x27;[15] = 0x02 ⊕ AES_D(C<sub>i</sub>)[15]</code>
          </div>
          This is computable because we recovered <code>AES_D(C<sub>i</sub>)[15]</code> in Part 1.
          Byte 15 is now locked in — it will always produce <code>0x02</code> regardless of what
          we do to byte 14.
        </Step>

        <Step n={2} title="Brute-force position 14">
          Set <code>C&#x27;[k] = C<sub>i-1</sub>[k]</code> for <code>k = 0…13</code> (unchanged),
          then try all 256 values for <code>C&#x27;[14] = guess</code>. The oracle now checks
          that <em>both</em> bytes 14 and 15 equal <code>0x02</code>. Byte 15 is already
          guaranteed, so the oracle is effectively just checking byte 14.
        </Step>

        <Step n={3} title="Solve for byte 14">
          When the oracle confirms valid:
          <div className="lp-formula-box inline">
            <code>AES_D(C<sub>i</sub>)[14] = 0x02 ⊕ guess*</code>
          </div>
          Then:
          <div className="lp-formula-box inline">
            <code>P<sub>i</sub>[14] = AES_D(C<sub>i</sub>)[14] ⊕ C<sub>i-1</sub>[14]</code>
          </div>
        </Step>
      </div>

      {/* ── General pattern ── */}
      <h3>The General Pattern (j&nbsp;=&nbsp;13 down to 0)</h3>
      <p>
        Each subsequent byte follows the same rhythm. To recover byte <code>j</code>:
      </p>
      <ul className="lp-list">
        <li>
          <strong>Target padding:</strong> <code>pad = 16 − j</code>
        </li>
        <li>
          <strong>Fix the tail:</strong> for every <code>k &gt; j</code> where
          <code> AES_D(C<sub>i</sub>)[k]</code> is already known, set
          <code> C&#x27;[k] = pad ⊕ AES_D(C<sub>i</sub>)[k]</code>.
          This forces all trailing bytes to <code>pad</code>.
        </li>
        <li>
          <strong>Brute-force position j:</strong> try <code>0x00</code>–<code>0xFF</code> for{' '}
          <code>C&#x27;[j]</code>.
        </li>
        <li>
          <strong>On valid:</strong> <code>AES_D(C<sub>i</sub>)[j] = pad ⊕ guess*</code>,
          then <code>P<sub>i</sub>[j] = AES_D(C<sub>i</sub>)[j] ⊕ C<sub>i-1</sub>[j]</code>.
        </li>
      </ul>
      <p>
        After 16 iterations (j = 15 down to 0), the entire block is recovered — with no
        knowledge of the AES key.
      </p>

      <h3>False Positives</h3>
      <p>
        Occasionally the oracle says &#34;valid&#34; for a wrong guess because an accidental
        padding pattern (e.g., two bytes of <code>0x02</code> when targeting <code>0x01</code>)
        satisfies PKCS#7 by coincidence. This is resolved by tweaking one of the unchanged
        left-side bytes in <code>C&#x27;<sub>i-1</sub></code> and re-querying — a false
        positive disappears while the true answer persists.
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

// ── Block diagram ─────────────────────────────────────────────────────────────
// Shows C_{i-1}, C'_{i-1}, and C_i rows.
// target=15: only byte 15 is the guess; all others unchanged.
// target=14: byte 15 is forced (F), byte 14 is the guess; rest unchanged.

function BlockDiagram({ target }: { target: 14 | 15 }) {
  const cw = 24, ch = 28, step = 26;
  const xOff = 88;

  const rows: Array<{ y: number; label: React.ReactNode }> = [
    { y: 10,  label: <>C<tspan dy="3" fontSize="8">i-1</tspan></> },
    { y: 58,  label: <>C&#x27;<tspan dy="3" fontSize="8">i-1</tspan></> },
    { y: 106, label: <>C<tspan dy="3" fontSize="8">i</tspan></> },
  ];

  // Placeholder values for the known ciphertext bytes (C_{i-1} and C_i).
  // These are fixed representative hex values — the attacker reads them off the wire.
  const prevBytes = ['3A','F1','0C','8B','2D','E7','55','19','C4','6E','A0','3F','72','B8','4C','D2'];
  const ctBytes   = ['87','2A','E3','5C','09','F6','B1','4E','7D','C0','38','91','6F','23','DA','50'];

  // A position is "overridden" if C'_{i-1} replaces it with a guess or forced value.
  function isOverridden(ci: number) {
    return ci === target || (target === 14 && ci === 15);
  }

  type CellType = 'ci' | 'kept' | 'replaced' | 'guess' | 'forced';

  function cellType(ri: number, ci: number): CellType {
    if (ri === 2) return 'ci';                              // C_i — always full blue
    if (ri === 1) {                                         // C'_{i-1}
      if (ci === target) return 'guess';
      if (target === 14 && ci === 15) return 'forced';
      return 'kept';
    }
    // ri === 0: C_{i-1}
    return isOverridden(ci) ? 'replaced' : 'kept';
  }

  function cellLabel(ri: number, ci: number): string {
    if (ri === 0) return prevBytes[ci];
    if (ri === 2) return ctBytes[ci];
    // C'_{i-1} row
    if (ci === target) return '?';
    if (target === 14 && ci === 15) return 'F';
    return prevBytes[ci];
  }

  // ci    — C_i bytes: full blue (these are what's being decrypted)
  // kept  — unchanged positions in C_{i-1} and C'_{i-1}: muted blue-gray
  // replaced — C_{i-1} positions being overridden: dimmed gray
  // guess / forced — active modification cells: yellow / orange
  const fills   = { ci: '#0c2340', kept: '#0d1829', replaced: '#111827', guess: '#ca8a04', forced: '#2d1a00' };
  const strokes = { ci: '#3b82f6', kept: '#1e3a5f', replaced: '#1f2937', guess: '#eab308', forced: '#f97316' };
  const colors  = { ci: '#60a5fa', kept: '#4a7fa5', replaced: '#2d3f52', guess: '#0d1117', forced: '#fb923c' };

  const totalW = xOff + 16 * step - 2;
  const caption = target === 15
    ? 'Targeting byte 15 (pad = 0x01). Only C\'[15] varies; everything else is untouched.'
    : 'Targeting byte 14 (pad = 0x02). Byte 15 is forced to 0x02; C\'[14] varies.';

  const legendItems = target === 15
    ? [{ cls: 'atk-legend-guess', label: '■ guess (?)' }]
    : [
        { cls: 'atk-legend-forced', label: '■ forced (F)' },
        { cls: 'atk-legend-guess',  label: '■ guess (?)' },
      ];

  const tickPositions = target === 15 ? [0, 8, 15] : [0, 8, 14, 15];

  return (
    <figure className="lp-diagram">
      <figcaption>
        {caption}&ensp;
        <span className="atk-legend-unchanged">■ unchanged</span>&ensp;
        <span className="atk-legend-replaced">■ overridden</span>
        {legendItems.map(({ cls, label }) => (
          <span key={label}>&ensp;<span className={cls}>{label}</span></span>
        ))}
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
              const t = cellType(ri, ci);
              const x = xOff + ci * step;
              return (
                <g key={ci}>
                  <rect x={x} y={row.y} width={cw} height={ch} rx={3}
                    fill={fills[t]} stroke={strokes[t]} strokeWidth={1} />
                  <text
                    x={x + cw / 2} y={row.y + ch / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fill={colors[t]} fontSize={8} fontFamily="Consolas,monospace" fontWeight="bold"
                  >
                    {cellLabel(ri, ci)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {tickPositions.map(ci => (
          <text
            key={ci}
            x={xOff + ci * step + cw / 2} y={rows[2].y + ch + 11}
            textAnchor="middle" fill="#64748b" fontSize={8} fontFamily="Consolas,monospace"
          >
            {ci}
          </text>
        ))}

        {/* Bracket grouping C'_{i-1} and C_i */}
        <line x1={totalW + 4} y1={rows[1].y + 4}  x2={totalW + 4} y2={rows[2].y + ch - 4} stroke="#4b5563" strokeWidth={1} />
        <line x1={totalW + 1} y1={rows[1].y + 4}  x2={totalW + 8} y2={rows[1].y + 4}  stroke="#4b5563" strokeWidth={1} />
        <line x1={totalW + 1} y1={rows[2].y + ch - 4} x2={totalW + 8} y2={rows[2].y + ch - 4} stroke="#4b5563" strokeWidth={1} />
        {/* Arrow from bracket midpoint to oracle label */}
        <line
          x1={totalW + 8} y1={(rows[1].y + rows[2].y + ch) / 2}
          x2={totalW + 18} y2={(rows[1].y + rows[2].y + ch) / 2}
          stroke="#6b7280" strokeWidth={1.5}
          markerEnd="url(#atk-arr)"
        />
        <text
          x={totalW + 21} y={(rows[1].y + rows[2].y + ch) / 2 - 6}
          textAnchor="start" dominantBaseline="central"
          fill="#94a3b8" fontSize={10} fontStyle="italic"
        >
          oracle
        </text>
        <text
          x={totalW + 21} y={(rows[1].y + rows[2].y + ch) / 2 + 6}
          textAnchor="start" dominantBaseline="central"
          fill="#64748b" fontSize={8}
        >
          valid?
        </text>
      </svg>
    </figure>
  );
}

// ── Plaintext recovery diagram ────────────────────────────────────────────────
// Shows two chained XOR steps:
//   Step 1: pad ⊕ guess* = AES_D(Ci)[j]
//   Step 2: AES_D(Ci)[j] ⊕ C_{i-1}[j] = P_i[j]
// Uses j=15, pad=0x01, with concrete placeholder values.

function PlaintextRecoverySVG() {
  const bw = 70, bh = 36;
  // Descriptions sit 12px above each box; notation labels sit 11px below.
  // r1y/r2y are the box top edges — enough gap between rows for the connector.
  const r1y = 26, r2y = 130;

  // Concrete example: j=15, pad=0x01, guess*=0xA7
  //   AES_D = 0x01 ⊕ 0xA7 = 0xA6
  //   P     = 0xA6 ⊕ 0xD2 = 0x74  ('t')
  const vals = { pad: '0x01', guess: '0xA7', aesd: '0xA6', prev: '0xD2', pt: '0x74' };

  const boxes = {
    pad:   { x: 10,  y: r1y, fill: '#042f2e', stroke: '#0d9488', color: '#2dd4bf' },
    guess: { x: 98,  y: r1y, fill: '#1a1500', stroke: '#ca8a04', color: '#fbbf24' },
    aesd1: { x: 186, y: r1y, fill: '#0c1a2e', stroke: '#3b82f6', color: '#93c5fd' },
    aesd2: { x: 10,  y: r2y, fill: '#091525', stroke: '#1d4ed8', color: '#93c5fd' },
    prev:  { x: 98,  y: r2y, fill: '#0c2340', stroke: '#3b82f6', color: '#93c5fd' },
    pt:    { x: 186, y: r2y, fill: '#052e16', stroke: '#16a34a', color: '#4ade80' },
  };

  // descBelow=true puts the description under the notation label (used for row 2
  // to keep it clear of the connector path that enters boxes from above).
  function Box({ id, val, label, desc, bold, descBelow }: {
    id: keyof typeof boxes; val: string; label: string; desc: string; bold?: boolean; descBelow?: boolean
  }) {
    const b = boxes[id];
    const cx = b.x + bw / 2;
    const cy = b.y + bh / 2;
    const labelColor = bold ? b.color : '#94a3b8';
    const descColor  = bold ? b.color : '#64748b';
    return (
      <g>
        {/* Description — above for row 1, below notation for row 2 */}
        {!descBelow && (
          <text x={cx} y={b.y - 5} textAnchor="middle" dominantBaseline="auto"
            fill={descColor} fontSize={7} fontStyle="italic">
            {desc}
          </text>
        )}
        {/* Box */}
        <rect x={b.x} y={b.y} width={bw} height={bh} rx={3}
          fill={b.fill} stroke={b.stroke} strokeWidth={1} />
        {/* Hex value */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill={b.color} fontSize={9} fontFamily="Consolas,monospace" fontWeight="bold">
          {val}
        </text>
        {/* Notation label below box */}
        <text x={cx} y={b.y + bh + 11} textAnchor="middle"
          fill={labelColor} fontSize={8} fontFamily="Consolas,monospace"
          fontWeight={bold ? 'bold' : 'normal'}>
          {label}
        </text>
        {/* Description below notation (row 2 only) */}
        {descBelow && (
          <text x={cx} y={b.y + bh + 22} textAnchor="middle"
            fill={descColor} fontSize={7} fontStyle="italic">
            {desc}
          </text>
        )}
      </g>
    );
  }

  const sym = (x: number, y: number, ch: string) => (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fill="#cbd5e1" fontSize={13} fontWeight="bold">{ch}</text>
  );

  const r1cy = r1y + bh / 2;
  const r2cy = r2y + bh / 2;

  // Connector routing avoids all labels:
  //   - exits aesd1 from bottom-center, steps 2px down (stays above aesd1's
  //     notation label at y≈73), then cuts left to x=183 (just outside aesd1's
  //     notation text), drops through the clear gap, arrives at aesd2 center.
  //   - Row 2 descriptions render BELOW their notation labels (descBelow) so
  //     the connector's final vertical segment at x=45 is unobstructed.
  const connStepY = r1y + bh + 2;            // 64 — 2px below box, above notation
  const connSideX = boxes.aesd1.x - 3;       // 183 — outside notation text boundary
  const connMidY  = Math.round((connStepY + r2y) / 2); // 97
  const destX     = boxes.aesd2.x + bw / 2;  // 45
  const destY     = r2y - 1;                  // 129

  return (
    <figure className="lp-diagram">
      <figcaption>
        Once the oracle confirms <code>guess*</code>: two XOR steps recover the plaintext byte
        (example: j&nbsp;=&nbsp;15, pad&nbsp;=&nbsp;0x01).
      </figcaption>
      <svg viewBox="0 0 270 200" className="lp-svg" aria-label="Plaintext recovery steps">
        <defs>
          <marker id="rec-arr" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
            <polygon points="0 0,7 3,0 6" fill="#4b5563" />
          </marker>
        </defs>

        {/* Row 1: pad ⊕ guess* = AES_D(Ci)[j] */}
        <Box id="pad"   val={vals.pad}   label="pad"           desc="Target padding value" />
        {sym(89, r1cy, '⊕')}
        <Box id="guess" val={vals.guess} label="guess*"        desc="Successful guess" />
        {sym(177, r1cy, '=')}
        <Box id="aesd1" val={vals.aesd}  label="AES_D(Cᵢ)[j]" desc="Decrypted ciphertext byte" />

        {/* Connector: bottom of aesd1 → left side exit → down → right to aesd2 */}
        <path
          d={`M ${boxes.aesd1.x + bw / 2},${r1y + bh} L ${boxes.aesd1.x + bw / 2},${connStepY} L ${connSideX},${connStepY} L ${connSideX},${connMidY} L ${destX},${connMidY} L ${destX},${destY}`}
          fill="none" stroke="#374151" strokeWidth={1} strokeDasharray="3 2"
          markerEnd="url(#rec-arr)"
        />
        <text x={(connSideX + destX) / 2} y={connMidY - 5}
          textAnchor="middle" fill="#64748b" fontSize={7} fontStyle="italic">
          now known
        </text>

        {/* Row 2: AES_D(Ci)[j] ⊕ C_{i-1}[j] = P_i[j] — descriptions below */}
        <Box id="aesd2" val={vals.aesd} label="AES_D(Cᵢ)[j]" desc="Decrypted ciphertext byte" descBelow />
        {sym(89, r2cy, '⊕')}
        <Box id="prev"  val={vals.prev} label="Cᵢ₋₁[j]"      desc="Prev. ciphertext byte"    descBelow />
        {sym(177, r2cy, '=')}
        <Box id="pt"    val={vals.pt}   label="Pᵢ[j]"         desc="Recovered plaintext byte" descBelow bold />
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
