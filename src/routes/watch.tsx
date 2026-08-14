import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { OverlayStage } from "@/components/overlay-stage";
import { LocalLayerDock } from "@/components/overlay-toggles";
import { DEMO_PLAYLIST, GAP_MS, type Track } from "@/lib/now-playing";
import { loadLocalLayers, saveLocalLayers, type LayerMap } from "@/lib/overlay-prefs";

export const Route = createFileRoute("/watch")({
  component: WatchPage,
  ssr: false,
});

function WatchPage() {
  const [local, setLocal] = useState<LayerMap>(() => loadLocalLayers());
  const [track, setTrack] = useState<Track | null>(DEMO_PLAYLIST[0] ?? null);
  const [index, setIndex] = useState(0);

  const onHidden = useCallback(() => {
    window.setTimeout(() => {
      setIndex((i) => {
        const next = (i + 1) % DEMO_PLAYLIST.length;
        const base = DEMO_PLAYLIST[next];
        if (base) setTrack(base);
        return next;
      });
    }, GAP_MS);
  }, []);

  function change(next: LayerMap) {
    setLocal(next);
    saveLocalLayers(next);
  }

  return (
    <div className="watch-page">
      <header className="watch-bar">
        <div>
          <p className="np-desk-kicker">Xiao_PandaMaiden · #lambs_shadow</p>
          <h1 className="watch-title">Your overlay</h1>
        </div>
        <nav className="np-desk-actions">
          <Link to="/events" className="np-mini">
            Event desk
          </Link>
          <Link to="/offstream" className="np-mini">
            Offstream
          </Link>
          <a href="/overlay?obs=1" className="np-mini">
            OBS
          </a>
          <a href="/chat" className="np-mini">
            Chat
          </a>
        </nav>
      </header>
      <p className="watch-note">
        Toggles on the left are yours alone. Mods still control what goes out on
        the stream overlay.
      </p>
      <div className="watch-layout">
        <LocalLayerDock layers={local} onChange={change} />
        <div className="watch-canvas">
          <OverlayStage localLayers={local} musicTrack={track} onMusicHidden={onHidden} />
        </div>
      </div>
    </div>
  );
}
