import { useEffect, useState } from "react";
import { useTracksStore } from "./tracksStore";
import { formatTime, useRaceStore } from "./store";
import { useBestTimesStore } from "./bestTimesStore";
import { useLeaderboardStore } from "./leaderboardStore";
import { useStaffStore } from "./staffStore";
import { useT } from "./i18n";
import { ghostInfo, ghostUsePersonal } from "./ghost";
import { useLiveryStore } from "./liveryStore";

function TrackDetail({ slot, onBack }: { slot: number; onBack: () => void }) {
  const t = useT();
  const tracks = useTracksStore((s) => s.tracks);
  const startRace = useRaceStore((s) => s.startRace);
  const best = useBestTimesStore((s) => s.times)[slot]?.total;
  const { entries, loading, error, name, setName, fetch, userId, refreshAuth, loadGhost } =
    useLeaderboardStore();
  const [ghostName, setGhostName] = useState<string | null>(ghostInfo.pinned ? ghostInfo.label : null);
  const [ghostError, setGhostError] = useState(false);

  useEffect(() => {
    void fetch(slot);
    void refreshAuth();
  }, [slot, fetch, refreshAuth]);

  const track = tracks.find((t) => t.slot === slot);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
            {t("track.label")} {String(slot).padStart(2, "0")}
          </p>
          <h2 className="text-lg font-black text-foreground">{track?.name ?? t("track.label")}</h2>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 rounded-full border border-border/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        >
          {t("track.back")}
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
        <span className="text-xs text-muted-foreground">{t("track.yourBest")}</span>
        <span className="font-mono text-sm tabular-nums text-primary">
          {best != null ? formatTime(best) : "--:--"}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
        <span className="truncate text-xs text-muted-foreground">
          {ghostName ? t("ghost.active").replace("{name}", ghostName) : t("ghost.mine")}
        </span>
        {ghostName && (
          <button
            onClick={() => {
              ghostUsePersonal(useLiveryStore.getState());
              setGhostName(null);
            }}
            className="shrink-0 rounded-full border border-border/60 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
          >
            {t("ghost.mine")}
          </button>
        )}
      </div>
      {ghostError && <p className="mb-3 text-xs text-destructive">{t("ghost.none")}</p>}

      <button
        onClick={startRace}
        className="mb-5 w-full rounded-full bg-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.02]"
      >
        {t("track.go")}
      </button>

      {userId ? (
        <>
          <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
            {t("track.yourName")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("track.namePlaceholder")}
            maxLength={24}
            className="mb-4 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
          />
        </>
      ) : (
        <div className="mb-4 rounded-lg border border-border/60 px-3 py-3 text-center">
          <p className="mb-2 text-xs text-muted-foreground">
            {t("track.signInPrompt")}
          </p>
          <a
            href="/auth"
            className="inline-block rounded-full border border-primary px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
          >
            {t("track.signIn")}
          </a>
        </div>
      )}

      <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        {t("track.worldLeaderboard")}
      </h3>
      {loading && <p className="text-xs text-muted-foreground">{t("track.loadingBoard")}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!loading && entries.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("track.noTimes")}</p>
      )}

      <ol className="space-y-1">
        {entries.map((e, i) => (
          <li
            key={e.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
              e.user_id === userId ? "border-primary bg-primary/15" : "border-border/60"
            }`}
          >

            <span className="w-6 font-mono text-xs font-bold text-muted-foreground">{i + 1}</span>
            <span className="truncate text-sm font-semibold text-foreground">{e.player_name}</span>
            <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-primary">
              {formatTime(e.time_ms / 1000)}
            </span>
            {e.hasGhost && (
              <button
                onClick={async () => {
                  setGhostError(false);
                  const ok = await loadGhost(e);
                  if (ok) setGhostName(e.player_name);
                  else setGhostError(true);
                }}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-widest transition-colors ${
                  ghostName === e.player_name
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-foreground/10"
                }`}
              >
                {t("ghost.watch")}
              </button>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

export function TracksPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { tracks, selected, select, loading, error } = useTracksStore();
  const isAdmin = useStaffStore((s) => s.unlocked);
  const openEditor = useRaceStore((s) => s.openEditor);
  const bestTimes = useBestTimesStore((s) => s.times);
  
  const [detail, setDetail] = useState<number | null>(null);

  return (
    <div
      className="pointer-events-auto mt-6 w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/90 p-4 backdrop-blur-md sm:p-6"
      style={{ maxHeight: "min(70vh, 640px)" }}
    >
      {detail != null ? (
        <TrackDetail slot={detail} onBack={() => setDetail(null)} />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">
              {t("tracks.title")}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
            >
              {t("tracks.close")}
            </button>
          </div>

          {loading && <p className="text-xs text-muted-foreground">{t("tracks.loading")}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            {tracks.map((t) => {
              const best = bestTimes[t.slot]?.total;
              return (
                <button
                  key={t.slot}
                  onClick={() => {
                    select(t.slot);
                    setDetail(t.slot);
                  }}
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

          {isAdmin && (
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/50 pt-4 text-xs">
              <span className="text-muted-foreground">{t("staff.unlocked")}</span>
              <button
                onClick={openEditor}
                className="rounded-full bg-primary px-4 py-2 font-bold uppercase tracking-widest text-primary-foreground"
              >
                {t("tracks.editTrack")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
