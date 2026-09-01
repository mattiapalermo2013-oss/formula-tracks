import { create } from "zustand";

export type LiveryPattern = "solid" | "stripes" | "rally" | "split";

export interface LiveryState {
  body: string;
  accent: string;
  pattern: LiveryPattern;
  number: string;
  setBody: (c: string) => void;
  setAccent: (c: string) => void;
  setPattern: (p: LiveryPattern) => void;
  setNumber: (n: string) => void;
}

const KEY = "polyrush-livery";

function load(): Pick<LiveryState, "body" | "accent" | "pattern" | "number"> {
  const fallback = { body: "#e63946", accent: "#f8f9fa", pattern: "stripes" as LiveryPattern, number: "7" };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function persist(s: Pick<LiveryState, "body" | "accent" | "pattern" | "number">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ body: s.body, accent: s.accent, pattern: s.pattern, number: s.number }),
    );
  } catch {
    /* ignore */
  }
}

export const BODY_COLORS = [
  "#e63946", "#f4a261", "#ffd166", "#43aa8b",
  "#118ab2", "#3d5a80", "#7209b7", "#e0e1dd",
  "#2b2d42", "#ff6b6b", "#06d6a0", "#ff9f1c",
];

export const ACCENT_COLORS = [
  "#f8f9fa", "#111417", "#ffd166", "#00c2ff",
  "#ff2e63", "#39ff88", "#ff8f1f", "#b388ff",
];

export const useLiveryStore = create<LiveryState>((set, get) => ({
  ...load(),
  setBody: (body) => { set({ body }); persist({ ...get(), body }); },
  setAccent: (accent) => { set({ accent }); persist({ ...get(), accent }); },
  setPattern: (pattern) => { set({ pattern }); persist({ ...get(), pattern }); },
  setNumber: (number) => {
    const n = number.replace(/[^0-9]/g, "").slice(0, 2);
    set({ number: n });
    persist({ ...get(), number: n });
  },
}));
