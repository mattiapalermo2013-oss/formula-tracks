import { useEffect } from "react";
import { formatTime } from "./store";
import { useTracksStore } from "./tracksStore";
import { useLeaderboardStore } from "./leaderboardStore";

export function LeaderboardPanel({ onClose }: { onClose: () => void }) {
  const tracks = useTracksStore((s) => s.tracks);
  const selected = useTracksStore((s) => s.selected);
  const select = useTracksStore((s) => s.select);
  const { entries, loading, error, name, setName, fetch } = useLeaderboardStore();

  useEffect(() => {
    if (selected != null) void fetch(selected);
  }, [selected, fetch]);

  const current = tracks.find((t) => t.slot === selected);

  return (
    <div
      className="pointer-events-auto mt-6 w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/90 p-6 backdrop-blur-md"
      style={{ maxHeight: "min(70vh, 640px)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">
          Classifica mondiale
        </h2>
        <button
          onClick={onClose}
          className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        >
          Chiudi
        </button>
      </div>

      <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        Il tuo nome
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Pilota"
        maxLength={24}
        className="mb-4 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
      />

      <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground/50">
        Pista
      </label>
      <select
        value={selected ?? ""}
        onChange={(e) => select(Number(e.target.value))}
        className="mb-4 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
      >
        {tracks.map((t) => (
          <option key={t.slot} value={t.slot}>
            {String(t.slot).padStart(2, "0")} · {t.name}
          </option>
        ))}
      </select>

      {loading && <p className="text-xs text-muted-foreground">Carico la classifica…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!loading && entries.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nessun tempo su {current?.name ?? "questa pista"}. Sii il primo!
        </p>
      )}

      <ol className="space-y-1">
        {entries.map((e, i) => (
          <li
            key={e.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
              e.player_name === name.trim()
                ? "border-primary bg-primary/15"
                : "border-border/60"
            }`}
          >
            <span className="w-6 font-mono text-xs font-bold text-muted-foreground">
              {i + 1}
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {e.player_name}
            </span>
            <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-primary">
              {formatTime(e.time_ms / 1000)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
