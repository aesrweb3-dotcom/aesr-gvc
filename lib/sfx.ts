/* Synthetic sound effects — Web Audio API only, no audio files needed */

let _ac: AudioContext | null = null;
let _muted = false;

function ac(): AudioContext {
  if (!_ac) _ac = new AudioContext();
  if (_ac.state === "suspended") _ac.resume().catch(() => {});
  return _ac;
}

function tone(
  c: AudioContext, freq: number, freqEnd: number,
  gain: number, dur: number, delay = 0, type: OscillatorType = "sine"
) {
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type  = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delay);
  if (freqEnd !== freq)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + delay + dur);
  g.gain.setValueAtTime(0, c.currentTime + delay);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + dur + 0.01);
}

function noise(
  c: AudioContext, freq: number, q: number,
  gain: number, dur: number, delay = 0
) {
  const sr  = c.sampleRate;
  const buf = c.createBuffer(1, Math.ceil(sr * dur), sr);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src  = c.createBufferSource(); src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type  = "bandpass"; filt.frequency.value = freq; filt.Q.value = q;
  const g    = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  src.connect(filt); filt.connect(g); g.connect(c.destination);
  src.start(c.currentTime + delay);
  src.stop(c.currentTime + delay + dur + 0.01);
}

export function setMuted(v: boolean) { _muted = v; }
export function isMuted()            { return _muted; }

/** Crisp metallic scissors snip — two blade clicks */
export function snip() {
  if (_muted || typeof window === "undefined") return;
  try {
    const c = ac();
    // First blade click
    noise(c, 4200, 8, 0.22, 0.03);
    tone(c,  2200, 800, 0.09, 0.04, 0, "square");
    // Second blade click (offset for shear feel)
    noise(c, 3600, 6, 0.16, 0.025, 0.038);
    tone(c,  1800, 600, 0.06, 0.04, 0.038, "square");
  } catch {}
}

/** Satisfying paper tear with trailing rip */
export function tear() {
  if (_muted || typeof window === "undefined") return;
  try {
    const c = ac();
    // Initial rip burst
    noise(c, 1800, 0.5, 0.7, 0.08);
    // Long trailing rip
    noise(c, 900,  0.9, 0.5, 0.32, 0.06);
    noise(c, 400,  1.5, 0.3, 0.28, 0.10);
    // Low thud as pack opens
    tone(c, 140, 60, 0.25, 0.18, 0.08, "sine");
  } catch {}
}

/** Magical card reveal — rising arpeggio + shimmer */
export function reveal() {
  if (_muted || typeof window === "undefined") return;
  try {
    const c = ac();
    // Rising arpeggio
    const notes = [261, 329, 392, 523, 659, 784];
    notes.forEach((f, i) => tone(c, f, f, 0.12, 0.5, i * 0.06));
    // High shimmer on top
    tone(c, 2093, 2093, 0.05, 0.6, 0.15);
    tone(c, 1760, 1760, 0.04, 0.4, 0.22);
    // Sparkle noise burst
    noise(c, 6000, 15, 0.08, 0.12, 0.05);
    noise(c, 5000, 12, 0.06, 0.10, 0.18);
  } catch {}
}

/** Card flip — fast whoosh with satisfying thump */
export function flip() {
  if (_muted || typeof window === "undefined") return;
  try {
    const c = ac();
    // Whoosh sweep
    tone(c, 900, 120, 0.22, 0.16, 0, "sine");
    // Soft thump landing
    tone(c, 80, 50, 0.18, 0.12, 0.10, "sine");
    noise(c, 1200, 0.4, 0.08, 0.10);
  } catch {}
}

/** Generate button — energetic rising flourish */
export function generate() {
  if (_muted || typeof window === "undefined") return;
  try {
    const c = ac();
    // Quick chord stab
    [261, 329, 392].forEach((f, i) => tone(c, f, f * 1.5, 0.10, 0.18, i * 0.02));
    // Bright top note
    tone(c, 784, 1047, 0.08, 0.22, 0.05);
  } catch {}
}

/** Generic UI click */
export function click() {
  if (_muted || typeof window === "undefined") return;
  try {
    const c = ac();
    noise(c, 3000, 4, 0.12, 0.04);
    tone(c, 500, 260, 0.08, 0.06);
  } catch {}
}
