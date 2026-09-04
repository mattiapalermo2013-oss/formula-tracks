import { useTracksStore } from "./tracksStore";
import { formatTime, useRaceStore } from "./store";
import { useBestTimesStore } from "./bestTimesStore";


export function TracksPanel({ onClose }: { onClose: () => void }) {
  const { tracks, selected, select, loading, error, isAdmin, email, claimAdmin, signOut } =
    useTracksStore();
  const openEditor = useRaceStore((s) => s.openEditor);
  const bestTimes = useBestTimesStore((s) => s.times);
  const clearAllTimes = useBestTimesStore((s) => s.clearAll);

  return (
    <div
      className="pointer-events-auto mt-6 w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/90 p-6 backdrop-blur-md"
      style={{ maxHeight: "min(70vh, 640px)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">
          Piste ufficiali
        </h2>
        <button
          onClick={onClose}
          className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        >
          Chiudi
        </button>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Carico le piste…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {tracks.map((t) => {
          const best = bestTimes[t.slot]?.total;
          return (
            <button
              key={t.slot}
              onClick={() => select(t.slot)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                selected === t.slot
                  ? "border-primary bg-primary/15"
                  : "border-border/60 hover:bg-foreground/5"
              }`}
            >
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {String(t.slot).padStart(2, "0")}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">{t.name}</span>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-primary">
                {best != null ? formatTime(best) : "--:--"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={clearAllTimes}
          className="rounded-full border border-border/60 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        >
          Azzera record
        </button>
      </div>

      <div className="mt-5 border-t border-border/50 pt-4 text-xs">
        {isAdmin ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Admin: {email}</span>
            <div className="flex gap-2">
              <button
                onClick={openEditor}
                className="rounded-full bg-primary px-4 py-2 font-bold uppercase tracking-widest text-primary-foreground"
              >
                Modifica pista
              </button>
              <button
                onClick={signOut}
                className="rounded-full border border-border/60 px-4 py-2 font-bold uppercase tracking-widest text-foreground"
              >
                Esci
              </button>
            </div>
          </div>
        ) : email ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Connesso: {email}</span>
            <div className="flex gap-2">
              <button
                onClick={claimAdmin}
                className="rounded-full border border-border/60 px-4 py-2 font-bold uppercase tracking-widest text-foreground"
              >
                Diventa admin
              </button>
              <button
                onClick={signOut}
                className="rounded-full border border-border/60 px-4 py-2 font-bold uppercase tracking-widest text-foreground"
              >
                Esci
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Le piste sono uguali per tutti.</span>
            <a
              href="/auth"
              className="rounded-full border border-border/60 px-4 py-2 font-bold uppercase tracking-widest text-foreground"
            >
              Accesso staff
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
