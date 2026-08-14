import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MusicNowPlaying } from "@/components/music-overlay";
import {
  DEMO_PLAYLIST,
  DISPLAY_MS,
  GAP_MS,
  SOURCE_LABEL,
  type MusicSource,
  type Track,
} from "@/lib/now-playing";

const SOURCES: MusicSource[] = ["suno", "ytmusic", "vlc", "spotify"];

export function MusicStudio() {
  const [index, setIndex] = useState(0);
  const [track, setTrack] = useState<Track | null>(DEMO_PLAYLIST[0] ?? null);
  const [autoplay, setAutoplay] = useState(true);
  const [obsMode, setObsMode] = useState(false);

  const playAt = useCallback((i: number, source?: MusicSource) => {
    const base = DEMO_PLAYLIST[(i + DEMO_PLAYLIST.length) % DEMO_PLAYLIST.length];
    if (!base) return;
    setIndex((i + DEMO_PLAYLIST.length) % DEMO_PLAYLIST.length);
    setTrack(source ? { ...base, source } : base);
  }, []);

  const onHidden = useCallback(() => {
    if (!autoplay) {
      setTrack(null);
      return;
    }
    window.setTimeout(() => {
      setIndex((i) => {
        const next = (i + 1) % DEMO_PLAYLIST.length;
        const base = DEMO_PLAYLIST[next];
        if (base) setTrack(base);
        return next;
      });
    }, GAP_MS);
  }, [autoplay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "ArrowRight") {
        playAt(index + 1);
      }
      if (e.key === " ") {
        e.preventDefault();
        setAutoplay((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, playAt]);

  return (
    <div className={obsMode ? "np-obs" : "np-studio"}>
      {!obsMode ? (
        <>
          <div className="np-stage-bg" aria-hidden="true">
            <span className="np-stage-grain" />
            <p className="np-stage-hint">Stream canvas</p>
          </div>

          <header className="np-desk">
            <div>
              <p className="np-desk-kicker">Xiao_PandaMaiden · TTV overlay</p>
              <h1 className="np-desk-title">Now Playing</h1>
            </div>
            <div className="np-desk-actions">
              <Link to="/events" className="np-mini">
                Events
              </Link>
              <Link to="/offstream" className="np-mini">
                Offstream
              </Link>
              <Link to="/desk" className="np-mini">
                Tournament desk
              </Link>
              <a href="/overlay?demo=1" className="np-mini">
                OBS overlay
              </a>
            </div>
          </header>

          <section className="np-controls" aria-label="Overlay controls">
            <div className="np-track-list">
              {DEMO_PLAYLIST.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  className={i === index && track ? "np-pick is-live" : "np-pick"}
                  onClick={() => playAt(i)}
                >
                  <img src={t.cover} alt="" />
                  <span>
                    <strong>{t.title}</strong>
                    <em>
                      {t.artist} · {SOURCE_LABEL[t.source]}
                    </em>
                  </span>
                </button>
              ))}
            </div>

            <div className="np-toggles">
              <label className="np-toggle">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                />
                Auto next song
              </label>
              <label className="np-toggle">
                <input
                  type="checkbox"
                  checked={obsMode}
                  onChange={(e) => setObsMode(e.target.checked)}
                />
                Preview as OBS (transparent)
              </label>
              <div className="np-source-row">
                {SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="np-source-chip"
                    onClick={() => playAt(index, s)}
                  >
                    {SOURCE_LABEL[s]}
                  </button>
                ))}
              </div>
              <p className="np-help">
                Popup holds {Math.round(DISPLAY_MS / 1000)}s, then fades until the next track.
                Press N to skip.
              </p>
            </div>
          </section>
        </>
      ) : (
        <button type="button" className="np-exit-obs" onClick={() => setObsMode(false)}>
          Exit OBS preview
        </button>
      )}

      <MusicNowPlaying track={track} onHidden={onHidden} />
    </div>
  );
}
