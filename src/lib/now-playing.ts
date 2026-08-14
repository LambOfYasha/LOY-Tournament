export type MusicSource = "suno" | "vlc" | "ytmusic" | "spotify";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  source: MusicSource;
  cover: string;
  durationSec: number;
};

export const SOURCE_LABEL: Record<MusicSource, string> = {
  suno: "Suno",
  vlc: "VLC",
  ytmusic: "YouTube Music",
  spotify: "Spotify",
};

export const DEMO_PLAYLIST: Track[] = [
  {
    id: "t1",
    title: "Velvet Reliquary",
    artist: "Xiao_PandaMaiden",
    album: "Chapel Hours",
    source: "suno",
    cover: "/covers/velvet.svg",
    durationSec: 214,
  },
  {
    id: "t2",
    title: "Maiden's Lullaby",
    artist: "Xiao_PandaMaiden",
    album: "Bow & Cross",
    source: "ytmusic",
    cover: "/covers/maiden.svg",
    durationSec: 198,
  },
  {
    id: "t3",
    title: "Crimson Hymn",
    artist: "LOY Choir",
    album: "Stained Glass",
    source: "vlc",
    cover: "/covers/hymn.svg",
    durationSec: 247,
  },
  {
    id: "t4",
    title: "Night Market Requiem",
    artist: "Abe & the Relics",
    album: "Silk & Vinyl",
    source: "spotify",
    cover: "/covers/requiem.svg",
    durationSec: 183,
  },
];

export const DISPLAY_MS = 9200;
export const EXIT_MS = 280;
export const ENTER_MS = 420;
export const GAP_MS = 1600;

export function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function trackFromSearch(params: URLSearchParams): Track | null {
  const title = params.get("title")?.trim();
  if (!title) return null;
  const sourceRaw = (params.get("source") || "suno").toLowerCase();
  const source = (["suno", "vlc", "ytmusic", "spotify"].includes(sourceRaw)
    ? sourceRaw
    : "suno") as MusicSource;
  return {
    id: `q-${title}`,
    title,
    artist: params.get("artist")?.trim() || "Unknown Artist",
    album: params.get("album")?.trim() || "",
    source,
    cover: params.get("cover")?.trim() || "/covers/maiden.svg",
    durationSec: Number(params.get("duration")) || 180,
  };
}
