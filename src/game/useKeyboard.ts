import { useEffect, useRef } from "react";

export function useKeyboard() {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyR"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    // If the window loses focus mid-press (alt-tab, a modal opening, a click
    // outside), the keyup never arrives and the key would stay "held"
    // forever — e.g. the car steering left on its own. Drop everything.
    const clearAll = () => keys.current.clear();

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clearAll);
    document.addEventListener("visibilitychange", clearAll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clearAll);
      document.removeEventListener("visibilitychange", clearAll);
    };
  }, []);

  return keys;
}
