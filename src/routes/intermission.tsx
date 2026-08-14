import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IntermissionArt, OverlayClock } from "@/components/intermission";
import { listenOverlay } from "@/lib/overlay-bus";
import { useEvents } from "@/lib/event-store";

export const Route = createFileRoute("/intermission")({
  component: IntermissionPage,
  ssr: false,
});

function IntermissionPage() {
  useEffect(() => {
    void useEvents.persist.rehydrate();
    useEvents.getState().markHydrated();
  }, []);

  const scene = useEvents((s) => s.scene);
  const layers = useEvents((s) => s.layers);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const bump = () => setNow(Date.now());
    const stop = listenOverlay(bump);
    const id = window.setInterval(bump, 250);
    return () => {
      stop();
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="ov-obs ov-intermission">
      {scene && layers.scene !== false ? <IntermissionArt scene={scene} /> : null}
      {layers.timer !== false ? <OverlayClock now={now} /> : null}
    </div>
  );
}
