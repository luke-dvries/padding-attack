import './ImpactTab.css';

export default function ImpactTab({ onNext, nextLabel }: { onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="lp-section">
      <h2>Real-World Impact</h2>

      <p>
        Padding oracle vulnerabilities are not theoretical edge cases — they have caused
        measurable harm to real users, companies, and internet infrastructure. The damage
        falls into several interconnected categories.
      </p>

      {/* ── Impact cards ── */}
      <h3>Categories of Harm</h3>
      <div className="impact-grid">

        <ImpactCard
          icon="🔓"
          title="Data Confidentiality Compromise"
          severity="critical"
        >
          The primary effect: encrypted data becomes readable without the key. Attackers
          have used padding oracles to recover session cookies, authentication tokens,
          credit card numbers, PII, encrypted form fields, and proprietary application data.
          Once the attacker can decrypt arbitrary ciphertexts, the encryption provides no
          protection.
        </ImpactCard>

        <ImpactCard
          icon="👤"
          title="Session Hijacking"
          severity="critical"
        >
          Many web applications store encrypted session identifiers in cookies. By decrypting
          these tokens, an attacker gains a valid session and can act as the victim — accessing
          account settings, making transactions, or reading private messages — without ever
          knowing the victim's password.
        </ImpactCard>

        <ImpactCard
          icon="🔑"
          title="Authentication Bypass &amp; Forgery"
          severity="critical"
        >
          The padding oracle attack is a two-way street. Because the attacker understands the
          relationship between the intermediate state and the ciphertext, they can also
          <em> craft</em> a ciphertext that decrypts to an arbitrary plaintext. This allows
          forging authentication tickets, ViewState values, signed tokens, or any
          CBC-encrypted credential — bypassing login entirely.
        </ImpactCard>

        <ImpactCard
          icon="🌐"
          title="Protocol-Level Exposure"
          severity="high"
        >
          POODLE and Lucky Thirteen affected TLS itself — the foundation of HTTPS. Any session
          encrypted with a vulnerable CBC cipher suite was potentially recoverable by a
          network-positioned attacker. This includes bank logins, medical records, email
          sessions, and anything else sent over HTTPS during that era.
        </ImpactCard>

        <ImpactCard
          icon="💸"
          title="Financial &amp; Reputational Damage"
          severity="high"
        >
          Organizations hit by padding oracle vulnerabilities face emergency patch cycles,
          incident response costs, potential regulatory fines (GDPR, PCI-DSS), customer
          notification obligations, and reputational fallout. The ASP.NET vulnerability
          required an out-of-band emergency patch from Microsoft — a rare and costly event.
        </ImpactCard>

        <ImpactCard
          icon="🔬"
          title="Erosion of Trust in Implementations"
          severity="medium"
        >
          Each rediscovery — BEAST, Lucky Thirteen, POODLE, ROBOT — forced the industry to
          confront that even widely deployed, well-audited cryptographic code contained
          exploitable oracles. This eroded confidence in the ability to safely implement
          CBC-based schemes and accelerated the push toward AEAD-only designs.
        </ImpactCard>

      </div>

      {/* ── Per-attack impact breakdown ── */}
      <h3>Attack-by-Attack Impact</h3>

      <AttackImpact
        name="ASP.NET Padding Oracle (2010)"
        affected="All ASP.NET applications running on IIS with default configuration"
        data="ViewState, forms authentication cookies, roles cookies, anonymous identification cookies, session IDs"
        severity="critical"
      >
        <p>
          Every ASP.NET application exposed to the internet was vulnerable by default.
          Attackers could decrypt the ViewState of any page (often containing sensitive
          application data), and — more critically — forge a forms authentication cookie
          for any username, including <code>admin</code>. This meant complete account
          takeover without credentials on any affected site.
        </p>
        <p>
          The POET tool automated the attack: given a URL, it could decrypt or forge
          ASP.NET encrypted tokens in minutes. Microsoft rated this Critical and released
          an emergency out-of-band security update (MS10-070) within days.
        </p>
      </AttackImpact>

      <AttackImpact
        name="Lucky Thirteen (2013)"
        affected="OpenSSL, GnuTLS, NSS, PolarSSL, CyaSSL, Java SunJSSE, and others"
        data="Any data encrypted over TLS/DTLS using a CBC cipher suite (the vast majority of HTTPS traffic at the time)"
        severity="high"
      >
        <p>
          Lucky Thirteen required a network-positioned attacker and many thousands of oracle
          queries per target byte, making it harder to exploit than ASP.NET's HTTP-level
          oracle. However, it demonstrated that even carefully hardened TLS implementations
          that returned identical error codes were still vulnerable through timing.
        </p>
        <p>
          The attack prompted every major TLS library to rewrite their MAC verification and
          padding-check code in constant time — a non-trivial engineering effort requiring
          specialized techniques to prevent compiler and CPU optimizations from reintroducing
          timing differences.
        </p>
      </AttackImpact>

      <AttackImpact
        name="POODLE (2014)"
        affected="Any browser and server supporting SSL 3.0 fallback (essentially all major browsers and most servers)"
        data="HTTPS session cookies, OAuth tokens, HTTP Authorization headers"
        severity="high"
      >
        <p>
          POODLE's network-based attack model — inject handshake errors to trigger SSL 3.0
          downgrade, then use JavaScript running in the browser to make chosen-prefix requests
          — could steal a session cookie in under two minutes in lab conditions. The attack
          required the attacker to share a network with the victim (coffee shop Wi-Fi, corporate
          network, or ISP-level positioning).
        </p>
        <p>
          The industry response was immediate and decisive: Chrome, Firefox, Internet Explorer,
          and Safari all disabled SSL 3.0 within weeks. RFC 7568 formally prohibited SSL 3.0
          in 2015. POODLE is widely credited as the event that finally killed SSL 3.0
          in production after years of warnings that it should be deprecated.
        </p>
      </AttackImpact>

      <AttackImpact
        name="ROBOT (2017)"
        affected="Facebook, Citrix, Cisco, Radware, F5, Palo Alto Networks, and many others"
        data="TLS session keys (enabling passive decryption of recorded traffic), RSA signature forgery"
        severity="high"
      >
        <p>
          ROBOT showed that high-profile infrastructure — including Facebook's load balancers
          — was running 19-year-old vulnerable RSA padding code. An attacker with the ability
          to make TLS handshake requests could recover session keys, decrypt any recorded
          TLS traffic to those servers, and forge RSA signatures.
        </p>
        <p>
          The scale was significant: security scans found roughly 2.8% of the top million
          HTTPS domains were vulnerable, including Fortune 500 companies and major internet
          services. The attack worked because RSA-PKCS#1 v1.5 key exchange was still enabled
          by default on many servers despite modern TLS supporting forward-secret alternatives.
        </p>
      </AttackImpact>

      {/* ── Protocol-level consequences ── */}
      <h3>Protocol-Level Consequences</h3>
      <p>
        The accumulation of CBC padding oracle attacks forced fundamental changes to how
        TLS is designed:
      </p>
      <ul className="lp-list">
        <li>
          <strong>SSL 3.0 deprecated (RFC 7568, 2015)</strong> — formally prohibited after
          POODLE. Browsers removed support within weeks of the attack's publication.
        </li>
        <li>
          <strong>TLS 1.0 and 1.1 deprecated (RFC 8996, 2021)</strong> — both versions
          supported CBC cipher suites vulnerable to Lucky Thirteen and related attacks.
          Major browsers dropped support in 2020.
        </li>
        <li>
          <strong>TLS 1.3 mandates AEAD (RFC 8446, 2018)</strong> — TLS 1.3 removed all
          non-AEAD cipher suites. CBC mode is simply not available in TLS 1.3, closing
          the entire class of CBC padding oracle attacks at the protocol level.
        </li>
        <li>
          <strong>RSA key exchange removed from TLS 1.3</strong> — eliminating the RSA
          PKCS#1 v1.5 oracle class (ROBOT) simultaneously.
        </li>
      </ul>

      <div className="impact-conclusion">
        <div className="impact-conclusion-icon">📌</div>
        <div>
          <strong>The lasting lesson:</strong> Padding oracle attacks demonstrate that
          encryption without authentication is fundamentally broken as a design pattern.
          A system that decrypts before verifying integrity will always leak information —
          regardless of how carefully error messages are crafted. The correct answer is
          authenticated encryption (AEAD) at the design level, not better error handling.
        </div>
      </div>
    </div>
  );
}

