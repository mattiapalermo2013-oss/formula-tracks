import * as THREE from "three";
import { BASE_HALF, buildPolyline, type PieceType } from "./blocks";

// ---------------------------------------------------------------------------
// A Track is the resampled centerline of a block layout. Geometry, collision
// and checkpoints all read from the same samples so visuals and physics agree.
// ---------------------------------------------------------------------------

export const HALF_WIDTH = BASE_HALF;
export const LAPS_TO_WIN = 1;

export interface TrackSample {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector2; // XZ perpendicular, unit length
  half: number; // half road width at this sample
}

export interface PitZone {
  start: number; // sample index where the lane opens
  end: number; // sample index where it closes (may wrap)
  box: number; // sample index of the pit box
  side: 1 | -1; // lateral side of the lane
  width: number; // lane width added to the road half width
}

export interface Track {
  samples: TrackSample[];
  count: number;
  checkpoints: number[];
  length: number;
  pit: PitZone | null;
}

interface Resampled {
  points: THREE.Vector3[];
  widths: number[];
  checkpoints: number[];
}

function resample(
  points: THREE.Vector3[],
  widths: number[],
  marks: number[],
  spacing: number,
): Resampled {
  const closed = [...points, points[0]!.clone()];
  const closedW = [...widths, widths[0]!];
  const cum: number[] = [0];
  for (let i = 1; i < closed.length; i++) {
    cum.push(cum[i - 1]! + closed[i]!.distanceTo(closed[i - 1]!));
  }
  const total = cum[cum.length - 1]!;
  const n = Math.max(120, Math.round(total / spacing));
  const out: THREE.Vector3[] = [];
  const outW: number[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const d = (i / n) * total;
    while (seg < cum.length - 2 && cum[seg + 1]! < d) seg++;
    const segLen = cum[seg + 1]! - cum[seg]! || 1;
    const t = (d - cum[seg]!) / segLen;
    out.push(closed[seg]!.clone().lerp(closed[seg + 1]!, t));
    outW.push(THREE.MathUtils.lerp(closedW[seg]!, closedW[seg + 1]!, t));
  }
  const checkpoints = marks
    .map((m) => Math.round(((cum[Math.min(m, cum.length - 1)]! / (total || 1)) * n)) % n)
    .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
    .sort((a, b) => a - b);
  return { points: out, widths: outW, checkpoints };
}

// Light smoothing keeps the ribbon clean without rounding away sharp corners.
function smooth(points: THREE.Vector3[], passes: number): THREE.Vector3[] {
  let pts = points;
  const n = points.length;
  for (let p = 0; p < passes; p++) {
    pts = pts.map((cur, i) => {
      const a = pts[(i - 1 + n) % n]!;
      const b = pts[(i + 1) % n]!;
      return new THREE.Vector3(
        cur.x * 0.6 + (a.x + b.x) * 0.2,
        cur.y * 0.6 + (a.y + b.y) * 0.2,
        cur.z * 0.6 + (a.z + b.z) * 0.2,
      );
    });
  }
  return pts;
}

function smoothScalar(vals: number[], passes: number): number[] {
  let out = vals;
  const n = vals.length;
  for (let p = 0; p < passes; p++) {
    out = out.map((cur, i) => cur * 0.5 + (out[(i - 1 + n) % n]! + out[(i + 1) % n]!) * 0.25);
  }
  return out;
}

export function buildTrack(pieces: PieceType[], startPose?: StartPose): Track {
  const poly = buildPolyline(pieces, startPose);
  const rs = resample(poly.points, poly.widths, poly.marks, 1.5);
  const pts = smooth(rs.points, 2);
  const widths = smoothScalar(rs.widths, 6);
  const count = pts.length;
  const samples: TrackSample[] = pts.map((pos, i) => {
    const next = pts[(i + 1) % count]!;
    const prev = pts[(i - 1 + count) % count]!;
    const tangent = next.clone().sub(prev).normalize();
    return {
      pos,
      tangent,
      right: new THREE.Vector2(tangent.z, -tangent.x).normalize(),
      half: widths[i] ?? BASE_HALF,
    };
  });
  let length = 0;
  for (let i = 0; i < count; i++) {
    length += samples[i]!.pos.distanceTo(samples[(i + 1) % count]!.pos);
  }
  const checkpoints = rs.checkpoints.length
    ? rs.checkpoints
    : [0.25, 0.5, 0.75].map((f) => Math.floor(count * f));
  return { samples, count, checkpoints, length, pit: findPitZone(samples, count) };
}

// --- Pit lane -------------------------------------------------------------
export const PIT_WIDTH = 7.5;
export const PIT_GAP = 2.6; // separation strip between main straight and pit lane
export const PIT_RAMP = 8; // samples used to taper the lane open/close
export const PIT_STOP_SECONDS = 3;

