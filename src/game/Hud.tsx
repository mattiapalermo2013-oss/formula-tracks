import { Suspense, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { formatTime, useRaceStore } from "./store";
import { CarModel } from "./CarModel";
import {
  ACCENT_COLORS,
  BODY_COLORS,
  useLiveryStore,
  type LiveryPattern,
} from "./liveryStore";
import { useTracksStore } from "./tracksStore";
import { useTrackStore } from "./trackStore";
import { TracksPanel } from "./TracksPanel";
import { useLeaderboardStore } from "./leaderboardStore";
import { ControlsPanel } from "./ControlsPanel";
import { RotateOverlay, TouchControls } from "./TouchControls";
import { keyName, useControlsStore } from "./controlsStore";

function Turntable() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.7;
  });
  return (
    <group ref={ref} position={[0, -0.6, 0]}>
      <CarModel />
    </group>
  );
}

function CarPreview() {
  return (
    <div className="mb-4 h-44 overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-sky-200/60 to-background">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [3.2, 1.8, 4.2], fov: 38 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 3]} intensity={1.8} castShadow />
        <hemisphereLight args={["#cfe9ff", "#4b7a45", 0.6]} />
        <Suspense fallback={null}>
          <Turntable />
        </Suspense>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.62, 0]} receiveShadow>
          <circleGeometry args={[3.4, 40]} />
          <meshStandardMaterial color="#3a3f4a" roughness={0.9} />
        </mesh>
      </Canvas>
    </div>
  );
}

const PATTERNS: { id: LiveryPattern; label: string }[] = [
  { id: "solid", label: "Tinta unita" },
  { id: "stripes", label: "Strisce" },
  { id: "rally", label: "Rally" },
  { id: "split", label: "Bicolore" },
];

