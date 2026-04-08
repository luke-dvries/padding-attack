/**
 * ByteCell.tsx
 * A single hex byte cell in the block visualizer.
 * Color-coded by role to make relationships immediately obvious.
 */

import { byteToAscii, byteToHex } from '../lib/format';

export type ByteRole =
  | 'unknown'          // Not yet known (shown as ??)
  | 'ciphertext'       // Ciphertext byte (unchanged, dark blue)
  | 'original-prev'    // Original C[i-1] byte (blue)
  | 'modified-prev'    // Attacker-modified C'[i-1] byte (yellow)
  | 'current-guess'    // Byte currently being tried (pulsing yellow)
  | 'valid-guess'      // The guess that yielded valid padding (green)
  | 'padding-target'   // Byte set to create target padding value (orange)
  | 'intermediate'     // Intermediate state I[i] byte (purple)
  | 'recovered'        // Fully recovered plaintext byte (green)
  | 'padding-byte'     // Known padding byte in plaintext (dim green)
  | 'dimmed'           // Low-importance byte (gray)

interface ByteCellProps {
  value: number | null;
  role: ByteRole;
  index: number;        // 0-15 position label
  showIndex?: boolean;
  showAscii?: boolean;
  animate?: boolean;    // apply CSS pulse animation
  tooltip?: string;
  small?: boolean;
}

export default function ByteCell({
  value,
  role,
  index,
  showIndex = false,
  showAscii = false,
  animate = false,
  tooltip,
  small = false,
}: ByteCellProps) {
  const hexStr = value !== null ? byteToHex(value) : '??';
  const ascii = value !== null ? byteToAscii(value) : '';

  const className = [
    'byte-cell',
    `role-${role}`,
    animate ? 'byte-animate' : '',
    small ? 'byte-small' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className} title={tooltip ?? `Byte ${index}: ${hexStr}`}>
      {showIndex && <span className="byte-index">{index}</span>}
      <span className="byte-hex">{hexStr}</span>
      {showAscii && <span className="byte-ascii">{ascii || ' '}</span>}
    </div>
  );
}
