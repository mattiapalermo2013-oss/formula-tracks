import { LAPS_TO_WIN, formatTime, useRaceStore } from "./store";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-24">
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        {label}
      </div>
      <div
        className={`font-mono text-2xl font-bold tabular-nums ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function Hud() {
  const { phase, lap, checkpoint, speed, elapsed, lastLap, bestLap, raceTime, startRace, reset, openEditor } =
    useRaceStore();

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {phase !== "ready" && (
        <>
          <div className="absolute left-4 top-4 flex gap-5 rounded-xl border border-border/40 bg-card/80 px-5 py-3 backdrop-blur-md">
            <Stat label="Giro" value={`${Math.min(lap, LAPS_TO_WIN)}/${LAPS_TO_WIN}`} />
            <Stat label="Tempo" value={formatTime(elapsed)} />
            <Stat label="Miglior giro" value={bestLap ? formatTime(bestLap) : "--:--"} accent />
          </div>

          <div className="absolute bottom-6 right-6 rounded-xl border border-border/40 bg-card/80 px-6 py-3 text-right backdrop-blur-md">
            <div className="font-mono text-5xl font-bold tabular-nums text-foreground">
              {speed}
            </div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-foreground/50">
              km/h
            </div>
          </div>

          <div className="absolute bottom-6 left-6 flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-2 w-10 rounded-full ${
                  i < checkpoint ? "bg-primary" : "bg-foreground/20"
                }`}
              />
            ))}
          </div>

          {lastLap !== null && phase === "racing" && (
            <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-border/40 bg-card/80 px-5 py-2 font-mono text-sm text-foreground backdrop-blur-md">
              Ultimo giro {formatTime(lastLap)}
            </div>
          )}
        </>
      )}

      {phase === "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-primary">
            Arcade racing
          </p>
          <h1 className="mt-3 text-6xl font-black tracking-tight text-foreground sm:text-7xl">
            POLY RUSH
          </h1>
          <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">
            Tre giri sul circuito sospeso. Curve strette, rampe e un cronometro che non perdona.
          </p>
          <button
            className="pointer-events-auto mt-8 rounded-full bg-primary px-10 py-4 text-base font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-105"
            onClick={startRace}
          >
            Vai in pista
          </button>
          <button
            className="pointer-events-auto mt-3 rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
            onClick={openEditor}
          >
            Costruisci la pista
          </button>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {[
              ["W / ↑", "accelera"],
              ["S / ↓", "frena"],
              ["A D / ← →", "sterza"],
              ["Spazio", "derapata"],
              ["R", "reset"],
            ].map(([k, d]) => (
              <span key={k} className="rounded-md border border-border/50 bg-card/70 px-3 py-1.5">
                <b className="font-mono text-foreground">{k}</b> · {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-border/50 bg-card/90 px-12 py-10 text-center">
            <h2 className="text-4xl font-black tracking-tight text-foreground">TRAGUARDO</h2>
            <p className="mt-6 font-mono text-5xl font-bold tabular-nums text-primary">
              {raceTime !== null ? formatTime(raceTime) : "--"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Miglior giro {bestLap ? formatTime(bestLap) : "--"}
            </p>
            <button
              className="pointer-events-auto mt-8 rounded-full bg-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-105"
              onClick={reset}
            >
              Riprova
            </button>
            <button
              className="pointer-events-auto mt-3 block w-full rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
              onClick={openEditor}
            >
              Modifica pista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
