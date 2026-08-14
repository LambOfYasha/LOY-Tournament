import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEvents } from "@/lib/event-store";
import {
  SCENES,
  TIMER_PRESETS,
  formatClock,
  parseDurationMs,
  timerDisplayMs,
  timerDone,
  type SceneId,
} from "@/lib/scenes";

export function IntermissionArt({ scene }: { scene: SceneId }) {
  const def = SCENES.find((s) => s.id === scene);
  if (!def) return null;
  return (
    <figure className="ov-scene" aria-label={def.name}>
      <img src={def.art} alt={def.name} />
    </figure>
  );
}

export function OverlayClock({ now }: { now: number }) {
  const timer = useEvents((s) => s.timer);
  const done = timerDone(timer, now);
  const ms = timerDisplayMs(timer, now);
  if (!timer.running && timer.accumulated === 0 && !timer.origin) return null;
  return (
    <article className={`ov-clock${done ? " is-done" : ""}`} aria-label="Stream timer">
      <p className="ov-kicker">{timer.label || "Timer"}</p>
      <strong>{done && timer.mode === "countdown" ? "NOW" : formatClock(ms)}</strong>
      <span>{timer.mode === "countup" ? "elapsed" : done ? "time" : "remaining"}</span>
    </article>
  );
}

export function SceneBoard() {
  const scene = useEvents((s) => s.scene);
  const setScene = useEvents((s) => s.setScene);
  const startTimer = useEvents((s) => s.startTimer);

  function pick(id: SceneId) {
    const def = SCENES.find((s) => s.id === id);
    setScene(id);
    if (def) {
      startTimer({
        mode: "countdown",
        durationMs: def.defaultMin * 60_000,
        label: def.defaultLabel,
      });
      toast(`${def.name} · ${def.defaultMin}m`, { className: "toast-gothic" });
    }
  }

  return (
    <div className="scene-board">
      <ul className="scene-thumbs">
        {SCENES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="scene-thumb"
              data-on={scene === s.id}
              onClick={() => pick(s.id)}
            >
              <img src={s.art} alt="" />
              <span>{s.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="ghost-btn"
        onClick={() => {
          setScene(null);
          toast("Intermission cleared", { className: "toast-gothic" });
        }}
      >
        Back to live
      </button>
    </div>
  );
}

export function TimerBoard() {
  const timer = useEvents((s) => s.timer);
  const startTimer = useEvents((s) => s.startTimer);
  const pauseTimer = useEvents((s) => s.pauseTimer);
  const resumeTimer = useEvents((s) => s.resumeTimer);
  const clearTimer = useEvents((s) => s.clearTimer);
  const [custom, setCustom] = useState("10:00");
  const [label, setLabel] = useState(timer.label);
  const [mode, setMode] = useState(timer.mode);

  const now = useMemo(() => Date.now(), [timer.running, timer.origin, timer.accumulated]);
  const live = timerDisplayMs(timer, Date.now() || now);

  function apply(ms: number) {
    startTimer({ mode, durationMs: ms, label: label.trim() || "Intermission" });
    toast(`${mode === "countup" ? "Count-up" : formatClock(ms)} · ${label}`, {
      className: "toast-gothic",
    });
  }

  return (
    <div className="timer-board">
      <p className="off-meta">
        {timer.running ? "Running" : timer.accumulated ? "Paused" : "Idle"} ·{" "}
        {formatClock(live)} · {timer.label}
      </p>
      <div className="add-row">
        <input
          className="field-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          aria-label="Timer label"
        />
        <input
          className="field-input"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="10:00 or 5m"
          aria-label="Timer duration"
        />
        <button
          type="button"
          className="add-btn"
          onClick={() => {
            const ms = parseDurationMs(custom);
            if (!ms && mode === "countdown") {
              toast("Use 10, 5:00, or 90s", { className: "toast-gothic" });
              return;
            }
            apply(ms ?? 0);
          }}
        >
          Start
        </button>
      </div>
      <div className="ghost-row">
        {TIMER_PRESETS.map((p) => (
          <button key={p.label} type="button" className="ghost-btn" onClick={() => apply(p.ms)}>
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="ghost-btn"
          data-active={mode === "countdown"}
          onClick={() => setMode("countdown")}
        >
          Down
        </button>
        <button
          type="button"
          className="ghost-btn"
          data-active={mode === "countup"}
          onClick={() => setMode("countup")}
        >
          Up
        </button>
        {timer.running ? (
          <button type="button" className="ghost-btn" onClick={pauseTimer}>
            Pause
          </button>
        ) : (
          <button type="button" className="ghost-btn" onClick={resumeTimer}>
            Resume
          </button>
        )}
        <button type="button" className="ghost-btn" onClick={clearTimer}>
          Clear
        </button>
      </div>
    </div>
  );
}
