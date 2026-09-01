import { create } from "zustand";
import { LAPS_TO_WIN } from "./track";

export type RacePhase = "ready" | "editing" | "racing" | "finished";

const BEST_KEY = "polyrush-best-lap";

function loadBest(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(BEST_KEY);
  return raw ? Number(raw) : null;
}

interface RaceStore {
  phase: RacePhase;
  lap: number;
  checkpoint: number; // how many checkpoints passed this lap
  speed: number; // km/h for the HUD
  elapsed: number; // current race time (seconds)
  lastLap: number | null;
  bestLap: number | null;
  raceTime: number | null; // final total when finished
  startRace: () => void;
  setTelemetry: (speed: number, elapsed: number) => void;
  setProgress: (lap: number, checkpoint: number) => void;
  completeLap: (lapTime: number) => void;
  finishRace: (total: number, best: number) => void;
  reset: () => void;
}

export const useRaceStore = create<RaceStore>((set, get) => ({
  phase: "ready",
  lap: 1,
  checkpoint: 0,
  speed: 0,
  elapsed: 0,
  lastLap: null,
  bestLap: loadBest(),
  raceTime: null,
  startRace: () => set({ phase: "racing", lap: 1, checkpoint: 0, elapsed: 0, raceTime: null, lastLap: null }),
  setTelemetry: (speed, elapsed) => set({ speed, elapsed }),
  setProgress: (lap, checkpoint) => {
    const s = get();
    if (s.lap !== lap || s.checkpoint !== checkpoint) set({ lap, checkpoint });
  },
  completeLap: (lapTime) =>
    set((s) => {
      const bestLap = s.bestLap === null ? lapTime : Math.min(s.bestLap, lapTime);
      if (typeof window !== "undefined") localStorage.setItem(BEST_KEY, String(bestLap));
      return { lastLap: lapTime, bestLap };
    }),
  finishRace: (total) => set({ phase: "finished", raceTime: total }),
  reset: () =>
    set({
      phase: "ready",
      lap: 1,
      checkpoint: 0,
      speed: 0,
      elapsed: 0,
      lastLap: null,
      raceTime: null,
    }),
}));

export { LAPS_TO_WIN };

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t * 1000) % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
