import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
export type { BotActor } from "@/lib/bot-commands";
import {
  BOT_CHANNEL,
  BOT_DISPLAY,
  BOT_HELP,
  BOT_LOGIN,
  BOT_TAGLINE,
  isValidSeriesScore,
  normalizeName,
  parseCommand,
  parseScorePair,
  type BotActor,
} from "@/lib/bot-commands";
import { useEvents } from "@/lib/event-store";
import { findEmoteTokens } from "@/lib/emotes";
import { broadcastOverlay } from "@/lib/overlay-bus";

export type MatchStatus = "waiting" | "in_progress" | "paused" | "complete";

export type PlayerSlot = {
  tag: string;
  character: string;
  score: number;
};

export type RegisteredPlayer = {
  id: string;
  tag: string;
  character: string;
  platform: string;
  region: string;
  twitch: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  flag: "dq" | "noshow" | null;
};

export type OverlayPayload = {
  tournamentName: string;
  round: string;
  status: MatchStatus;
  bestOf: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
  pushedAt: string | null;
};

export type OffstreamStatus =
  | "awaiting_report"
  | "awaiting_confirm"
  | "disputed"
  | "complete";

export type OffstreamMatch = {
  id: string;
  p1Id: string;
  p2Id: string;
  bestOf: number;
  status: OffstreamStatus;
  report: {
    byId: string;
    reporterScore: number;
    opponentScore: number;
    at: string;
  } | null;
  result: {
    winnerId: string;
    p1Score: number;
    p2Score: number;
    confirmedBy: string;
    at: string;
    reason: "confirm" | "mod" | "dq" | "noshow";
  } | null;
  createdAt: string;
};

export type ChatLine = {
  id: string;
  user: string;
  role: "mod" | "player" | "bot";
  text: string;
  at: string;
};

type TournamentState = {
  tournamentName: string;
  round: string;
  bestOf: number;
  status: MatchStatus;
  player1: PlayerSlot;
  player2: PlayerSlot;
  registered: RegisteredPlayer[];
  lastPushed: OverlayPayload | null;
  pushTick: number;
  hydrated: boolean;
  offstream: OffstreamMatch | null;
  nextUp: { p1Id: string; p2Id: string } | null;
  results: OffstreamMatch[];
  chat: ChatLine[];
  setField: <K extends "tournamentName" | "round">(key: K, value: string) => void;
  setBestOf: (n: number) => void;
  setStatus: (s: MatchStatus) => void;
  setPlayer: (side: 1 | 2, patch: Partial<PlayerSlot>) => void;
  bumpScore: (side: 1 | 2, delta: number) => void;
  resetScores: () => void;
  swapSides: () => void;
  loadSignup: (side: 1 | 2, player: RegisteredPlayer) => void;
  addRegistered: (player: Omit<RegisteredPlayer, "id" | "checkedIn" | "checkedInAt" | "twitch" | "flag"> & { twitch?: string }) => void;
  removeRegistered: (id: string) => void;
  checkIn: (id: string) => string;
  checkOut: (id: string) => void;
  setNextUp: (p1Id: string, p2Id: string) => string;
  clearNextUp: () => void;
  pushMatchInfo: () => OverlayPayload;
  forcePushAll: () => OverlayPayload;
  runChat: (actor: BotActor, raw: string) => string;
  appendBotChat: (text: string) => void;
  markHydrated: () => void;
};

const SEED_REGISTERED: RegisteredPlayer[] = [
  { id: "p-gamer", tag: "GamerTag1", character: "Kazuya", platform: "PC", region: "NA", twitch: "gamertag1", checkedIn: true, checkedInAt: new Date().toISOString(), flag: null },
  { id: "p-pro", tag: "ProFighter", character: "Jin", platform: "PS5", region: "EU", twitch: "profightter", checkedIn: true, checkedInAt: new Date().toISOString(), flag: null },
  { id: "p-shadow", tag: "ShadowKing", character: "Heihachi", platform: "PC", region: "NA", twitch: "shadowking", checkedIn: false, checkedInAt: null, flag: null },
  { id: "p-azul", tag: "AzuLuna", character: "Xiaoyu", platform: "Xbox", region: "JP", twitch: "azuluna", checkedIn: false, checkedInAt: null, flag: null },
  { id: "p-knee", tag: "Knee", character: "Bryan", platform: "PC", region: "KR", twitch: "knee", checkedIn: false, checkedInAt: null, flag: null },
];

