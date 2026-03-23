import { FileData } from './types';

export const INITIAL_FILES: FileData[] = [
  {
    name: 'freq_mod_528.js',
    lang: 'js',
    color: 'var(--color-yellow-primary)',
    raw: `// Reality Forge — 528 Hz Solfeggio modulator
const BASE_FREQ = 528;
const DIVISOR = 83.3333;

function zoneMap(hz) {
  return Math.round(hz / DIVISOR);
}

const ctx = new AudioContext();
const osc = ctx.createOscillator();
osc.frequency.value = BASE_FREQ;
osc.connect(ctx.destination);
osc.start();

// Harmonic stack: 528 → 1056 → 2112
const harmonics = [1, 2, 4].map(n => BASE_FREQ * n);
console.log('Zone:', zoneMap(BASE_FREQ));

export default { osc, harmonics, zoneMap };`
  },
  {
    name: 'fibonacci.py',
    lang: 'py',
    color: 'var(--color-cyan-primary)',
    raw: `# Reality Forge — Fibonacci frequency mapper
import math

BASE = 83.3333  # Hz divisor
PHI = (1 + math.sqrt(5)) / 2

def fib_seq(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a+b

seq = list(fib_seq(20))
hz_map = {n: round(n*PHI, 2) for n in seq}

# 373 Hz zone check
zone_373 = round(373 / BASE)
print(f"373 Hz → zone {zone_373}")
print(f"φ = {PHI:.10f}")`
  },
  {
    name: 'pemf_test.sh',
    lang: 'sh',
    color: 'var(--color-orange-primary)',
    raw: `#!/bin/bash
# PEMF coil diagnostic — ABHA/Rodin 5"

TARGET_OHM=5
STRANDS=32
TURNS=11

echo "[PEMF] Coil: \${STRANDS}-strand bifilar"
echo "[PEMF] Turns: $TURNS | Target: \${TARGET_OHM}Ω"

# CEN-TECH multimeter read
MEASURED=$(multimeter --resistance)

if [[ $MEASURED -eq $TARGET_OHM ]]; then
  echo "[OK] Resistance nominal"
  echo "[OK] AK-380 amp: 4-16Ω ✓"
else
  echo "[WARN] Field output low — check connections"
fi

echo "[INFO] ABHA/Rodin geometry: 5 inch"`
  },
  {
    name: '.gitignore',
    lang: 'txt',
    color: 'var(--color-txt3)',
    raw: `# Dependencies
node_modules/
# Build files
build/
# Environment files
.env
# Logs
npm-debug.log*
# Editor directories and files
.idea/
.vscodecheck/
*.swp
*.swo
.DS_Store
Thumbs.db`
  }
];

export const SHELL_PROMPTS = ['forge:~$', 'node>', '>>>'];
export const LANG_LABELS = ['JS', 'PY', 'SH', 'TXT'];
