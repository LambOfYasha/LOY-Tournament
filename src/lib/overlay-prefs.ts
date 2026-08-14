export const LAYER_IDS = [
  "scene",
  "timer",
  "ad",
  "chat",
  "score",
  "next",
  "giveaway",
  "verse",
  "prayer",
  "study",
  "music",
  "redeem",
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export type LayerMap = Record<LayerId, boolean>;

export const LAYER_LABEL: Record<LayerId, string> = {
  scene: "Intermission",
  timer: "Timer",
  ad: "Ad / SO",
  chat: "Chat",
  score: "Scorebug",
  next: "Up next",
  giveaway: "Giveaway",
  verse: "Verse",
  prayer: "Prayer",
  study: "Study",
  music: "Now playing",
  redeem: "Emotes",
};

export function allLayersOn(): LayerMap {
  return {
    scene: true,
    timer: true,
    ad: true,
    chat: true,
    score: true,
    next: true,
    giveaway: true,
    verse: true,
    prayer: true,
    study: true,
    music: true,
    redeem: true,
  };
}

const LOCAL_KEY = "panda-local-layers-v1";

export function loadLocalLayers(): LayerMap {
  if (typeof window === "undefined") return allLayersOn();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return allLayersOn();
    const parsed = JSON.parse(raw) as Partial<LayerMap>;
    return { ...allLayersOn(), ...parsed };
  } catch {
    return allLayersOn();
  }
}

export function saveLocalLayers(layers: LayerMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(layers));
}

export function layerVisible(stream: LayerMap, local: LayerMap, id: LayerId) {
  return stream[id] !== false && local[id] !== false;
}
