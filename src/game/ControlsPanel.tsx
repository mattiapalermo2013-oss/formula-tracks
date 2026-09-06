import { useEffect, useState } from "react";
import {
  CONTROL_LABELS,
  DEFAULT_BINDINGS,
  keyName,
  useControlsStore,
  type ControlAction,
} from "./controlsStore";
import { useI18nStore, useT, type Lang } from "./i18n";
import { useSettingsStore, type SpeedUnit } from "./settingsStore";

const ACTIONS = Object.keys(DEFAULT_BINDINGS) as ControlAction[];

function ToggleRow<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: T; text: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex gap-1 rounded-full border border-border/60 bg-card p-1">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest transition-colors ${
              value === o.id
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-foreground/10"
            }`}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ControlsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const units = useSettingsStore((s) => s.units);
  const setUnits = useSettingsStore((s) => s.setUnits);
  const bindings = useControlsStore((s) => s.bindings);
  const setBinding = useControlsStore((s) => s.setBinding);
  const resetDefaults = useControlsStore((s) => s.resetDefaults);
  const [waiting, setWaiting] = useState<ControlAction | null>(null);

  useEffect(() => {
    if (!waiting) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== "Escape") setBinding(waiting, e.code);
      setWaiting(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [waiting, setBinding]);

  return (
    <div className="pointer-events-auto mt-6 w-full max-w-md rounded-2xl border border-border/50 bg-card/90 p-4 backdrop-blur-md sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-foreground">
          {t("menu.settings")}
        </h2>
        <button
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          {t("controls.close")}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <ToggleRow<Lang>
          label={t("settings.language")}
          value={lang}
          onPick={setLang}
          options={[
            { id: "en", text: "EN" },
            { id: "it", text: "IT" },
          ]}
        />
        <ToggleRow<SpeedUnit>
          label={t("settings.units")}
          value={units}
          onPick={setUnits}
          options={[
            { id: "kmh", text: t("settings.kmh") },
            { id: "mph", text: t("settings.mph") },
          ]}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t("controls.hint")}
      </p>
      <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto pr-1 overscroll-contain">
        {ACTIONS.map((action) => (
          <div
            key={action}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-2.5"
          >
            <span className="text-sm text-foreground">{t(CONTROL_LABELS[action])}</span>
            <button
              className={`min-w-24 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors ${
                waiting === action
                  ? "animate-pulse border-primary bg-primary/20 text-primary"
                  : "border-border/60 bg-card text-foreground hover:bg-foreground/10"
              }`}
              onClick={() => setWaiting(waiting === action ? null : action)}
            >
              {waiting === action
                ? t("controls.press")
                : bindings[action]
                  ? keyName(bindings[action])
                  : "—"}
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-2.5 opacity-60">
          <span className="text-sm text-foreground">{t("controls.backToMenu")}</span>
          <span className="min-w-24 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-center font-mono text-xs font-bold uppercase text-foreground">
            Esc
          </span>
        </div>
      </div>
      <button
        className="mt-4 w-full rounded-full border border-border/60 py-2 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        onClick={resetDefaults}
      >
        {t("controls.resetDefaults")}
      </button>
    </div>
  );
}
