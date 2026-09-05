import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

const NAME_KEY = "polyrush-player-name";

export interface LapEntry {
  id: string;
  slot: number;
  player_name: string;
  time_ms: number;
  created_at: string;
  user_id: string;
}

function loadName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

interface LeaderboardState {
  name: string;
  userId: string | null;
  entries: LapEntry[];
  loading: boolean;
  error: string | null;
  lastRank: number | null; // world position of the run just submitted
  needsAuth: boolean;
  setName: (n: string) => void;
  refreshAuth: () => Promise<void>;
  fetch: (slot: number) => Promise<void>;
  submit: (slot: number, seconds: number) => Promise<void>;
  clearRank: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  name: loadName(),
  userId: null,
  entries: [],
  loading: false,
  error: null,
  lastRank: null,
  needsAuth: false,

  setName: (n) => {
    const name = n.slice(0, 24);
    if (typeof window !== "undefined") localStorage.setItem(NAME_KEY, name);
    set({ name });
  },

  clearRank: () => set({ lastRank: null }),

  refreshAuth: async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user ?? null;
    set({ userId: user?.id ?? null, needsAuth: false });
    if (user && !get().name.trim()) {
      const fallback = (user.email ?? "Pilota").split("@")[0]!.slice(0, 24);
      get().setName(fallback);
    }
  },

  fetch: async (slot) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("lap_times")
      .select("id,slot,player_name,time_ms,created_at,user_id")
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
    const time_ms = Math.round(seconds * 1000);
    if (time_ms <= 1000) return;

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      set({ needsAuth: true, lastRank: null, userId: null });
      return;
    }
    set({ userId: user.id, needsAuth: false });

    let name = get().name.trim();
    if (!name) {
      name = (user.email ?? "Pilota").split("@")[0]!.slice(0, 24);
      get().setName(name);
    }

    // one row per player per track: keep only the best time
    const { data: existing } = await supabase
      .from("lap_times")
      .select("id,time_ms")
      .eq("slot", slot)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && existing.time_ms <= time_ms) {
      // keep the previous (faster) record, just report the rank of that record
      await get().rankFor(slot, existing.time_ms);
      await get().fetch(slot);
      return;
    }

    const { error } = await supabase
      .from("lap_times")
      .upsert(
        { slot, player_name: name, time_ms, user_id: user.id },
        { onConflict: "slot,user_id" },
      );
    if (error) {
      set({ error: error.message });
      return;
    }
    await get().rankFor(slot, time_ms);
    await get().fetch(slot);
  },

  rankFor: async (slot: number, time_ms: number) => {
    const { count } = await supabase
      .from("lap_times")
      .select("id", { count: "exact", head: true })
      .eq("slot", slot)
      .lt("time_ms", time_ms);
    set({ lastRank: (count ?? 0) + 1 });
  },
}) as LeaderboardState & { rankFor: (slot: number, time_ms: number) => Promise<void> });
