/**
 * GlossaryTooltip.tsx
 * Wraps any text in a hoverable tooltip showing a glossary definition.
 */

import React, { useState } from 'react';

const GLOSSARY: Record<string, string> = {
  IV: 'Initialization Vector — a random 16-byte value prepended to the ciphertext. XOR\'d with the first plaintext block before encryption to ensure identical plaintexts produce different ciphertexts.',
  oracle: 'An oracle is any system that answers a yes/no question. A padding oracle specifically answers: "Does this ciphertext decrypt to a value with valid PKCS#7 padding?"',
  'padding oracle': 'A server or service that reveals whether a decrypted ciphertext has valid PKCS#7 padding. One bit of information per query is enough to recover the full plaintext.',
  'PKCS#7': 'A padding scheme: if n bytes of padding are needed, append n bytes each with value n. For example, 3 bytes of padding = [0x03, 0x03, 0x03].',
  'intermediate state': 'The output of the raw AES block decryption before XOR with the previous ciphertext block: I[i] = AES_block_decrypt(C[i]). The intermediate state never changes for a given C[i] — only the final XOR step is affected by the previous block.',
  'AES-CBC': 'AES in Cipher Block Chaining mode. Each plaintext block is XOR\'d with the previous ciphertext block before encryption. Decryption reverses this: P[i] = AES_block_decrypt(C[i]) XOR C[i-1].',
  'AES-GCM': 'AES in Galois/Counter Mode — an Authenticated Encryption with Associated Data (AEAD) mode. It simultaneously encrypts and authenticates the data, preventing padding oracle attacks.',
  AEAD: 'Authenticated Encryption with Associated Data. Encryption modes like AES-GCM or ChaCha20-Poly1305 that guarantee both confidentiality and integrity, preventing ciphertext tampering attacks.',
  'block cipher': 'A symmetric encryption algorithm that operates on fixed-size blocks of data (AES uses 16-byte / 128-bit blocks).',
  XOR: 'Exclusive OR (⊕). A bitwise operation where 1⊕1=0, 0⊕0=0, 1⊕0=1. Key property: A⊕B⊕B = A, so XOR is its own inverse.',
  'ciphertext': 'The encrypted output. Without the key it should appear random and reveal nothing about the plaintext.',
  'plaintext': 'The original unencrypted message.',
  'false positive': 'A case where the oracle returns "valid padding" for the wrong guess. This happens when a different padding structure (e.g. two bytes of 0x02) happens to be valid by coincidence. Handled by re-checking with a modified earlier byte.',
};

interface GlossaryTooltipProps {
  term: string;
  children?: React.ReactNode;
}

export default function GlossaryTooltip({ term, children }: GlossaryTooltipProps) {
  const [visible, setVisible] = useState(false);
  const definition = GLOSSARY[term] ?? GLOSSARY[term.toLowerCase()];
  if (!definition) return <>{children ?? term}</>;

  return (
    <span
      className="glossary-term"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      role="button"
      aria-label={`Definition of ${term}`}
    >
      {children ?? term}
      {visible && (
        <span className="glossary-tooltip" role="tooltip">
          <strong>{term}</strong>: {definition}
        </span>
      )}
    </span>
  );
}

/** Export for use in other components */
export { GLOSSARY };
