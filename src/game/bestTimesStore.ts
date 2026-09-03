import { create } from "zustand";

const KEY = "polyrush-best-times";

type BestMap = Record<number, number>;

function load(): BestMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

interface BestTimesState {
  times: BestMap;
  record: (slot: number, total: number) => void;
}

export const useBestTimesStore = create<BestTimesState>((set, get) => ({
  times: load(),
  record: (slot, total) => {
    const cur = get().times[slot];
    if (cur != null && total >= cur) return;
    const times = { ...get().times, [slot]: total };
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(times));
    set({ times });
  },
}));
