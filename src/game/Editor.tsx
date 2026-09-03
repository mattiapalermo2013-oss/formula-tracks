import { useEffect, useState } from "react";
import { PIECE_DEFS } from "./blocks";
import { useTrackStore } from "./trackStore";
import { useRaceStore } from "./store";
import { useTracksStore } from "./tracksStore";

export function Editor() {
  const phase = useRaceStore((s) => s.phase);
  const startRace = useRaceStore((s) => s.startRace);
  const { pieces, track, add, undo, clear, useDefault } = useTrackStore();
  const { tracks, selected, select, isAdmin, saving, error, save } = useTracksStore();
  const [name, setName] = useState("");
  const [savedAt, setSavedAt] = useState(false);

  const current = tracks.find((t) => t.slot === selected) ?? null;

  useEffect(() => {
    setName(current?.name ?? "");
    setSavedAt(false);
  }, [current?.slot, current?.name]);

  if (phase !== "editing") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      <div className="pointer-events-auto absolute left-4 top-4 w-72 rounded-2xl border border-border/40 bg-card/90 p-4 backdrop-blur-md">
        <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
          Costruisci la pista
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Aggiungi blocchi in sequenza: il circuito si chiude da solo fino al traguardo.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {PIECE_DEFS.map((p) => (
            <button
              key={p.type}
              onClick={() => add(p.type)}
              title={p.hint}
              className="rounded-lg border border-border/50 bg-background/60 px-2 py-2 text-left transition-colors hover:border-primary hover:bg-primary/10"
            >
              <span className="font-mono text-base text-primary">{p.glyph}</span>
              <span className="mt-0.5 block text-[0.7rem] font-semibold leading-tight text-foreground">
                {p.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={undo}
            disabled={pieces.length === 0}
            className="flex-1 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-40"
          >
            Annulla
          </button>
          <button
            onClick={clear}
            className="flex-1 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/10"
          >
            Svuota
          </button>
          <button
            onClick={useDefault}
            className="flex-1 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/10"
          >
            Demo
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{pieces.length} blocchi</span>
          <span>{Math.round(track.length)} m</span>
        </div>

        <button
          onClick={startRace}
          className="mt-3 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          Corri su questa pista
        </button>

        {isAdmin && (
          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
              Salva su slot ufficiale
            </p>
            <select
              value={selected ?? ""}
              onChange={(e) => select(Number(e.target.value))}
              className="w-full rounded-lg border border-border/60 bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="" disabled>
                Scegli slot
              </option>
              {tracks.map((t) => (
                <option key={t.slot} value={t.slot}>
                  {String(t.slot).padStart(2, "0")} · {t.name}
                </option>
              ))}
            </select>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome della pista"
              className="mt-2 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              disabled={saving || selected == null || !name.trim()}
              onClick={async () => {
                if (selected == null) return;
                await save(selected, name.trim(), pieces);
                setSavedAt(true);
              }}
              className="mt-2 w-full rounded-full border border-primary bg-primary/15 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-primary/25 disabled:opacity-40"
            >
              {saving ? "Salvo…" : "Salva pista"}
            </button>
            {savedAt && !error && (
              <p className="mt-2 text-[0.7rem] text-muted-foreground">Pista salvata.</p>
            )}
            {error && <p className="mt-2 text-[0.7rem] text-destructive">{error}</p>}
          </div>
        )}
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 overflow-x-auto rounded-full border border-border/40 bg-card/85 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          {pieces.length === 0 && (
            <span className="px-2 text-xs text-muted-foreground">Nessun blocco</span>
          )}
          {pieces.map((p, i) => {
            const def = PIECE_DEFS.find((d) => d.type === p)!;
            return (
              <span
                key={i}
                title={def.label}
                className="rounded-md bg-background/70 px-2 py-1 font-mono text-xs text-foreground"
              >
                {def.glyph}
              </span>
            );
          })}
        </div>
      </div>

      <p className="absolute right-4 top-4 rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
        Trascina per ruotare · rotella per zoom
      </p>
    </div>
  );
}
