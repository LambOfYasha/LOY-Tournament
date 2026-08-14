import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OverlayStage } from "@/components/overlay-stage";
import { allLayersOn } from "@/lib/overlay-prefs";
import {
  DEMO_PLAYLIST,
  GAP_MS,
  trackFromSearch,
  type Track,
} from "@/lib/now-playing";

export const Route = createFileRoute("/overlay")({
  component: OverlayPage,
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    title: typeof search.title === "string" ? search.title : undefined,
    artist: typeof search.artist === "string" ? search.artist : undefined,
    album: typeof search.album === "string" ? search.album : undefined,
    source: typeof search.source === "string" ? search.source : undefined,
    cover: typeof search.cover === "string" ? search.cover : undefined,
    duration: typeof search.duration === "string" ? search.duration : undefined,
    demo: search.demo === "1" || search.demo === true || search.demo === "true",
    obs: search.obs === "1" || search.obs === true || search.obs === "true",
  }),
});

function OverlayPage() {
  const search = Route.useSearch();
  const fromQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (search.title) params.set("title", search.title);
    if (search.artist) params.set("artist", search.artist);
    if (search.album) params.set("album", search.album);
    if (search.source) params.set("source", search.source);
    if (search.cover) params.set("cover", search.cover);
    if (search.duration) params.set("duration", search.duration);
    return trackFromSearch(params);
  }, [search]);

  const [index, setIndex] = useState(0);
  const [track, setTrack] = useState<Track | null>(fromQuery ?? DEMO_PLAYLIST[0] ?? null);

  useEffect(() => {
    if (fromQuery) setTrack(fromQuery);
  }, [fromQuery]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; track?: Track };
      if (data?.type === "now-playing" && data.track?.title) {
        setTrack({
          id: data.track.id || `ext-${Date.now()}`,
          title: data.track.title,
          artist: data.track.artist || "Unknown Artist",
          album: data.track.album || "",
          source: data.track.source || "suno",
          cover: data.track.cover || "/covers/maiden.svg",
          durationSec: data.track.durationSec || 180,
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const onHidden = useCallback(() => {
    if (fromQuery && !search.demo) {
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
  }, [fromQuery, search.demo]);

  return (
    <div className="np-obs ov-obs">
      <OverlayStage localLayers={allLayersOn()} musicTrack={track} onMusicHidden={onHidden} />
    </div>
  );
}