// The pit lane sits on the start/finish straight (the straight containing
// sample 0), detached from the main straight by a narrow strip + wall.
function findPitZone(samples: TrackSample[], count: number): PitZone | null {
  const straight = (i: number) => {
    const a = samples[i]!.tangent;
    const b = samples[(i + 1) % count]!.tangent;
    return Math.abs(Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z)) < 0.035;
  };
  // Find the straight run that contains the start line (index 0).
  let runStart = 0;
  let guard = 0;
  while (straight((runStart - 1 + count) % count) && guard++ < count) {
    runStart = (runStart - 1 + count) % count;
  }
  let bestLen = 0;
  guard = 0;
  while (straight((runStart + bestLen) % count) && guard++ < count) bestLen++;
  if (bestLen <= 0) return null;
  const bestStart = runStart;
  const minLen = PIT_RAMP * 2 + 16;
  if (bestLen < minLen) return null;
  const margin = Math.max(2, Math.floor((bestLen - minLen) / 4));
  const start = (bestStart + margin) % count;
  const len = bestLen - margin * 2;
  const end = (start + len) % count;
  return { start, end, box: (start + Math.floor(len / 2)) % count, side: 1, width: PIT_WIDTH };
}

function pitProgress(track: Track, index: number): number {
  const pit = track.pit;
  if (!pit) return 0;
  const n = track.count;
  const rel = (((index - pit.start) % n) + n) % n;
  const span = (((pit.end - pit.start) % n) + n) % n;
  if (rel > span) return 0;
  const ramp = Math.min(PIT_RAMP, span / 2);
  const t = Math.min(rel / ramp, (span - rel) / ramp, 1);
  return Math.max(0, Math.min(1, t));
}

/** Extra lateral room (on the pit side) available at this sample. */
export function pitExtensionAt(track: Track, index: number): number {
  const pit = track.pit;
  if (!pit) return 0;
  return pitProgress(track, index) * pit.width;
}

/** Width of the closed separator strip between main straight and pit lane. */
export function pitGapAt(track: Track, index: number): number {
  const pit = track.pit;
  if (!pit) return 0;
  return pitProgress(track, index) * PIT_GAP;
}

export function yawAt(track: Track, index: number): number {
  const t = track.samples[((index % track.count) + track.count) % track.count]!.tangent;
  return Math.atan2(t.x, t.z);
}

export interface TrackHit {
  index: number;
  lat: number;
  groundY: number;
  offTrack: boolean;
  pushX: number;
  pushZ: number;
}

export function trackQuery(track: Track, px: number, pz: number, prevIndex: number): TrackHit {
  const n = track.count;
  let best = prevIndex;
  let bestDist = Infinity;
  for (let k = -10; k <= 24; k++) {
    const j = (((prevIndex + k) % n) + n) % n;
    const dx = px - track.samples[j]!.pos.x;
    const dz = pz - track.samples[j]!.pos.z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      best = j;
    }
  }
  const s = track.samples[best]!;
  const r = s.right;
  const lat = (px - s.pos.x) * r.x + (pz - s.pos.z) * r.y;
  const pitSide = track.pit ? track.pit.side : 1;
  const side = Math.sign(lat) || 1;
  const extra = side === pitSide ? pitExtensionAt(track, best) : 0;
  const gap = side === pitSide ? pitGapAt(track, best) : 0;
  const inner = s.half - 1.2;
  const absLat = Math.abs(lat);
  // Separator strip: a wall splits the main straight from the pit lane where
  // the lane is open; the car gets pushed to whichever side is nearer.
  if (gap > 0.4 && absLat > inner && absLat < inner + gap) {
    const mid = inner + gap / 2;
    const bound = absLat < mid ? inner : inner + gap;
    const push = absLat - bound;
    return {
      index: best,
      lat,
      groundY: s.pos.y,
      offTrack: true,
      pushX: -side * r.x * push,
      pushZ: -side * r.y * push,
    };
  }
  const limit = inner + extra;
  if (absLat > limit) {
    const sign = Math.sign(lat);
    const push = Math.abs(lat) - limit;
    return {
      index: best,
      lat,
      groundY: s.pos.y,
      offTrack: true,
      pushX: -sign * r.x * push,
      pushZ: -sign * r.y * push,
    };
  }
  return { index: best, lat, groundY: s.pos.y, offTrack: false, pushX: 0, pushZ: 0 };
}

// Deterministic pseudo-random (mulberry32) so props are stable.
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distanceToTrack(track: Track, px: number, pz: number): number {
  let best = Infinity;
  for (let i = 0; i < track.count; i += 4) {
    const dx = px - track.samples[i]!.pos.x;
    const dz = pz - track.samples[i]!.pos.z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
