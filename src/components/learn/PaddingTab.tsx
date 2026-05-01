import './PaddingTab.css';

export default function PaddingTab({ onNext, nextLabel }: { onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="lp-section">
      <h2>PKCS#7 Padding</h2>

      <p>
        AES operates on <strong>exactly 16 bytes at a time</strong>. Real messages are rarely a
        perfect multiple of 16 bytes, so we must pad them before encryption.
        <strong> PKCS#7</strong> is the standard padding scheme used with AES-CBC.
      </p>

      <div className="lp-formula-box">
        <strong>The Rule:</strong> To pad to the next 16-byte boundary, compute the number of
        missing bytes <em>n</em> and append <em>n</em> copies of the byte value <em>n</em>.
        <br /><br />
        Special case: if the message is <em>already</em> a multiple of 16 bytes, append a full
        extra block of 16 bytes, each with value <code>0x10</code>&nbsp;(16). This ensures padding
        can always be unambiguously removed.
      </div>

      <h3>Valid Padding Examples</h3>
      <p>
        The padding bytes are shown in teal. The pad count can always be read from the last byte.
      </p>

      <PaddingExample
        label="1 byte of padding"
        bytes={['41','42','43','44','45','46','47','48','49','4a','4b','4c','4d','4e','4f','01']}
        padCount={1}
        desc="Last byte = 0x01 → 1 byte of padding. Valid: exactly one byte with value 1."
      />
      <PaddingExample
        label="4 bytes of padding"
        bytes={['48','65','6c','6c','6f','20','57','6f','72','6c','64','21','04','04','04','04']}
        padCount={4}
        desc='"Hello World!" (12 bytes) padded to 16. Last 4 bytes = 0x04.'
      />
      <PaddingExample
        label="Full extra block of padding"
        bytes={['10','10','10','10','10','10','10','10','10','10','10','10','10','10','10','10']}
        padCount={16}
        desc="All 16 bytes = 0x10. Added when the message was already a multiple of 16 bytes."
      />

      <h3>Invalid Padding Examples</h3>
      <p>
        Invalid bytes are shown in red. Any mismatch between the stated count and the actual
        trailing bytes causes the decryption to fail.
      </p>

      <PaddingExample
        label="Mismatched count"
        bytes={['41','42','43','44','45','46','47','48','49','4a','4b','4c','4d','0f','0f','04']}
        padCount={0}
        invalid
        badStart={13}
        desc="Last byte = 0x04, but only 2 preceding bytes equal 0x0f — count mismatch. Invalid."
      />
      <PaddingExample
        label="Zero-byte padding"
        bytes={['41','42','43','44','45','46','47','48','49','4a','4b','4c','4d','4e','4f','00']}
        padCount={0}
        invalid
        badStart={15}
        desc="Last byte = 0x00 — invalid, padding value must be between 1 and 16."
      />

      <h3>Removing Padding on Decryption</h3>
      <p>
        After decrypting the last ciphertext block, the receiver reads the final byte as the
        padding count <em>n</em>, then checks that the last <em>n</em> bytes all equal <em>n</em>.
        If the check fails the message is rejected.
      </p>

      <div className="lp-callout pad-warn">
        <strong>Why this matters for security:</strong> Any observable difference in server
        behavior when padding is invalid — a different HTTP status, a distinct error message,
        a redirect, or even a timing difference — leaks one bit of information per ciphertext
        query. As the next tab explains, that single bit is enough to fully recover the plaintext.
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

function PaddingExample({
  label, bytes, padCount, invalid = false, badStart, desc,
}: {
  label: string;
  bytes: string[];
  padCount: number;
  invalid?: boolean;
  badStart?: number;
  desc: string;
}) {
  return (
    <div className={`pad-ex ${invalid ? 'pad-invalid' : 'pad-valid'}`}>
      <div className="pad-ex-label">{invalid ? '✗' : '✓'} {label}</div>
      <div className="pad-ex-bytes">
        {bytes.map((b, i) => {
          const isPad = !invalid && padCount > 0 && i >= 16 - padCount;
          const isBad = invalid && badStart !== undefined && i >= badStart;
          return (
            <div key={i} className={`pad-byte${isPad ? ' pad' : ''}${isBad ? ' bad' : ''}`}>
              {b}
            </div>
          );
        })}
      </div>
      <div className="pad-ex-desc">{desc}</div>
    </div>
  );
}
