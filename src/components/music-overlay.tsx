import { useEffect, useState } from "react";
import {
  DISPLAY_MS,
  ENTER_MS,
  EXIT_MS,
  SOURCE_LABEL,
  formatClock,
  type Track,
} from "@/lib/now-playing";

type Phase = "idle" | "in" | "hold" | "out";

export function MusicNowPlaying({
  track,
  holdMs = DISPLAY_MS,
  onHidden,
}: {
  track: Track | null;
  holdMs?: number;
  onHidden?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState<Track | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!track) {
      setPhase("idle");
      setShown(null);
      setProgress(0);
      return;
    }
    setShown(track);
    setProgress(0);
    setPhase("in");
    const enter = window.setTimeout(() => setPhase("hold"), ENTER_MS);
    return () => window.clearTimeout(enter);
  }, [track?.id]);

  useEffect(() => {
    if (phase !== "hold" || !shown) return;
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / holdMs);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const hide = window.setTimeout(() => setPhase("out"), holdMs);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hide);
    };
  }, [phase, shown, holdMs]);

  useEffect(() => {
    if (phase !== "out") return;
    const done = window.setTimeout(() => {
      setPhase("idle");
      setShown(null);
      setProgress(0);
      onHidden?.();
    }, EXIT_MS);
    return () => window.clearTimeout(done);
  }, [phase, onHidden]);

  if (!shown || phase === "idle") return null;

  const elapsed = shown.durationSec * 0.18 + progress * shown.durationSec * 0.22;

  return (
    <aside
      className={`np-card np-${phase}`}
      role="status"
      aria-live="polite"
      aria-label={`Now playing ${shown.title} by ${shown.artist}`}
    >
      <img src="/ornaments/bow.png" alt="" className="np-bow" />
      <img src="/ornaments/cross.png" alt="" className="np-cross" />
      <img src="/ornaments/panda.png?v=xiaoyu" alt="" className="np-panda" />

      <div className="np-art-wrap">
        <img src={shown.cover} alt="" className="np-art" />
      </div>

      <div className="np-meta">
        <p className="np-kicker">Now playing</p>
        <h2 className="np-title">{shown.title}</h2>
        <p className="np-artist">{shown.artist}</p>
        <div className="np-row">
          <span className={`np-source np-source-${shown.source}`}>
            {SOURCE_LABEL[shown.source]}
          </span>
          {shown.album ? <span className="np-album">{shown.album}</span> : null}
          <span className="np-time">
            {formatClock(elapsed)} / {formatClock(shown.durationSec)}
          </span>
        </div>
      </div>

      <div className="np-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
    </aside>
  );
}
