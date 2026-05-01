import './CBCTab.css';

export default function CBCTab({ onNext, nextLabel }: { onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="lp-section">
      <h2>AES in Cipher Block Chaining (CBC) Mode</h2>

      <p>
        <strong>AES (Advanced Encryption Standard)</strong> is a <em>block cipher</em>: it
        transforms exactly 16 bytes of plaintext into 16 bytes of ciphertext using a secret key.
        To encrypt messages longer than 16 bytes, a <em>mode of operation</em> chains multiple
        AES calls together. <strong>CBC</strong> is one of the most widely deployed modes.
      </p>

      <h3>Encryption</h3>
      <p>
        Before encrypting each 16-byte block, it is XOR&#39;d with the previous ciphertext block.
        The first block XORs with a random <strong>Initialization Vector (IV)</strong> instead.
        This chaining ensures identical plaintext blocks produce different ciphertexts depending
        on their position in the message.
      </p>

      <div className="lp-formula-box">
        <div className="lp-formula">
          <span className="lp-f-lbl">Encryption</span>
          <code>C<sub>i</sub> = AES_encrypt( P<sub>i</sub> ⊕ C<sub>i−1</sub> )</code>
          <span className="lp-f-note">where C<sub>−1</sub> = IV</span>
        </div>
      </div>

      <CBCEncryptSVG />

      <h3>Decryption</h3>
      <p>
        Decryption runs the chain in reverse: AES-decrypt each ciphertext block, then XOR with
        the previous ciphertext block. <code>AES_decrypt(C<sub>i</sub>)</code> depends only on
        C<sub>i</sub> and the key — its output is fixed regardless of what precedes it.
      </p>

      <div className="lp-formula-box">
        <div className="lp-formula">
          <span className="lp-f-lbl">Decryption</span>
          <code>P<sub>i</sub> = AES_decrypt( C<sub>i</sub> ) ⊕ C<sub>i−1</sub></code>
          <span className="lp-f-note">where C<sub>−1</sub> = IV</span>
        </div>
      </div>

      <CBCDecryptSVG />

      <h3>The Key Vulnerability</h3>
      <div className="lp-callout cbc-vuln">
        <p>
          Because <code>P<sub>i</sub> = AES_decrypt(C<sub>i</sub>) ⊕ C<sub>i−1</sub></code>, anyone who can <em>modify</em> the previous
          ciphertext block can control the decrypted plaintext —
          <strong> without touching C<sub>i</sub> and without knowing the AES key</strong>.
        </p>
        <p>
          The AES key is hidden inside the black-box <code>AES_decrypt(C<sub>i</sub>)</code> step.
          An attacker can <em>infer</em> its output byte-by-byte by exploiting a padding oracle.
        </p>
        <p>
          AES-CBC provides <strong>confidentiality</strong> but not <strong>integrity</strong>.
          Nothing prevents an attacker from modifying ciphertext bytes.
        </p>
      </div>
      {onNext && (
        <div className="lp-next-row">
          <button className="lp-next-btn" onClick={onNext}>
            Next: {nextLabel} <span className="lp-next-btn-arrow">→</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CBCEncryptSVG() {
  const bw = 72, bh = 28, xr = 18, aH = 32;
  const cx0 = 185, cx1 = 420;
  const pY = 10, xY = 80, aY = 110, cY = 165;

  return (
    <figure className="lp-diagram">
      <figcaption>CBC Encryption — two blocks</figcaption>
      <svg viewBox="0 0 540 210" className="lp-svg" aria-label="CBC encryption diagram">
        <defs>
          <marker id="enc-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0,8 3,0 6" fill="#6b7280" />
          </marker>
        </defs>

        <text x={cx0} y={pY - 4} textAnchor="middle" fontSize={9} fill="#6b7280" fontFamily="Consolas,monospace">Block 0</text>
        <text x={cx1} y={pY - 4} textAnchor="middle" fontSize={9} fill="#6b7280" fontFamily="Consolas,monospace">Block 1</text>

        {/* IV */}
        <rect x={10} y={xY - bh / 2} width={56} height={bh} rx={4} fill="#0a1e3d" stroke="#3b82f6" strokeWidth={1.5} />
        <text x={38} y={xY} textAnchor="middle" dominantBaseline="central" fill="#60a5fa" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">IV</text>
        <line x1={66} y1={xY} x2={cx0 - xr - 1} y2={xY} stroke="#3b82f6" strokeWidth={1.5} markerEnd="url(#enc-arr)" />

        {/* Block 0 */}
        <rect x={cx0 - bw / 2} y={pY} width={bw} height={bh} rx={4} fill="#052e16" stroke="#22c55e" strokeWidth={1.5} />
        <text x={cx0} y={pY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#4ade80" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">P<tspan dy="4" fontSize="8">0</tspan></text>
        <line x1={cx0} y1={pY + bh} x2={cx0} y2={xY - xr - 1} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#enc-arr)" />

        <circle cx={cx0} cy={xY} r={xr} fill="#1a0f00" stroke="#f97316" strokeWidth={1.5} />
        <text x={cx0} y={xY + 1} textAnchor="middle" dominantBaseline="central" fill="#f97316" fontSize={18}>⊕</text>
        <line x1={cx0} y1={xY + xr + 1} x2={cx0} y2={aY} stroke="#f97316" strokeWidth={1.5} markerEnd="url(#enc-arr)" />

        <rect x={cx0 - bw / 2} y={aY} width={bw} height={aH} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx0} y={aY + aH / 2} textAnchor="middle" dominantBaseline="central" fill="#93c5fd" fontSize={11} fontFamily="Consolas,monospace" fontWeight="bold">AES_E</text>
        <line x1={cx0} y1={aY + aH} x2={cx0} y2={cY} stroke="#60a5fa" strokeWidth={1.5} markerEnd="url(#enc-arr)" />

        <rect x={cx0 - bw / 2} y={cY} width={bw} height={bh} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx0} y={cY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#60a5fa" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">C<tspan dy="4" fontSize="8">0</tspan></text>

        {/* C[0] → XOR[1] routing */}
        <path
          d={`M ${cx0 + bw / 2 + 1},${cY + bh / 2} L 312,${cY + bh / 2} L 312,${xY} L ${cx1 - xr - 1},${xY}`}
          stroke="#3b82f6" strokeWidth={1.5} fill="none" markerEnd="url(#enc-arr)"
        />

        {/* Block 1 */}
        <rect x={cx1 - bw / 2} y={pY} width={bw} height={bh} rx={4} fill="#052e16" stroke="#22c55e" strokeWidth={1.5} />
        <text x={cx1} y={pY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#4ade80" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">P<tspan dy="4" fontSize="8">1</tspan></text>
        <line x1={cx1} y1={pY + bh} x2={cx1} y2={xY - xr - 1} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#enc-arr)" />

        <circle cx={cx1} cy={xY} r={xr} fill="#1a0f00" stroke="#f97316" strokeWidth={1.5} />
        <text x={cx1} y={xY + 1} textAnchor="middle" dominantBaseline="central" fill="#f97316" fontSize={18}>⊕</text>
        <line x1={cx1} y1={xY + xr + 1} x2={cx1} y2={aY} stroke="#f97316" strokeWidth={1.5} markerEnd="url(#enc-arr)" />

        <rect x={cx1 - bw / 2} y={aY} width={bw} height={aH} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx1} y={aY + aH / 2} textAnchor="middle" dominantBaseline="central" fill="#93c5fd" fontSize={11} fontFamily="Consolas,monospace" fontWeight="bold">AES_E</text>
        <line x1={cx1} y1={aY + aH} x2={cx1} y2={cY} stroke="#60a5fa" strokeWidth={1.5} markerEnd="url(#enc-arr)" />

        <rect x={cx1 - bw / 2} y={cY} width={bw} height={bh} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx1} y={cY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#60a5fa" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">C<tspan dy="4" fontSize="8">1</tspan></text>
        <text x={cx1 + bw / 2 + 10} y={cY + bh / 2 + 5} fill="#4b5563" fontSize={20}>→ …</text>
      </svg>
    </figure>
  );
}

function CBCDecryptSVG() {
  // Flow: C (top) → AES_D → XOR → P (bottom)
  const bw = 72, bh = 28, xr = 18, aH = 32;
  const cx0 = 185, cx1 = 420;
  const cY = 10, aY = 52, xY = 112, pY = 145;

  return (
    <figure className="lp-diagram">
      <figcaption>CBC Decryption — two blocks</figcaption>
      <svg viewBox="0 0 540 185" className="lp-svg" aria-label="CBC decryption diagram">
        <defs>
          <marker id="dec-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0,8 3,0 6" fill="#6b7280" />
          </marker>
        </defs>

        {/* IV */}
        <rect x={10} y={xY - bh / 2} width={56} height={bh} rx={4} fill="#0a1e3d" stroke="#3b82f6" strokeWidth={1.5} />
        <text x={38} y={xY} textAnchor="middle" dominantBaseline="central" fill="#60a5fa" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">IV</text>
        <line x1={66} y1={xY} x2={cx0 - xr - 1} y2={xY} stroke="#3b82f6" strokeWidth={1.5} markerEnd="url(#dec-arr)" />

        {/* Block 0 */}
        <rect x={cx0 - bw / 2} y={cY} width={bw} height={bh} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx0} y={cY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#60a5fa" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">C<tspan dy="4" fontSize="8">0</tspan></text>
        <line x1={cx0} y1={cY + bh} x2={cx0} y2={aY} stroke="#60a5fa" strokeWidth={1.5} markerEnd="url(#dec-arr)" />

        <rect x={cx0 - bw / 2} y={aY} width={bw} height={aH} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx0} y={aY + aH / 2} textAnchor="middle" dominantBaseline="central" fill="#93c5fd" fontSize={11} fontFamily="Consolas,monospace" fontWeight="bold">AES_D</text>

        <line x1={cx0} y1={aY + aH} x2={cx0} y2={xY - xr - 1} stroke="#60a5fa" strokeWidth={1.5} markerEnd="url(#dec-arr)" />

        <circle cx={cx0} cy={xY} r={xr} fill="#1a0f00" stroke="#f97316" strokeWidth={1.5} />
        <text x={cx0} y={xY + 1} textAnchor="middle" dominantBaseline="central" fill="#f97316" fontSize={18}>⊕</text>
        <line x1={cx0} y1={xY + xr + 1} x2={cx0} y2={pY} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#dec-arr)" />

        <rect x={cx0 - bw / 2} y={pY} width={bw} height={bh} rx={4} fill="#052e16" stroke="#22c55e" strokeWidth={1.5} />
        <text x={cx0} y={pY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#4ade80" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">P<tspan dy="4" fontSize="8">0</tspan></text>

        {/* C[0] → XOR[1] routing for block 1 */}
        <path
          d={`M ${cx0 + bw / 2 + 1},${cY + bh / 2} L 312,${cY + bh / 2} L 312,${xY} L ${cx1 - xr - 1},${xY}`}
          stroke="#3b82f6" strokeWidth={1.5} fill="none" markerEnd="url(#dec-arr)"
        />

        {/* Block 1 */}
        <rect x={cx1 - bw / 2} y={cY} width={bw} height={bh} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx1} y={cY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#60a5fa" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">C<tspan dy="4" fontSize="8">1</tspan></text>
        <line x1={cx1} y1={cY + bh} x2={cx1} y2={aY} stroke="#60a5fa" strokeWidth={1.5} markerEnd="url(#dec-arr)" />

        <rect x={cx1 - bw / 2} y={aY} width={bw} height={aH} rx={4} fill="#0c2340" stroke="#60a5fa" strokeWidth={1.5} />
        <text x={cx1} y={aY + aH / 2} textAnchor="middle" dominantBaseline="central" fill="#93c5fd" fontSize={11} fontFamily="Consolas,monospace" fontWeight="bold">AES_D</text>

        <line x1={cx1} y1={aY + aH} x2={cx1} y2={xY - xr - 1} stroke="#60a5fa" strokeWidth={1.5} markerEnd="url(#dec-arr)" />

        <circle cx={cx1} cy={xY} r={xr} fill="#1a0f00" stroke="#f97316" strokeWidth={1.5} />
        <text x={cx1} y={xY + 1} textAnchor="middle" dominantBaseline="central" fill="#f97316" fontSize={18}>⊕</text>
        <line x1={cx1} y1={xY + xr + 1} x2={cx1} y2={pY} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#dec-arr)" />

        <rect x={cx1 - bw / 2} y={pY} width={bw} height={bh} rx={4} fill="#052e16" stroke="#22c55e" strokeWidth={1.5} />
        <text x={cx1} y={pY + bh / 2} textAnchor="middle" dominantBaseline="central" fill="#4ade80" fontSize={12} fontFamily="Consolas,monospace" fontWeight="bold">P<tspan dy="4" fontSize="8">1</tspan></text>
      </svg>
    </figure>
  );
}
