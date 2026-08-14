import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { OverlayStage } from "@/components/overlay-stage";
import { SceneBoard, TimerBoard } from "@/components/intermission";
import { AdBoard } from "@/components/ad-overlay";
import { WelcomeBoard } from "@/components/welcome-board";
import { SourceBoard } from "@/components/source-board";
import { StudyBoard } from "@/components/study-board";
import { StreamLayerBoard } from "@/components/overlay-toggles";
import { EmoteText } from "@/components/emote-overlay";
import { REDEEMS, useEvents, shownPrayer, STARTING_POINTS } from "@/lib/event-store";
import { EMOTES } from "@/lib/emotes";
import { allLayersOn } from "@/lib/overlay-prefs";
import {
  MOD_ACTOR,
  actorFromPlayer,
  useTournament,
  type BotActor,
} from "@/lib/tournament-store";

function useHydrate() {
  useEffect(() => {
    void useTournament.persist.rehydrate();
    void useEvents.persist.rehydrate();
    useTournament.getState().markHydrated();
    useEvents.getState().markHydrated();
  }, []);
}

export function EventsDesk() {
  useHydrate();
  const registered = useTournament((s) => s.registered);
  const chat = useTournament((s) => s.chat);
  const runChat = useTournament((s) => s.runChat);
  const nextUp = useTournament((s) => s.nextUp);
  const setNextUp = useTournament((s) => s.setNextUp);
  const clearNextUp = useTournament((s) => s.clearNextUp);

  const giveawayOpen = useEvents((s) => s.giveawayOpen);
  const prize = useEvents((s) => s.giveawayPrize);
  const entries = useEvents((s) => s.entries);
  const winner = useEvents((s) => s.winner);
  const verseRef = useEvents((s) => s.verseRef);
  const verseText = useEvents((s) => s.verseText);
  const prayers = useEvents((s) => s.prayers);
  const prayer = useEvents(shownPrayer);
  const balances = useEvents((s) => s.balances);
  const picks = useEvents((s) => s.picks);
  const picksLocked = useEvents((s) => s.picksLocked);

  const [actorKey, setActorKey] = useState("mod");
  const [draft, setDraft] = useState("!enter");
  const [prizeDraft, setPrizeDraft] = useState("Tekken 8 key");
  const [refDraft, setRefDraft] = useState(verseRef);
  const [verseDraft, setVerseDraft] = useState(verseText);
  const [nextA, setNextA] = useState(nextUp?.p1Id ?? registered[2]?.id ?? "");
  const [nextB, setNextB] = useState(nextUp?.p2Id ?? registered[3]?.id ?? "");
  const logRef = useRef<HTMLDivElement>(null);

  const actor: BotActor =
    actorKey === "mod"
      ? MOD_ACTOR
      : (() => {
          const p = registered.find((r) => r.id === actorKey);
          return p ? actorFromPlayer(p) : MOD_ACTOR;
        })();

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  function send(text = draft) {
    const reply = runChat(actor, text);
    setDraft("");
    if (reply) toast(reply.split(" · ")[0] ?? reply, { className: "toast-gothic" });
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
              <h1 className="title-word">Events</h1>
            </div>
          </header>

          <p className="off-lede">
            Tournament next-up and DQ, intermission scenes, timers, LOY / MSS
            ads and shoutouts, timed welcome !so devices, Lambs_Shadow chat
            frame, prayer emotes, Scripture study lessons, giveaways, verse and
            prayer, courtyard points. Chat commands match the live bot.
          </p>

          <nav className="off-nav">
            <Link to="/desk" className="np-mini">
              Stream desk
            </Link>
            <Link to="/offstream" className="np-mini">
              Offstream
            </Link>
            <Link to="/watch" className="np-mini">
              Watch (personal)
            </Link>
            <a href="/intermission" className="np-mini">
              Intermission OBS
            </a>
            <a href="/overlay?obs=1" className="np-mini">
              HUD overlay
            </a>
            <a href="/chat" className="np-mini">
              Chat OBS
            </a>
            <Link to="/dev" className="np-mini">
              Source
            </Link>
            <a href="/study" className="np-mini">
              Study OBS
            </a>
          </nav>

          <div className="off-grid ev-grid">
            <section className="panel ev-scenes" aria-label="Intermission scenes">
              <h2 className="panel-title">Intermission</h2>
              <p className="off-meta">
                Full-screen Starting / Prayer / Scripture / Ending boards.
                Click a card to take the scene and start its default timer.
                OBS: add Intermission as its own browser source.
              </p>
              <SceneBoard />
            </section>

            <section className="panel" aria-label="Overlay timer">
              <h2 className="panel-title">Timer</h2>
              <p className="off-meta">
                Countdown or count-up. Presets, custom 5:00 / 90s / 10, pause
                and resume. Pairs with any scene or sits alone (!brb 5).
              </p>
              <TimerBoard />
            </section>

            <section className="panel ev-scenes" aria-label="Ad media">
              <h2 className="panel-title">Ad media</h2>
              <AdBoard />
            </section>

            <section className="panel ev-scenes" aria-label="Welcome shoutouts">
              <h2 className="panel-title">Welcome !so</h2>
              <WelcomeBoard />
            </section>

            <section className="panel ev-scenes" aria-label="Developer source">
              <h2 className="panel-title">Source</h2>
              <SourceBoard />
            </section>

            <section className="panel" aria-label="Next up and DQ">
              <h2 className="panel-title">Up next</h2>
              <p className="off-meta">
                Posts the next-up card on stream. DQ / no-show awards the open
                set and clears that player from the card.
              </p>
              <div className="add-row">
                <select
                  className="field-input"
                  value={nextA}
                  onChange={(e) => setNextA(e.target.value)}
                >
                  {registered.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tag}
                      {p.flag ? ` (${p.flag})` : ""}
                    </option>
                  ))}
                </select>
                <select
                  className="field-input"
                  value={nextB}
                  onChange={(e) => setNextB(e.target.value)}
                >
                  {registered.map((p) => (
                    <option key={`b-${p.id}`} value={p.id}>
                      {p.tag}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => toast(setNextUp(nextA, nextB), { className: "toast-gothic" })}
                >
                  Post
                </button>
              </div>
              <div className="ghost-row">
                <button type="button" className="ghost-btn" onClick={() => send("!upnext")}>
                  !upnext
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    clearNextUp();
                    toast("Next-up cleared", { className: "toast-gothic" });
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => send(`!dq ${registered.find((r) => r.id === nextA)?.tag ?? ""}`)}
                >
                  DQ left
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => send(`!noshow ${registered.find((r) => r.id === nextB)?.tag ?? ""}`)}
                >
                  No-show right
                </button>
              </div>
            </section>

            <section className="panel" aria-label="Giveaway">
              <h2 className="panel-title">Giveaway</h2>
              <p className="off-meta">
                {giveawayOpen
                  ? `OPEN · ${entries.length} entered · ${prize}`
                  : winner
                    ? `Drawn: ${winner.display}`
                    : "Closed"}
              </p>
              <div className="add-row">
                <input
                  className="field-input"
                  value={prizeDraft}
                  onChange={(e) => setPrizeDraft(e.target.value)}
                  placeholder="Prize"
                />
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => send(`!giveaway ${prizeDraft}`)}
                >
                  Open
                </button>
              </div>
              <div className="ghost-row">
                <button type="button" className="ghost-btn" onClick={() => send("!enter")}>
                  !enter
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!draw")}>
                  !draw
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!claim")}>
                  !claim
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!redraw")}>
                  !redraw
                </button>
              </div>
            </section>

            <section className="panel" aria-label="Verse and prayer">
              <h2 className="panel-title">Verse & prayer</h2>
              <p className="off-report">
                {verseRef}: {verseText}
              </p>
              <div className="add-row">
                <input
                  className="field-input"
                  value={refDraft}
                  onChange={(e) => setRefDraft(e.target.value)}
                  placeholder="Reference"
                />
                <input
                  className="field-input"
                  value={verseDraft}
                  onChange={(e) => setVerseDraft(e.target.value)}
                  placeholder="Text"
                />
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => send(`!setverse ${refDraft} | ${verseDraft}`)}
                >
                  Set
                </button>
              </div>
              <p className="off-meta">
                Queue: {prayers.filter((p) => p.status === "pending").length} pending
                {prayer ? ` · showing ${prayer.display}` : ""}
              </p>
              <div className="ghost-row">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => send("!prayer Peace over tonight's bracket.")}
                >
                  Sample !prayer
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!approve")}>
                  !approve
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!verse")}>
                  !verse
                </button>
              </div>
            </section>

            <section className="panel ev-scenes" aria-label="Scripture study">
              <h2 className="panel-title">Scripture study</h2>
              <StudyBoard />
            </section>

            <section className="panel" aria-label="Points and redeems">
              <h2 className="panel-title">Courtyard points</h2>
              <p className="off-meta">
                Start at {STARTING_POINTS}. Chat tokens :pray: :hype: :joy:
                :fight: :love: :word: are free with a short cooldown. !emote
                spends points and posts the verse.
              </p>
              <ul className="emote-board">
                {EMOTES.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="emote-launch"
                      onClick={() => send(e.token)}
                    >
                      <img src={`/emotes/${e.id}.png`} alt="" />
                      <span>
                        <strong>
                          {e.token} · {e.momentLabel}
                        </strong>
                        <em>{e.ref}</em>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="off-results">
                {REDEEMS.map((r) => (
                  <li key={r.id}>
                    <strong>
                      !redeem {r.id} · {r.cost} pts
                    </strong>
                    <span>{r.blurb}</span>
                  </li>
                ))}
              </ul>
              <p className="off-meta">
                Picks {picksLocked ? "locked" : "open"} · {picks.length} in · sample
                balances:{" "}
                {Object.entries(balances)
                  .slice(0, 3)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(" · ") || "none yet"}
              </p>
              <div className="ghost-row">
                <button type="button" className="ghost-btn" onClick={() => send("!daily")}>
                  !daily
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!points")}>
                  !points
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!redeem panda")}>
                  !redeem panda
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!pick 1")}>
                  !pick 1
                </button>
              </div>
            </section>

            <section className="panel" aria-label="Stream overlay layers">
              <h2 className="panel-title">Stream overlay (mods)</h2>
              <p className="off-meta">
                This is what OBS shows. Viewers on Watch can hide layers for
                themselves only. Chat uses the Lambs_Shadow frame.
              </p>
              <StreamLayerBoard />
              <div className="ghost-row">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => send("!overlay hide chat")}
                >
                  Hide chat
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => send("!overlay show chat")}
                >
                  Show chat
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => send("!overlay hide giveaway")}
                >
                  Hide giveaway
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => send("!overlay show all")}
                >
                  Show all
                </button>
              </div>
            </section>

            <section className="panel ev-preview" aria-label="Overlay preview">
              <h2 className="panel-title">Overlay preview</h2>
              <div className="ev-preview-frame">
                <OverlayStage
                  localLayers={{ ...allLayersOn(), music: false }}
                  musicTrack={null}
                />
              </div>
            </section>

            <section className="panel off-bot" aria-label="Xiao_PandaMaiden console">
              <h2 className="panel-title">Xiao_PandaMaiden</h2>
              <p className="off-meta">
                Courtyard bot for #lambs_shadow — Sunday Bible & Tekken. Pray.
                Train. Trust.
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
                  placeholder="!enter"
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
                <button type="button" className="ghost-btn" onClick={() => send("!emotes")}>
                  !emotes
                </button>
                <button type="button" className="ghost-btn" onClick={() => send(":hype:")}>
                  :hype:
                </button>
                <button type="button" className="ghost-btn" onClick={() => send("!src")}>
                  !src
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
