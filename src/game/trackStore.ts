import { create } from "zustand";
import { DEFAULT_PIECES, type PieceType } from "./blocks";
import { buildTrack, type Track } from "./track";

const SAVE_KEY = "polyrush-layout";

function loadPieces(): PieceType[] {
  if (typeof window === "undefined") return DEFAULT_PIECES;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PieceType[]) : null;
    return parsed && parsed.length ? parsed : DEFAULT_PIECES;
  } catch {
    return DEFAULT_PIECES;
  }
}

function persist(pieces: PieceType[]) {
  if (typeof window !== "undefined") localStorage.setItem(SAVE_KEY, JSON.stringify(pieces));
}

interface TrackStore {
  pieces: PieceType[];
  track: Track;
  setPieces: (p: PieceType[]) => void;
  add: (p: PieceType) => void;
  undo: () => void;
  clear: () => void;
  useDefault: () => void;
}

const initial = loadPieces();

export const useTrackStore = create<TrackStore>((set, get) => ({
  pieces: initial,
  track: buildTrack(initial),
  setPieces: (pieces) => {
    const safe = pieces.length ? pieces : ["straight" as PieceType];
    persist(safe);
    set({ pieces: safe, track: buildTrack(safe) });
  },
  add: (p) => {
    const pieces = [...get().pieces, p];
    persist(pieces);
    set({ pieces, track: buildTrack(pieces) });
  },
  undo: () => {
    const pieces = get().pieces.slice(0, -1);
    persist(pieces);
    set({ pieces, track: buildTrack(pieces) });
  },
  clear: () => {
    const pieces: PieceType[] = ["straight"];
    persist(pieces);
    set({ pieces, track: buildTrack(pieces) });
  },
  useDefault: () => {
    persist(DEFAULT_PIECES);
    set({ pieces: [...DEFAULT_PIECES], track: buildTrack(DEFAULT_PIECES) });
  },
}));
