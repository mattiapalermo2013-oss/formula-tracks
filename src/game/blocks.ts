import * as THREE from "three";

// ---------------------------------------------------------------------------
// Block-based track construction. The track is a sequence of pieces appended
// one after the other ("turtle" walk in 3D): each piece knows how it moves and
// rotates the build cursor, and how wide the road is along it. The resulting
// polyline is the single source of truth for geometry, collision, checkpoints.
// ---------------------------------------------------------------------------

export type PieceType =
  | "straight"
  | "long"
  | "wide"
  | "wideLong"
  | "curveLeft"
  | "curveRight"
  | "sweepLeft"
  | "sweepRight"
  | "bendLeft"
  | "bendRight"
  | "wideCurveLeft"
  | "wideCurveRight"
  | "sharpLeft"
  | "sharpRight"
  | "rampUp"
  | "rampDown"
  | "checkpoint";

export interface PieceDef {
  type: PieceType;
  label: string;
  hint: string;
  glyph: string;
}

export const BASE_HALF = 6;
export const WIDE_HALF = 9.5;

export const PIECE_DEFS: PieceDef[] = [
  { type: "straight", label: "block.straight", hint: "block.straight.hint", glyph: "▮" },
  { type: "long", label: "block.long", hint: "block.long.hint", glyph: "▮▮" },
  { type: "wide", label: "block.wide", hint: "block.wide.hint", glyph: "▭" },
  { type: "wideLong", label: "block.wideLong", hint: "block.wideLong.hint", glyph: "▭▭" },
  { type: "bendLeft", label: "block.bendLeft", hint: "block.bendLeft.hint", glyph: "◟" },
  { type: "bendRight", label: "block.bendRight", hint: "block.bendRight.hint", glyph: "◞" },
  { type: "sweepLeft", label: "block.sweepLeft", hint: "block.sweepLeft.hint", glyph: "❨" },
  { type: "sweepRight", label: "block.sweepRight", hint: "block.sweepRight.hint", glyph: "❩" },
  { type: "curveLeft", label: "block.curveLeft", hint: "block.curveLeft.hint", glyph: "◜" },
  { type: "curveRight", label: "block.curveRight", hint: "block.curveRight.hint", glyph: "◝" },
  { type: "wideCurveLeft", label: "block.wideCurveLeft", hint: "block.wideCurveLeft.hint", glyph: "◐" },
  { type: "wideCurveRight", label: "block.wideCurveRight", hint: "block.wideCurveRight.hint", glyph: "◑" },
  { type: "sharpLeft", label: "block.sharpLeft", hint: "block.sharpLeft.hint", glyph: "⌐" },
  { type: "sharpRight", label: "block.sharpRight", hint: "block.sharpRight.hint", glyph: "¬" },
  { type: "rampUp", label: "block.rampUp", hint: "block.rampUp.hint", glyph: "◢" },
  { type: "rampDown", label: "block.rampDown", hint: "block.rampDown.hint", glyph: "◣" },
  { type: "checkpoint", label: "block.checkpoint", hint: "block.checkpoint.hint", glyph: "⚑" },
];

const STEP = 2; // polyline resolution in metres

interface Cursor {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

interface Build {
  pts: THREE.Vector3[];
  widths: number[];
  marks: number[]; // indices in pts that carry a checkpoint gate
}

function pushStraight(b: Build, c: Cursor, length: number, dy: number, half: number) {
  const steps = Math.max(2, Math.round(length / STEP));
  const startY = c.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const s = t * t * (3 - 2 * t); // smoothstep elevation change
    const d = t * length;
    b.pts.push(
      new THREE.Vector3(
        c.x + Math.sin(c.yaw) * d,
        startY + dy * s,
        c.z + Math.cos(c.yaw) * d,
      ),
    );
    b.widths.push(half);
  }
  c.x += Math.sin(c.yaw) * length;
  c.z += Math.cos(c.yaw) * length;
  c.y = startY + dy;
}