function Swatches({
  colors,
  value,
  onPick,
}: {
  colors: string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {colors.map((c) => (
        <button
          key={c}
          aria-label={c}
          onClick={() => onPick(c)}
          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
            value === c ? "border-foreground scale-110" : "border-border/50"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function LiveryPanel({ onClose }: { onClose: () => void }) {
  const { body, accent, pattern, number, setBody, setAccent, setPattern, setNumber } =
    useLiveryStore();
  return (
    <div className="pointer-events-auto mt-6 w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/90 p-4 backdrop-blur-md sm:p-6" style={{ maxHeight: "min(70vh, 640px)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">
          Officina
        </h2>
        <button
          onClick={onClose}
          className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        >
          Chiudi
        </button>
      </div>
      <CarPreview />
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        Carrozzeria
      </p>
      <Swatches colors={BODY_COLORS} value={body} onPick={setBody} />
      <p className="mb-2 mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        Accento
      </p>
      <Swatches colors={ACCENT_COLORS} value={accent} onPick={setAccent} />
      <p className="mb-2 mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        Livrea
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPattern(p.id)}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              pattern === p.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-foreground hover:bg-foreground/10"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        Numero di gara
      </p>
      <div className="flex justify-center">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="numeric"
          placeholder="0-99"
          className="w-24 rounded-lg border border-border/60 bg-background px-3 py-2 text-center font-mono text-xl font-bold text-foreground outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-16 sm:min-w-24">
      <div className="text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-foreground/50 sm:text-[0.65rem]">
        {label}
      </div>
      <div
        className={`font-mono text-lg font-bold tabular-nums sm:text-2xl ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function Hud() {
  const { phase, checkpoint, speed, elapsed, lastLap, bestLap, raceTime, raceDelta, lastSplit, startRace, reset, openEditor } =
    useRaceStore();
  const gates = useTrackStore((s) => s.track.checkpoints.length);
  const [splitVisible, setSplitVisible] = useState(false);
  const [showLivery, setShowLivery] = useState(false);
  const [showTracks, setShowTracks] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const bindings = useControlsStore((s) => s.bindings);
  const lastRank = useLeaderboardStore((s) => s.lastRank);
  const userId = useLeaderboardStore((s) => s.userId);
  const refreshLeaderboardAuth = useLeaderboardStore((s) => s.refreshAuth);
  const fetchAll = useTracksStore((s) => s.fetchAll);
  const refreshAuth = useTracksStore((s) => s.refreshAuth);
  const isAdmin = useTracksStore((s) => s.isAdmin);

  useEffect(() => {
    void fetchAll();
    void refreshAuth();
    void refreshLeaderboardAuth();
  }, [fetchAll, refreshAuth, refreshLeaderboardAuth]);

  useEffect(() => {
    if (!lastSplit) {
      setSplitVisible(false);
      return;
    }
    setSplitVisible(true);
    const t = window.setTimeout(() => setSplitVisible(false), 3000);
    return () => window.clearTimeout(t);
  }, [lastSplit?.key]);

  useEffect(() => {
    if (phase !== "racing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useRaceStore.getState().reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {(phase === "racing" || phase === "finished") && (
        <>
          <div className="absolute left-2 top-2 flex gap-3 rounded-xl border border-border/40 bg-card/80 px-3 py-2 backdrop-blur-md sm:left-4 sm:top-4 sm:gap-5 sm:px-5 sm:py-3">
            <Stat label="Tempo" value={formatTime(elapsed)} />
            <Stat label="Record" value={bestLap ? formatTime(bestLap) : "--:--"} accent />
          </div>

          <div className="absolute bottom-3 right-3 rounded-xl border border-border/40 bg-card/80 px-4 py-2 text-right backdrop-blur-md sm:bottom-6 sm:right-6 sm:px-6 sm:py-3">
            <div className="font-mono text-3xl font-bold tabular-nums text-foreground sm:text-5xl">
              {speed}
            </div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-foreground/50">
              km/h
            </div>
          </div>

          <div className="absolute bottom-4 left-3 flex items-center gap-1.5 sm:bottom-6 sm:left-6 sm:gap-2">
            {Array.from({ length: gates }, (_, i) => i).map((i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-full sm:h-2 sm:w-10 ${
                  i < checkpoint ? "bg-primary" : "bg-foreground/20"
                }`}
              />
            ))}
          </div>

          {phase === "racing" && (
            <button
              className="pointer-events-auto absolute right-2 top-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-foreground backdrop-blur-md transition-colors hover:bg-foreground/10 sm:right-4 sm:top-4 sm:px-5 sm:py-2 sm:text-xs"
              onClick={reset}
            >
              Menu <span className="font-mono text-foreground/50">[Esc]</span>
            </button>
          )}

          {splitVisible && lastSplit && phase === "racing" && (
            <div className="absolute left-1/2 top-28 -translate-x-1/2 rounded-xl border border-border/40 bg-card/85 px-4 py-2 text-center backdrop-blur-md sm:top-24 sm:px-6 sm:py-3">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-foreground/50">
                Settore {lastSplit.index + 1}
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {formatTime(lastSplit.time)}
              </div>
              {lastSplit.delta !== null && (
                <div
                  className={`font-mono text-sm font-bold tabular-nums ${
                    lastSplit.delta <= 0 ? "text-emerald-400" : "text-destructive"
                  }`}
                >
                  {lastSplit.delta <= 0 ? "-" : "+"}
                  {formatTime(Math.abs(lastSplit.delta))}
                </div>
              )}
            </div>
          )}

          {phase === "racing" && (
            <>
              <TouchControls />
              <RotateOverlay />
            </>
          )}

          {lastLap !== null && phase === "racing" && (
            <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full border border-border/40 bg-card/80 px-4 py-1.5 font-mono text-xs text-foreground backdrop-blur-md sm:top-6 sm:px-5 sm:py-2 sm:text-sm">
              Ultimo giro {formatTime(lastLap)}
            </div>
          )}
        </>
      )}

      {phase === "ready" && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center overflow-y-auto bg-background/70 px-3 py-6 backdrop-blur-sm">
          <div className="my-auto flex flex-col items-center">
          <div className="mb-4 flex items-center gap-3">
            {userId ? (
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Account connesso
              </span>
            ) : (
              <Link
                to="/auth"
                className="pointer-events-auto rounded-full border border-primary px-6 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
              >
                Accedi
              </Link>
            )}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-primary">
            Arcade racing
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-7xl">
            F1-TRACK
          </h1>
          <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">
            Un giro lanciato sul circuito sospeso. Curve strette, rampe e un cronometro che non perdona.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              className="pointer-events-auto rounded-full bg-primary px-10 py-4 text-base font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-105"
              onClick={() => {
                setShowLivery(false);
                setShowControls(false);
                setShowTracks((v) => !v);
              }}
            >
              Gioca
            </button>
            {isAdmin && (
              <button
                className="pointer-events-auto rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
                onClick={openEditor}
              >
                Costruisci la pista
              </button>
            )}
            <button
              className="pointer-events-auto rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
              onClick={() => {
                setShowTracks(false);
                setShowControls(false);
                setShowLivery((v) => !v);
              }}
            >
              Personalizza auto
            </button>
            <button
              className="pointer-events-auto rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
              onClick={() => {
                setShowTracks(false);
                setShowLivery(false);
                setShowControls((v) => !v);
              }}
            >
              Comandi
            </button>
          </div>
          {showTracks && <TracksPanel onClose={() => setShowTracks(false)} />}
          {showLivery && <LiveryPanel onClose={() => setShowLivery(false)} />}
          {showControls && <ControlsPanel onClose={() => setShowControls(false)} />}
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {[
              [`${keyName(bindings.accelerate)} / ↑`, "accelera"],
              [`${keyName(bindings.brake)} / ↓`, "frena"],
              [`${keyName(bindings.left)} ${keyName(bindings.right)} / ← →`, "sterza"],
              [keyName(bindings.handbrake), "derapata"],
              [keyName(bindings.reset), "reset"],
              ["Esc", "menu"],
            ].map(([k, d]) => (
              <span key={k} className="rounded-md border border-border/50 bg-card/70 px-3 py-1.5">
                <b className="font-mono text-foreground">{k}</b> · {d}
              </span>
            ))}
          </div>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="pointer-events-auto max-h-[90vh] w-[min(92vw,32rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/90 px-5 py-8 text-center sm:px-12 sm:py-10">
            <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">GIRO COMPLETATO</h2>
            <p className="mt-6 font-mono text-3xl font-bold tabular-nums text-primary sm:text-5xl">
              {raceTime !== null ? formatTime(raceTime) : "--"}
            </p>
            {raceDelta !== null ? (
              <p
                className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                  raceDelta <= 0 ? "text-emerald-400" : "text-destructive"
                }`}
              >
                {raceDelta <= 0 ? "-" : "+"}
                {formatTime(Math.abs(raceDelta))}
              </p>
            ) : (
              <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-emerald-400">
                Primo record
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Record {bestLap ? formatTime(bestLap) : "--"}
            </p>
            {userId ? (
              lastRank !== null && (
                <p className="mt-4 font-mono text-sm font-bold uppercase tracking-widest text-foreground">
                  Posizione mondiale{" "}
                  <span className="text-primary">#{lastRank}</span>
                </p>
              )
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Accedi per salvare i tuoi progressi ed entrare in classifica
                </p>
                <a
                  href="/auth"
                  className="pointer-events-auto inline-block rounded-full border border-primary px-6 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
                >
                  Accedi
                </a>
              </div>
            )}

            <button
              className="pointer-events-auto mt-8 rounded-full bg-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-105"
              onClick={startRace}
            >
              Riprova
            </button>
            <button
              className="pointer-events-auto mt-3 block w-full rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
              onClick={reset}
            >
              Torna al menu
            </button>
            {isAdmin && (
              <button
                className="pointer-events-auto mt-3 block w-full rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
                onClick={openEditor}
              >
                Modifica pista
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
