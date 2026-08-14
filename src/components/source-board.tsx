import { useState } from "react";
import { toast } from "sonner";
import { useEvents } from "@/lib/event-store";
import { SOURCE_REPOS } from "@/lib/sources";

export function SourceBoard() {
  const notice = useEvents((s) => s.endingNotice);
  const armedAt = useEvents((s) => s.endingNoticeAt);
  const scene = useEvents((s) => s.scene);
  const setEndingNotice = useEvents((s) => s.setEndingNotice);
  const [line, setLine] = useState(notice.line);
  const [delay, setDelay] = useState(String(Math.round(notice.delayMs / 1000)));

  const wait =
    armedAt && armedAt > Date.now()
      ? Math.ceil((armedAt - Date.now()) / 1000)
      : null;

  return (
    <div className="source-board">
      <p className="off-meta">
        Command and timed-close system for developers. Links stay live whether
        the stream is on or off. Ending Soon posts the close line after its
        delay.
      </p>

      <ul className="source-repos">
        {SOURCE_REPOS.map((r) => (
          <li key={r.id}>
            <a className="source-repo" href={r.href} target="_blank" rel="noreferrer">
              <em>
                github.com/{r.org}
              </em>
              <strong>{r.name}</strong>
              <span>{r.role}</span>
              <code>{r.commands}</code>
            </a>
          </li>
        ))}
      </ul>

      <h3 className="off-sub">Ending Soon · timed chat</h3>
      <p className="off-meta">
        Ignites when the Ending Soon overlay is toggled on (scene card, !ending,
        or !scene ending).{" "}
        {scene === "ending"
          ? wait != null
            ? `Armed — posts in ${wait}s.`
            : "Scene is up."
          : "Waiting for Ending Soon."}
      </p>
      <div className="ghost-row">
        <button
          type="button"
          className="ghost-btn"
          data-active={notice.enabled}
          onClick={() => {
            setEndingNotice({ enabled: !notice.enabled });
            toast(notice.enabled ? "Ending notice off" : "Ending notice on", {
              className: "toast-gothic",
            });
          }}
        >
          {notice.enabled ? "Notice on" : "Notice off"}
        </button>
      </div>
      <textarea
        className="field-input welcome-line"
        value={line}
        onChange={(e) => setLine(e.target.value)}
        rows={3}
        aria-label="Ending Soon chat line"
      />
      <div className="add-row">
        <input
          className="field-input"
          type="number"
          min={0}
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          aria-label="Ending notice delay seconds"
        />
        <button
          type="button"
          className="add-btn"
          onClick={() => {
            setEndingNotice({
              line: line.trim() || notice.line,
              delayMs: Math.max(0, Number(delay) || 0) * 1000,
              enabled: true,
            });
            toast("Ending notice saved", { className: "toast-gothic" });
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
