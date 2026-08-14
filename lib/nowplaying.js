function normalizeTrack(body) {
  const title = String((body && body.title) || "").trim();
  if (!title) return null;
  const sourceRaw = String((body && body.source) || "suno").toLowerCase();
  const source = ["suno", "vlc", "ytmusic", "spotify"].includes(sourceRaw) ? sourceRaw : "suno";
  return {
    id: (body && body.id) || `np-${Date.now()}`,
    title,
    artist: String((body && body.artist) || "Unknown Artist").trim(),
    album: String((body && body.album) || "").trim(),
    source,
    cover: String((body && body.cover) || "/covers/maiden.svg").trim(),
    durationSec: Number(body && body.durationSec) || 180,
    at: new Date().toISOString(),
  };
}

module.exports = { normalizeTrack };
