import { useRef, type ReactNode } from "react";
import { resetTouchInput, touchInput } from "./touchControls";
import { useT } from "./i18n";

type TouchAction = keyof typeof touchInput;

function TouchButton({
  action,
  className = "",
  children,
  label,
}: {
  action: TouchAction;
  className?: string;
  children: ReactNode;
  label: string;
}) {
  const active = useRef(false);

  const press = (on: boolean) => {
    active.current = on;
    touchInput[action] = on;
  };

  return (
    <button
      aria-label={label}
      className={`pointer-events-auto flex touch-none select-none items-center justify-center rounded-2xl border border-border/50 bg-card/70 text-foreground backdrop-blur-md active:border-primary active:bg-primary/25 ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        press(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // synthetic or already-released pointers: ignore
        }
      }}
      onPointerUp={() => press(false)}
      onPointerCancel={() => press(false)}
      onLostPointerCapture={() => {
        if (active.current) press(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

function Arrow({ dir }: { dir: "up" | "down" | "left" | "right" }) {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

// Rendered only on coarse-pointer (touch) devices while racing.
export function TouchControls() {
  const t = useT();
  return (
    <div className="pointer-events-none absolute inset-0 hidden [@media(pointer:coarse)]:block">
      {/* steering — bottom left */}
      <div className="absolute bottom-20 left-3 flex gap-3">
        <TouchButton action="left" label={t("action.left")} className="h-20 w-20">
          <Arrow dir="left" />
        </TouchButton>
        <TouchButton action="right" label={t("action.right")} className="h-20 w-20">
          <Arrow dir="right" />
        </TouchButton>
      </div>

      {/* throttle / brake — bottom right */}
      <div className="absolute bottom-20 right-3 flex gap-3">
        <TouchButton action="brake" label={t("action.brake")} className="h-20 w-20">
          <Arrow dir="down" />
        </TouchButton>
        <TouchButton action="accelerate" label={t("action.accelerate")} className="h-24 w-20 bg-primary/20">
          <Arrow dir="up" />
        </TouchButton>
      </div>

      {/* handbrake + reset — above the throttle cluster */}
      <div className="absolute bottom-48 right-3 flex gap-3">
        <TouchButton
          action="handbrake"
          label={t("action.handbrake")}
          className="h-12 w-16 text-[0.6rem] font-bold uppercase tracking-wider"
        >
          {t("touch.drift")}
        </TouchButton>
        <TouchButton
          action="reset"
          label={t("action.reset")}
          className="h-12 w-16 text-[0.6rem] font-bold uppercase tracking-wider"
        >
          {t("touch.reset")}
        </TouchButton>
      </div>

      {/* the checkpoint dots sit bottom-left; nudge them up via padding on small screens is handled in Hud */}
    </div>
  );
}

// Full-screen hint shown on phones held in portrait during a race.
export function RotateOverlay() {
  const t = useT();
  return (
    <div className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center bg-background/80 backdrop-blur-sm [@media(pointer:coarse)_and_(orientation:portrait)]:flex">
      <div className="flex flex-col items-center gap-4 px-8 text-center">
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse text-primary"
        >
          <rect x="7" y="2" width="10" height="20" rx="2" transform="rotate(90 12 12)" />
          <path d="M20 8l2 2-2 2" />
        </svg>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">
          {t("touch.rotate")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("touch.rotateHint")}
        </p>
      </div>
    </div>
  );
}

export function releaseAllTouch() {
  resetTouchInput();
}
