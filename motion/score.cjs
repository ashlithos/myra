/* Synthesizes the reel's 15s score, locked to the same beat map as reel.js.
 *   node motion/score.cjs  →  motion/out/myra-reel-score.wav  (48 kHz, stereo, 16-bit)
 * Pad + bell chimes on key moments + air whooshes on transitions + soft typing ticks,
 * all through a small Schroeder reverb.
 */
const fs = require("fs");
const path = require("path");

const SR = 48000;
const DUR = 15;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);
const wetL = new Float32Array(N);
const wetR = new Float32Array(N);

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (x) => x * x * (3 - 2 * x);

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- pad: chords crossfade on the reel's beats ---- */
const CHORDS = [
  [0.0, [50, 57, 62, 66, 69, 76]], // Dmaj9
  [3.75, [47, 54, 62, 66, 69, 73]], // Bm11-ish
  [6.35, [43, 55, 59, 62, 66, 69]], // Gmaj7
  [8.6, [45, 57, 61, 64, 69, 71]], // Aadd9
  [10.4, [42, 54, 61, 64, 69, 73]], // F#m7
  [11.9, [38, 50, 57, 62, 66, 69, 76]], // Dmaj9, open
];
function chordWeights(t) {
  return CHORDS.map(([start], i) => {
    const next = CHORDS[i + 1] ? CHORDS[i + 1][0] : Infinity;
    const fadeIn = i === 0 ? 1 : smooth(clamp((t - start + 0.35) / 0.9, 0, 1));
    const fadeOut = next === Infinity ? 1 : 1 - smooth(clamp((t - next + 0.35) / 0.9, 0, 1));
    return fadeIn * fadeOut;
  });
}
{
  const pr = rng(7);
  const phases = CHORDS.map(([, notes]) => notes.map(() => [pr() * 6.28, pr() * 6.28]));
  let lp = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const w = chordWeights(t);
    let l = 0, r = 0;
    CHORDS.forEach(([, notes], c) => {
      if (w[c] < 1e-4) return;
      notes.forEach((m, k) => {
        const f = midi(m);
        const ph = phases[c][k];
        const det = 1 + 0.0018 * Math.sin(t * 0.3 + k);
        const a = (2 * Math.PI * f * t) * det;
        const lo = m < 52 ? 0.55 : 1;
        const tone = Math.sin(a + ph[0]) + 0.18 * Math.sin(2 * a + ph[1]) + 0.05 * Math.sin(3 * a);
        const tone2 = Math.sin(a * 1.0035 + ph[1]) + 0.15 * Math.sin(2.007 * a);
        const breathe = 0.75 + 0.25 * Math.sin(t * (0.6 + k * 0.13) + k);
        const g = w[c] * breathe * lo * 0.05;
        const pan = (k / (notes.length - 1)) * 0.8 - 0.4;
        l += (tone * (0.5 - pan * 0.5) + tone2 * 0.3) * g;
        r += (tone2 * (0.5 + pan * 0.5) + tone * 0.3) * g;
      });
    });
    // gentle one-pole lowpass that opens up through the piece
    const cut = 0.06 + 0.05 * clamp((t - 1.9) / 3, 0, 1) + 0.04 * clamp((t - 12) / 1.5, 0, 1);
    lp += (l - lp) * cut;
    lpR += (r - lpR) * cut;
    const env = smooth(clamp(t / 1.6, 0, 1)) * (1 - smooth(clamp((t - 13.9) / 1.1, 0, 1)) * 0.85);
    L[i] += lp * env * 1.4;
    R[i] += lpR * env * 1.4;
    wetL[i] += lp * env * 0.6;
    wetR[i] += lpR * env * 0.6;
  }
}

/* ---- bells ---- */
function bell(t0, m, gain, pan = 0, bright = 1) {
  const f = midi(m);
  const partials = [[1, 1, 1.6], [2.0, 0.35, 1.1], [2.76, 0.28 * bright, 0.7], [5.4, 0.12 * bright, 0.35], [8.93, 0.05 * bright, 0.2]];
  const start = Math.floor(t0 * SR);
  const len = Math.floor(3.2 * SR);
  for (let j = 0; j < len && start + j < N; j++) {
    const t = j / SR;
    const att = Math.min(1, t / 0.004);
    let v = 0;
    for (const [ratio, amp, dec] of partials) v += Math.sin(2 * Math.PI * f * ratio * t) * amp * Math.exp(-t / dec);
    v *= att * gain;
    L[start + j] += v * (0.5 - pan * 0.5);
    R[start + j] += v * (0.5 + pan * 0.5);
    wetL[start + j] += v * 0.9;
    wetR[start + j] += v * 0.9;
  }
}
bell(1.42, 81, 0.16, 0); // dot lands
bell(1.95, 78, 0.12, -0.2); // iris opens
bell(2.0, 85, 0.07, 0.3);
bell(4.62, 86, 0.08, 0.25); // headline
bell(7.86, 81, 0.09, -0.3); // results arrive
bell(7.96, 85, 0.08, 0);
bell(8.06, 88, 0.07, 0.3);
bell(8.64, 90, 0.07, 0.1, 0.6); // saved
bell(9.92, 86, 0.08, 0.2); // best time
bell(9.98, 81, 0.06, -0.2);
bell(10.98, 81, 0.12, -0.1); // completed
bell(11.04, 86, 0.1, 0.15);
bell(11.1, 90, 0.07, 0.35);
bell(13.18, 74, 0.2, 0); // the mark
bell(13.2, 81, 0.13, -0.15);
bell(13.24, 86, 0.09, 0.2);

