import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAPS_TO_WIN, formatTime, useRaceStore } from "./store";
import { CarModel } from "./CarModel";
import {
  ACCENT_COLORS,
  BODY_COLORS,
  useLiveryStore,
  type LiveryPattern,
} from "./liveryStore";
import { useTracksStore } from "./tracksStore";
import { TracksPanel } from "./TracksPanel";

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
    <div className="pointer-events-auto mt-6 w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/90 p-6 backdrop-blur-md" style={{ maxHeight: "min(70vh, 640px)" }}>
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
  const [showLivery, setShowLivery] = useState(false);
  const [showTracks, setShowTracks] = useState(false);
  const fetchAll = useTracksStore((s) => s.fetchAll);
  const refreshAuth = useTracksStore((s) => s.refreshAuth);
  const isAdmin = useTracksStore((s) => s.isAdmin);

  useEffect(() => {
    void fetchAll();
    void refreshAuth();
  }, [fetchAll, refreshAuth]);

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

          {phase === "racing" && (
            <button
              className="pointer-events-auto absolute right-4 top-4 rounded-full border border-border/60 bg-card/80 px-5 py-2 text-xs font-bold uppercase tracking-widest text-foreground backdrop-blur-md transition-colors hover:bg-foreground/10"
              onClick={reset}
            >
              Menu <span className="font-mono text-foreground/50">[Esc]</span>
            </button>
          )}

          {lastLap !== null && phase === "racing" && (
            <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-border/40 bg-card/80 px-5 py-2 font-mono text-sm text-foreground backdrop-blur-md">
              Ultimo giro {formatTime(lastLap)}
            </div>
          )}
        </>
      )}

      {phase === "ready" && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center overflow-y-auto bg-background/70 py-6 backdrop-blur-sm">
          <div className="my-auto flex flex-col items-center">
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
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <button
              className="pointer-events-auto rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
              onClick={() => {
                setShowLivery(false);
                setShowTracks((v) => !v);
              }}
            >
              Piste
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
                setShowLivery((v) => !v);
              }}
            >
              Personalizza auto
            </button>
          </div>
          {showTracks && <TracksPanel onClose={() => setShowTracks(false)} />}
          {showLivery && <LiveryPanel onClose={() => setShowLivery(false)} />}
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {[
              ["W / ↑", "accelera"],
              ["S / ↓", "frena"],
              ["A D / ← →", "sterza"],
              ["Spazio", "derapata"],
              ["R", "reset"],
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
