import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SpeedUnit = "kmh" | "mph";

interface SettingsState {
  units: SpeedUnit;
  setUnits: (units: SpeedUnit) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      units: "kmh",
      setUnits: (units) => set({ units }),
    }),
    { name: "f1track-settings" },
  ),
);

const KMH_TO_MPH = 0.621371;

export function displaySpeed(kmh: number, units: SpeedUnit): number {
  return Math.round(units === "mph" ? kmh * KMH_TO_MPH : kmh);
}

export function speedUnitLabel(units: SpeedUnit): string {
  return units === "mph" ? "mph" : "km/h";
}
