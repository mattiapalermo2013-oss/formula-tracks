import * as THREE from "three";

// ---------------------------------------------------------------------------
// Track definition: a closed Catmull-Rom loop with elevation (hills / jumps).
// All gameplay code (geometry, collision, checkpoints) derives from the same
// sampled centerline so the visual mesh and the physics always agree.
// ---------------------------------------------------------------------------

const CONTROL_POINTS: [number, number, number][] = [
  [0, 0, -60], // start straight
  [35, 0, -62],
  [65, 0, -55],
  [88, 0, -30], // right-hand sweeper
  [92, 1, 5],
  [75, 5, 38], // climbing ramp
  [40, 9, 55], // elevated section (jump crest)
  [0, 9, 60],
  [-40, 7, 55], // descent begins
  [-72, 3, 35],
  [-90, 0, 5],
  [-88, 0, -30],
  [-65, 0, -52], // final hairpin onto the straight
  [-35, 0, -60],
];

export const SAMPLE_COUNT = 400;
export const HALF_WIDTH = 6;
export const LAPS_TO_WIN = 3;

const curve = new THREE.CatmullRomCurve3(
  CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  true,
  "catmullrom",
  0.6,
);

export interface TrackSample {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector2; // XZ perpendicular, unit length
}

export const samples: TrackSample[] = (() => {
  const pts = curve.getSpacedPoints(SAMPLE_COUNT);
  pts.pop(); // last == first on a closed curve
  return pts.map((pos, i) => {
    const t = i / SAMPLE_COUNT;
    const tangent = curve.getTangentAt(t).normalize();
    return {
      pos,
      tangent,
      right: new THREE.Vector2(tangent.z, -tangent.x).normalize(),
    };
  });
})();

// Checkpoints at 1/4, 1/2, 3/4 of the lap (start/finish is index 0).
export const CHECKPOINT_INDICES = [
  Math.floor(SAMPLE_COUNT * 0.25),
  Math.floor(SAMPLE_COUNT * 0.5),
  Math.floor(SAMPLE_COUNT * 0.75),
];

export function yawAt(index: number): number {
  const t = samples[((index % SAMPLE_COUNT) + SAMPLE_COUNT) % SAMPLE_COUNT].tangent;
  return Math.atan2(t.x, t.z);
}

// --- Collision: local search around the last known sample, then clamp the
// lateral offset to the road. Shared pattern for racing splines.
export interface TrackHit {
  index: number;
  lat: number; // signed lateral offset from centerline
  groundY: number;
  offTrack: boolean;
  pushX: number;
  pushZ: number;
}

export function trackQuery(px: number, pz: number, prevIndex: number): TrackHit {
  const n = SAMPLE_COUNT;
  let best = prevIndex;
  let bestDist = Infinity;
  for (let k = -6; k <= 16; k++) {
    const j = (((prevIndex + k) % n) + n) % n;
    const dx = px - samples[j].pos.x;
    const dz = pz - samples[j].pos.z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      best = j;
    }
  }
  const s = samples[best];
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

// Deterministic pseudo-random (mulberry32) so terrain/props are stable.
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

// Distance from a point to the nearest track sample (used to flatten terrain
// and keep props off the road).
export function distanceToTrack(px: number, pz: number): number {
  let best = Infinity;
  for (let i = 0; i < SAMPLE_COUNT; i += 4) {
    const dx = px - samples[i].pos.x;
    const dz = pz - samples[i].pos.z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
