/**
 * DefensePanel.tsx
 * Explains how to prevent padding oracle vulnerabilities.
 * Includes a side-by-side vulnerable vs. defended comparison.
 */

import GlossaryTooltip from './GlossaryTooltip';

export default function DefensePanel() {
  return (
    <div className="defense-panel">
      <h2>How to Prevent Padding Oracle Attacks</h2>
      <p className="defense-intro">
        Padding oracle attacks are entirely preventable. Every mitigation below addresses
        the root cause: exposing decryption behavior through error feedback.
      </p>

      {/* ── Primary recommendation ── */}
      <div className="defense-primary">
        <div className="defense-icon">🛡️</div>
        <div>
          <h3>Primary Recommendation: Use AEAD Encryption</h3>
          <p>
            The best defense is to never use CBC mode for encryption in the first place.
            Modern <GlossaryTooltip term="AEAD">AEAD</GlossaryTooltip> modes encrypt and authenticate
            simultaneously, making ciphertext tampering immediately detectable — no oracle possible.
          </p>
          <div className="aead-options">
            <div className="aead-option">
              <div className="aead-name">AES-GCM</div>
              <div className="aead-desc">The standard choice for most applications. Hardware-accelerated on modern CPUs. Provides authentication tag that detects any modification.</div>
            </div>
            <div className="aead-option">
              <div className="aead-name">ChaCha20-Poly1305</div>
              <div className="aead-desc">Excellent on devices without AES hardware acceleration (e.g., mobile). Also an AEAD mode — no padding oracles possible.</div>
            </div>
            <div className="aead-option">
              <div className="aead-name">XChaCha20-Poly1305</div>
              <div className="aead-desc">Extended nonce variant — useful when random nonce collision probability matters (large numbers of messages).</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── If CBC must be used ── */}
      <h3>If CBC Mode Cannot Be Avoided</h3>
      <p>
        Legacy systems sometimes can't immediately switch to AEAD. In that case:
      </p>

      <div className="defense-cards">
        <DefenseCard
          title="Encrypt-then-MAC (EtM)"
          icon="🔏"
          status="recommended"
          description="Compute an HMAC over the ciphertext (not the plaintext) and verify the MAC before attempting decryption. If the MAC fails, reject immediately — never decrypt. This prevents the oracle from being reached."
          code={`// Correct order: Encrypt, then MAC
const ct = AES_CBC_encrypt(key_enc, iv, plaintext);
const mac = HMAC_SHA256(key_mac, iv + ct);
// On receive: verify MAC first, decrypt only if valid
if (!verifyMAC(mac, received_mac)) throw Error("Tampered!");
const pt = AES_CBC_decrypt(key_enc, iv, ct);`}
        />

        <DefenseCard
          title="Constant-time MAC Comparison"
          icon="⏱️"
          status="required"
          description="Always compare MACs in constant time (same duration regardless of where they differ) to prevent timing oracles. Most languages have a dedicated function for this."
          code={`// JavaScript / Node.js
import { timingSafeEqual } from 'crypto';
// Python
import hmac
hmac.compare_digest(mac_a, mac_b)
// Go
subtle.ConstantTimeCompare(a, b)`}
        />

        <DefenseCard
          title="Uniform Error Responses"
          icon="🔇"
          status="required"
          description='Never return different error messages for "invalid padding" vs "invalid MAC" vs "wrong format". Always return the same generic error regardless of where decryption failed. An attacker must not be able to distinguish failure modes.'
          code={`// BAD — leaks information
if (paddingError) return "Invalid padding";
if (macError)     return "Authentication failed";

// GOOD — uniform response
try { decrypt(...); }
catch { return "Decryption failed"; } // same message always`}
        />

        <DefenseCard
          title="Reject Before Decryption"
          icon="🚫"
          status="required"
          description="Use the Encrypt-then-MAC pattern to reject invalid ciphertexts before any decryption attempt. If you must use MAC-then-Encrypt (legacy), still perform the full decryption before MAC verification, then discard — but this is fragile."
          code={`// Correct flow
1. Receive: IV + Ciphertext + MAC
2. Verify MAC(IV + Ciphertext) — if invalid, reject NOW
3. Only if MAC is valid: decrypt ciphertext
// Never decrypt first and check MAC after`}
        />
      </div>

      {/* ── Side-by-side comparison ── */}
      <h3>Vulnerable vs. Defended: Side-by-Side</h3>
      <div className="comparison-grid">
        <div className="comparison-col vulnerable">
          <div className="comparison-header">
            <span className="comparison-icon">⚠️</span>
            <span>Vulnerable Pattern</span>
          </div>
          <div className="comparison-items">
            <ComparisonItem text="Uses AES-CBC without authentication" bad />
            <ComparisonItem text="Returns 'Invalid padding' error on bad ciphertext" bad />
            <ComparisonItem text="Returns different errors for padding vs. other failures" bad />
            <ComparisonItem text="Decrypts first, then checks integrity" bad />
            <ComparisonItem text="Uses string equality to compare MACs" bad />
            <ComparisonItem text="Logs detailed decryption errors to client" bad />
          </div>
          <div className="comparison-code vulnerable-code">
            <pre>{`// ⚠️ VULNERABLE
function decrypt(ciphertext, key, iv) {
  try {
    const pt = AES_CBC_decrypt(key, iv, ciphertext);
    return { ok: true, data: pt };
  } catch(e) {
    // Leaks decryption internals!
    return { ok: false, error: e.message };
  }
}`}</pre>
          </div>
        </div>

        <div className="comparison-col defended">
          <div className="comparison-header">
            <span className="comparison-icon">✅</span>
            <span>Defended Pattern</span>
          </div>
          <div className="comparison-items">
            <ComparisonItem text="Uses AES-GCM (AEAD) — authentication built in" good />
            <ComparisonItem text="Returns only 'Decryption failed' — no detail" good />
            <ComparisonItem text="Same error code for all failure modes" good />
            <ComparisonItem text="Authentication tag verified before any decryption" good />
            <ComparisonItem text="Uses constant-time MAC comparison" good />
            <ComparisonItem text="No internal error details exposed to client" good />
          </div>
          <div className="comparison-code defended-code">
            <pre>{`// ✅ DEFENDED (using AES-GCM)
async function decrypt(ciphertext, key, iv) {
  try {
    // AES-GCM verifies auth tag internally.
    // If tampered, throws before exposing anything.
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return { ok: true, data: pt };
  } catch {
    return { ok: false }; // no detail!
  }
}`}</pre>
          </div>
        </div>
      </div>

      {/* ── TLS note ── */}
      <div className="defense-note">
        <h3>What About TLS?</h3>
        <p>
          Modern TLS (1.3) has removed CBC cipher suites entirely and mandates AEAD modes.
          TLS 1.2 still supports CBC but adds MAC-then-Encrypt with the CBC-MAC construction, which
          was still vulnerable to timing attacks (Lucky 13) until patched. The lesson: CBC-based
          designs required years of patches to harden. AEAD modes avoid this complexity entirely.
        </p>
      </div>
    </div>
  );
}

function DefenseCard({
  title,
  icon,
  status,
  description,
  code,
}: {
  title: string;
  icon: string;
  status: 'recommended' | 'required';
  description: string;
  code: string;
}) {
  return (
    <div className={`defense-card defense-${status}`}>
      <div className="defense-card-header">
        <span>{icon}</span>
        <span className="defense-card-title">{title}</span>
        <span className={`defense-badge ${status}`}>{status}</span>
      </div>
      <p className="defense-card-desc">{description}</p>
      <pre className="defense-code">{code}</pre>
    </div>
  );
}

function ComparisonItem({ text, bad, good }: { text: string; bad?: boolean; good?: boolean }) {
  return (
    <div className={`comp-item ${bad ? 'comp-bad' : ''} ${good ? 'comp-good' : ''}`}>
      <span className="comp-icon">{bad ? '✗' : '✓'}</span>
      <span>{text}</span>
    </div>
  );
}
