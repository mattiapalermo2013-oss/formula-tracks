import { Suspense, useEffect, useRef, useState } from "react";
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
import { useT } from "./i18n";
import { displaySpeed, speedUnitLabel, useSettingsStore } from "./settingsStore";
import { StaffGate } from "./StaffGate";
import { useStaffStore } from "./staffStore";

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
  { id: "solid", label: "livery.solid" },
  { id: "stripes", label: "livery.stripes" },
  { id: "rally", label: "livery.rally" },
  { id: "split", label: "livery.split" },
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
  const t = useT();
  const { body, accent, pattern, number, setBody, setAccent, setPattern, setNumber } =
    useLiveryStore();
  return (
    <div className="pointer-events-auto mt-6 w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/90 p-4 backdrop-blur-md sm:p-6" style={{ maxHeight: "min(70vh, 640px)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">
          {t("livery.title")}
        </h2>
        <button
          onClick={onClose}
          className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        >
          {t("livery.close")}
        </button>
      </div>
      <CarPreview />
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        {t("livery.body")}
      </p>
      <Swatches colors={BODY_COLORS} value={body} onPick={setBody} />
      <p className="mb-2 mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        {t("livery.accent")}
      </p>
      <Swatches colors={ACCENT_COLORS} value={accent} onPick={setAccent} />
      <p className="mb-2 mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        {t("livery.pattern")}
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
            {t(p.label)}
          </button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        {t("livery.number")}
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
  const t = useT();
  const { phase, lap, checkpoint, speed, elapsed, lastLap, bestLap, sessionBest, lapBanner, pitRemaining, pitReadyKey, raceTime, raceDelta, lastSplit, startRace, reset, openEditor } =
    useRaceStore();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [boostVisible, setBoostVisible] = useState(false);
  const gates = useTrackStore((s) => s.track.checkpoints.length);
  const [splitVisible, setSplitVisible] = useState(false);
  const [showLivery, setShowLivery] = useState(false);
  const [showTracks, setShowTracks] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const bindings = useControlsStore((s) => s.bindings);
  const lastRank = useLeaderboardStore((s) => s.lastRank);
  const refreshLeaderboardAuth = useLeaderboardStore((s) => s.refreshAuth);
  const fetchAll = useTracksStore((s) => s.fetchAll);
  const refreshAuth = useTracksStore((s) => s.refreshAuth);
  const isAdmin = useStaffStore((s) => s.unlocked);

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
    if (!lapBanner) {
      setBannerVisible(false);
      return;
    }
    setBannerVisible(true);
    const id = window.setTimeout(() => setBannerVisible(false), 6500);
    return () => window.clearTimeout(id);
  }, [lapBanner?.key]);

  useEffect(() => {
    if (!pitReadyKey) return;
    setBoostVisible(true);
    const id = window.setTimeout(() => setBoostVisible(false), 1500);
    return () => window.clearTimeout(id);
  }, [pitReadyKey]);

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
      <StaffGate />
      {(phase === "racing" || phase === "finished") && (
        <>
          <div className="absolute left-2 top-2 flex gap-3 rounded-xl border border-border/40 bg-card/80 px-3 py-2 backdrop-blur-md sm:left-4 sm:top-4 sm:gap-5 sm:px-5 sm:py-3">
            <Stat label={t("hud.time")} value={formatTime(elapsed)} />
            <Stat label={t("hud.best")} value={bestLap ? formatTime(bestLap) : "--:--"} accent />
            <Stat
              label={t("hud.session")}
              value={sessionBest ? formatTime(sessionBest) : "--:--"}
            />
            <Stat label={t("hud.lap")} value={lap === 1 ? t("hud.outLap") : String(lap - 1)} />
          </div>

          <div className="absolute bottom-3 right-3 rounded-xl border border-border/40 bg-card/80 px-4 py-2 text-right backdrop-blur-md sm:bottom-6 sm:right-6 sm:px-6 sm:py-3 [@media(pointer:coarse)]:bottom-auto [@media(pointer:coarse)]:left-2 [@media(pointer:coarse)]:right-auto [@media(pointer:coarse)]:top-[4.75rem]">
            <div className="font-mono text-3xl font-bold tabular-nums text-foreground sm:text-5xl">
              {displaySpeed(speed, units)}
            </div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-foreground/50">
              {speedUnitLabel(units)}
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
              {t("hud.menu")} <span className="font-mono text-foreground/50">[Esc]</span>
            </button>
          )}

          {splitVisible && lastSplit && phase === "racing" && (
            <div className="absolute left-1/2 top-28 -translate-x-1/2 rounded-xl border border-border/40 bg-card/85 px-4 py-2 text-center backdrop-blur-md sm:top-24 sm:px-6 sm:py-3">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-foreground/50">
                {t("hud.sector")} {lastSplit.index + 1}
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

          {lastLap !== null && bannerVisible && phase === "racing" && (
            <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full border border-border/40 bg-card/80 px-4 py-1.5 font-mono text-xs text-foreground backdrop-blur-md sm:top-6 sm:px-5 sm:py-2 sm:text-sm">
              {t("hud.lastLap")} {formatTime(lastLap)}
            </div>
          )}

          {/* Pit stop countdown — the lap clock keeps running underneath. */}
          {pitRemaining !== null && phase === "racing" && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary/50 bg-card/90 px-8 py-5 text-center backdrop-blur-md">
              <div className="text-sm font-black uppercase tracking-[0.3em] text-primary">
                {t("hud.pitStop")}
              </div>
              <div className="mt-2 font-mono text-5xl font-black tabular-nums text-foreground">
                {pitRemaining.toFixed(1)}
              </div>
            </div>
          )}

          {boostVisible && phase === "racing" && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-400/60 bg-card/90 px-8 py-4 text-center backdrop-blur-md">
              <div className="text-2xl font-black uppercase tracking-[0.3em] text-emerald-400">
                {t("hud.pitGo")}
              </div>
            </div>
          )}

          {/* Lap closed: time and gap to the personal best, race keeps going. */}
          {bannerVisible && lapBanner && phase === "racing" && (
            <div className="absolute left-1/2 top-32 -translate-x-1/2 rounded-2xl border border-border/40 bg-card/90 px-6 py-3 text-center backdrop-blur-md">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-foreground/50">
                {lapBanner.improved ? t("hud.newRecord") : t("hud.lapDone")}
              </div>
              <div className="font-mono text-3xl font-black tabular-nums text-foreground">
                {formatTime(lapBanner.time)}
              </div>
              {lapBanner.delta !== null && (
                <div
                  className={`font-mono text-base font-bold tabular-nums ${
                    lapBanner.delta <= 0 ? "text-emerald-400" : "text-destructive"
                  }`}
                >
                  {lapBanner.delta <= 0 ? "-" : "+"}
                  {formatTime(Math.abs(lapBanner.delta))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {phase === "ready" && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center overflow-y-auto bg-background/70 px-3 py-6 backdrop-blur-sm">
          <div className="my-auto flex flex-col items-center">
          <div className="mb-4 flex items-center gap-3">
            <LanguageSwitch />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-primary">
            {t("menu.tagline")}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-7xl">
            FORMULA TRACK
          </h1>
          <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">
            {t("menu.intro")}
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
              {t("menu.play")}
            </button>
            {isAdmin && (
              <button
                className="pointer-events-auto rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
                onClick={openEditor}
              >
                {t("menu.build")}
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
              {t("menu.customize")}
            </button>
            <button
              className="pointer-events-auto rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
              onClick={() => {
                setShowTracks(false);
                setShowLivery(false);
                setShowControls((v) => !v);
              }}
            >
              {t("menu.controls")}
            </button>
          </div>
          {showTracks && <TracksPanel onClose={() => setShowTracks(false)} />}
          {showLivery && <LiveryPanel onClose={() => setShowLivery(false)} />}
          {showControls && <ControlsPanel onClose={() => setShowControls(false)} />}
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {[
              [`${keyName(bindings.accelerate)} / ↑`, t("hint.accelerate")],
              [`${keyName(bindings.brake)} / ↓`, t("hint.brake")],
              [`${keyName(bindings.left)} ${keyName(bindings.right)} / ← →`, t("hint.steer")],
              [keyName(bindings.handbrake), t("hint.drift")],
              [keyName(bindings.reset), t("hint.reset")],
              ["Esc", t("hint.menu")],
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
            <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">{t("hud.lapDone")}</h2>
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
                {t("hud.firstRecord")}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {t("hud.record")} {bestLap ? formatTime(bestLap) : "--"}
            </p>
            {lastRank !== null && (
              <p className="mt-4 font-mono text-sm font-bold uppercase tracking-widest text-foreground">
                {t("hud.worldRank")} <span className="text-primary">#{lastRank}</span>
              </p>
            )}

            <button
              className="pointer-events-auto mt-8 rounded-full bg-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-105"
              onClick={startRace}
            >
              {t("hud.retry")}
            </button>
            <button
              className="pointer-events-auto mt-3 block w-full rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
              onClick={reset}
            >
              {t("hud.backToMenu")}
            </button>
            {isAdmin && (
              <button
                className="pointer-events-auto mt-3 block w-full rounded-full border border-border/60 px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
                onClick={openEditor}
              >
                {t("hud.editTrack")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
