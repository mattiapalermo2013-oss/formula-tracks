import { create } from "zustand";
import { DEFAULT_PIECES, DEFAULT_START, type PieceType, type StartPose } from "./blocks";
import { buildTrack, type Track } from "./track";

const SAVE_KEY = "polyrush-layout-v2";
const STARTS_KEY = "polyrush-starts-v1";

interface SavedLayout {
  pieces: PieceType[];
  start: StartPose;
}

/** Key used to store the start pose of a given track slot (null = local layout). */
function slotKey(slot: number | null): string {
  return slot == null ? "local" : String(slot);
}

function validStart(s: unknown): StartPose | null {
  const p = s as Partial<StartPose> | undefined;
  return p && Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.yaw)
    ? { x: p.x as number, z: p.z as number, yaw: p.yaw as number }
    : null;
}

function loadStarts(): Record<string, StartPose> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STARTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, StartPose> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const s = validStart(v);
      if (s) out[k] = s;
    }
    return out;
  } catch {
    return {};
  }
}

function persistStarts(starts: Record<string, StartPose>) {
  if (typeof window !== "undefined") localStorage.setItem(STARTS_KEY, JSON.stringify(starts));
}

function loadLayout(): SavedLayout {
  const fallback: SavedLayout = { pieces: DEFAULT_PIECES, start: { ...DEFAULT_START } };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SavedLayout>;
    if (!parsed.pieces || !parsed.pieces.length) return fallback;
    return {
      pieces: parsed.pieces,
      start: validStart(parsed.start) ?? { ...DEFAULT_START },
    };
  } catch {
    return fallback;
  }
}

function persist(pieces: PieceType[]) {
  if (typeof window !== "undefined") localStorage.setItem(SAVE_KEY, JSON.stringify({ pieces }));
}

const START_MOVE_STEP = 10;

interface TrackStore {
  pieces: PieceType[];
  start: StartPose;
  /** Slot the current layout belongs to; null while editing the local layout. */
  slot: number | null;
  starts: Record<string, StartPose>;
  track: Track;
  setPieces: (p: PieceType[]) => void;
  /** Load a whole track (blocks + its own start line) for a given slot. */
  loadLayout: (slot: number | null, pieces: PieceType[], start?: StartPose | null) => void;
  add: (p: PieceType) => void;
  undo: () => void;
  clear: () => void;
  useDefault: () => void;
  /** Rotate the start line heading by 45 degrees. */
  rotateStart: () => void;
  /** Move the start line on the ground plane (metres). */
  moveStart: (dx: number, dz: number) => void;
  resetStart: () => void;
}

const initial = loadLayout();
const initialStarts = loadStarts();

export const useTrackStore = create<TrackStore>((set, get) => ({
  pieces: initial.pieces,
  start: initialStarts["local"] ?? initial.start,
  slot: null,
  starts: initialStarts,
  track: buildTrack(initial.pieces, initialStarts["local"] ?? initial.start),
  setPieces: (pieces) => {
    const safe = pieces.length ? pieces : (["straight"] as PieceType[]);
    const { start } = get();
    persist(safe);
    set({ pieces: safe, track: buildTrack(safe, start) });
  },
  loadLayout: (slot, pieces, start) => {
    const safe = pieces.length ? pieces : (["straight"] as PieceType[]);
    const { starts } = get();
    // Each track keeps its own start line: cloud value first, then the local
    // one saved for that slot, then the default.
    const pose = validStart(start) ?? starts[slotKey(slot)] ?? { ...DEFAULT_START };
    const nextStarts = { ...starts, [slotKey(slot)]: pose };
    persistStarts(nextStarts);
    if (slot == null) persist(safe);
    set({ slot, pieces: safe, start: pose, starts: nextStarts, track: buildTrack(safe, pose) });
  },
  add: (p) => {
    const pieces = [...get().pieces, p];
    const { start } = get();
    persist(pieces);
    set({ pieces, track: buildTrack(pieces, start) });
  },
  undo: () => {
    const pieces = get().pieces.slice(0, -1);
    const { start } = get();
    persist(pieces);
    set({ pieces, track: buildTrack(pieces, start) });
  },
  clear: () => {
    const pieces: PieceType[] = ["straight"];
    const { start } = get();
    persist(pieces);
    set({ pieces, track: buildTrack(pieces, start) });
  },
  useDefault: () => {
    const { start } = get();
    persist(DEFAULT_PIECES);
    set({ pieces: [...DEFAULT_PIECES], track: buildTrack(DEFAULT_PIECES, start) });
  },
  rotateStart: () => {
    const { pieces, start } = get();
    setStart(set, get, pieces, { ...start, yaw: start.yaw + Math.PI / 4 });
  },
  moveStart: (dx, dz) => {
    const { pieces, start } = get();
    setStart(set, get, pieces, { ...start, x: start.x + dx, z: start.z + dz });
  },
  resetStart: () => {
    const { pieces } = get();
    setStart(set, get, pieces, { ...DEFAULT_START });
  },
}));

function setStart(
  set: (partial: Partial<TrackStore>) => void,
  get: () => TrackStore,
  pieces: PieceType[],
  next: StartPose,
) {
  const { slot, starts } = get();
  const nextStarts = { ...starts, [slotKey(slot)]: next };
  persistStarts(nextStarts);
  set({ start: next, starts: nextStarts, track: buildTrack(pieces, next) });
}

export { START_MOVE_STEP };
