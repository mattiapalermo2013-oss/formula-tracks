import { useEffect, useState } from "react";
import {
  CONTROL_LABELS,
  DEFAULT_BINDINGS,
  keyName,
  useControlsStore,
  type ControlAction,
} from "./controlsStore";

const ACTIONS = Object.keys(DEFAULT_BINDINGS) as ControlAction[];

export function ControlsPanel({ onClose }: { onClose: () => void }) {
  const bindings = useControlsStore((s) => s.bindings);
  const setBinding = useControlsStore((s) => s.setBinding);
  const resetDefaults = useControlsStore((s) => s.resetDefaults);
  const [waiting, setWaiting] = useState<ControlAction | null>(null);

  useEffect(() => {
    if (!waiting) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== "Escape") setBinding(waiting, e.code);
      setWaiting(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [waiting, setBinding]);

  return (
    <div className="pointer-events-auto mt-6 w-full max-w-md rounded-2xl border border-border/50 bg-card/90 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-foreground">
          Comandi
        </h2>
        <button
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          Chiudi
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Clicca su un tasto per cambiarlo, poi premi il nuovo tasto. Esc annulla.
      </p>
      <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto pr-1 overscroll-contain">
        {ACTIONS.map((action) => (
          <div
            key={action}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-2.5"
          >
            <span className="text-sm text-foreground">{CONTROL_LABELS[action]}</span>
            <button
              className={`min-w-24 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors ${
                waiting === action
                  ? "animate-pulse border-primary bg-primary/20 text-primary"
                  : "border-border/60 bg-card text-foreground hover:bg-foreground/10"
              }`}
              onClick={() => setWaiting(waiting === action ? null : action)}
            >
              {waiting === action
                ? "Premi un tasto…"
                : bindings[action]
                  ? keyName(bindings[action])
                  : "—"}
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-2.5 opacity-60">
          <span className="text-sm text-foreground">Torna al menu</span>
          <span className="min-w-24 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-center font-mono text-xs font-bold uppercase text-foreground">
            Esc
          </span>
        </div>
      </div>
      <button
        className="mt-4 w-full rounded-full border border-border/60 py-2 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        onClick={resetDefaults}
      >
        Ripristina predefiniti
      </button>
    </div>
  );
}
