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
  accelerate: "action.accelerate",
  brake: "action.brake",
  left: "action.left",
  right: "action.right",
  handbrake: "action.handbrake",
  reset: "action.reset",
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
  Space: "Space",
  ArrowUp: "Arrow Up",
  ArrowDown: "Arrow Down",
  ArrowLeft: "Arrow Left",
  ArrowRight: "Arrow Right",
  ShiftLeft: "Shift L",
  ShiftRight: "Shift R",
  ControlLeft: "Ctrl L",
  ControlRight: "Ctrl R",
  AltLeft: "Alt L",
  AltRight: "Alt R",
  Escape: "Esc",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  CapsLock: "Caps Lock",
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
