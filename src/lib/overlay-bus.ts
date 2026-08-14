export const OVERLAY_CHANNEL = "panda-maiden-overlay";

export type OverlayMsg = {
  type: "state" | "popup" | "layers";
  t: number;
};

export function broadcastOverlay(type: OverlayMsg["type"] = "state") {
  if (typeof window === "undefined") return;
  const msg: OverlayMsg = { type, t: Date.now() };
  try {
    const ch = new BroadcastChannel(OVERLAY_CHANNEL);
    ch.postMessage(msg);
    ch.close();
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("panda-overlay", { detail: msg }));
}

export function listenOverlay(onMsg: (msg: OverlayMsg) => void) {
  if (typeof window === "undefined") return () => {};
  let ch: BroadcastChannel | null = null;
  const onBc = (e: MessageEvent<OverlayMsg>) => {
    if (e.data?.type) onMsg(e.data);
  };
  try {
    ch = new BroadcastChannel(OVERLAY_CHANNEL);
    ch.addEventListener("message", onBc);
  } catch {
    ch = null;
  }
  const onWin = (e: Event) => {
    const detail = (e as CustomEvent<OverlayMsg>).detail;
    if (detail?.type) onMsg(detail);
  };
  window.addEventListener("panda-overlay", onWin);
  return () => {
    ch?.removeEventListener("message", onBc);
    ch?.close();
    window.removeEventListener("panda-overlay", onWin);
  };
}
