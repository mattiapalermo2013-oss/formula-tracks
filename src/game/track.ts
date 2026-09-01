import * as THREE from "three";
import { buildPolyline, type PieceType } from "./blocks";

// ---------------------------------------------------------------------------
// A Track is the resampled centerline of a block layout. Geometry, collision
// and checkpoints all read from the same samples so visuals and physics agree.
// ---------------------------------------------------------------------------

export const HALF_WIDTH = 6;
export const LAPS_TO_WIN = 3;

export interface TrackSample {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector2; // XZ perpendicular, unit length
}

export interface Track {
  samples: TrackSample[];
  count: number;
  checkpoints: number[];
  length: number;
}

function resample(points: THREE.Vector3[], spacing: number): THREE.Vector3[] {
  const closed = [...points, points[0]!.clone()];
  const cum: number[] = [0];
  for (let i = 1; i < closed.length; i++) {
    cum.push(cum[i - 1]! + closed[i]!.distanceTo(closed[i - 1]!));
  }
  const total = cum[cum.length - 1]!;
  const n = Math.max(120, Math.round(total / spacing));
  const out: THREE.Vector3[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const d = (i / n) * total;
    while (seg < cum.length - 2 && cum[seg + 1]! < d) seg++;
    const segLen = cum[seg + 1]! - cum[seg]! || 1;
    const t = (d - cum[seg]!) / segLen;
    out.push(closed[seg]!.clone().lerp(closed[seg + 1]!, t));
  }
  return out;
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

export function buildTrack(pieces: PieceType[]): Track {
  const poly = smooth(resample(buildPolyline(pieces), 1.5), 2);
  const count = poly.length;
  const samples: TrackSample[] = poly.map((pos, i) => {
    const next = poly[(i + 1) % count]!;
    const prev = poly[(i - 1 + count) % count]!;
    const tangent = next.clone().sub(prev).normalize();
    return {
      pos,
      tangent,
      right: new THREE.Vector2(tangent.z, -tangent.x).normalize(),
    };
  });
  let length = 0;
  for (let i = 0; i < count; i++) {
    length += samples[i]!.pos.distanceTo(samples[(i + 1) % count]!.pos);
  }
  return {
    samples,
    count,
    checkpoints: [0.25, 0.5, 0.75].map((f) => Math.floor(count * f)),
    length,
  };
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
  const limit = HALF_WIDTH - 1.2;
  if (Math.abs(lat) > limit) {
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
