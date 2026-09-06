import { create } from "zustand";
import { DEFAULT_PIECES, DEFAULT_START, type PieceType, type StartPose } from "./blocks";
import { buildTrack, type Track } from "./track";

const SAVE_KEY = "polyrush-layout-v2";

interface SavedLayout {
  pieces: PieceType[];
  start: StartPose;
}

function loadLayout(): SavedLayout {
  const fallback: SavedLayout = { pieces: DEFAULT_PIECES, start: { ...DEFAULT_START } };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SavedLayout>;
    if (!parsed.pieces || !parsed.pieces.length) return fallback;
    const s = parsed.start;
    return {
      pieces: parsed.pieces,
      start:
        s && Number.isFinite(s.x) && Number.isFinite(s.z) && Number.isFinite(s.yaw)
          ? { x: s.x, z: s.z, yaw: s.yaw }
          : { ...DEFAULT_START },
    };
  } catch {
    return fallback;
  }
}

function persist(pieces: PieceType[], start: StartPose) {
  if (typeof window !== "undefined")
    localStorage.setItem(SAVE_KEY, JSON.stringify({ pieces, start }));
}

const START_MOVE_STEP = 10;

interface TrackStore {
  pieces: PieceType[];
  start: StartPose;
  track: Track;
  setPieces: (p: PieceType[]) => void;
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

export const useTrackStore = create<TrackStore>((set, get) => ({
  pieces: initial.pieces,
  start: initial.start,
  track: buildTrack(initial.pieces, initial.start),
  setPieces: (pieces) => {
    const safe = pieces.length ? pieces : (["straight"] as PieceType[]);
    const { start } = get();
    persist(safe, start);
    set({ pieces: safe, track: buildTrack(safe, start) });
  },
  add: (p) => {
    const pieces = [...get().pieces, p];
    const { start } = get();
    persist(pieces, start);
    set({ pieces, track: buildTrack(pieces, start) });
  },
  undo: () => {
    const pieces = get().pieces.slice(0, -1);
    const { start } = get();
    persist(pieces, start);
    set({ pieces, track: buildTrack(pieces, start) });
  },
  clear: () => {
    const pieces: PieceType[] = ["straight"];
    const { start } = get();
    persist(pieces, start);
    set({ pieces, track: buildTrack(pieces, start) });
  },
  useDefault: () => {
    const { start } = get();
    persist(DEFAULT_PIECES, start);
    set({ pieces: [...DEFAULT_PIECES], track: buildTrack(DEFAULT_PIECES, start) });
  },
  rotateStart: () => {
    const { pieces, start } = get();
    const next: StartPose = { ...start, yaw: start.yaw + Math.PI / 4 };
    persist(pieces, next);
    set({ start: next, track: buildTrack(pieces, next) });
  },
  moveStart: (dx, dz) => {
    const { pieces, start } = get();
    const next: StartPose = { ...start, x: start.x + dx, z: start.z + dz };
    persist(pieces, next);
    set({ start: next, track: buildTrack(pieces, next) });
  },
  resetStart: () => {
    const { pieces } = get();
    const next = { ...DEFAULT_START };
    persist(pieces, next);
    set({ start: next, track: buildTrack(pieces, next) });
  },
}));

export { START_MOVE_STEP };
