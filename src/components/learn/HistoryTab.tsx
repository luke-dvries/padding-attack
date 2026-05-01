import './HistoryTab.css';

export default function HistoryTab({ onNext, nextLabel }: { onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="lp-section">
      <h2>History of CBC Padding Oracle Attacks</h2>

      <p>
        Padding oracle attacks have shadowed CBC-based cryptography for over two decades.
        What began as a theoretical curiosity in an academic paper became one of the most
        practically exploited vulnerability classes in applied cryptography.
      </p>

      <div className="lp-callout">
        <strong>Core insight (Vaudenay, 2002):</strong> If a decryption system leaks whether
        padding is valid — even through something as subtle as a timing difference —
        an attacker can recover the full plaintext one byte at a time without ever knowing
        the key.
      </div>

      {/* Timeline */}
      <h3>Attack Timeline</h3>
      <div className="history-timeline">

        <TimelineEvent
          year="2002"
          name="Vaudenay's Foundational Paper"
          severity="theoretical"
          cve=""
        >
          <p>
            Serge Vaudenay published <em>"Security Flaws Induced by CBC Padding — Applications
            to SSL, IPSEC, WTLS…"</em> at EUROCRYPT 2002, formally describing the padding oracle
            attack for the first time. He showed that any system leaking a padding-validity signal
            after CBC decryption is fully breakable — at most 256 oracle queries per plaintext byte.
          </p>
          <p>
            Vaudenay applied his attack theoretically to SSL, IPsec, and WTLS, noting that all
            three produced distinguishable error responses for invalid padding. The paper set the
            template every later attack would follow.
          </p>
        </TimelineEvent>

        <TimelineEvent
          year="2010"
          name="ASP.NET Padding Oracle (POET)"
          severity="critical"
          cve="CVE-2010-3332 / MS10-070"
        >
          <p>
            Researchers Juliano Rizzo and Thai Duong demonstrated a fully practical padding oracle
            in every version of ASP.NET. The framework encrypted ViewState, authentication cookies,
            and other session data with AES-CBC, then returned either HTTP 200 or HTTP 500
            depending on whether padding was valid after decryption.
          </p>
          <p>
            Using their tool <strong>POET</strong> (Padding Oracle Exploitation Tool), they could
            decrypt an ASP.NET ViewState or forms-authentication cookie in minutes with only
            network access. More critically, knowing the padding oracle also allowed them to 
            <em> forge</em> valid ciphertexts — meaning they could forge authentication tokens and
            log in as any user, including administrators.
          </p>
          <p>
            Microsoft issued an emergency out-of-band patch (MS10-070) within days of responsible
            disclosure, affecting all supported ASP.NET versions at the time.
          </p>
        </TimelineEvent>

        <TimelineEvent
          year="2011"
          name="BEAST"
          severity="high"
          cve="CVE-2011-3389"
        >
          <p>
            Also by Rizzo and Duong, BEAST (Browser Exploit Against SSL/TLS) attacked TLS 1.0's
            CBC implementation using a chosen-plaintext approach rather than a padding oracle
            directly. TLS 1.0 used the last ciphertext block of the previous record as the IV for
            the next, making IVs predictable and enabling a blockwise chosen-boundary attack.
          </p>
          <p>
            BEAST focused on recovering HTTP session cookies via JavaScript running in the
            victim's browser. While it required the attacker to inject JavaScript into the page,
            the attack demonstrated that CBC-mode weaknesses in TLS were actively exploitable —
            not merely theoretical.
          </p>
        </TimelineEvent>

        <TimelineEvent
          year="2013"
          name="Lucky Thirteen"
          severity="high"
          cve="CVE-2013-0169"
        >
          <p>
            Nadhem AlFardan and Kenny Paterson identified a timing side-channel in virtually every
            TLS and DTLS library that supported CBC cipher suites. Even when implementations tried
            to return the same error for all failures, the MAC verification step processed a
            different number of bytes depending on where padding ended — causing a measurable
            timing difference of roughly 1–2 microseconds.
          </p>
          <p>
            The name comes from the fact that MAC computation takes longer when the padding appears
            to be 13 bytes — an artifact of SHA-1/SHA-256 internal block size alignment.
          </p>
          <p>
            Lucky Thirteen was alarming because it broke the assumption that uniform error responses
            were sufficient. Defenders now had to ensure not just the <em>output</em> was
            consistent but that the <em>timing</em> was too, requiring constant-time MAC
            implementations across the entire TLS stack.
          </p>
          <p>
            Affected libraries included OpenSSL, GnuTLS, NSS, PolarSSL, CyaSSL, and the Java
            SunJSSE provider.
          </p>
        </TimelineEvent>

        <TimelineEvent
          year="2014"
          name="POODLE"
          severity="high"
          cve="CVE-2014-3566"
        >
          <p>
            Google researchers Bodo Möller, Thai Duong, and Krzysztof Kotowicz discovered POODLE
            (Padding Oracle On Downgraded Legacy Encryption). The attack had two components:
          </p>
          <ol className="history-ol">
            <li>
              <strong>Protocol downgrade:</strong> TLS clients of the era would retry failed
              handshakes with progressively older protocol versions, all the way down to SSL 3.0,
              for compatibility. An active network attacker could inject handshake failures to
              force the browser to negotiate SSL 3.0.
            </li>
            <li>
              <strong>Padding oracle:</strong> SSL 3.0's CBC mode used a different padding scheme
              than PKCS#7 — only the last byte was required to be correct, meaning any 255 values
              would produce "valid" padding for the last byte with 1-in-256 probability for
              others. The server closed the connection on a padding error, which was
              distinguishable.
            </li>
          </ol>
          <p>
            In practice, a network-positioned attacker running JavaScript in the victim's browser
            could steal an HTTPS session cookie in about 256 requests per byte. POODLE forced the
            industry to finally deprecate SSL 3.0 — most major browsers disabled it within weeks.
          </p>
          <p>
            A follow-up variant, <strong>POODLE-TLS</strong> (CVE-2014-8730), showed that some
            TLS implementations incorrectly copied SSL 3.0's lax padding validation, making the
            padding oracle exploitable even in TLS 1.0–1.2 without any downgrade.
          </p>
        </TimelineEvent>

        <TimelineEvent
          year="2017"
          name="ROBOT"
          severity="high"
          cve="CVE-2017-13099 and others"
        >
          <p>
            Hanno Böck, Juraj Somorovsky, and Craig Young showed that Bleichenbacher's 1998 RSA
            padding oracle — considered long-dead — was still present in the TLS stacks of
            Facebook, PayPal, Cisco, Citrix, and others. ROBOT stands for
            <em> Return Of Bleichenbacher's Oracle Threat</em>.
          </p>
          <p>
            While RSA-PKCS#1 v1.5 padding is distinct from PKCS#7 CBC padding, the attack
            principle is identical: differing server responses to valid vs. invalid padding expose
            an oracle that lets an attacker decrypt TLS session keys or forge RSA signatures
            without knowing the private key.
          </p>
          <p>
            The discovery that a 19-year-old attack class was still winning against billion-user
            services underscored how difficult it is to fully eradicate a cryptographic
            vulnerability once its class is understood.
          </p>
        </TimelineEvent>

        <TimelineEvent
          year="2019"
          name="GOLDENDOODLE"
          severity="medium"
          cve=""
        >
          <p>
            Craig Young demonstrated GOLDENDOODLE against TLS stacks that had implemented Lucky
            Thirteen mitigations incorrectly. Some libraries added constant-time MAC verification
            but failed to make the <em>padding removal</em> step constant-time, reintroducing a
            timing oracle. Others introduced new timing differences in error-logging code paths
            triggered only on invalid padding.
          </p>
          <p>
            GOLDENDOODLE showed that patching CBC vulnerabilities piecemeal is fragile: each
            mitigation creates new assumptions that must hold uniformly across the entire
            implementation, any one of which can reopen an oracle.
          </p>
        </TimelineEvent>

      </div>

      {/* Summary table */}
      <h3>At a Glance</h3>
      <div className="history-table">
        <div className="history-row history-head">
          <span>Year</span>
          <span>Name</span>
          <span>Oracle type</span>
          <span>Target</span>
        </div>
        <div className="history-row">
          <span>2002</span>
          <span>Vaudenay</span>
          <span>Error message distinction</span>
          <span>SSL, IPsec, WTLS (theoretical)</span>
        </div>
        <div className="history-row">
          <span>2010</span>
          <span>ASP.NET / POET</span>
          <span>HTTP 200 vs 500</span>
          <span>ASP.NET ViewState &amp; auth cookies</span>
        </div>
        <div className="history-row">
          <span>2011</span>
          <span>BEAST</span>
          <span>Predictable IV (chosen-plaintext)</span>
          <span>TLS 1.0 session cookies</span>
        </div>
        <div className="history-row">
          <span>2013</span>
          <span>Lucky Thirteen</span>
          <span>Timing side-channel (~1–2 µs)</span>
          <span>TLS/DTLS CBC cipher suites</span>
        </div>
        <div className="history-row">
          <span>2014</span>
          <span>POODLE</span>
          <span>Connection reset on bad padding</span>
          <span>SSL 3.0 (forced via downgrade)</span>
        </div>
        <div className="history-row">
          <span>2017</span>
          <span>ROBOT</span>
          <span>RSA-PKCS#1 error differences</span>
          <span>TLS RSA key exchange (Facebook, PayPal…)</span>
        </div>
        <div className="history-row">
          <span>2019</span>
          <span>GOLDENDOODLE</span>
          <span>Residual timing in patched Lucky 13</span>
          <span>Incompletely patched TLS stacks</span>
        </div>
      </div>

      <div className="lp-callout">
        <strong>The pattern:</strong> Every few years, researchers find a new way to extract
        the same oracle from systems that thought they were protected. The only reliable defense
        is to eliminate CBC-mode encryption entirely and replace it with an AEAD mode
        (AES-GCM, ChaCha20-Poly1305). TLS 1.3, finalized in 2018, made this mandatory by
        removing all non-AEAD cipher suites.
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

function TimelineEvent({
  year,
  name,
  severity,
  cve,
  children,
}: {
  year: string;
  name: string;
  severity: 'theoretical' | 'medium' | 'high' | 'critical';
  cve: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`timeline-event timeline-${severity}`}>
      <div className="timeline-marker">
        <div className="timeline-year">{year}</div>
        <div className="timeline-dot" />
        <div className="timeline-line" />
      </div>
      <div className="timeline-body">
        <div className="timeline-header">
          <span className="timeline-name">{name}</span>
          {cve && <span className="timeline-cve">{cve}</span>}
          <span className={`timeline-badge timeline-badge-${severity}`}>{severity}</span>
        </div>
        <div className="timeline-content">{children}</div>
      </div>
    </div>
  );
}
