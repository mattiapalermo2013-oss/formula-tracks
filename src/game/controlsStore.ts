import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ControlAction =
  | "accelerate"
  | "brake"
  | "left"
  | "right"
  | "handbrake"
  | "reset";

export const CONTROL_LABELS: Record<ControlAction, string> = {
  accelerate: "Accelera",
  brake: "Frena / Retromarcia",
  left: "Sterza a sinistra",
  right: "Sterza a destra",
  handbrake: "Freno a mano",
  reset: "Reset giro",
};

export const DEFAULT_BINDINGS: Record<ControlAction, string> = {
  accelerate: "KeyW",
  brake: "KeyS",
  left: "KeyA",
  right: "KeyD",
  handbrake: "Space",
  reset: "KeyR",
};

const KEY_NAMES: Record<string, string> = {
  Space: "Spazio",
  ArrowUp: "Freccia su",
  ArrowDown: "Freccia giù",
  ArrowLeft: "Freccia sinistra",
  ArrowRight: "Freccia destra",
  ShiftLeft: "Shift sx",
  ShiftRight: "Shift dx",
  ControlLeft: "Ctrl sx",
  ControlRight: "Ctrl dx",
  AltLeft: "Alt sx",
  AltRight: "Alt dx",
  Escape: "Esc",
  Enter: "Invio",
  Tab: "Tab",
  Backspace: "Backspace",
  CapsLock: "Bloc Maiusc",
};

export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}

interface ControlsState {
  bindings: Record<ControlAction, string>;
  setBinding: (action: ControlAction, code: string) => void;
  resetDefaults: () => void;
}

export const useControlsStore = create<ControlsState>()(
  persist(
    (set) => ({
      bindings: { ...DEFAULT_BINDINGS },
      setBinding: (action, code) =>
        set((s) => {
          const bindings = { ...s.bindings };
          // avoid duplicate keys: clear any other action using this code
          for (const a of Object.keys(bindings) as ControlAction[]) {
            if (bindings[a] === code && a !== action) bindings[a] = "";
          }
          bindings[action] = code;
          return { bindings };
        }),
      resetDefaults: () => set({ bindings: { ...DEFAULT_BINDINGS } }),
    }),
    { name: "f1track-controls" },
  ),
);
