/** Lightweight WebAudio engine + tire-screech synthesizer (no asset files). */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// engine
let engOsc1: OscillatorNode | null = null;
let engOsc2: OscillatorNode | null = null;
let engGain: GainNode | null = null;

// skid
let skidSrc: AudioBufferSourceNode | null = null;
let skidGain: GainNode | null = null;

let enabled = true;

function noiseBuffer(c: AudioContext): AudioBuffer {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function ensure(): boolean {
  if (typeof window === "undefined" || !enabled) return false;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // Engine: two detuned saw oscillators through a low-pass filter.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    engGain = ctx.createGain();
    engGain.gain.value = 0;
    engOsc1 = ctx.createOscillator();
    engOsc1.type = "sawtooth";
    engOsc1.frequency.value = 60;
    engOsc2 = ctx.createOscillator();
    engOsc2.type = "square";
    engOsc2.frequency.value = 90;
    engOsc1.connect(filter);
    engOsc2.connect(filter);
    filter.connect(engGain);
    engGain.connect(master);
    engOsc1.start();
    engOsc2.start();

    // Skid: band-passed white noise loop.
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 1.2;
    skidGain = ctx.createGain();
    skidGain.gain.value = 0;
    skidSrc = ctx.createBufferSource();
    skidSrc.buffer = noiseBuffer(ctx);
    skidSrc.loop = true;
    skidSrc.connect(bp);
    bp.connect(skidGain);
    skidGain.connect(master);
    skidSrc.start();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return true;
}

/** Call from a user gesture (key press / touch) to unlock audio. */
export function unlockAudio() {
  ensure();
}

export function setAudioEnabled(on: boolean) {
  enabled = on;
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
}

export function isAudioEnabled() {
  return enabled;
}

/**
 * @param speedRatio 0..1 of top speed
 * @param throttle 0..1 how hard the player is on the gas
 * @param active engine running (racing)
 */
export function updateEngine(speedRatio: number, throttle: number, active: boolean) {
  if (!ensure() || !ctx || !engOsc1 || !engOsc2 || !engGain) return;
  const t = ctx.currentTime;
  if (!active) {
    engGain.gain.setTargetAtTime(0, t, 0.15);
    return;
  }
  const r = Math.max(0, Math.min(1, speedRatio));
  const base = 55 + r * 320 + throttle * 30;
  engOsc1.frequency.setTargetAtTime(base, t, 0.05);
  engOsc2.frequency.setTargetAtTime(base * 1.51, t, 0.05);
  engGain.gain.setTargetAtTime(0.05 + 0.11 * r + 0.05 * throttle, t, 0.08);
}

export function updateSkid(intensity: number) {
  if (!ensure() || !ctx || !skidGain) return;
  const i = Math.max(0, Math.min(1, intensity));
  skidGain.gain.setTargetAtTime(i * 0.22, ctx.currentTime, 0.05);
}

export function stopEngineSound() {
  updateEngine(0, 0, false);
  updateSkid(0);
}