function pushArc(b: Build, c: Cursor, radius: number, sign: number, sweep: number, half: number) {
  // sign = +1 turns left, -1 turns right
  const steps = Math.max(6, Math.round((radius * sweep) / STEP));
  const ds = (radius * sweep) / steps;
  for (let i = 0; i < steps; i++) {
    c.yaw += (sign * sweep) / steps;
    c.x += Math.sin(c.yaw) * ds;
    c.z += Math.cos(c.yaw) * ds;
    b.pts.push(new THREE.Vector3(c.x, c.y, c.z));
    b.widths.push(half);
  }
}

const Q = Math.PI / 2;

function applyPiece(b: Build, c: Cursor, type: PieceType) {
  switch (type) {
    case "straight":
      return pushStraight(b, c, 26, 0, BASE_HALF);
    case "long":
      return pushStraight(b, c, 52, 0, BASE_HALF);
    case "wide":
      return pushStraight(b, c, 26, 0, WIDE_HALF);
    case "wideLong":
      return pushStraight(b, c, 52, 0, WIDE_HALF);
    case "bendLeft":
      return pushArc(b, c, 30, 1, Q / 2, BASE_HALF);
    case "bendRight":
      return pushArc(b, c, 30, -1, Q / 2, BASE_HALF);
    case "sweepLeft":
      return pushArc(b, c, 38, 1, Q, BASE_HALF);
    case "sweepRight":
      return pushArc(b, c, 38, -1, Q, BASE_HALF);
    case "curveLeft":
      return pushArc(b, c, 20, 1, Q, BASE_HALF);
    case "curveRight":
      return pushArc(b, c, 20, -1, Q, BASE_HALF);
    case "wideCurveLeft":
      return pushArc(b, c, 26, 1, Q, WIDE_HALF);
    case "wideCurveRight":
      return pushArc(b, c, 26, -1, Q, WIDE_HALF);
    case "sharpLeft":
      return pushArc(b, c, 7, 1, Q, BASE_HALF);
    case "sharpRight":
      return pushArc(b, c, 7, -1, Q, BASE_HALF);
    case "rampUp":
      return pushStraight(b, c, 32, 7, BASE_HALF);
    case "rampDown":
      return pushStraight(b, c, 32, -7, BASE_HALF);
    case "checkpoint": {
      const before = b.pts.length;
      pushStraight(b, c, 14, 0, BASE_HALF);
      b.marks.push(Math.floor((before + b.pts.length - 1) / 2));
      return;
    }
  }
}

export interface Polyline {
  points: THREE.Vector3[];
  widths: number[];
  marks: number[];
}

/**
 * Builds the closed centerline polyline for a list of pieces. The loop is
 * always closed: a smooth bezier link joins the last piece back to the start
 * line, so the circuit is drivable whatever the player builds.
 */
export function buildPolyline(pieces: PieceType[]): Polyline {
  const b: Build = { pts: [new THREE.Vector3(0, 0, 0)], widths: [BASE_HALF], marks: [] };
  const c: Cursor = { x: 0, y: 0, z: 0, yaw: 0 };
  for (const p of pieces) applyPiece(b, c, p);

  // --- closing link: cubic bezier honouring both headings
  const end = new THREE.Vector3(c.x, c.y, c.z);
  const start = b.pts[0]!.clone();
  const gap = end.distanceTo(start);
  if (gap > 0.5) {
    const handle = Math.max(12, gap * 0.45);
    const h1 = new THREE.Vector3(
      end.x + Math.sin(c.yaw) * handle,
      end.y,
      end.z + Math.cos(c.yaw) * handle,
    );
    const h2 = new THREE.Vector3(start.x, start.y, start.z - handle); // start heads +Z
    const curve = new THREE.CubicBezierCurve3(end, h1, h2, start);
    const n = Math.max(8, Math.round(curve.getLength() / STEP));
    for (let i = 1; i < n; i++) {
      b.pts.push(curve.getPoint(i / n));
      b.widths.push(BASE_HALF);
    }
  }

  // never dip below ground level
  for (const p of b.pts) if (p.y < 0) p.y = 0;
  return { points: b.pts, widths: b.widths, marks: b.marks };
}

export const DEFAULT_PIECES: PieceType[] = [
  "long",
  "sweepRight",
  "wide",
  "rampUp",
  "curveRight",
  "checkpoint",
  "straight",
  "sharpLeft",
  "bendRight",
  "rampDown",
  "wideCurveRight",
  "checkpoint",
  "long",
  "curveRight",
  "straight",
];
