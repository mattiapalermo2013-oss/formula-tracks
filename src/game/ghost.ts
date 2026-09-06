// Ghost car recording: the fastest flying lap is stored frame-by-frame and
// replayed on the following laps.

export interface GhostFrame {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

const SAMPLE_STEP = 0.04; // seconds between recorded samples

let recording: GhostFrame[] = [];
let best: GhostFrame[] = [];
let bestTime: number | null = null;
let lastSample = -1;

// Current lap time of the player, used to drive the playback.
export const ghostClock = { t: 0 };

export function ghostResetLap() {
  recording = [];
  lastSample = -1;
}

export function ghostClearAll() {
  recording = [];
  best = [];
  bestTime = null;
  lastSample = -1;
  ghostClock.t = 0;
}

export function ghostRecord(t: number, x: number, y: number, z: number, yaw: number) {
  ghostClock.t = t;
  if (t - lastSample < SAMPLE_STEP) return;
  lastSample = t;
  recording.push({ t, x, y, z, yaw });
}

/** Called when a lap closes. Keeps the recording if it is the fastest so far. */
export function ghostCommitLap(lapTime: number, valid: boolean) {
  if (valid && recording.length > 4 && (bestTime === null || lapTime < bestTime)) {
    bestTime = lapTime;
    best = recording;
  }
  ghostResetLap();
}

export function ghostHasData() {
  return best.length > 1;
}

export function ghostBestTime() {
  return bestTime;
}

/** Interpolated pose of the ghost at time t, or null when there is no lap yet. */
export function ghostSample(t: number, out: GhostFrame): boolean {
  const n = best.length;
  if (n < 2) return false;
  const last = best[n - 1]!;
  if (t >= last.t) {
    out.x = last.x; out.y = last.y; out.z = last.z; out.yaw = last.yaw; out.t = last.t;
    return true;
  }
  // linear scan from an estimated index (samples are near-uniform in time)
  let i = Math.min(n - 2, Math.max(0, Math.floor(t / SAMPLE_STEP)));
  while (i > 0 && best[i]!.t > t) i--;
  while (i < n - 2 && best[i + 1]!.t < t) i++;
  const a = best[i]!;
  const b = best[i + 1]!;
  const span = b.t - a.t || 1;
  const k = Math.min(1, Math.max(0, (t - a.t) / span));
  out.t = t;
  out.x = a.x + (b.x - a.x) * k;
  out.y = a.y + (b.y - a.y) * k;
  out.z = a.z + (b.z - a.z) * k;
  let dy = b.yaw - a.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  out.yaw = a.yaw + dy * k;
  return true;
}
