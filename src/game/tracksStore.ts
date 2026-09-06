import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { PieceType } from "./blocks";
import { useTrackStore } from "./trackStore";
import { useStaffStore } from "./staffStore";
import { saveTrackAsStaff } from "@/lib/staff.functions";

export const TRACK_SLOTS = 24;
const SLOT_KEY = "polyrush-slot";

export interface TrackRow {
  slot: number;
  name: string;
  pieces: PieceType[];
}

interface TracksState {
  tracks: TrackRow[];
  selected: number | null;
  isAdmin: boolean;
  email: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  select: (slot: number) => void;
  save: (slot: number, name: string, pieces: PieceType[]) => Promise<void>;
  claimAdmin: () => Promise<void>;
  signOut: () => Promise<void>;
}

function storedSlot(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SLOT_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= TRACK_SLOTS ? n : null;
}

export const useTracksStore = create<TracksState>((set, get) => ({
  tracks: [],
  selected: storedSlot(),
  isAdmin: false,
  email: null,
  loading: false,
  saving: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("tracks")
      .select("slot,name,pieces")
      .order("slot");
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    const tracks = (data ?? []).map((t) => ({
      slot: t.slot,
      name: t.name,
      pieces: (Array.isArray(t.pieces) ? t.pieces : []) as PieceType[],
    }));
    set({ tracks, loading: false });
    const sel = get().selected;
    if (sel != null) {
      const row = tracks.find((t) => t.slot === sel);
      if (row && row.pieces.length) useTrackStore.getState().setPieces(row.pieces);
    }
  },

  refreshAuth: async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user ?? null;
    if (!user) {
      set({ isAdmin: false, email: null });
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    set({
      email: user.email ?? null,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    });
  },

  select: (slot) => {
    const row = get().tracks.find((t) => t.slot === slot);
    set({ selected: slot });
    if (typeof window !== "undefined") localStorage.setItem(SLOT_KEY, String(slot));
    if (row && row.pieces.length) useTrackStore.getState().setPieces(row.pieces);
  },

  save: async (slot, name, pieces) => {
    set({ saving: true, error: null });
    const password = useStaffStore.getState().password;
    if (!password) {
      set({ saving: false, error: "staff" });
      return;
    }
    try {
      const res = await saveTrackAsStaff({ data: { password, slot, name, pieces } });
      if (!res.ok) {
        set({ saving: false, error: "staff" });
        return;
      }
    } catch (e) {
      set({ saving: false, error: e instanceof Error ? e.message : "error" });
      return;
    }
    set((s) => ({
      saving: false,
      tracks: s.tracks.map((t) => (t.slot === slot ? { ...t, name, pieces } : t)),
    }));
  },

  claimAdmin: async () => {
    const { error } = await supabase.rpc("claim_admin");
    if (error) {
      set({ error: error.message });
      return;
    }
    await get().refreshAuth();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ isAdmin: false, email: null });
  },
}));
