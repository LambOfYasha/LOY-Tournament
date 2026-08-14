import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useEvents } from "@/lib/event-store";
import { useTournament } from "@/lib/tournament-store";
import {
  WELCOME_KIND_LABEL,
  WELCOME_KINDS,
  secondsLabel,
  type WelcomeKind,
  type WelcomePlay,
} from "@/lib/welcomes";

export function useWelcomeClock() {
  useEffect(() => {
    const tick = () => {
      const ev = useEvents.getState();
      const tourney = useTournament.getState();
      for (const line of ev.flushWelcomes(Date.now())) tourney.appendBotChat(line);
      for (const line of ev.flushEndingNotice(Date.now())) tourney.appendBotChat(line);
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, []);
}

export function WelcomeToast({ play }: { play: WelcomePlay }) {
  const tv = play.twitch.replace(/^https?:\/\//, "");
  const site = play.site.replace(/^https?:\/\//, "");
  return (
    <article className={`ov-welcome ov-welcome-${play.kind}`} aria-label={`${play.kind} welcome`}>
      <p className="ov-kicker">{WELCOME_KIND_LABEL[play.kind]}</p>
      <strong>@{play.display}</strong>
      <p>{tv}</p>
      {site && site !== tv ? <p>{site}</p> : null}
    </article>
  );
}

export function WelcomeBoard() {
  useWelcomeClock();
  const armed = useEvents((s) => s.welcomesArmed);
  const devices = useEvents((s) => s.welcomeDevices);
  const queue = useEvents((s) => s.welcomeQueue);
  const setArmed = useEvents((s) => s.setWelcomesArmed);
  const upsert = useEvents((s) => s.upsertWelcome);
  const queueWelcome = useEvents((s) => s.queueWelcome);
  const cancelWelcome = useEvents((s) => s.cancelWelcome);
  const [guest, setGuest] = useState("azuluna");
  const [kind, setKind] = useState<WelcomeKind>("first");
  const [delay, setDelay] = useState("3");
  const [editId, setEditId] = useState<string | null>(null);
  const [line, setLine] = useState("");

  const queued = queue.filter((q) => q.status === "queued");
  const editing = devices.find((d) => d.id === editId);

  function fire(k: WelcomeKind, wait?: number) {
    const msg = queueWelcome({
      kind: k,
      login: guest,
      display: guest,
      delayMs: wait,
    });
    toast(msg, { className: "toast-gothic" });
  }

  return (
    <div className="welcome-board">
      <p className="off-meta">
        Twitch-style welcome !so devices. Work offline (queue and edit) or
        online (auto first-chat). Chat always names twitch.tv plus a saved site.
      </p>
      <div className="ghost-row">
        <button
          type="button"
          className="ghost-btn"
          data-active={armed}
          onClick={() => {
            setArmed(!armed);
            toast(armed ? "Welcomes offline" : "Welcomes online", { className: "toast-gothic" });
          }}
        >
          {armed ? "Online · auto first chat" : "Offline · manual queue"}
        </button>
      </div>

      <ul className="welcome-devices">
        {devices.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="welcome-device"
              data-on={d.enabled}
              onClick={() => upsert({ id: d.id, enabled: !d.enabled })}
            >
              <em>{WELCOME_KIND_LABEL[d.kind]}</em>
              <strong>{d.name}</strong>
              <span>
                {secondsLabel(d.delayMs)}
                {d.overlay ? " · overlay" : ""}
                {d.emote ? ` · ${d.emote}` : ""}
              </span>
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setEditId(d.id);
                setLine(d.chatLine);
              }}
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="welcome-edit">
          <p className="off-meta">
            Editing {editing.name}. Tokens: {"{user}"} {"{twitch}"} {"{site}"}
          </p>
          <textarea
            className="field-input welcome-line"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            rows={3}
            aria-label="Welcome chat line"
          />
          <div className="add-row">
            <input
              className="field-input"
              type="number"
              min={0}
              value={Math.round(editing.delayMs / 1000)}
              onChange={(e) =>
                upsert({ id: editing.id, delayMs: Math.max(0, Number(e.target.value) || 0) * 1000 })
              }
              aria-label="Delay seconds"
            />
            <button
              type="button"
              className="ghost-btn"
              data-active={editing.overlay}
              onClick={() => upsert({ id: editing.id, overlay: !editing.overlay })}
            >
              {editing.overlay ? "Overlay on" : "Overlay off"}
            </button>
            <button
              type="button"
              className="add-btn"
              onClick={() => {
                upsert({ id: editing.id, chatLine: line });
                toast("Device saved", { className: "toast-gothic" });
              }}
            >
              Save line
            </button>
          </div>
        </div>
      ) : null}

      <h3 className="off-sub">Fire / queue</h3>
      <div className="add-row">
        <input
          className="field-input"
          value={guest}
          onChange={(e) => setGuest(e.target.value)}
          placeholder="@user"
          aria-label="Welcome username"
        />
        <select
          className="field-input"
          value={kind}
          onChange={(e) => setKind(e.target.value as WelcomeKind)}
          aria-label="Welcome kind"
        >
          {WELCOME_KINDS.map((k) => (
            <option key={k} value={k}>
              {WELCOME_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <input
          className="field-input"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          placeholder="sec"
          aria-label="Delay seconds"
        />
        <button type="button" className="add-btn" onClick={() => fire(kind, Number(delay) * 1000)}>
          Queue
        </button>
        <button type="button" className="ghost-btn" onClick={() => fire(kind, 0)}>
          Fire now
        </button>
      </div>

      {queued.length ? (
        <ul className="off-results">
          {queued.map((q) => (
            <li key={q.id}>
              <strong>
                @{q.display} · {WELCOME_KIND_LABEL[q.kind]}
              </strong>
              <span>
                {q.fireAt <= Date.now() ? "firing" : `in ${secondsLabel(q.fireAt - Date.now())}`}
              </span>
              <button type="button" className="ghost-btn" onClick={() => cancelWelcome(q.id)}>
                Cancel
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="off-meta">No queued welcomes. Offline queue still fires in this desk.</p>
      )}
    </div>
  );
}