/* ---- whooshes: band-passed noise with a sweeping centre ---- */
function whoosh(t0, dur, gain, f0, f1, panFrom = 0, panTo = 0, seed = 1) {
  const rnd = rng(seed);
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  let low = 0, band = 0;
  for (let j = 0; j < len && start + j < N; j++) {
    const u = j / len;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 2);
    const fc = f0 * Math.pow(f1 / f0, u);
    const F = 2 * Math.sin((Math.PI * fc) / SR);
    const q = 0.5;
    const x = rnd() * 2 - 1;
    low += F * band;
    const high = x - low - q * band;
    band += F * high;
    const v = band * env * gain;
    const pan = panFrom + (panTo - panFrom) * u;
    L[start + j] += v * (0.5 - pan * 0.5);
    R[start + j] += v * (0.5 + pan * 0.5);
    wetL[start + j] += v * 0.5;
    wetR[start + j] += v * 0.5;
  }
}
whoosh(1.75, 1.0, 0.16, 300, 2400, 0, 0, 2); // iris
whoosh(3.45, 1.1, 0.12, 500, 1800, 0, 0, 3); // morph
whoosh(5.75, 1.0, 0.3, 400, 3600, 0.7, -0.7, 4); // whip
whoosh(9.15, 0.9, 0.12, 700, 2600, -0.3, 0.6, 5); // fly to April
whoosh(10.25, 0.9, 0.12, 600, 2000, 0.6, 0.2, 6); // fly to centre
whoosh(11.6, 1.3, 0.2, 2500, 300, 0, 0, 7); // dissolve into the mark

/* ---- typing ticks ---- */
{
  const rnd = rng(42);
  const chars = 33;
  for (let k = 0; k < chars; k++) {
    const t0 = 6.82 + (k / chars) * 0.88 + (rnd() - 0.5) * 0.01;
    const start = Math.floor(t0 * SR);
    let hp = 0, prev = 0;
    for (let j = 0; j < 0.03 * SR; j++) {
      const x = (rnd() * 2 - 1) * Math.exp(-j / (0.004 * SR));
      hp = 0.85 * (hp + x - prev);
      prev = x;
      const v = hp * 0.05;
      const pan = 0.35;
      L[start + j] += v * (0.5 - pan * 0.5);
      R[start + j] += v * (0.5 + pan * 0.5);
      wetL[start + j] += v * 0.3;
      wetR[start + j] += v * 0.3;
    }
  }
}

/* ---- low swell into the mark ---- */
for (let i = Math.floor(11.9 * SR); i < N; i++) {
  const t = i / SR;
  const env = smooth(clamp((t - 11.9) / 1.3, 0, 1)) * (1 - smooth(clamp((t - 13.6) / 1.4, 0, 1)));
  const v = Math.sin(2 * Math.PI * midi(38) * t) * env * 0.09;
  L[i] += v;
  R[i] += v;
}

/* ---- reverb ---- */
function schroeder(input, combs, allpasses, fb = 0.84, damp = 0.3) {
  const out = new Float32Array(N);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0, filt = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      filt = y * (1 - damp) + filt * damp;
      buf[idx] = input[i] + filt * fb;
      out[i] += y / combs.length;
      idx = (idx + 1) % d;
    }
  }
  for (const d of allpasses) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
}
const s = SR / 44100;
const revL = schroeder(wetL, [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round(d * s * 1.6)), [225, 556, 441].map((d) => Math.round(d * s)));
const revR = schroeder(wetR, [1580, 1640, 1514, 1445, 1300, 1379].map((d) => Math.round(d * s * 1.6)), [248, 579, 464].map((d) => Math.round(d * s)));

/* ---- mix, master, write ---- */
let peak = 0;
const mixL = new Float32Array(N);
const mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const tail = 1 - smooth(clamp((t - 14.55) / 0.45, 0, 1));
  mixL[i] = Math.tanh((L[i] + revL[i] * 0.55) * 1.1) * tail;
  mixR[i] = Math.tanh((R[i] + revR[i] * 0.55) * 1.1) * tail;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}
const norm = 0.66 / peak; // ~ -3.6 dBFS peak, ~ -15 LUFS
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(clamp(mixL[i] * norm, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(mixR[i] * norm, -1, 1) * 32767), 46 + i * 4);
}
const out = path.join(__dirname, "out", "myra-reel-score.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`wrote ${out}  (peak normalised from ${peak.toFixed(3)})`);