function ImpactCard({
  icon,
  title,
  severity,
  children,
}: {
  icon: string;
  title: string;
  severity: 'medium' | 'high' | 'critical';
  children: React.ReactNode;
}) {
  return (
    <div className={`impact-card impact-card-${severity}`}>
      <div className="impact-card-header">
        <span className="impact-icon">{icon}</span>
        <span className="impact-card-title">{title}</span>
        <span className={`impact-badge impact-badge-${severity}`}>{severity}</span>
      </div>
      <p className="impact-card-body">{children}</p>
    </div>
  );
}

function AttackImpact({
  name,
  affected,
  data,
  severity,
  children,
}: {
  name: string;
  affected: string;
  data: string;
  severity: 'high' | 'critical';
  children: React.ReactNode;
}) {
  return (
    <div className={`attack-impact attack-impact-${severity}`}>
      <div className="attack-impact-name">{name}</div>
      <div className="attack-impact-meta">
        <div className="aim-row">
          <span className="aim-label">Affected</span>
          <span className="aim-value">{affected}</span>
        </div>
        <div className="aim-row">
          <span className="aim-label">Data at risk</span>
          <span className="aim-value">{data}</span>
        </div>
      </div>
      <div className="attack-impact-detail">{children}</div>
    </div>
  );
}