function payloadOf(s: {
  tournamentName: string;
  round: string;
  status: MatchStatus;
  bestOf: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
}): OverlayPayload {
  return {
    tournamentName: s.tournamentName,
    round: s.round,
    status: s.status,
    bestOf: s.bestOf,
    player1: { ...s.player1 },
    player2: { ...s.player2 },
    pushedAt: new Date().toISOString(),
  };
}

function line(user: string, role: ChatLine["role"], text: string): ChatLine {
  return {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    user,
    role,
    text,
    at: new Date().toISOString(),
  };
}

function findPlayer(registered: RegisteredPlayer[], name: string) {
  const n = normalizeName(name);
  return registered.find(
    (p) => normalizeName(p.tag) === n || normalizeName(p.twitch) === n || p.id === name,
  );
}

function playerOfActor(registered: RegisteredPlayer[], actor: BotActor) {
  return findPlayer(registered, actor.login) ?? findPlayer(registered, actor.display);
}

function matchHasPlayer(match: OffstreamMatch, id: string) {
  return match.p1Id === id || match.p2Id === id;
}

function otherId(match: OffstreamMatch, id: string) {
  return match.p1Id === id ? match.p2Id : match.p1Id;
}

function newMatch(p1Id: string, p2Id: string, bestOf: number): OffstreamMatch {
  return {
    id: `m-${Date.now().toString(36)}`,
    p1Id,
    p2Id,
    bestOf,
    status: "awaiting_report",
    report: null,
    result: null,
    createdAt: new Date().toISOString(),
  };
}

export const STATUS_LABEL: Record<MatchStatus, string> = {
  waiting: "Waiting",
  in_progress: "In Progress",
  paused: "Paused",
  complete: "Complete",
};

export const OFFSTREAM_LABEL: Record<OffstreamStatus, string> = {
  awaiting_report: "Awaiting report",
  awaiting_confirm: "Awaiting confirm",
  disputed: "Disputed",
  complete: "Complete",
};

export const BEST_OF_OPTIONS = [1, 3, 5, 7] as const;

export const MOD_ACTOR: BotActor = {
  login: BOT_LOGIN,
  display: BOT_DISPLAY,
  isMod: true,
};

