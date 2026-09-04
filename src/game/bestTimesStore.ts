import { create } from "zustand";

const KEY = "polyrush-best-times";

interface BestEntry {
  total: number;
  splits: number[];
}

type BestMap = Record<number, BestEntry>;

function normalize(obj: unknown): BestMap {
  const out: BestMap = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const slot = Number(k);
    if (!Number.isFinite(slot)) continue;
    if (typeof v === "number") out[slot] = { total: v, splits: [] };
    else if (v && typeof v === "object" && typeof (v as BestEntry).total === "number") {
      const e = v as BestEntry;
      out[slot] = { total: e.total, splits: Array.isArray(e.splits) ? e.splits : [] };
    }
  }
  return out;
}

function load(): BestMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

interface BestTimesState {
  times: BestMap;
  record: (slot: number, total: number, splits?: number[]) => void;
  splitsFor: (slot: number | null) => number[];
}

export const useBestTimesStore = create<BestTimesState>((set, get) => ({
  times: load(),
  record: (slot, total, splits = []) => {
    const cur = get().times[slot];
    if (cur != null && total >= cur.total) return;
    const times = { ...get().times, [slot]: { total, splits } };
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(times));
    set({ times });
  },
  splitsFor: (slot) => (slot == null ? [] : (get().times[slot]?.splits ?? [])),
}));
