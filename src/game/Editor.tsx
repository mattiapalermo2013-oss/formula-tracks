import { useEffect, useState } from "react";
import { PIECE_DEFS } from "./blocks";
import { START_MOVE_STEP, useTrackStore } from "./trackStore";
import { useRaceStore } from "./store";
import { useTracksStore } from "./tracksStore";
import { useStaffStore } from "./staffStore";
import { useT } from "./i18n";

export function Editor() {
  const t = useT();
  const phase = useRaceStore((s) => s.phase);
  const startRace = useRaceStore((s) => s.startRace);
  const { pieces, track, start, add, undo, clear, useDefault, rotateStart, moveStart, resetStart } =
    useTrackStore();
  const { tracks, selected, select, saving, error, save } = useTracksStore();
  const isAdmin = useStaffStore((s) => s.unlocked);
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
      <div className="pointer-events-auto absolute left-2 right-2 top-2 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border/40 bg-card/90 p-4 backdrop-blur-md sm:left-4 sm:right-auto sm:top-4 sm:w-72 sm:max-h-[calc(100vh-2rem)]">
        <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
          {t("editor.title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("editor.intro")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {PIECE_DEFS.map((p) => (
            <button
              key={p.type}
              onClick={() => add(p.type)}
              title={t(p.hint)}
              className="rounded-lg border border-border/50 bg-background/60 px-2 py-2 text-left transition-colors hover:border-primary hover:bg-primary/10"
            >
              <span className="font-mono text-base text-primary">{p.glyph}</span>
              <span className="mt-0.5 block text-[0.7rem] font-semibold leading-tight text-foreground">
                {t(p.label)}
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
            {t("editor.undo")}
          </button>
          <button
            onClick={clear}
            className="flex-1 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/10"
          >
            {t("editor.clear")}
          </button>
          <button
            onClick={useDefault}
            className="flex-1 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/10"
          >
            {t("editor.demo")}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{pieces.length} {t("editor.blocks")}</span>
          <span>{Math.round(track.length)} m</span>
        </div>

        <div className="mt-4 rounded-lg border border-border/50 bg-background/40 p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
            {t("editor.start")}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{t("editor.startHint")}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="grid grid-cols-3 gap-1" aria-label={t("editor.startMove")}>
              <span />
              <button
                onClick={() => moveStart(0, -START_MOVE_STEP)}
                className="rounded-md border border-border/50 px-2 py-1 text-xs text-foreground transition-colors hover:bg-foreground/10"
              >
                ↑
              </button>
              <span />
              <button
                onClick={() => moveStart(-START_MOVE_STEP, 0)}
                className="rounded-md border border-border/50 px-2 py-1 text-xs text-foreground transition-colors hover:bg-foreground/10"
              >
                ←
              </button>
              <span
                className="flex items-center justify-center text-base text-primary transition-transform"
                style={{ transform: `rotate(${(-start.yaw * 180) / Math.PI}deg)` }}
                title={`${Math.round(((start.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * 180 / Math.PI)}°`}
              >
                ➤
              </span>
              <button
                onClick={() => moveStart(START_MOVE_STEP, 0)}
                className="rounded-md border border-border/50 px-2 py-1 text-xs text-foreground transition-colors hover:bg-foreground/10"
              >
                →
              </button>
              <span />
              <button
                onClick={() => moveStart(0, START_MOVE_STEP)}
                className="rounded-md border border-border/50 px-2 py-1 text-xs text-foreground transition-colors hover:bg-foreground/10"
              >
                ↓
              </button>
              <span />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <button
                onClick={rotateStart}
                className="rounded-md border border-border/50 px-2 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/10"
              >
                ⟳ {t("editor.startRotate")}
              </button>
              <button
                onClick={resetStart}
                className="rounded-md border border-border/50 px-2 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/10"
              >
                {t("editor.startReset")}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={startRace}
          className="mt-3 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          {t("editor.race")}
        </button>

        {isAdmin && (
          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
              {t("editor.saveSlot")}
            </p>
            <select
              value={selected ?? ""}
              onChange={(e) => select(Number(e.target.value))}
              className="w-full rounded-lg border border-border/60 bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="" disabled>
                {t("editor.chooseSlot")}
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
              placeholder={t("editor.trackName")}
              className="mt-2 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              disabled={saving || selected == null || !name.trim()}
              onClick={async () => {
                if (selected == null) return;
                await save(selected, name.trim(), pieces, start);
                setSavedAt(true);
              }}
              className="mt-2 w-full rounded-full border border-primary bg-primary/15 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-primary/25 disabled:opacity-40"
            >
              {saving ? t("editor.saving") : t("editor.save")}
            </button>
            {savedAt && !error && (
              <p className="mt-2 text-[0.7rem] text-muted-foreground">{t("editor.saved")}</p>
            )}

            {error && <p className="mt-2 text-[0.7rem] text-destructive">{error}</p>}
          </div>
        )}
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 overflow-x-auto rounded-full border border-border/40 bg-card/85 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          {pieces.length === 0 && (
            <span className="px-2 text-xs text-muted-foreground">{t("editor.noBlocks")}</span>
          )}
          {pieces.map((p, i) => {
            const def = PIECE_DEFS.find((d) => d.type === p)!;
            return (
              <span
                key={i}
                title={t(def.label)}
                className="rounded-md bg-background/70 px-2 py-1 font-mono text-xs text-foreground"
              >
                {def.glyph}
              </span>
            );
          })}
        </div>
      </div>

      <p className="absolute bottom-16 right-2 rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md sm:bottom-auto sm:right-4 sm:top-4">
        {t("editor.cameraHint")}
      </p>
    </div>
  );
}