export const useTournament = create<TournamentState>()(
  persist(
    (set, get) => ({
      tournamentName: "Tekken 8 Open",
      round: "Winners Finals",
      bestOf: 3,
      status: "waiting",
      player1: { tag: "Player 1", character: "Jin / Kazuya / etc.", score: 0 },
      player2: { tag: "Player 2", character: "Character", score: 0 },
      registered: SEED_REGISTERED,
      lastPushed: null,
      pushTick: 0,
      hydrated: false,
      offstream: newMatch("p-gamer", "p-pro", 3),
      nextUp: { p1Id: "p-azul", p2Id: "p-knee" },
      results: [],
      chat: [
        line(
          BOT_DISPLAY,
          "bot",
          `${BOT_DISPLAY} online — courtyard bot for #lambs_shadow. Sunday Bible & Tekken. Pray. Train. Trust.`,
        ),
        line("AzuLuna", "player", "gg courtyard — ready for Sunday Tekken."),
        line(
          BOT_DISPLAY,
          "bot",
          "When the set is over, a player types !report 2-1 — opponent types !confirm.",
        ),
      ],
      setField: (key, value) => set({ [key]: value }),
      setBestOf: (n) => set({ bestOf: n }),
      setStatus: (s) => {
        const prev = get().status;
        set({ status: s });
        if (prev !== s && s === "in_progress") {
          useEvents.getState().playEmote("pray", BOT_DISPLAY, { free: true });
        }
        if (prev !== s && s === "complete") {
          useEvents.getState().playEmote("joy", BOT_DISPLAY, { free: true });
        }
      },
      setPlayer: (side, patch) =>
        set((st) => {
          const key = side === 1 ? "player1" : "player2";
          return { [key]: { ...st[key], ...patch } };
        }),
      bumpScore: (side, delta) =>
        set((st) => {
          const key = side === 1 ? "player1" : "player2";
          const next = Math.max(0, Math.min(99, st[key].score + delta));
          const winsNeeded = Math.ceil(st.bestOf / 2);
          const other = side === 1 ? st.player2 : st.player1;
          let status = st.status;
          if (next >= winsNeeded) status = "complete";
          else if (next > 0 || other.score > 0) {
            if (st.status === "waiting" || st.status === "complete") status = "in_progress";
          }
          if (status === "complete" && st.status !== "complete") {
            queueMicrotask(() => useEvents.getState().playEmote("joy", BOT_DISPLAY, { free: true }));
          } else if (st.status === "waiting" && status === "in_progress") {
            queueMicrotask(() => useEvents.getState().playEmote("pray", BOT_DISPLAY, { free: true }));
          } else if (
            st.status === "in_progress" &&
            status === "in_progress" &&
            delta > 0 &&
            st.player1.score + st.player2.score === 0
          ) {
            queueMicrotask(() => useEvents.getState().playEmote("fight", BOT_DISPLAY, { free: true }));
          }
          return { [key]: { ...st[key], score: next }, status };
        }),
      resetScores: () =>
        set((st) => ({
          player1: { ...st.player1, score: 0 },
          player2: { ...st.player2, score: 0 },
          status: "waiting",
        })),
      swapSides: () =>
        set((st) => ({
          player1: st.player2,
          player2: st.player1,
        })),
      loadSignup: (side, player) =>
        set((st) => {
          const key = side === 1 ? "player1" : "player2";
          return {
            [key]: {
              ...st[key],
              tag: player.tag,
              character: player.character,
            },
          };
        }),
      addRegistered: (player) =>
        set((st) => ({
          registered: [
            ...st.registered,
            {
              ...player,
              twitch: player.twitch?.trim() || player.tag.toLowerCase(),
              checkedIn: false,
              checkedInAt: null,
              flag: null,
              id: `p-${Date.now().toString(36)}`,
            },
          ],
        })),
      removeRegistered: (id) =>
        set((st) => ({
          registered: st.registered.filter((p) => p.id !== id),
          offstream:
            st.offstream && (st.offstream.p1Id === id || st.offstream.p2Id === id)
              ? null
              : st.offstream,
        })),
      checkIn: (id) => {
        const p = get().registered.find((r) => r.id === id);
        if (!p) return "Player not in signups.";
        set((st) => ({
          registered: st.registered.map((r) =>
            r.id === id
              ? { ...r, checkedIn: true, checkedInAt: new Date().toISOString() }
              : r,
          ),
        }));
        return `${p.tag} checked in for offstream.`;
      },
      checkOut: (id) =>
        set((st) => ({
          registered: st.registered.map((r) =>
            r.id === id ? { ...r, checkedIn: false, checkedInAt: null } : r,
          ),
        })),
      setNextUp: (p1Id, p2Id) => {
        const a = get().registered.find((r) => r.id === p1Id);
        const b = get().registered.find((r) => r.id === p2Id);
        if (!a || !b) return "Pick two signed-up players.";
        if (a.id === b.id) return "Pick two different players.";
        set({ nextUp: { p1Id, p2Id } });
        broadcastOverlay("state");
        return `Up next: ${a.tag} vs ${b.tag}.`;
      },
      clearNextUp: () => {
        set({ nextUp: null });
        broadcastOverlay("state");
      },
      pushMatchInfo: () => {
        const payload = payloadOf(get());
        set((st) => ({ lastPushed: payload, pushTick: st.pushTick + 1 }));
        broadcastOverlay("state");
        return payload;
      },
      forcePushAll: () => {
        const payload = payloadOf(get());
        set((st) => ({ lastPushed: payload, pushTick: st.pushTick + 1 }));
        broadcastOverlay("state");
        return payload;
      },
      runChat: (actor, raw) => {
        const trimmed = raw.trim();
        if (!trimmed) return "";
        const cmd = parseCommand(trimmed);
        const asPlayer = playerOfActor(get().registered, actor);
        const incoming = line(actor.display, actor.isMod ? "mod" : "player", trimmed);

        if (!actor.isMod) {
          const ev = useEvents.getState();
          if (ev.markWelcomeSeen(actor.login || actor.display) && ev.welcomesArmed) {
            ev.queueWelcome({
              kind: "first",
              login: actor.login || actor.display,
              display: actor.display,
            });
          }
        }

        const reply = (text: string, extra?: Partial<TournamentState>) => {
          set((st) => ({
            ...extra,
            chat: [
              ...st.chat,
              incoming,
              ...(text ? [line(BOT_DISPLAY, "bot", text)] : []),
            ].slice(-80),
            ...(extra ?? {}),
          }));
          return text;
        };

        if (!cmd) {
          const tokens = findEmoteTokens(trimmed);
          if (tokens[0]) {
            return reply(
              useEvents.getState().playEmote(tokens[0], actor.display, {
                fromChat: true,
                login: actor.login,
              }),
            );
          }
          return reply("Commands start with ! — try !help");
        }

        if (cmd.name === "help") {
          return reply(BOT_HELP);
        }

        if (cmd.name === "about" || cmd.name === "xiao" || cmd.name === "who") {
          return reply(
            `${BOT_DISPLAY} — courtyard bot for twitch.tv/${BOT_LOGIN} · #${BOT_CHANNEL}. ${BOT_TAGLINE}. Pray. Train. Trust.`,
          );
        }

        if (cmd.name === "checkin") {
          if (!asPlayer) {
            return reply(`${actor.display} is not on the signup list. Sign up first.`);
          }
          set((st) => ({
            registered: st.registered.map((r) =>
              r.id === asPlayer.id
                ? { ...r, checkedIn: true, checkedInAt: new Date().toISOString() }
                : r,
            ),
          }));
          return reply(`${asPlayer.tag} is checked in. Waiting for an offstream pairing.`);
        }

        if (cmd.name === "checkout") {
          if (!asPlayer) return reply("You are not signed up.");
          set((st) => ({
            registered: st.registered.map((r) =>
              r.id === asPlayer.id ? { ...r, checkedIn: false, checkedInAt: null } : r,
            ),
          }));
          return reply(`${asPlayer.tag} left the offstream queue.`);
        }

        if (cmd.name === "offstream") {
          if (!actor.isMod) return reply("Only mods can open an offstream match.");
          const a = findPlayer(get().registered, cmd.args[0] ?? "");
          const b = findPlayer(get().registered, cmd.args[1] ?? "");
          if (!a || !b) return reply("Usage: !offstream @player1 @player2 (both must be signed up).");
          if (a.id === b.id) return reply("Pick two different players.");
          if (!a.checkedIn || !b.checkedIn) {
            return reply(`Both players must !checkin first. ${a.tag}: ${a.checkedIn ? "in" : "not in"} · ${b.tag}: ${b.checkedIn ? "in" : "not in"}.`);
          }
          if (get().offstream && get().offstream?.status !== "complete") {
            return reply("An offstream match is already open. !cancel it first.");
          }
          const match = newMatch(a.id, b.id, get().bestOf);
          return reply(
            `Offstream set locked: ${a.tag} vs ${b.tag} (Bo${match.bestOf}). Play the set, then one player !report 2-1 — the other !confirm.`,
            { offstream: match },
          );
        }

        if (cmd.name === "cancel") {
          if (!actor.isMod) return reply("Only mods can cancel.");
          if (!get().offstream) return reply("No open offstream match.");
          return reply("Offstream match cancelled.", { offstream: null });
        }

        if (cmd.name === "report") {
          if (!asPlayer) return reply("You must be a signed-up player to report.");
          const match = get().offstream;
          if (!match || match.status === "complete") {
            return reply("No open offstream match. A mod starts one with !offstream @p1 @p2 after both !checkin.");
          }
          if (!matchHasPlayer(match, asPlayer.id)) {
            return reply("You are not in the current offstream set.");
          }
          const pair = parseScorePair(cmd.args);
          if (!pair) return reply("Usage: !report 2-1  (your games first, opponent second).");
          if (!isValidSeriesScore(match.bestOf, Math.max(pair.a, pair.b), Math.min(pair.a, pair.b))) {
            return reply(`Not a valid Bo${match.bestOf} score. First to ${Math.ceil(match.bestOf / 2)} wins, no draws.`);
          }
          useEvents.getState().lockPicks();
          const next: OffstreamMatch = {
            ...match,
            status: "awaiting_confirm",
            report: {
              byId: asPlayer.id,
              reporterScore: pair.a,
              opponentScore: pair.b,
              at: new Date().toISOString(),
            },
          };
          const opp = findPlayer(get().registered, otherId(match, asPlayer.id));
          return reply(
            `${asPlayer.tag} reports ${pair.a}–${pair.b}. ${opp?.tag ?? "Opponent"}: type !confirm to lock it, or !dispute.`,
            { offstream: next },
          );
        }

        if (cmd.name === "confirm") {
          if (!asPlayer) return reply("You must be a signed-up player to confirm.");
          const match = get().offstream;
          if (!match?.report || (match.status !== "awaiting_confirm" && match.status !== "disputed")) {
            return reply("Nothing to confirm. A player in the set must !report first.");
          }
          if (!matchHasPlayer(match, asPlayer.id)) return reply("You are not in this set.");
          if (match.report.byId === asPlayer.id) {
            return reply("The other player has to !confirm. You already reported.");
          }
          const p1Score =
            match.report.byId === match.p1Id
              ? match.report.reporterScore
              : match.report.opponentScore;
          const p2Score =
            match.report.byId === match.p2Id
              ? match.report.reporterScore
              : match.report.opponentScore;
          const winnerId = p1Score > p2Score ? match.p1Id : match.p2Id;
          const finished: OffstreamMatch = {
            ...match,
            status: "complete",
            result: {
              winnerId,
              p1Score,
              p2Score,
              confirmedBy: asPlayer.id,
              at: new Date().toISOString(),
              reason: "confirm",
            },
          };
          const winner = findPlayer(get().registered, winnerId);
          const p1 = findPlayer(get().registered, match.p1Id);
          const p2 = findPlayer(get().registered, match.p2Id);
          const pickNote = useEvents.getState().settleMatch(winnerId === match.p1Id ? 1 : 2);
          useEvents.getState().playEmote("joy", BOT_DISPLAY, { free: true });
          set((st) => ({
            chat: [
              ...st.chat,
              incoming,
              line(
                BOT_DISPLAY,
                "bot",
                `Result locked: ${p1?.tag} ${p1Score}–${p2Score} ${p2?.tag}. Winner: ${winner?.tag}. Overlay standings updated.${pickNote}`,
              ),
            ].slice(-80),
            offstream: null,
            results: [finished, ...st.results].slice(0, 24),
            player1: p1
              ? { tag: p1.tag, character: p1.character, score: p1Score }
              : st.player1,
            player2: p2
              ? { tag: p2.tag, character: p2.character, score: p2Score }
              : st.player2,
            status: "complete",
          }));
          get().pushMatchInfo();
          return `Result locked: ${p1?.tag} ${p1Score}–${p2Score} ${p2?.tag}.`;
        }

        if (cmd.name === "dispute") {
          if (!asPlayer) return reply("You must be in the set to dispute.");
          const match = get().offstream;
          if (!match?.report) return reply("No pending report to dispute.");
          if (!matchHasPlayer(match, asPlayer.id)) return reply("You are not in this set.");
          if (match.report.byId === asPlayer.id) return reply("You cannot dispute your own report. Wait or have a mod !cancel.");
          return reply("Report disputed. Re-enter with !report, or a mod can !result @p1 2 @p2 1.", {
            offstream: { ...match, status: "disputed", report: null },
          });
        }

        if (cmd.name === "result") {
          if (!actor.isMod) return reply("Only mods can force a result.");
          const match = get().offstream;
          if (!match) return reply("No open offstream match.");
          const a = findPlayer(get().registered, cmd.args[0] ?? "");
          const b = findPlayer(get().registered, cmd.args[2] ?? "");
          const pair = parseScorePair([cmd.args[1] ?? "", cmd.args[3] ?? ""]);
          if (!a || !b || !pair || !matchHasPlayer(match, a.id) || !matchHasPlayer(match, b.id)) {
            return reply("Usage: !result @playerA 2 @playerB 1");
          }
          if (!isValidSeriesScore(match.bestOf, Math.max(pair.a, pair.b), Math.min(pair.a, pair.b))) {
            return reply(`Not a valid Bo${match.bestOf} score.`);
          }
          const p1Score = a.id === match.p1Id ? pair.a : pair.b;
          const p2Score = a.id === match.p1Id ? pair.b : pair.a;
          const winnerId = p1Score > p2Score ? match.p1Id : match.p2Id;
          const finished: OffstreamMatch = {
            ...match,
            status: "complete",
            result: {
              winnerId,
              p1Score,
              p2Score,
              confirmedBy: "mod",
              at: new Date().toISOString(),
              reason: "mod",
            },
          };
          const p1 = findPlayer(get().registered, match.p1Id);
          const p2 = findPlayer(get().registered, match.p2Id);
          const winner = findPlayer(get().registered, winnerId);
          const pickNote = useEvents.getState().settleMatch(winnerId === match.p1Id ? 1 : 2);
          set((st) => ({
            chat: [
              ...st.chat,
              incoming,
              line(
                BOT_DISPLAY,
                "bot",
                `Mod result: ${p1?.tag} ${p1Score}–${p2Score} ${p2?.tag}. Winner: ${winner?.tag}.${pickNote}`,
              ),
            ].slice(-80),
            offstream: null,
            results: [finished, ...st.results].slice(0, 24),
            player1: p1 ? { tag: p1.tag, character: p1.character, score: p1Score } : st.player1,
            player2: p2 ? { tag: p2.tag, character: p2.character, score: p2Score } : st.player2,
            status: "complete",
          }));
          get().pushMatchInfo();
          return `Mod result locked.`;
        }

        if (cmd.name === "dq" || cmd.name === "noshow") {
          if (!actor.isMod) return reply("Only mods can DQ or call a no-show.");
          const reason = cmd.name === "dq" ? "dq" : "noshow";
          const target = findPlayer(get().registered, cmd.args[0] ?? "");
          if (!target) return reply(`Usage: !${cmd.name} @player`);
          const match = get().offstream;
          set((st) => ({
            registered: st.registered.map((r) =>
              r.id === target.id
                ? { ...r, flag: reason, checkedIn: false }
                : r,
            ),
            nextUp:
              st.nextUp && (st.nextUp.p1Id === target.id || st.nextUp.p2Id === target.id)
                ? null
                : st.nextUp,
          }));
          if (match && match.status !== "complete" && matchHasPlayer(match, target.id)) {
            const winnerId = otherId(match, target.id);
            const firstTo = Math.ceil(match.bestOf / 2);
            const p1Score = match.p1Id === winnerId ? firstTo : 0;
            const p2Score = match.p2Id === winnerId ? firstTo : 0;
            const finished: OffstreamMatch = {
              ...match,
              status: "complete",
              result: {
                winnerId,
                p1Score,
                p2Score,
                confirmedBy: "mod",
                at: new Date().toISOString(),
                reason,
              },
            };
            const p1 = findPlayer(get().registered, match.p1Id);
            const p2 = findPlayer(get().registered, match.p2Id);
            const winner = findPlayer(get().registered, winnerId);
            const pickNote = useEvents.getState().settleMatch(winnerId === match.p1Id ? 1 : 2);
            const label = reason === "dq" ? "DQ" : "no-show";
            set((st) => ({
              chat: [
                ...st.chat,
                incoming,
                line(
                  BOT_DISPLAY,
                  "bot",
                  `${target.tag} ${label}. ${winner?.tag} takes the set ${p1?.tag} ${p1Score}–${p2Score} ${p2?.tag}.${pickNote}`,
                ),
              ].slice(-80),
              offstream: null,
              results: [finished, ...st.results].slice(0, 24),
              player1: p1 ? { tag: p1.tag, character: p1.character, score: p1Score } : st.player1,
              player2: p2 ? { tag: p2.tag, character: p2.character, score: p2Score } : st.player2,
              status: "complete",
            }));
            get().pushMatchInfo();
            return `${target.tag} ${label}. Set awarded.`;
          }
          const label = reason === "dq" ? "disqualified" : "marked no-show";
          return reply(`${target.tag} ${label}. Removed from next-up if listed.`);
        }

        if (cmd.name === "next") {
          if (!actor.isMod) return reply("Only mods set the next match.");
          const a = findPlayer(get().registered, cmd.args[0] ?? "");
          const b = findPlayer(get().registered, cmd.args[1] ?? "");
          if (!a || !b) return reply("Usage: !next @player1 @player2");
          return reply(get().setNextUp(a.id, b.id));
        }

        if (cmd.name === "upnext") {
          const n = get().nextUp;
          if (!n) return reply("No next match posted.");
          const a = findPlayer(get().registered, n.p1Id);
          const b = findPlayer(get().registered, n.p2Id);
          return reply(`Up next: ${a?.tag} vs ${b?.tag}.`);
        }

        if (cmd.name === "skipnext") {
          if (!actor.isMod) return reply("Only mods can skip next-up.");
          get().clearNextUp();
          return reply("Next-up card cleared.");
        }

        const ev = useEvents.getState().handleCommand(actor, cmd.name, cmd.args, {
          p1Tag: (() => {
            const m = get().offstream;
            if (m) return findPlayer(get().registered, m.p1Id)?.tag ?? get().player1.tag;
            return get().player1.tag;
          })(),
          p2Tag: (() => {
            const m = get().offstream;
            if (m) return findPlayer(get().registered, m.p2Id)?.tag ?? get().player2.tag;
            return get().player2.tag;
          })(),
          matchLive:
            Boolean(get().offstream && get().offstream?.status !== "complete") ||
            get().status === "in_progress",
        });
        if (ev) return reply(ev);

        return reply("Unknown command. !help for the list.");
      },
      appendBotChat: (text) => {
        if (!text) return;
        set((st) => ({
          chat: [...st.chat, line(BOT_DISPLAY, "bot", text)].slice(-80),
        }));
        broadcastOverlay("state");
      },
      markHydrated: () =>
        set((s) => ({
          hydrated: true,
          chat: s.chat.map((c) =>
            c.user === "PandaBot" || c.user === "PandaMaiden"
              ? { ...c, user: BOT_DISPLAY }
              : c,
          ),
        })),
    }),
    {
      name: "tcp-gothic-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        tournamentName: s.tournamentName,
        round: s.round,
        bestOf: s.bestOf,
        status: s.status,
        player1: s.player1,
        player2: s.player2,
        registered: s.registered,
        lastPushed: s.lastPushed,
        offstream: s.offstream,
        nextUp: s.nextUp,
        results: s.results,
        chat: s.chat.slice(-40),
      }),
    },
  ),
);

export function livePreviewJson(s: {
  tournamentName: string;
  round: string;
  status: MatchStatus;
  bestOf: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
}) {
  return {
    tournamentName: s.tournamentName,
    round: s.round,
    status: s.status,
    bestOf: s.bestOf,
    player1: s.player1,
    player2: s.player2,
  };
}

export function actorFromPlayer(p: RegisteredPlayer): BotActor {
  return { login: p.twitch, display: p.tag, isMod: false };
}
