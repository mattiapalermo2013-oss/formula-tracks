import { useEffect, useRef, useState } from "react";
import { useStaffStore } from "./staffStore";
import { useTracksStore } from "./tracksStore";
import { useBestTimesStore } from "./bestTimesStore";
import { useLeaderboardStore } from "./leaderboardStore";
import { useT } from "./i18n";

/**
 * Hidden staff entry point: Shift + Alt + A, or 5 fast taps in the
 * top-right corner of the screen. Regular players never see anything.
 */
export function StaffGate() {
  const t = useT();
  const { open, unlocked, busy, error, message, openPanel, closePanel, unlock, lock, wipeLeaderboard } =
    useStaffStore();
  const selected = useTracksStore((s) => s.selected);
  const clearLocal = useBestTimesStore((s) => s.clearAll);
  const [password, setPassword] = useState("");
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && (e.code === "KeyA" || e.key.toLowerCase() === "a")) {
        e.preventDefault();
        openPanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPanel]);

  const onCornerTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t0) => now - t0 < 1500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      openPanel();
    }
  };

  return (
    <>
      {/* invisible hotspot, top-right */}
      <div
        onClick={onCornerTap}
        aria-hidden
        className="pointer-events-auto fixed right-0 top-0 z-40 h-12 w-12 opacity-0"
      />

      {open && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">
              {t("staff.title")}
            </h2>

            {!unlocked ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void unlock(password);
                  setPassword("");
                }}
              >
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("staff.password")}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                {error && <p className="text-xs text-destructive">{t("staff.wrong")}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
                  >
                    {t("staff.confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="flex-1 rounded-full border border-border/60 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground"
                  >
                    {t("staff.close")}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  {t("staff.unlocked")}
                </p>
                {selected != null && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setLocalMsg(null);
                      await wipeLeaderboard(selected);
                      if (selected != null) await useLeaderboardStore.getState().fetch(selected);
                    }}
                    className="w-full rounded-full border border-border/60 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground disabled:opacity-60"
                  >
                    {t("staff.resetTrack")}
                  </button>
                )}
                <button
                  disabled={busy}
                  onClick={async () => {
                    setLocalMsg(null);
                    await wipeLeaderboard(null);
                    if (selected != null) await useLeaderboardStore.getState().fetch(selected);
                  }}
                  className="w-full rounded-full border border-border/60 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground disabled:opacity-60"
                >
                  {t("staff.resetAll")}
                </button>
                <button
                  onClick={() => {
                    clearLocal();
                    setLocalMsg(t("staff.localCleared"));
                  }}
                  className="w-full rounded-full border border-border/60 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground"
                >
                  {t("staff.resetLocal")}
                </button>

                {message?.startsWith("deleted:") && (
                  <p className="text-xs text-emerald-400">
                    {t("staff.deleted")} {message.slice(8)}
                  </p>
                )}
                {localMsg && <p className="text-xs text-emerald-400">{localMsg}</p>}
                {error && <p className="text-xs text-destructive">{t("staff.wrong")}</p>}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={lock}
                    className="flex-1 rounded-full border border-border/60 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground"
                  >
                    {t("staff.lock")}
                  </button>
                  <button
                    onClick={closePanel}
                    className="flex-1 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground"
                  >
                    {t("staff.close")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
