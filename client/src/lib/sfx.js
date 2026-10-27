/* Small chat sound effects, synthesized with Web Audio (no files to load).
   sfx.send() · sfx.receive() · sfx.voice() · sfx.tick()
   Muted per browser with sfx.setOn(false) (remembered in localStorage). */

const KEY = "ds_sound";
let ctx = null;

function audio() {
  const Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function soundOn() {
  try { return localStorage.getItem(KEY) !== "off"; } catch (e) { return true; }
}
export function setSoundOn(on) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) { /* storage unavailable */ }
}

// One soft note: frequency glide from f1 to f2, quick attack, smooth decay
function note(c, at, { f1, f2 = f1, len = 0.15, vol = 0.12, type = "sine" }) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, at);
  if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, at + len);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g); g.connect(c.destination);
  o.start(at); o.stop(at + len + 0.02);
}

// Filtered noise burst (the "air" in a whoosh)
function whoosh(c, at, len, vol) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf;
  f.type = "bandpass"; f.Q.value = 1.2;
  f.frequency.setValueAtTime(600, at); f.frequency.exponentialRampToValueAtTime(3200, at + len);
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(at); src.stop(at + len);
}

function play(fn) {
  if (!soundOn()) return;
  const c = audio();
  if (!c) return;
  try { fn(c, c.currentTime + 0.01); } catch (e) { /* audio unavailable */ }
}

export const sfx = {
  // Outgoing message: quick upward "pop"
  send: () => play((c, t) => { note(c, t, { f1: 520, f2: 980, len: 0.09, vol: 0.1, type: "triangle" }); }),
  // Incoming reply: soft two-note chime
  receive: () => play((c, t) => { note(c, t, { f1: 880, len: 0.16, vol: 0.09 }); note(c, t + 0.11, { f1: 1320, len: 0.28, vol: 0.08 }); }),
  // Voice note sent: whoosh + pop
  voice: () => play((c, t) => { whoosh(c, t, 0.28, 0.12); note(c, t + 0.2, { f1: 700, f2: 1200, len: 0.12, vol: 0.09, type: "triangle" }); }),
  // Recording starts / small UI tick
  tick: () => play((c, t) => { note(c, t, { f1: 1500, f2: 1100, len: 0.05, vol: 0.07, type: "square" }); })
};
