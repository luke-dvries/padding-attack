import './OracleTab.css';

export default function OracleTab() {
  return (
    <div className="lp-section">
      <h2>What Is a Padding Oracle?</h2>

      <p>
        In cryptography, an <strong>oracle</strong> is any system that answers a specific question.
        A <strong>padding oracle</strong> answers exactly one:
      </p>

      <div className="oracle-question">
        "Does this ciphertext decrypt to a value with valid PKCS#7 padding?"
        <div className="oracle-answers">
          <span className="oracle-yes">✓ YES — valid padding</span>
          <span className="oracle-no">✗ NO — invalid padding</span>
        </div>
      </div>

      <h3>The Interaction</h3>
      <p>
        An attacker submits a crafted ciphertext to a server. The server decrypts it and checks
        the padding. The attacker observes whatever the server does next — the oracle response.
      </p>

      <OracleFlowSVG />

      <h3>How It Manifests in Real Systems</h3>
      <p>
        The oracle does not need to be intentional or explicit. Any <em>observable difference</em>
        between valid-padding and invalid-padding outcomes constitutes a working oracle:
      </p>
      <ul className="lp-list">
        <li>
          <strong>Different HTTP status codes</strong> — 200 OK vs 403 Forbidden vs 500 Internal
          Server Error. This was the original class of oracle discovered by Vaudenay.
        </li>
        <li>
          <strong>Distinct error messages</strong> — "Invalid padding" vs "Message authentication
          failed" vs "Decryption error". Even generically different messages are sufficient.
        </li>
        <li>
          <strong>Redirect destination</strong> — a valid ciphertext loads the application; an
          invalid one redirects to the login page or a generic error page.
        </li>
        <li>
          <strong>Timing differences</strong> — the padding check runs before MAC verification;
          if they take measurably different amounts of time, a timing oracle exists (Lucky 13).
        </li>
        <li>
          <strong>Cache behavior</strong> — responses for valid ciphertexts may be cached;
          attackers can distinguish hits (valid) from misses (invalid) by response latency.
        </li>
        <li>
          <strong>Connection behavior</strong> — some implementations close the TCP connection
          on padding errors, providing a distinguishable network-level signal.
        </li>
      </ul>

      <h3>Historical Examples</h3>
      <div className="oracle-history">
        <div className="oracle-history-row oracle-history-head">
          <span>Vulnerability</span>
          <span>Year</span>
          <span>Target system</span>
          <span>Oracle type</span>
        </div>
        <div className="oracle-history-row">
          <span>Vaudenay's CBC padding attack</span>
          <span>2002</span>
          <span>IETF SSL/TLS CBC</span>
          <span>Distinct error messages</span>
        </div>
        <div className="oracle-history-row">
          <span>ASP.NET padding oracle (CVE-2010-3332)</span>
          <span>2010</span>
          <span>ASP.NET ViewState &amp; forms auth cookies</span>
          <span>HTTP 200 vs 500 status codes</span>
        </div>
        <div className="oracle-history-row">
          <span>BEAST</span>
          <span>2011</span>
          <span>TLS 1.0 / SSL 3.0</span>
          <span>Chosen-plaintext + IV predictability</span>
        </div>
        <div className="oracle-history-row">
          <span>Lucky 13 (CVE-2013-0169)</span>
          <span>2013</span>
          <span>TLS / DTLS CBC cipher suites</span>
          <span>Timing side-channel</span>
        </div>
        <div className="oracle-history-row">
          <span>POODLE (CVE-2014-3566)</span>
          <span>2014</span>
          <span>SSL 3.0 fallback</span>
          <span>Forced downgrade + padding oracle</span>
        </div>
        <div className="oracle-history-row">
          <span>GOLDENDOODLE</span>
          <span>2019</span>
          <span>Various TLS CBC stacks</span>
          <span>Non-constant-time MAC verification</span>
        </div>
      </div>

      <h3>Why One Bit Is Enough</h3>
      <div className="lp-callout">
        <p>
          For each target byte position, the attacker tries up to 256 candidate values. Only one
          (or rarely two, with false positives) will produce valid padding. The oracle&#39;s
          yes/no answer identifies which candidate is correct — one bit resolves the ambiguity.
        </p>
        <p>
          A 16-byte block requires at most 256 &times; 16 = <strong>4&thinsp;096 queries</strong>.
          With an average of ~128 queries per byte, a typical block is cracked in around
          <strong> 2&thinsp;048 queries</strong>. No key material is ever needed.
        </p>
      </div>
    </div>
  );
}

function OracleFlowSVG() {
  return (
    <figure className="lp-diagram">
      <figcaption>Attacker–server padding oracle interaction</figcaption>
      <svg viewBox="0 0 480 200" className="lp-svg" aria-label="Oracle flow diagram">
        <defs>
          <marker id="ora-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0,8 3,0 6" fill="#6b7280" />
          </marker>
        </defs>

        {/* Actor header boxes */}
        <rect x={15}  y={12} width={110} height={28} rx={5} fill="#0d1117" stroke="#3b82f6" strokeWidth={1.5} />
        <text x={70}  y={26} textAnchor="middle" dominantBaseline="central" fill="#60a5fa" fontSize={13} fontWeight="bold">Attacker</text>

        <rect x={355} y={12} width={110} height={28} rx={5} fill="#0d1117" stroke="#6b7280" strokeWidth={1.5} />
        <text x={410} y={26} textAnchor="middle" dominantBaseline="central" fill="#94a3b8" fontSize={13} fontWeight="bold">Server</text>

        {/* Timeline dashes */}
        <line x1={70}  y1={40} x2={70}  y2={198} stroke="#1e293b" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={410} y1={40} x2={410} y2={198} stroke="#1e293b" strokeWidth={1.5} strokeDasharray="5 4" />

        {/* Send modified ciphertext */}
        <line x1={71} y1={75} x2={409} y2={75} stroke="#3b82f6" strokeWidth={1.5} markerEnd="url(#ora-arr)" />
        <text x={240} y={65} textAnchor="middle" fill="#93c5fd" fontSize={11} fontFamily="Consolas,monospace">Send modified (C&#x27;<tspan dy="3" fontSize="7">i-1</tspan><tspan dy="-3">, C</tspan><tspan dy="3" fontSize="7">i</tspan><tspan dy="-3">)</tspan></text>

        {/* Server processing box */}
        <rect x={302} y={88} width={155} height={58} rx={5} fill="#0d1117" stroke="#374151" strokeWidth={1} />
        <text x={379} y={104} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="Consolas,monospace">1. AES_D( C<tspan dy="3" fontSize="7">i</tspan><tspan dy="-3"> )</tspan></text>
        <text x={379} y={119} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="Consolas,monospace">2. XOR with C&#x27;<tspan dy="3" fontSize="7">i-1</tspan></text>
        <text x={379} y={134} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="Consolas,monospace">3. check PKCS#7 padding</text>

        {/* Response */}
        <line x1={409} y1={162} x2={71} y2={162} stroke="#4b5563" strokeWidth={1.5} markerEnd="url(#ora-arr)" />
        <text x={240} y={153} textAnchor="middle" fill="#4ade80" fontSize={11} fontFamily="Consolas,monospace">200 OK  (valid padding)</text>
        <text x={240} y={176} textAnchor="middle" fill="#f87171" fontSize={11} fontFamily="Consolas,monospace">500 Error  (invalid padding)</text>
        <text x={240} y={192} textAnchor="middle" fill="#4b5563" fontSize={9}>attacker observes one of the above and records it</text>
      </svg>
    </figure>
  );
}
