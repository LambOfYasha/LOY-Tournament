import { AdBreak } from "@/components/ad-overlay";
import { ChatOverlay } from "@/components/chat-overlay";
import { EmoteBurst } from "@/components/emote-overlay";
import { IntermissionArt, OverlayClock } from "@/components/intermission";
import { WelcomeToast, useWelcomeClock } from "@/components/welcome-board";
import { LessonCard } from "@/components/lesson-overlay";
import { MusicNowPlaying } from "@/components/music-overlay";
import { listenOverlay } from "@/lib/overlay-bus";
import { layerVisible, type LayerMap } from "@/lib/overlay-prefs";
import { REDEEMS, shownPrayer, useEvents } from "@/lib/event-store";
import { EMOTE_INTRO, EMOTE_INTRO_MS, EMOTES } from "@/lib/emotes";
import { DEMO_PLAYLIST, type Track } from "@/lib/now-playing";
import { BOT_DISPLAY } from "@/lib/bot-commands";
import { useTournament } from "@/lib/tournament-store";
import { useEffect, useMemo, useState } from "react";

function useHydrateAll() {
  useEffect(() => {
    void useTournament.persist.rehydrate();
    void useEvents.persist.rehydrate();
    useTournament.getState().markHydrated();
    useEvents.getState().markHydrated();
  }, []);
}

function useEmoteIntro() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("xiao-emote-intro")) return;
    const t = window.setTimeout(() => {
      if (window.sessionStorage.getItem("xiao-emote-intro")) return;
      window.sessionStorage.setItem("xiao-emote-intro", "1");
      useTournament.getState().appendBotChat(EMOTE_INTRO);
      useEvents.getState().playEmote("pray", BOT_DISPLAY, { free: true });
    }, EMOTE_INTRO_MS);
    return () => window.clearTimeout(t);
  }, []);
}

function useOverlayTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const stop = listenOverlay(bump);
    const onStore = () => bump();
    window.addEventListener("storage", onStore);
    const id = window.setInterval(bump, 1000);
    return () => {
      stop();
      window.removeEventListener("storage", onStore);
      window.clearInterval(id);
    };
  }, []);
  return tick;
}

