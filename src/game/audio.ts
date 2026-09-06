/** WebAudio F1-style engine + tire-screech synthesizer (no asset files). */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// engine
type Partial_ = { osc: OscillatorNode; gain: GainNode; mult: number };
let partials: Partial_[] = [];
let engFilter: BiquadFilterNode | null = null;
let engGain: GainNode | null = null;
let engNoiseGain: GainNode | null = null;

// skid
let skidSrc: AudioBufferSourceNode | null = null;
let skidGain: GainNode | null = null;

let enabled = true;

// gearbox state
const GEARS = 6;
let gear = 1;
let shiftUntil = 0;

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

    engGain = ctx.createGain();
    engGain.gain.value = 0;
    engGain.connect(master);

    // Slight distortion gives the harshness of a real engine instead of a pure tone.
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    shaper.curve = curve;
    shaper.connect(engGain);

    engFilter = ctx.createBiquadFilter();
    engFilter.type = "lowpass";
    engFilter.frequency.value = 1600;
    engFilter.Q.value = 0.8;
    engFilter.connect(shaper);

    // Harmonic stack: firing order partials, slightly detuned = mechanical, not synthy.
    const stack: Array<[number, number, OscillatorType]> = [
      [0.5, 0.5, "sawtooth"],
      [1, 1, "sawtooth"],
      [1.5, 0.35, "square"],
      [2, 0.45, "sawtooth"],
      [3, 0.22, "sawtooth"],
      [4.5, 0.14, "square"],
    ];
    partials = stack.map(([mult, amp, type]) => {
      const osc = ctx!.createOscillator();
      osc.type = type;
      osc.frequency.value = 80 * mult;
      osc.detune.value = (Math.random() - 0.5) * 14;
      const g = ctx!.createGain();
      g.gain.value = amp;
      osc.connect(g);
      g.connect(engFilter!);
      osc.start();
      return { osc, gain: g, mult };
    });

    // Air/intake noise layer.
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer(ctx);
    noiseSrc.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 900;
    nf.Q.value = 0.7;
    engNoiseGain = ctx.createGain();
    engNoiseGain.gain.value = 0;
    noiseSrc.connect(nf);
    nf.connect(engNoiseGain);
    engNoiseGain.connect(engFilter);
    noiseSrc.start();

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

/** Which gear a given speed ratio sits in, with a little hysteresis. */
function gearFor(r: number): number {
  const g = Math.min(GEARS, Math.floor(r * GEARS) + 1);
  return Math.max(1, g);
}

/**
 * @param speedRatio 0..1 of top speed
 * @param throttle 0..1 how hard the player is on the gas
 * @param active engine running (racing)
 */
export function updateEngine(speedRatio: number, throttle: number, active: boolean) {
  if (!ensure() || !ctx || !engGain || !engFilter) return;
  const t = ctx.currentTime;
  if (!active) {
    engGain.gain.setTargetAtTime(0, t, 0.15);
    if (engNoiseGain) engNoiseGain.gain.setTargetAtTime(0, t, 0.15);
    gear = 1;
    return;
  }

  const r = Math.max(0, Math.min(1, speedRatio));
  const nextGear = gearFor(r);
  if (nextGear !== gear) {
    // Upshift/downshift: momentary cut, like an F1 seamless-shift blip.
    shiftUntil = t + (nextGear > gear ? 0.18 : 0.14);
    gear = nextGear;
  }
  const shifting = t < shiftUntil;

  // Revs climb inside each gear and drop on the upshift — that's the "cambiata".
  const span = 1 / GEARS;
  const inGear = Math.min(1, Math.max(0, (r - (gear - 1) * span) / span));
  // Long, high-revving pull: start low in the gear, scream at the top before shifting.
  const rpm = 0.22 + Math.pow(inGear, 1.15) * 0.78; // 0..1 normalized rev range

  const base = 38 + rpm * 235 + throttle * 14;
  for (const p of partials) {
    p.osc.frequency.setTargetAtTime(base * p.mult, t, shifting ? 0.02 : 0.05);
  }
  engFilter.frequency.setTargetAtTime(700 + rpm * 4200 + r * 1200, t, 0.06);

  const loud = 0.05 + 0.12 * rpm + 0.05 * throttle + 0.04 * r;
  engGain.gain.setTargetAtTime(shifting ? loud * 0.25 : loud, t, shifting ? 0.012 : 0.07);
  if (engNoiseGain) engNoiseGain.gain.setTargetAtTime(0.02 + 0.06 * r, t, 0.1);
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
