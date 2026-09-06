import { create } from "zustand";
import { LAPS_TO_WIN } from "./track";
import { useTracksStore } from "./tracksStore";
import { useBestTimesStore } from "./bestTimesStore";
import { useLeaderboardStore } from "./leaderboardStore";
import { submitCrazyScore } from "./crazygames";

export type RacePhase = "ready" | "editing" | "racing" | "finished";

// Per-track personal best, read from the best-times store for the selected slot.
function loadBest(): number | null {
  const slot = useTracksStore.getState().selected;
  return useBestTimesStore.getState().bestFor(slot);
}

export interface LapBanner {
  time: number;
  delta: number | null; // gap vs personal best before this lap
  improved: boolean;
  key: number;
}

interface RaceStore {
  phase: RacePhase;
  lap: number;
  checkpoint: number; // how many checkpoints passed this lap
  speed: number; // km/h for the HUD
  elapsed: number; // current lap time (seconds)
  lastLap: number | null;
  bestLap: number | null; // personal best on this track
  sessionBest: number | null; // best lap of this session
  lapBanner: LapBanner | null;
  pitRemaining: number | null; // seconds left of the pit stop, null when not stopped
  pitReadyKey: number | null; // bumps when the stop finishes (visual boost)
  raceTime: number | null; // final total when finished
  raceDelta: number | null; // gap vs previous personal best on this track
  splits: number[]; // cumulative time at each checkpoint this lap
  lastSplit: { index: number; time: number; delta: number | null; key: number } | null;
  passCheckpoint: (index: number, time: number) => void;
  startRace: () => void;
  openEditor: () => void;
  setTelemetry: (speed: number, elapsed: number) => void;
  setProgress: (lap: number, checkpoint: number) => void;
  setPit: (remaining: number | null) => void;
  pitReady: () => void;
  completeLap: (lapTime: number, outLap: boolean) => void;
  finishRace: (total: number, best: number) => void;
  reset: () => void;
}

const cleared = {
  lap: 1,
  checkpoint: 0,
  elapsed: 0,
  lastLap: null,
  sessionBest: null,
  lapBanner: null,
  pitRemaining: null,
  pitReadyKey: null,
  raceTime: null,
  raceDelta: null,
  splits: [],
  lastSplit: null,
};

export const useRaceStore = create<RaceStore>((set, get) => ({
  phase: "ready",
  speed: 0,
  bestLap: loadBest(),
  ...cleared,
  openEditor: () => set({ phase: "editing", speed: 0, ...cleared }),
  startRace: () => (
    useLeaderboardStore.getState().clearRank(),
    set({ phase: "racing", ...cleared, bestLap: loadBest() })
  ),
  passCheckpoint: (index, time) => {
    const slot = useTracksStore.getState().selected;
    const ref = useBestTimesStore.getState().splitsFor(slot)[index];
    const splits = get().splits.slice(0, index);
    splits[index] = time;
    set({
      splits,
      lastSplit: { index, time, delta: ref != null ? time - ref : null, key: Date.now() },
    });
  },
  setTelemetry: (speed, elapsed) => set({ speed, elapsed }),
  setProgress: (lap, checkpoint) => {
    const s = get();
    if (s.lap !== lap || s.checkpoint !== checkpoint) set({ lap, checkpoint });
  },
  setPit: (remaining) => {
    if (get().pitRemaining !== remaining) set({ pitRemaining: remaining });
  },
  pitReady: () => set({ pitRemaining: null, pitReadyKey: Date.now() }),
  // A lap is closed while the car keeps rolling: the clock restarts, the best
  // lap of the session is tracked and any personal best goes to the boards.
  completeLap: (lapTime, outLap) => {
    const s = get();
    const slot = useTracksStore.getState().selected;
    const prevBest = s.bestLap;
    const improved = !outLap && (prevBest === null || lapTime < prevBest);
    set({
      lap: s.lap + 1,
      checkpoint: 0,
      elapsed: 0,
      lastLap: lapTime,
      sessionBest:
        outLap || s.sessionBest === null ? (outLap ? s.sessionBest : lapTime) : Math.min(s.sessionBest, lapTime),
      lapBanner: {
        time: lapTime,
        delta: prevBest != null ? lapTime - prevBest : null,
        improved,
        key: Date.now(),
      },
      splits: [],
      lastSplit: null,
    });
    if (improved && slot != null) {
      useBestTimesStore.getState().record(slot, lapTime, s.splits);
      set({ bestLap: useBestTimesStore.getState().bestFor(slot) });
      void useLeaderboardStore.getState().submit(slot, lapTime);
      void submitCrazyScore(lapTime);
    }
  },
  finishRace: (total) => {
    const splits = get().splits;
    const slot = useTracksStore.getState().selected;
    const prevBest = useBestTimesStore.getState().bestFor(slot);
    set({ phase: "finished", raceTime: total, raceDelta: prevBest != null ? total - prevBest : null });
    if (slot != null) {
      useBestTimesStore.getState().record(slot, total, splits);
      set({ bestLap: useBestTimesStore.getState().bestFor(slot) });
      void useLeaderboardStore.getState().submit(slot, total);
      void submitCrazyScore(total);
    }
  },
  reset: () =>
    set({
      phase: "ready",
      lap: 1,
      checkpoint: 0,
      speed: 0,
      elapsed: 0,
      lastLap: null,
      raceTime: null,
      raceDelta: null,
      splits: [],
      lastSplit: null,
      bestLap: loadBest(),
    }),
}));

export { LAPS_TO_WIN };

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t * 1000) % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
