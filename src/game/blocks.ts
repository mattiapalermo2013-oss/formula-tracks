import * as THREE from "three";

// ---------------------------------------------------------------------------
// Block-based track construction. The track is a sequence of pieces appended
// one after the other ("turtle" walk in 3D): each piece knows how it moves and
// rotates the build cursor. The resulting polyline is the single source of
// truth for geometry, collision and checkpoints.
// ---------------------------------------------------------------------------

export type PieceType =
  | "straight"
  | "long"
  | "curveLeft"
  | "curveRight"
  | "sharpLeft"
  | "sharpRight"
  | "rampUp"
  | "rampDown";

export interface PieceDef {
  type: PieceType;
  label: string;
  hint: string;
  glyph: string;
}

export const PIECE_DEFS: PieceDef[] = [
  { type: "straight", label: "Rettilineo", hint: "26 m dritti", glyph: "▮" },
  { type: "long", label: "Rettilineo lungo", hint: "52 m dritti", glyph: "▮▮" },
  { type: "curveLeft", label: "Curva sinistra", hint: "90° ampia", glyph: "◜" },
  { type: "curveRight", label: "Curva destra", hint: "90° ampia", glyph: "◝" },
  { type: "sharpLeft", label: "Angolo retto sx", hint: "90° stretto", glyph: "⌐" },
  { type: "sharpRight", label: "Angolo retto dx", hint: "90° stretto", glyph: "¬" },
  { type: "rampUp", label: "Rampa su", hint: "+7 m di quota", glyph: "◢" },
  { type: "rampDown", label: "Rampa giù", hint: "-7 m di quota", glyph: "◣" },
];

const STEP = 2; // polyline resolution in metres

interface Cursor {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

function pushStraight(pts: THREE.Vector3[], c: Cursor, length: number, dy: number) {
  const steps = Math.max(2, Math.round(length / STEP));
  const startY = c.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const s = t * t * (3 - 2 * t); // smoothstep elevation change
    const d = t * length;
    pts.push(
      new THREE.Vector3(
        c.x + Math.sin(c.yaw) * d,
        startY + dy * s,
        c.z + Math.cos(c.yaw) * d,
      ),
    );
  }
  c.x += Math.sin(c.yaw) * length;
  c.z += Math.cos(c.yaw) * length;
  c.y = startY + dy;
}

function pushArc(pts: THREE.Vector3[], c: Cursor, radius: number, sign: number) {
  // sign = +1 turns left, -1 turns right; always a 90° corner
  const steps = 20;
  const total = Math.PI / 2;
  const ds = (radius * total) / steps;
  for (let i = 0; i < steps; i++) {
    c.yaw += (sign * total) / steps;
    c.x += Math.sin(c.yaw) * ds;
    c.z += Math.cos(c.yaw) * ds;
    pts.push(new THREE.Vector3(c.x, c.y, c.z));
  }
}

function applyPiece(pts: THREE.Vector3[], c: Cursor, type: PieceType) {
  switch (type) {
    case "straight":
      return pushStraight(pts, c, 26, 0);
    case "long":
      return pushStraight(pts, c, 52, 0);
    case "curveLeft":
      return pushArc(pts, c, 20, 1);
    case "curveRight":
      return pushArc(pts, c, 20, -1);
    case "sharpLeft":
      return pushArc(pts, c, 7, 1);
    case "sharpRight":
      return pushArc(pts, c, 7, -1);
    case "rampUp":
      return pushStraight(pts, c, 32, 7);
    case "rampDown":
      return pushStraight(pts, c, 32, -7);
  }
}

/**
 * Builds the closed centerline polyline for a list of pieces. The loop is
 * always closed: a smooth bezier link joins the last piece back to the start
 * line, so the circuit is drivable whatever the player builds.
 */
export function buildPolyline(pieces: PieceType[]): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
  const c: Cursor = { x: 0, y: 0, z: 0, yaw: 0 };
  for (const p of pieces) applyPiece(pts, c, p);

  // --- closing link: cubic bezier honouring both headings
  const end = new THREE.Vector3(c.x, c.y, c.z);
  const start = pts[0]!.clone();
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
    for (let i = 1; i < n; i++) pts.push(curve.getPoint(i / n));
  }

  // never dip below ground level
  for (const p of pts) if (p.y < 0) p.y = 0;
  return pts;
}

export const DEFAULT_PIECES: PieceType[] = [
  "long",
  "curveRight",
  "straight",
  "rampUp",
  "curveRight",
  "straight",
  "sharpLeft",
  "straight",
  "rampDown",
  "curveRight",
  "long",
  "curveRight",
  "straight",
];
