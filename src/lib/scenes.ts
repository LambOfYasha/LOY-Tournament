export type SceneId = "starting" | "ending" | "prayer" | "scripture";

export type TimerMode = "countdown" | "countup";

export type OverlayTimer = {
  mode: TimerMode;
  durationMs: number;
  running: boolean;
  origin: number | null;
  accumulated: number;
  label: string;
};

export const SCENES: {
  id: SceneId;
  name: string;
  art: string;
  defaultLabel: string;
  defaultMin: number;
  aliases: string[];
}[] = [
  {
    id: "starting",
    name: "Starting Soon",
    art: "/scenes/starting-soon.png",
    defaultLabel: "Starting soon",
    defaultMin: 10,
    aliases: ["start", "starting", "soon", "intro", "open"],
  },
  {
    id: "ending",
    name: "Ending Soon",
    art: "/scenes/ending-soon.png",
    defaultLabel: "Closing prayer",
    defaultMin: 5,
    aliases: ["end", "ending", "close", "outro", "goodbye"],
  },
  {
    id: "prayer",
    name: "Prayer Break",
    art: "/scenes/prayer-break.png",
    defaultLabel: "Prayer break",
    defaultMin: 3,
    aliases: ["prayer", "break", "pray"],
  },
  {
    id: "scripture",
    name: "Scripture Time",
    art: "/scenes/scripture-time.png",
    defaultLabel: "Scripture time",
    defaultMin: 10,
    aliases: ["scripture", "word", "bible", "study"],
  },
];

export function sceneByToken(raw: string): (typeof SCENES)[number] | undefined {
  const t = raw.trim().toLowerCase();
  return SCENES.find((s) => s.id === t || s.aliases.includes(t));
}

export const EMPTY_TIMER: OverlayTimer = {
  mode: "countdown",
  durationMs: 10 * 60_000,
  running: false,
  origin: null,
  accumulated: 0,
  label: "Starting soon",
};

export function parseDurationMs(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const clock = t.match(/^(\d+):(\d{1,2})$/);
  if (clock) {
    return (Number(clock[1]) * 60 + Number(clock[2])) * 1000;
  }
  const sec = t.match(/^(\d+)\s*s(ec(onds?)?)?$/);
  if (sec) return Number(sec[1]) * 1000;
  const min = t.match(/^(\d+)\s*m(in(utes?)?)?$/);
  if (min) return Number(min[1]) * 60_000;
  if (/^\d+$/.test(t)) return Number(t) * 60_000;
  return null;
}

export function timerElapsed(t: OverlayTimer, now: number) {
  const live = t.running && t.origin ? Math.max(0, now - t.origin) : 0;
  return t.accumulated + live;
}

export function timerDisplayMs(t: OverlayTimer, now: number) {
  const elapsed = timerElapsed(t, now);
  if (t.mode === "countup") return elapsed;
  return Math.max(0, t.durationMs - elapsed);
}

export function timerDone(t: OverlayTimer, now: number) {
  return t.mode === "countdown" && timerDisplayMs(t, now) <= 0 && (t.running || t.accumulated > 0);
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const TIMER_PRESETS = [
  { label: "3m", ms: 3 * 60_000 },
  { label: "5m", ms: 5 * 60_000 },
  { label: "10m", ms: 10 * 60_000 },
  { label: "15m", ms: 15 * 60_000 },
  { label: "30m", ms: 30 * 60_000 },
] as const;
