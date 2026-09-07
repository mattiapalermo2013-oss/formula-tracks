import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { ghostFlat, ghostInfo, ghostSetExternal } from "./ghost";
import { useLiveryStore } from "./liveryStore";
import { useBestTimesStore } from "./bestTimesStore";

const NAME_KEY = "polyrush-player-name";
const PLAYER_KEY = "polyrush-player-id";

export interface LapEntry {
  id: string;
  slot: number;
  player_name: string;
  time_ms: number;
  created_at: string;
  hasGhost?: boolean;
}

function randomUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable anonymous player id kept in localStorage (one row per player per track). */
function loadPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = randomUuid();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

function loadName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

function guestName(): string {
  return `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Reads the username from the CrazyGames SDK when the game runs on CrazyGames. */
async function crazyGamesName(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const sdk = (window as unknown as { CrazyGames?: { SDK?: unknown } }).CrazyGames?.SDK as
      | { user?: { getUser?: () => Promise<{ username?: string } | null> } }
      | undefined;
    const user = await sdk?.user?.getUser?.();
    const username = user?.username?.trim();
    return username ? username.slice(0, 24) : null;
  } catch {
    return null;
  }
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
  resolveIdentity: () => Promise<{ id: string; name: string }>;
  fetch: (slot: number) => Promise<void>;
  submit: (slot: number, seconds: number) => Promise<void>;
  rankFor: (slot: number, time_ms: number) => Promise<void>;
  clearRank: () => void;
  loadGhost: (entry: LapEntry) => Promise<boolean>;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  name: loadName(),
  userId: loadPlayerId() || null,
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

  /** No account needed: identity comes from CrazyGames or a local guest profile. */
  resolveIdentity: async () => {
    const id = loadPlayerId();
    let name = get().name.trim();
    if (!name) {
      name = (await crazyGamesName()) ?? guestName();
      get().setName(name);
    }
    set({ userId: id, needsAuth: false });
    return { id, name };
  },

  refreshAuth: async () => {
    await get().resolveIdentity();
  },

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
    const rows = (data ?? []) as LapEntry[];
    const { data: withGhost } = await supabase
      .from("lap_times")
      .select("id")
      .eq("slot", slot)
      .not("ghost", "is", null);
    const ghostIds = new Set((withGhost ?? []).map((r) => r.id as string));
    set({ entries: rows.map((r) => ({ ...r, hasGhost: ghostIds.has(r.id) })), loading: false });
  },

  submit: async (slot, seconds) => {
    const time_ms = Math.round(seconds * 1000);
    if (time_ms <= 1000) return;

    const { id, name } = await get().resolveIdentity();

    const livery = useLiveryStore.getState();
    const { error } = await supabase
      .from("lap_times")
      .upsert(
        {
          slot,
          player_name: name,
          time_ms,
          user_id: id,
          // the recording only belongs to this player when no other ghost is pinned
          ghost: ghostInfo.pinned ? null : ghostFlat(),
          livery: { body: livery.body, accent: livery.accent },
        },
        { onConflict: "slot,user_id" },
      );
    if (error) {
      // The database trigger rejects updates that are not faster than the
      // stored record: treat that as "not improved", not as a failure.
      if (error.message.includes("faster lap time")) {
        const localBest = useBestTimesStore.getState().times[slot]?.total;
        await get().rankFor(slot, localBest != null ? Math.round(localBest * 1000) : time_ms);
        await get().fetch(slot);
        return;
      }
      set({ error: error.message });
      return;
    }
    await get().rankFor(slot, time_ms);
    await get().fetch(slot);
  },

  /** Downloads another player's recorded lap and makes it the active ghost. */
  loadGhost: async (entry) => {
    const { data, error } = await supabase
      .from("lap_times")
      .select("ghost,livery,player_name")
      .eq("id", entry.id)
      .maybeSingle();
    if (error || !data?.ghost || !Array.isArray(data.ghost)) return false;
    const livery = (data.livery ?? {}) as { body?: string; accent?: string };
    return ghostSetExternal(data.ghost as number[], data.player_name ?? entry.player_name, livery);
  },

  rankFor: async (slot: number, time_ms: number) => {
    const { count } = await supabase
      .from("lap_times")
      .select("id", { count: "exact", head: true })
      .eq("slot", slot)
      .lt("time_ms", time_ms);
    set({ lastRank: (count ?? 0) + 1 });
  },
}));
