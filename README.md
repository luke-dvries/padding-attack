# CBC Padding Oracle — Interactive Visualizer

> **Educational simulator only.** This app contains no network attack functionality,
> no external-URL input, and no real exploit code. It is a self-contained teaching
> tool that runs entirely in the browser with a local toy oracle.

An interactive, step-by-step visualization of the **CBC padding oracle attack**
against AES-128-CBC with PKCS#7 padding. Watch the attack recover plaintext
byte-by-byte without ever knowing the key.

---

## What You Will Learn

| Topic | Where |
|-------|-------|
| How AES-CBC mode chains blocks together | Learn → AES-CBC |
| What PKCS#7 padding is and why it's needed | Learn → PKCS#7 Padding |
| What a "padding oracle" is and how it leaks information | Learn → Padding Oracle |
| The full attack algorithm, step by step | Learn → The Attack |
| Live byte-level visualization of the attack | Attack Walkthrough tab |
| Why I[i] = P[i] ⊕ C[i-1] lets an attacker control decryption | Formula Panel |
| How to prevent these vulnerabilities | Defenses tab |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

### Install and Run

```bash
# From the project directory
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview   # serve the built app locally
```

---

## How to Use the App

1. **Start on the Learn tab** — read through the four sub-sections to build
   conceptual understanding of CBC, PKCS#7, and what an oracle is.

2. **Switch to Attack Walkthrough** — a scenario is pre-loaded (AES-128 key
   generated fresh in your browser, never sent anywhere).

3. **Press Step** to execute one oracle query at a time, or **Play** to animate
   the full attack automatically. Use the speed slider to control pacing.

4. **Watch the block rows** — color-coded bytes show:
   - The original previous ciphertext block (blue)
   - The attacker-modified previous block (yellow/orange)
   - The current guess (pulsing yellow)
   - The valid guess that reveals a byte (green)
   - Recovered intermediate state and plaintext bytes

5. **Check the Formula Panel** (right sidebar) to see the exact mathematical
   derivation for each byte being recovered.

6. **Enable Teacher Mode** to reveal the true intermediate state and plaintext
   before the attack discovers them — useful for teaching.

7. **Switch to Defenses** to read about AEAD modes, Encrypt-then-MAC, and
   other mitigations.

---

## Architecture

```
src/
├── lib/
│   ├── crypto.ts          # AES-CBC via Web Crypto API, PKCS#7, oracle, scenarios
│   ├── attackEngine.ts    # Pure state-machine: attack state, step transitions
│   └── format.ts          # Byte/hex/ASCII formatting utilities
├── hooks/
│   └── useAttack.ts       # React hook: async oracle calls, history, auto-play
├── components/
│   ├── Header.tsx          # App title bar
│   ├── BlockVisualizer.tsx # Main attack visualization (block rows, color coding)
│   ├── ByteCell.tsx        # Single hex byte cell, color-coded by role
│   ├── AttackControls.tsx  # Left sidebar: scenario/block/playback controls
│   ├── OracleLog.tsx       # Scrollable log of every oracle query
│   ├── FormulaPanel.tsx    # Math derivation for the current byte
│   ├── LearnPanel.tsx      # Educational content (CBC, padding, oracle, attack)
│   ├── DefensePanel.tsx    # How to prevent padding oracle attacks
│   └── GlossaryTooltip.tsx # Hover-over term definitions
├── App.tsx                 # Root: tab routing, scenario state, layout
├── index.css               # All styles (dark theme, CSS variables)
└── main.tsx                # React entry point
```

### Key Design Decisions

**Real AES via Web Crypto API** — The simulation uses the browser's built-in
`crypto.subtle` for actual AES-128-CBC encryption and decryption. The oracle
is implemented by calling `crypto.subtle.decrypt()` and checking whether it
throws an `OperationError` (invalid padding) or succeeds (valid padding). This
makes the simulation cryptographically accurate, not a fake.

**Intermediate state without raw block decrypt** — Since the app knows the
original plaintext and ciphertext, it computes `I[i] = P[i] ⊕ C[i-1]`
analytically. This is mathematically equivalent to `AES_block_decrypt(C[i])`
but avoids needing ECB mode (not available in Web Crypto).

**Pure state machine** — `attackEngine.ts` contains only pure functions with
no side effects. The `useAttack` hook manages async oracle calls and state
history, keeping concerns separated.

**Step-back via history stack** — Every state before a step is pushed onto a
history stack, allowing unlimited undo without re-computing.

---

## Safety Properties

This app intentionally omits all real attack capabilities:

- No network requests (no `fetch`, `XHR`, `WebSocket`)
- No input field for external URLs or ciphertexts
- Key is generated in-memory, never stored or exported
- Oracle is a local function, not a network endpoint
- Ciphertext is generated inside the app from preset messages
- The app cannot be pointed at any real server

---

## Preset Scenarios

| Name | Plaintext | Blocks | Last block padding |
|------|-----------|--------|--------------------|
| Short Secret | `SECRET MESSAGE!` (16 bytes) | 2 | Full block `0x10 × 16` |
| Multi-Block | `Hello, Crypto World! Attack!` (28 bytes) | 2 | `0x04 × 4` |
| Random | Randomly chosen from 5 example messages | varies | varies |

---

*This is an educational tool, not an attack tool.*
*Built for CS300 — Cryptography and Security.*
