import { Eye, EyeOff } from "lucide-react";
import {
  LAYER_IDS,
  LAYER_LABEL,
  type LayerId,
  type LayerMap,
} from "@/lib/overlay-prefs";
import { useEvents } from "@/lib/event-store";

export function LocalLayerDock({
  layers,
  onChange,
}: {
  layers: LayerMap;
  onChange: (next: LayerMap) => void;
}) {
  return (
    <aside className="ov-dock" aria-label="Your overlay view">
      <p className="ov-dock-kicker">Your view only</p>
      <p className="ov-dock-note">Hiding a layer here does not change the stream.</p>
      <ul>
        {LAYER_IDS.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="ov-dock-btn"
              data-on={layers[id]}
              onClick={() => onChange({ ...layers, [id]: !layers[id] })}
            >
              {layers[id] ? <Eye size={14} /> : <EyeOff size={14} />}
              {LAYER_LABEL[id]}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function StreamLayerBoard() {
  const layers = useEvents((s) => s.layers);
  const setLayer = useEvents((s) => s.setLayer);
  const setAll = useEvents((s) => s.setAllLayers);

  return (
    <div className="ov-stream-board">
      <div className="ghost-row">
        <button type="button" className="ghost-btn" onClick={() => setAll(true)}>
          Show all
        </button>
        <button type="button" className="ghost-btn" onClick={() => setAll(false)}>
          Hide all
        </button>
      </div>
      <ul className="ov-stream-list">
        {LAYER_IDS.map((id: LayerId) => (
          <li key={id}>
            <button
              type="button"
              className={layers[id] ? "chip chip-live" : "chip"}
              onClick={() => setLayer(id, !layers[id])}
            >
              {layers[id] ? "On" : "Off"} · {LAYER_LABEL[id]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
