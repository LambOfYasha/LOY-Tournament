import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmoteText } from "@/components/emote-overlay";
import {
  MOD_ACTOR,
  OFFSTREAM_LABEL,
  actorFromPlayer,
  useTournament,
  type BotActor,
  type RegisteredPlayer,
} from "@/lib/tournament-store";

function useHydrateStore() {
  useEffect(() => {
    void useTournament.persist.rehydrate();
    useTournament.getState().markHydrated();
  }, []);
}

function playerById(list: RegisteredPlayer[], id: string) {
  return list.find((p) => p.id === id);
}

export function OffstreamDesk() {
  useHydrateStore();
  const registered = useTournament((s) => s.registered);
  const offstream = useTournament((s) => s.offstream);
  const results = useTournament((s) => s.results);
  const chat = useTournament((s) => s.chat);
  const bestOf = useTournament((s) => s.bestOf);
  const checkIn = useTournament((s) => s.checkIn);
  const checkOut = useTournament((s) => s.checkOut);
  const runChat = useTournament((s) => s.runChat);
  const addRegistered = useTournament((s) => s.addRegistered);

  const [actorKey, setActorKey] = useState("mod");
  const [draft, setDraft] = useState("!report 2-1");
  const [tag, setTag] = useState("");
  const [character, setCharacter] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const actor: BotActor =
    actorKey === "mod"
      ? MOD_ACTOR
      : (() => {
          const p = registered.find((r) => r.id === actorKey);
          return p ? actorFromPlayer(p) : MOD_ACTOR;
        })();

  const p1 = offstream ? playerById(registered, offstream.p1Id) : undefined;
  const p2 = offstream ? playerById(registered, offstream.p2Id) : undefined;
  const reporter = offstream?.report
    ? playerById(registered, offstream.report.byId)
    : undefined;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  function send(text = draft) {
    const reply = runChat(actor, text);
    setDraft("");
    if (reply) toast(reply.split("\n")[0] ?? reply, { className: "toast-gothic" });
  }

  function signup() {
    const t = tag.trim();
    const c = character.trim();
    if (!t || !c) {
      toast("Tag and character required", { className: "toast-gothic" });
      return;
    }
    addRegistered({ tag: t, character: c, platform: "PC", region: "NA" });
    setTag("");
    setCharacter("");
    toast(`${t} signed up — they still need to !checkin`, { className: "toast-gothic" });
  }

  return (
    <div className="stage">
      <div className="stage-inner">
        <div className="ornate-shell off-shell">
          <img src="/ornaments/bow.png" alt="" className="ornament bow-tl" />
          <img src="/ornaments/bow.png" alt="" className="ornament bow-tr" />
          <img src="/ornaments/panda.png?v=xiaoyu" alt="Xiao PandaMaiden" className="ornament panda" />
          <img src="/ornaments/cross.png" alt="" className="ornament cross-br" />

          <header className="title-wrap">
            <div className="title-plaque">
              <h1 className="title-word">Offstream Desk</h1>
            </div>
          </header>

          <p className="off-lede">
            Sign up → check in → play the set off-stream → one player reports the
            final score in chat → the other confirms. Locked results push to the overlay.
          </p>

          <nav className="off-nav">
            <Link to="/events" className="np-mini">
              Events
            </Link>
            <Link to="/desk" className="np-mini">
              Stream desk
            </Link>
            <Link to="/" className="np-mini">
              Now Playing
            </Link>
          </nav>

          <div className="off-grid">
            <section className="panel" aria-label="Signups and check-in">
              <h2 className="panel-title">Signups</h2>
              <ul className="off-roster">
                {registered.map((p) => (
                  <li key={p.id} className="off-person">
                    <div>
                      <strong>{p.tag}</strong>
                      <span>
                        {p.character} · {p.checkedIn ? "checked in" : "signed up"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={p.checkedIn ? "chip" : "chip chip-live"}
                      onClick={() => {
                        if (p.checkedIn) {
                          checkOut(p.id);
                          toast(`${p.tag} left check-in`, { className: "toast-gothic" });
                        } else {
                          toast(checkIn(p.id), { className: "toast-gothic" });
                        }
                      }}
                    >
                      {p.checkedIn ? "Out" : "Check in"}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="add-row">
                <input
                  className="field-input"
                  placeholder="Tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signup()}
                />
                <input
                  className="field-input"
                  placeholder="Character"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signup()}
                />
                <button type="button" className="add-btn" onClick={signup}>
                  Sign up
                </button>
              </div>
            </section>

            <section className="panel" aria-label="Open offstream match">
              <h2 className="panel-title">Open match</h2>
              {offstream && p1 && p2 ? (
                <div className="off-match">
                  <p className="off-vs">
                    {p1.tag} <em>vs</em> {p2.tag}
                  </p>
                  <p className="off-meta">
                    Bo{offstream.bestOf} · {OFFSTREAM_LABEL[offstream.status]}
                  </p>
                  {offstream.report ? (
                    <p className="off-report">
                      {reporter?.tag} reported {offstream.report.reporterScore}–
                      {offstream.report.opponentScore}. Waiting on the opponent.
                    </p>
                  ) : (
                    <p className="off-report">
                      Play the set. Then a player types !report 2-1 (their games first).
                    </p>
                  )}
                  <div className="ghost-row">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setActorKey(p1.id);
                        setDraft("!report 2-1");
                      }}
                    >
                      Report as {p1.tag}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setActorKey(p2.id);
                        setDraft("!confirm");
                      }}
                    >
                      Confirm as {p2.tag}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setActorKey("mod");
                        send(`!dq ${p1.tag}`);
                      }}
                    >
                      DQ {p1.tag}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setActorKey("mod");
                        send(`!noshow ${p2.tag}`);
                      }}
                    >
                      No-show {p2.tag}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="off-report">
                  No open set. After both players check in, a mod runs !offstream @p1 @p2.
                  Default series is Bo{bestOf}.
                </p>
              )}

              <h2 className="panel-title off-sub">Locked results</h2>
              {results.length === 0 ? (
                <p className="off-report">No confirmed offstream results yet.</p>
              ) : (
                <ul className="off-results">
                  {results.map((r) => {
                    const a = playerById(registered, r.p1Id);
                    const b = playerById(registered, r.p2Id);
                    const w = r.result ? playerById(registered, r.result.winnerId) : undefined;
                    return (
                      <li key={r.id}>
                        <strong>
                          {a?.tag} {r.result?.p1Score}–{r.result?.p2Score} {b?.tag}
                        </strong>
                        <span>Winner {w?.tag}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="panel off-bot" aria-label="Xiao_PandaMaiden console">
              <h2 className="panel-title">Xiao_PandaMaiden</h2>
              <p className="off-meta">
                Courtyard bot for #lambs_shadow — Sunday Bible & Tekken. Talk as
                the streamer or a player.
              </p>
              <div className="off-log" ref={logRef} role="log" aria-live="polite">
                {chat.map((c) => (
                  <p key={c.id} className={`off-line off-line-${c.role}`}>
                    <b>{c.user}</b> <EmoteText text={c.text} />
                  </p>
                ))}
              </div>
              <label className="field">
                <span className="field-label">Chatting as</span>
                <select
                  className="field-input"
                  value={actorKey}
                  onChange={(e) => setActorKey(e.target.value)}
                >
                  <option value="mod">Streamer · Xiao_PandaMaiden</option>
                  {registered.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tag}
                      {p.checkedIn ? " · checked in" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="off-compose">
                <input
                  className="field-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="!report 2-1"
                  aria-label="Bot command"
                />
                <button type="button" className="rose-bar off-send" onClick={() => send()}>
                  Send
                </button>
              </div>
              <div className="ghost-row">
                <button type="button" className="ghost-btn" onClick={() => send("!help")}>
                  !help
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!about")}>
                  !about
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!checkin")}>
                  !checkin
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setActorKey("mod");
                    setDraft("!offstream GamerTag1 ProFighter");
                  }}
                >
                  !offstream
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