export function OverlayStage({
  localLayers,
  musicTrack,
  onMusicHidden,
}: {
  localLayers: LayerMap;
  musicTrack: Track | null;
  onMusicHidden?: () => void;
}) {
  useHydrateAll();
  useEmoteIntro();
  useWelcomeClock();
  const tick = useOverlayTick();

  const stream = useEvents((s) => s.layers);
  const show = (id: Parameters<typeof layerVisible>[2]) =>
    layerVisible(stream, localLayers, id);

  const scene = useEvents((s) => s.scene);
  const ad = useEvents((s) => s.ad);
  const intermission = Boolean(scene && show("scene"));
  const adLive = Boolean(ad && show("ad") && ad.until > Date.now());
  const chatOn = show("chat") && !adLive;
  const hud = !intermission && !adLive;

  const lastPushed = useTournament((s) => s.lastPushed);
  const liveP1 = useTournament((s) => s.player1);
  const liveP2 = useTournament((s) => s.player2);
  const round = useTournament((s) => s.round);
  const bestOf = useTournament((s) => s.bestOf);
  const status = useTournament((s) => s.status);
  const nextUp = useTournament((s) => s.nextUp);
  const registered = useTournament((s) => s.registered);

  const giveawayOpen = useEvents((s) => s.giveawayOpen);
  const prize = useEvents((s) => s.giveawayPrize);
  const entries = useEvents((s) => s.entries);
  const winner = useEvents((s) => s.winner);
  const claimUntil = useEvents((s) => s.claimUntil);
  const verseRef = useEvents((s) => s.verseRef);
  const verseText = useEvents((s) => s.verseText);
  const popup = useEvents((s) => s.popup);
  const emote = useEvents((s) => s.emote);
  const welcomePlay = useEvents((s) => s.welcomePlay);
  const lessons = useEvents((s) => s.lessons);
  const activeLessonId = useEvents((s) => s.activeLessonId);
  const prayer = useEvents(shownPrayer);

  const p1 = lastPushed?.player1 ?? liveP1;
  const p2 = lastPushed?.player2 ?? liveP2;
  const nextA = nextUp ? registered.find((r) => r.id === nextUp.p1Id) : undefined;
  const nextB = nextUp ? registered.find((r) => r.id === nextUp.p2Id) : undefined;

  const now = Date.now();
  const popupLive = popup && popup.until > now ? popup : null;
  const emoteLive = emote && emote.until > now ? emote : null;
  const welcomeLive = welcomePlay && welcomePlay.until > now ? welcomePlay : null;
  const activeLesson = activeLessonId
    ? lessons.find((l) => l.id === activeLessonId)
    : undefined;
  const emoteDef = emoteLive ? EMOTES.find((e) => e.id === emoteLive.id) : undefined;
  const redeemDef = popupLive ? REDEEMS.find((r) => r.id === popupLive.id) : undefined;
  const claimLeft = claimUntil ? Math.max(0, Math.ceil((claimUntil - now) / 1000)) : 0;
  const giveawayState = winner
    ? claimUntil && claimLeft > 0
      ? "unclaimed"
      : "drawn"
    : giveawayOpen
      ? "open"
      : null;

  const verseForRedeem = useMemo(
    () => ({ ref: verseRef, text: verseText }),
    [verseRef, verseText],
  );

  return (
    <div className={`ov-stage${intermission ? " is-scene" : ""}${chatOn ? " has-chat" : ""}`}>
      {intermission && scene ? <IntermissionArt scene={scene} /> : null}

      {show("timer") ? <OverlayClock now={Date.now() + tick} /> : null}

      {adLive && ad ? <AdBreak ad={ad} now={Date.now() + tick} /> : null}

      {!adLive && show("ad") && welcomeLive ? <WelcomeToast play={welcomeLive} /> : null}

      {chatOn ? <ChatOverlay /> : null}

      {!intermission && !adLive && show("score") ? (
        <article className="ov-score" aria-label="Scorebug">
          <p className="ov-kicker">
            {lastPushed?.round ?? round} · Bo{lastPushed?.bestOf ?? bestOf} · {status}
          </p>
          <div className="ov-score-row">
            <div>
              <strong>{p1.tag}</strong>
              <span>{p1.character}</span>
            </div>
            <em>
              {p1.score}
              <i>–</i>
              {p2.score}
            </em>
            <div>
              <strong>{p2.tag}</strong>
              <span>{p2.character}</span>
            </div>
          </div>
        </article>
      ) : null}

      {hud && show("next") && nextA && nextB ? (
        <article className="ov-next" aria-label="Up next">
          <p className="ov-kicker">Up next</p>
          <p className="ov-next-vs">
            {nextA.tag} <em>vs</em> {nextB.tag}
          </p>
          <p className="ov-fine">
            {nextA.character} · {nextB.character}
          </p>
        </article>
      ) : null}

      {hud && show("giveaway") && giveawayState ? (
        <article className={`ov-drop ov-drop-${giveawayState}`} aria-label="Giveaway">
          <p className="ov-kicker">
            {giveawayState === "open"
              ? "Giveaway open"
              : giveawayState === "unclaimed"
                ? "Drawn — claim it"
                : "Giveaway"}
          </p>
          <strong>{prize}</strong>
          {giveawayState === "open" ? (
            <p>Type !enter · {entries.length} in the pool</p>
          ) : (
            <p>
              {winner?.display}
              {claimLeft > 0 ? ` · ${claimLeft}s to !claim` : " claimed / locked"}
            </p>
          )}
        </article>
      ) : null}

      {hud && show("verse") ? (
        <article className="ov-verse" aria-label="Verse of the night">
          <p className="ov-kicker">Verse of the night</p>
          <blockquote>{verseText}</blockquote>
          <cite>{verseRef}</cite>
        </article>
      ) : null}

      {!adLive && show("study") && activeLesson ? <LessonCard lesson={activeLesson} /> : null}

      {hud && show("prayer") && prayer ? (
        <article className="ov-prayer" aria-label="Prayer request">
          <p className="ov-kicker">Prayer</p>
          <p>{prayer.text}</p>
          <span>from {prayer.display}</span>
        </article>
      ) : null}

      {hud && show("music") && musicTrack ? (
        <div className="ov-music">
          <MusicNowPlaying
            track={musicTrack ?? DEMO_PLAYLIST[0] ?? null}
            onHidden={onMusicHidden}
          />
        </div>
      ) : null}

      {!adLive && show("redeem") && emoteLive && emoteDef ? (
        <EmoteBurst play={emoteLive} def={emoteDef} />
      ) : null}

      {!adLive && show("redeem") && popupLive && redeemDef ? (
        <article className={`ov-redeem ov-redeem-${popupLive.id}`} aria-live="polite">
          <img
            src={
              popupLive.id === "panda"
                ? "/ornaments/panda.png?v=xiaoyu"
                : popupLive.id === "cross" || popupLive.id === "versecard"
                  ? "/ornaments/cross.png"
                  : "/ornaments/bow.png"
            }
            alt=""
          />
          <div>
            <p className="ov-kicker">{redeemDef.name}</p>
            {popupLive.id === "versecard" ? (
              <>
                <blockquote>{verseForRedeem.text}</blockquote>
                <cite>{verseForRedeem.ref}</cite>
              </>
            ) : (
              <strong>from {popupLive.by}</strong>
            )}
          </div>
        </article>
      ) : null}
    </div>
  );
}
