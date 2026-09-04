import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

const NAME_KEY = "polyrush-player-name";

export interface LapEntry {
  id: string;
  slot: number;
  player_name: string;
  time_ms: number;
  created_at: string;
}

function loadName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

interface LeaderboardState {
  name: string;
  entries: LapEntry[];
  loading: boolean;
  error: string | null;
  lastRank: number | null; // world position of the run just submitted
  setName: (n: string) => void;
  fetch: (slot: number) => Promise<void>;
  submit: (slot: number, seconds: number) => Promise<void>;
  clearRank: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  name: loadName(),
  entries: [],
  loading: false,
  error: null,
  lastRank: null,

  setName: (n) => {
    const name = n.slice(0, 24);
    if (typeof window !== "undefined") localStorage.setItem(NAME_KEY, name);
    set({ name });
  },

  clearRank: () => set({ lastRank: null }),

  fetch: async (slot) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("lap_times")
      .select("id,slot,player_name,time_ms,created_at")
      .eq("slot", slot)
      .order("time_ms", { ascending: true })
      .limit(100);
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ entries: (data ?? []) as LapEntry[], loading: false });
  },

  submit: async (slot, seconds) => {
    const name = get().name.trim();
    const time_ms = Math.round(seconds * 1000);
    if (!name || time_ms <= 1000) return;
    const { error } = await supabase.from("lap_times").insert({ slot, player_name: name, time_ms });
    if (error) {
      set({ error: error.message });
      return;
    }
    const { count } = await supabase
      .from("lap_times")
      .select("id", { count: "exact", head: true })
      .eq("slot", slot)
      .lt("time_ms", time_ms);
    set({ lastRank: (count ?? 0) + 1 });
    await get().fetch(slot);
  },
}));
