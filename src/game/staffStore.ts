import { create } from "zustand";
import { verifyStaff, resetLeaderboard } from "@/lib/staff.functions";

const KEY = "formula-track-staff";

function loadPassword(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

interface StaffState {
  open: boolean;
  unlocked: boolean;
  password: string | null;
  busy: boolean;
  error: string | null;
  message: string | null;
  openPanel: () => void;
  closePanel: () => void;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  wipeLeaderboard: (slot: number | null) => Promise<void>;
}

const initialPassword = loadPassword();

export const useStaffStore = create<StaffState>((set, get) => ({
  open: false,
  unlocked: initialPassword != null,
  password: initialPassword,
  busy: false,
  error: null,
  message: null,

  openPanel: () => set({ open: true, error: null, message: null }),
  closePanel: () => set({ open: false, error: null, message: null }),

  unlock: async (password) => {
    set({ busy: true, error: null, message: null });
    try {
      const { ok } = await verifyStaff({ data: { password } });
      if (!ok) {
        set({ busy: false, error: "wrong" });
        return;
      }
      try {
        sessionStorage.setItem(KEY, password);
      } catch {
        /* ignore */
      }
      set({ busy: false, unlocked: true, password });
    } catch {
      set({ busy: false, error: "wrong" });
    }
  },

  lock: () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ unlocked: false, password: null, open: false, message: null });
  },

  wipeLeaderboard: async (slot) => {
    const password = get().password;
    if (!password) return;
    set({ busy: true, error: null, message: null });
    try {
      const res = await resetLeaderboard({ data: { password, slot } });
      set({ busy: false, message: res.ok ? `deleted:${res.deleted}` : "wrong" });
    } catch {
      set({ busy: false, error: "wrong" });
    }
  },
}));
