/**
 * format.ts
 * Utility functions for displaying bytes as hex strings and ASCII.
 */

/** Format a single byte as a two-character uppercase hex string, e.g. 0x0a → "0a" */
export function byteToHex(b: number): string {
  return b.toString(16).padStart(2, '0');
}

/** Format a Uint8Array or number[] as a space-separated hex string */
export function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes).map(byteToHex).join(' ');
}

/** Format a single byte as a printable ASCII character, or '·' for non-printable */
export function byteToAscii(b: number): string {
  if (b >= 0x20 && b <= 0x7e) return String.fromCharCode(b);
  return '·';
}

/** XOR two byte arrays element-wise (must be same length) */
export function xorBytes(a: Uint8Array | number[], b: Uint8Array | number[]): Uint8Array {
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = (a as number[])[i] ^ (b as number[])[i];
  }
  return result;
}

/** Format a number as 0x-prefixed two-char hex, e.g. 10 → "0x0a" */
export function hex(n: number): string {
  return `0x${byteToHex(n)}`;
}

/** Format a byte for use in formulas: value + optional ascii */
export function formatByte(n: number, showAscii = false): string {
  const h = hex(n);
  if (!showAscii) return h;
  const c = byteToAscii(n);
  return c === '·' ? h : `${h} ('${c}')`;
}

/** Describe a PKCS#7 padded block — show which bytes are padding */
export function describePadding(block: Uint8Array): { dataBytes: number; padValue: number; padCount: number } | null {
  const v = block[block.length - 1];
  if (v < 1 || v > block.length) return null;
  for (let i = block.length - v; i < block.length; i++) {
    if (block[i] !== v) return null;
  }
  return { dataBytes: block.length - v, padValue: v, padCount: v };
}
