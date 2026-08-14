import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { normalizeName, type BotActor } from "@/lib/bot-commands";
import { broadcastOverlay } from "@/lib/overlay-bus";
import {
  AD_MS,
  DEFAULT_SHOUTS,
  PROJECTS,
  normalizeSite,
  projectByToken,
  shoutLine,
  twitchUrl,
  type AdPlay,
  type ShoutEntry,
} from "@/lib/ads";
import {
  CHAT_EMOTE_GLOBAL_MS,
  EMOTES,
  emoteByToken,
  emotesHelp,
  type EmoteId,
  type EmotePlay,
} from "@/lib/emotes";
import { allLayersOn, type LayerId, type LayerMap } from "@/lib/overlay-prefs";
import {
  DEFAULT_DEVICES,
  WELCOME_TOAST_MS,
  deviceByKind,
  fillWelcome,
  parseWelcomeKind,
  welcomeKicker,
  type WelcomeDevice,
  type WelcomeJob,
  type WelcomeKind,
  type WelcomePlay,
} from "@/lib/welcomes";
import { DEFAULT_ENDING_NOTICE, reposChatLine, reposHelp, type EndingNotice } from "@/lib/sources";
import { SEED_LESSONS, type Lesson } from "@/lib/lessons";
import { runGuardrail, verseFor, type GuardrailReport } from "@/lib/doctrine";
import {
  EMPTY_TIMER,
  parseDurationMs,
  sceneByToken,
  type OverlayTimer,
  type SceneId,
} from "@/lib/scenes";

export type RedeemId = "hype" | "panda" | "cross" | "bow" | "versecard";

export type RedeemDef = {
  id: RedeemId;
  name: string;
  cost: number;
  userCdMs: number;
  globalCdMs: number;
  durationMs: number;
  blurb: string;
};

export const REDEEMS: RedeemDef[] = [
  {
    id: "hype",
    name: "Hype burst",
    cost: 200,
    userCdMs: 90_000,
    globalCdMs: 20_000,
    durationMs: 7000,
    blurb: "Gold flash for a big round.",
  },
  {
    id: "panda",
    name: "Panda cameo",
    cost: 150,
    userCdMs: 60_000,
    globalCdMs: 15_000,
    durationMs: 6500,
    blurb: "Maiden mascot pops on stream.",
  },
  {
    id: "cross",
    name: "Blessing",
    cost: 100,
    userCdMs: 45_000,
    globalCdMs: 12_000,
    durationMs: 6000,
    blurb: "Cross overlay. Quiet flourish.",
  },
  {
    id: "bow",
    name: "Ribbon",
    cost: 80,
    userCdMs: 30_000,
    globalCdMs: 10_000,
    durationMs: 5000,
    blurb: "Satin bow burst.",
  },
  {
    id: "versecard",
    name: "Verse card",
    cost: 250,
    userCdMs: 120_000,
    globalCdMs: 30_000,
    durationMs: 10_000,
    blurb: "Holds the verse of the night.",
  },
];

export const STARTING_POINTS = 500;
export const CLAIM_MS = 90_000;
export const DAILY_POINTS = 40;
export const PICK_PAYOUT = 80;

export type GiveawayEntry = { login: string; display: string; at: string };

export type PrayerItem = {
  id: string;
  login: string;
  display: string;
  text: string;
  status: "pending" | "shown" | "done";
  at: string;
};

export type PickEntry = { login: string; display: string; side: 1 | 2; at: string };

export type ActivePopup = {
  id: RedeemId;
  by: string;
  at: string;
  until: number;
};

export type EventContext = {
  p1Tag: string;
  p2Tag: string;
  matchLive: boolean;
};

type EventState = {
  hydrated: boolean;
  layers: LayerMap;
  giveawayOpen: boolean;
  giveawayPrize: string;
  entries: GiveawayEntry[];
  winner: GiveawayEntry | null;
  claimUntil: number | null;
  verseRef: string;
  verseText: string;
  prayers: PrayerItem[];
  shownPrayerId: string | null;
  balances: Record<string, number>;
  lastDaily: Record<string, string>;
  userCd: Record<string, number>;
  globalCdUntil: number;
  popup: ActivePopup | null;
  picksOpen: boolean;
  picksLocked: boolean;
  picks: PickEntry[];
  lastPickResult: string | null;
  scene: SceneId | null;
  timer: OverlayTimer;
  ad: AdPlay | null;
  shoutbook: ShoutEntry[];
  loySite: string;
  emote: EmotePlay | null;
  welcomesArmed: boolean;
  welcomeDevices: WelcomeDevice[];
  welcomeQueue: WelcomeJob[];
  welcomeSeen: Record<string, string>;
  welcomeLast: Record<string, number>;
  welcomePlay: WelcomePlay | null;
  endingNotice: EndingNotice;
  endingNoticeAt: number | null;
  lessons: Lesson[];
  activeLessonId: string | null;
  markHydrated: () => void;
  setLayer: (id: LayerId, on: boolean) => void;
  setAllLayers: (on: boolean) => void;
  setScene: (id: SceneId | null) => void;
  startTimer: (patch: Partial<OverlayTimer> & { durationMs?: number }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  clearTimer: () => void;
  playAd: (ad: Omit<AdPlay, "until">, ms?: number) => void;
  clearAd: () => void;
  setLoySite: (site: string) => void;
  setShoutSite: (login: string, display: string, site: string) => void;
  playEmote: (
    id: EmoteId,
    by: string,
    opts?: { fromChat?: boolean; free?: boolean; login?: string },
  ) => string;
  setWelcomesArmed: (on: boolean) => void;
  upsertWelcome: (patch: Partial<WelcomeDevice> & { id: string }) => void;
  removeWelcome: (id: string) => void;
  queueWelcome: (opts: {
    kind?: WelcomeKind;
    deviceId?: string;
    login: string;
    display?: string;
    site?: string;
    delayMs?: number;
  }) => string;
  cancelWelcome: (idOrLogin: string) => string;
  flushWelcomes: (now: number) => string[];
  markWelcomeSeen: (login: string) => boolean;
  setEndingNotice: (patch: Partial<EndingNotice>) => void;
  flushEndingNotice: (now: number) => string[];
  upsertLesson: (lesson: Lesson) => void;
  removeLesson: (id: string) => void;
  reviewLesson: (id: string) => GuardrailReport | null;
  applyTightened: (id: string) => void;
  setLessonStatus: (id: string, status: Lesson["status"]) => void;
  takeLessonLive: (id: string) => string;
  clearLesson: () => void;
  settleMatch: (side: 1 | 2) => string;
  lockPicks: () => void;
  handleCommand: (actor: BotActor, name: string, args: string[], ctx: EventContext) => string | null;
};

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function loginOf(actor: BotActor) {
  return normalizeName(actor.login || actor.display);
}

function ensureBalance(balances: Record<string, number>, login: string) {
  if (balances[login] === undefined) return { ...balances, [login]: STARTING_POINTS };
  return balances;
}

function redeemBy(name: string) {
  const n = name.toLowerCase();
  return REDEEMS.find((r) => r.id === n || r.name.toLowerCase() === n);
}

export const useEvents = create<EventState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      layers: allLayersOn(),
      giveawayOpen: false,
      giveawayPrize: "Mystery prize",
      entries: [],
      winner: null,
      claimUntil: null,
      verseRef: "John 14:27",
      verseText: "Peace I leave with you; my peace I give to you.",
      prayers: [],
      shownPrayerId: null,
      balances: {},
      lastDaily: {},
      userCd: {},
      globalCdUntil: 0,
      popup: null,
      picksOpen: true,
      picksLocked: false,
      picks: [],
      lastPickResult: null,
      scene: null,
      timer: EMPTY_TIMER,
      ad: null,
      shoutbook: DEFAULT_SHOUTS,
      loySite: "",
      emote: null,
      welcomesArmed: false,
      welcomeDevices: DEFAULT_DEVICES,
      welcomeQueue: [],
      welcomeSeen: {},
      welcomeLast: {},
      welcomePlay: null,
      endingNotice: DEFAULT_ENDING_NOTICE,
      endingNoticeAt: null,
      lessons: SEED_LESSONS,
      activeLessonId: null,

      markHydrated: () =>
        set((s) => ({
          hydrated: true,
          layers: { ...allLayersOn(), ...s.layers },
          ad: s.ad && s.ad.until > Date.now() ? s.ad : null,
          emote: s.emote && s.emote.until > Date.now() ? s.emote : null,
          welcomePlay: s.welcomePlay && s.welcomePlay.until > Date.now() ? s.welcomePlay : null,
          welcomeDevices: s.welcomeDevices?.length ? s.welcomeDevices : DEFAULT_DEVICES,
          endingNotice: { ...DEFAULT_ENDING_NOTICE, ...s.endingNotice },
          lessons: s.lessons?.length ? s.lessons : SEED_LESSONS,
        })),

      setLayer: (id, on) => {
        set((s) => ({ layers: { ...allLayersOn(), ...s.layers, [id]: on } }));
        broadcastOverlay("layers");
      },
      setAllLayers: (on) => {
        set({ layers: on ? allLayersOn() : (Object.fromEntries(LAYER_IDS_OFF()) as LayerMap) });
        broadcastOverlay("layers");
      },
      setScene: (id) => {
        const prev = get().scene;
        const notice = get().endingNotice;
        let endingNoticeAt = get().endingNoticeAt;
        if (id === "ending" && prev !== "ending" && notice.enabled) {
          endingNoticeAt = Date.now() + Math.max(0, notice.delayMs);
        }
        if (id !== "ending") endingNoticeAt = null;
        set({ scene: id, endingNoticeAt });
        broadcastOverlay("state");
      },
      startTimer: (patch) => {
        const prev = get().timer;
        set({
          timer: {
            ...prev,
            ...patch,
            running: true,
            origin: Date.now(),
            accumulated: 0,
          },
        });
        broadcastOverlay("state");
      },
      pauseTimer: () => {
        const t = get().timer;
        if (!t.running) return;
        const extra = t.origin ? Date.now() - t.origin : 0;
        set({
          timer: { ...t, running: false, origin: null, accumulated: t.accumulated + extra },
        });
        broadcastOverlay("state");
      },
      resumeTimer: () => {
        const t = get().timer;
        if (t.running) return;
        set({ timer: { ...t, running: true, origin: Date.now() } });
        broadcastOverlay("state");
      },
      clearTimer: () => {
        set({ timer: { ...EMPTY_TIMER } });
        broadcastOverlay("state");
      },
      playAd: (ad, ms) => {
        const kind = ad.kind;
        const until = Date.now() + (ms ?? AD_MS[kind]);
        set({ ad: { ...ad, until } });
        broadcastOverlay("popup");
      },
      clearAd: () => {
        set({ ad: null });
        broadcastOverlay("state");
      },
      setLoySite: (site) => set({ loySite: normalizeSite(site) }),
      setShoutSite: (login, display, site) => {
        const key = login.replace(/^@/, "").toLowerCase();
        set((s) => {
          const rest = s.shoutbook.filter((e) => e.login !== key);
          return {
            shoutbook: [...rest, { login: key, display: display || key, site: normalizeSite(site) }],
          };
        });
      },

      playEmote: (id, by, opts) => {
        const def = EMOTES.find((e) => e.id === id);
        if (!def) return "Unknown emote.";
        const now = Date.now();
        const free = Boolean(opts?.free || opts?.fromChat);
        const login = opts?.login ?? by.toLowerCase();
        const globalWait = opts?.fromChat ? CHAT_EMOTE_GLOBAL_MS : def.globalCdMs;
        if (get().globalCdUntil > now && !opts?.free) {
          return `${def.name} cooling down ${Math.ceil((get().globalCdUntil - now) / 1000)}s.`;
        }
        if (!free) {
          const userKey = `${login}:emote:${def.id}`;
          const until = get().userCd[userKey] ?? 0;
          if (until > now) return `${def.name} ready in ${Math.ceil((until - now) / 1000)}s.`;
          const bal = ensureBalance(get().balances, login);
          const have = bal[login] ?? STARTING_POINTS;
          if (have < def.cost) return `Need ${def.cost} pts for ${def.token}. You have ${have}.`;
          const nextBal = { ...bal, [login]: have - def.cost };
          set((s) => ({
            balances: nextBal,
            userCd: { ...s.userCd, [userKey]: now + def.userCdMs },
            globalCdUntil: now + globalWait,
            emote: {
              id: def.id,
              by,
              at: new Date().toISOString(),
              until: now + def.durationMs,
            },
          }));
          broadcastOverlay("popup");
          return `${def.token} ${def.ref} — ${def.verse} (−${def.cost})`;
        }
        set({
          globalCdUntil: opts?.free ? get().globalCdUntil : now + globalWait,
          emote: {
            id: def.id,
            by,
            at: new Date().toISOString(),
            until: now + def.durationMs,
          },
        });
        broadcastOverlay("popup");
        return `${def.token} ${def.ref} — ${def.verse}`;
      },

      setWelcomesArmed: (on) => {
        set({ welcomesArmed: on });
        broadcastOverlay("state");
      },
      upsertWelcome: (patch) => {
        set((s) => {
          const i = s.welcomeDevices.findIndex((d) => d.id === patch.id);
          if (i < 0) {
            const base = DEFAULT_DEVICES.find((d) => d.kind === (patch.kind ?? "special"));
            const next: WelcomeDevice = {
              ...(base ?? DEFAULT_DEVICES[6]!),
              ...patch,
              id: patch.id,
              kind: patch.kind ?? "special",
              enabled: patch.enabled ?? true,
              name: patch.name ?? "Custom welcome",
            };
            return { welcomeDevices: [...s.welcomeDevices, next] };
          }
          const copy = [...s.welcomeDevices];
          copy[i] = { ...copy[i]!, ...patch };
          return { welcomeDevices: copy };
        });
        broadcastOverlay("state");
      },
      removeWelcome: (id) => {
        set((s) => ({
          welcomeDevices: s.welcomeDevices.filter((d) => d.id !== id),
          welcomeQueue: s.welcomeQueue.map((q) =>
            q.deviceId === id && q.status === "queued" ? { ...q, status: "cancelled" as const } : q,
          ),
        }));
      },
      queueWelcome: (opts) => {
        const kind = opts.kind ?? "first";
        const device =
          (opts.deviceId
            ? get().welcomeDevices.find((d) => d.id === opts.deviceId)
            : deviceByKind(get().welcomeDevices, kind)) ?? null;
        if (!device) return `No ${kind} welcome device.`;
        if (!device.enabled) return `${device.name} is turned off. Enable it on the Events desk.`;
        const login = normalizeName(opts.login);
        if (!login) return "Usage: !welcome @user [first|follow|sub|raid|vip|return|special|timed]";
        const known = get().shoutbook.find((e) => e.login === login);
        const display = opts.display || device.display || known?.display || opts.login.replace(/^@/, "");
        const site = normalizeSite(opts.site || device.site || known?.site || "");
        const delay = opts.delayMs ?? device.delayMs;
        const last = get().welcomeLast[`${device.id}:${login}`] ?? 0;
        if (device.cooldownMs && Date.now() - last < device.cooldownMs) {
          const wait = Math.ceil((device.cooldownMs - (Date.now() - last)) / 1000);
          return `${device.name} for ${display} is on cooldown (${wait}s).`;
        }
        const existing = get().welcomeQueue.find(
          (q) => q.status === "queued" && q.login === login && q.deviceId === device.id,
        );
        if (existing) {
          return `${device.name} for ${display} is already queued.`;
        }
        const job: WelcomeJob = {
          id: uid("so"),
          deviceId: device.id,
          kind: device.kind,
          login,
          display,
          site,
          fireAt: Date.now() + Math.max(0, delay),
          status: "queued",
        };
        set((s) => ({ welcomeQueue: [...s.welcomeQueue, job].slice(-40) }));
        broadcastOverlay("state");
        const wait = Math.max(0, Math.round(delay / 1000));
        return wait
          ? `${device.name} for ${display} in ${wait}s (${get().welcomesArmed ? "live" : "offline queue"}).`
          : `${device.name} for ${display} queued now.`;
      },
      cancelWelcome: (idOrLogin) => {
        const key = idOrLogin.replace(/^@/, "").toLowerCase();
        const hit = get().welcomeQueue.find(
          (q) => q.status === "queued" && (q.id === idOrLogin || q.login === key),
        );
        if (!hit) return "No queued welcome matches.";
        set((s) => ({
          welcomeQueue: s.welcomeQueue.map((q) =>
            q.id === hit.id ? { ...q, status: "cancelled" as const } : q,
          ),
        }));
        broadcastOverlay("state");
        return `Cancelled ${hit.kind} welcome for ${hit.display}.`;
      },
      flushWelcomes: (now) => {
        const due = get().welcomeQueue.filter((q) => q.status === "queued" && q.fireAt <= now);
        if (!due.length) {
          const play = get().welcomePlay;
          if (play && play.until <= now) set({ welcomePlay: null });
          return [];
        }
        const lines: string[] = [];
        let lastAd: Parameters<EventState["playAd"]>[0] | null = null;
        let lastEmote: EmoteId | "" = "";
        const plays: WelcomePlay[] = [];
        for (const job of due) {
          const device = get().welcomeDevices.find((d) => d.id === job.deviceId);
          if (!device) continue;
          const guest = { login: job.login, display: job.display, site: job.site };
          const line = fillWelcome(device.chatLine, guest);
          lines.push(line);
          const play: WelcomePlay = {
            id: job.id,
            kind: device.kind,
            login: job.login,
            display: job.display,
            site: job.site,
            twitch: twitchUrl(job.login),
            line,
            until: now + WELCOME_TOAST_MS,
          };
          plays.push(play);
          if (device.overlay) {
            lastAd = {
              kind: "shout",
              kicker: welcomeKicker(device.kind),
              title: job.display,
              body: line,
              site: job.site,
              twitch: twitchUrl(job.login),
            };
          }
          if (device.emote) lastEmote = device.emote;
        }
        set((s) => {
          const last = { ...s.welcomeLast };
          for (const job of due) last[`${job.deviceId}:${job.login}`] = now;
          return {
            welcomeQueue: s.welcomeQueue.map((q) =>
              due.some((d) => d.id === q.id) ? { ...q, status: "sent" as const } : q,
            ),
            welcomeLast: last,
            welcomePlay: plays[plays.length - 1] ?? s.welcomePlay,
          };
        });
        if (lastAd) get().playAd(lastAd);
        if (lastEmote) get().playEmote(lastEmote, due[due.length - 1]?.display ?? "courtyard", { free: true });
        broadcastOverlay("popup");
        return lines;
      },
      markWelcomeSeen: (login) => {
        const key = normalizeName(login);
        if (!key) return false;
        if (get().welcomeSeen[key]) return false;
        set((s) => ({ welcomeSeen: { ...s.welcomeSeen, [key]: new Date().toISOString() } }));
        return true;
      },

      setEndingNotice: (patch) => {
        set((s) => ({ endingNotice: { ...s.endingNotice, ...patch } }));
        broadcastOverlay("state");
      },
      flushEndingNotice: (now) => {
        const at = get().endingNoticeAt;
        if (!at || at > now) return [];
        const notice = get().endingNotice;
        set({ endingNoticeAt: null });
        if (!notice.enabled) return [];
        const line = notice.line.trim() || DEFAULT_ENDING_NOTICE.line;
        broadcastOverlay("state");
        return [line];
      },

      upsertLesson: (lesson) => {
        set((s) => {
          const i = s.lessons.findIndex((l) => l.id === lesson.id);
          if (i < 0) return { lessons: [lesson, ...s.lessons].slice(0, 40) };
          const copy = [...s.lessons];
          copy[i] = lesson;
          return { lessons: copy };
        });
        broadcastOverlay("state");
      },
      removeLesson: (id) => {
        set((s) => ({
          lessons: s.lessons.filter((l) => l.id !== id),
          activeLessonId: s.activeLessonId === id ? null : s.activeLessonId,
        }));
        broadcastOverlay("state");
      },
      reviewLesson: (id) => {
        const lesson = get().lessons.find((l) => l.id === id);
        if (!lesson) return null;
        const report = runGuardrail({
          title: lesson.title,
          passage: lesson.passage,
          body: lesson.body,
        });
        set((s) => ({
          lessons: s.lessons.map((l) =>
            l.id === id
              ? {
                  ...l,
                  lastReview: report,
                  tightened: report.tightened,
                  flags: report.flags.map((f) => f.note),
                  status: report.verdict,
                }
              : l,
          ),
        }));
        broadcastOverlay("state");
        return report;
      },
      applyTightened: (id) => {
        const lesson = get().lessons.find((l) => l.id === id);
        if (!lesson?.tightened) return;
        set((s) => ({
          lessons: s.lessons.map((l) =>
            l.id === id ? { ...l, body: l.tightened } : l,
          ),
        }));
      },
      setLessonStatus: (id, status) => {
        set((s) => ({
          lessons: s.lessons.map((l) => (l.id === id ? { ...l, status } : l)),
        }));
        broadcastOverlay("state");
      },
      takeLessonLive: (id) => {
        const lesson = get().lessons.find((l) => l.id === id);
        if (!lesson) return "Lesson not found.";
        if (lesson.format === "text" && lesson.status === "held") {
          return "Held by the doctrine session. Revise and review before air.";
        }
        const quoted = verseFor(lesson.passage);
        if (lesson.passage && quoted) {
          set({ verseRef: lesson.passage, verseText: quoted });
        }
        set({ activeLessonId: id });
        get().setScene("scripture");
        get().startTimer({
          mode: "countdown",
          durationMs: 10 * 60_000,
          label: lesson.title || "Scripture time",
        });
        broadcastOverlay("state");
        return `Scripture Time · ${lesson.title} (${lesson.format})${lesson.passage ? ` · ${lesson.passage}` : ""}`;
      },
      clearLesson: () => {
        set({ activeLessonId: null });
        broadcastOverlay("state");
      },

      lockPicks: () => set({ picksLocked: true, picksOpen: false }),

      settleMatch: (side) => {
        const s = get();
        if (!s.picks.length) {
          set({ picksLocked: false, picksOpen: true, lastPickResult: null });
          return "";
        }
        const hits = s.picks.filter((p) => p.side === side);
        const next = { ...s.balances };
        for (const p of hits) {
          next[p.login] = (next[p.login] ?? STARTING_POINTS) + PICK_PAYOUT;
        }
        const note = hits.length
          ? ` ${hits.length} pick${hits.length === 1 ? "" : "s"} paid +${PICK_PAYOUT}.`
          : " No winning picks.";
        set({
          balances: next,
          picks: [],
          picksLocked: false,
          picksOpen: true,
          lastPickResult: `Side ${side} paid ${hits.length} picks.`,
        });
        return note;
      },

      handleCommand: (actor, name, args, ctx) => {
        const login = loginOf(actor);
        const display = actor.display || login;

        if (name === "overlay") {
          if (!actor.isMod) return "Only mods toggle the stream overlay.";
          const act = (args[0] ?? "").toLowerCase();
          const target = (args[1] ?? "all").toLowerCase();
          if ((act === "show" || act === "hide") && (target === "all" || !args[1])) {
            get().setAllLayers(act === "show");
            return act === "show" ? "All overlay layers shown." : "All overlay layers hidden.";
          }
          if (!(target in get().layers) && !(target in allLayersOn())) {
            return "Unknown layer. scene timer ad chat score next giveaway verse prayer study music redeem";
          }
          if (act === "hide") {
            get().setLayer(target as LayerId, false);
            return `${target} hidden on stream.`;
          }
          if (act === "show") {
            get().setLayer(target as LayerId, true);
            return `${target} shown on stream.`;
          }
          return "Usage: !overlay hide|show [layer|all]";
        }

        if (name === "scene") {
          if (!actor.isMod) return "Only mods change the intermission scene.";
          const token = (args[0] ?? "").toLowerCase();
          if (!token || token === "off" || token === "clear" || token === "live") {
            get().setScene(null);
            return "Intermission cleared. Back to live.";
          }
          const def = sceneByToken(token);
          if (!def) return "Usage: !scene starting|ending|prayer|scripture|off";
          get().setScene(def.id);
          get().startTimer({
            mode: "countdown",
            durationMs: def.defaultMin * 60_000,
            label: def.defaultLabel,
          });
          return `${def.name} up · ${def.defaultMin}m ${def.defaultLabel}`;
        }

        if (name === "starting" || name === "ending" || name === "brb") {
          if (!actor.isMod) return "Only mods run intermission timers.";
          const def = name === "brb" ? undefined : sceneByToken(name);
          const durArg = parseDurationMs(args[0] ?? "");
          const dur = durArg ?? (def ? def.defaultMin * 60_000 : 5 * 60_000);
          const label =
            args.slice(durArg ? 1 : 0).join(" ").trim() || (def?.defaultLabel ?? "Be right back");
          if (def) get().setScene(def.id);
          get().startTimer({ mode: "countdown", durationMs: dur, label, accumulated: 0 });
          return `${label} · ${Math.round(dur / 1000)}s`;
        }

        if (name === "giveaway" || name === "drop") {
          if (!actor.isMod) return "Only mods open a giveaway.";
          const prize = args.join(" ").trim() || "Mystery prize";
          set({
            giveawayOpen: true,
            giveawayPrize: prize,
            entries: [],
            winner: null,
            claimUntil: null,
          });
          broadcastOverlay("state");
          return `Giveaway OPEN — ${prize}. Type !enter`;
        }

        if (name === "enter") {
          if (!get().giveawayOpen) return "No giveaway is open.";
          if (get().entries.some((e) => e.login === login)) return "You are already in the pool.";
          set((s) => ({
            entries: [...s.entries, { login, display, at: new Date().toISOString() }],
          }));
          broadcastOverlay("state");
          return `${display} entered. ${get().entries.length} in the pool.`;
        }

        if (name === "draw") {
          if (!actor.isMod) return "Only mods draw.";
          const pool = get().entries;
          if (!pool.length) return "Nobody has entered.";
          const pick = pool[Math.floor(Math.random() * pool.length)]!;
          set({
            giveawayOpen: false,
            winner: pick,
            claimUntil: Date.now() + CLAIM_MS,
          });
          broadcastOverlay("popup");
          return `Drawn: ${pick.display}. 90s to !claim`;
        }

        if (name === "claim") {
          const w = get().winner;
          if (!w) return "Nothing to claim.";
          if (w.login !== login) return "Only the winner can !claim.";
          const until = get().claimUntil;
          if (until && Date.now() > until) return "Claim window closed. Mods can !redraw.";
          set({ claimUntil: null });
          broadcastOverlay("state");
          return `${display} claimed ${get().giveawayPrize}.`;
        }

        if (name === "redraw") {
          if (!actor.isMod) return "Only mods redraw.";
          const pool = get().entries.filter((e) => e.login !== get().winner?.login);
          if (!pool.length) return "No other entries.";
          const pick = pool[Math.floor(Math.random() * pool.length)]!;
          set({ winner: pick, claimUntil: Date.now() + CLAIM_MS, giveawayOpen: false });
          broadcastOverlay("popup");
          return `Redraw: ${pick.display}. 90s to !claim`;
        }

        if (name === "verse") {
          return `${get().verseRef} — ${get().verseText}`;
        }

        if (name === "setverse") {
          if (!actor.isMod) return "Only mods set the verse.";
          const raw = args.join(" ");
          const parts = raw.split("|");
          const ref = (parts[0] ?? "").trim();
          const text = (parts[1] ?? "").trim();
          if (!ref || !text) return "Usage: !setverse John 14:27 | Peace I leave with you";
          set({ verseRef: ref, verseText: text });
          broadcastOverlay("state");
          return `Verse set: ${ref}`;
        }

        if (name === "prayer") {
          const text = args.join(" ").trim();
          if (!text) return "Usage: !prayer your request";
          const item: PrayerItem = {
            id: uid("pr"),
            login,
            display,
            text,
            status: "pending",
            at: new Date().toISOString(),
          };
          set((s) => ({ prayers: [...s.prayers, item].slice(-40) }));
          return "Prayer queued. A mod will !approve.";
        }

        if (name === "approve") {
          if (!actor.isMod) return "Only mods approve prayers.";
          const pending = get().prayers.find((p) => p.status === "pending");
          if (!pending) return "No pending prayers.";
          set((s) => ({
            prayers: s.prayers.map((p) =>
              p.id === pending.id ? { ...p, status: "shown" as const } : p,
            ),
            shownPrayerId: pending.id,
          }));
          broadcastOverlay("state");
          return `Showing prayer from ${pending.display}.`;
        }

        if (name === "faith") {
          return `${get().verseRef} — ${get().verseText} · Type !prayer to add a request.`;
        }

        if (name === "points") {
          const bal = ensureBalance(get().balances, login);
          if (bal !== get().balances) set({ balances: bal });
          return `${display} has ${bal[login]} courtyard points.`;
        }

        if (name === "daily") {
          const today = dayKey();
          if (get().lastDaily[login] === today) return "You already claimed daily points today.";
          const bal = ensureBalance(get().balances, login);
          const next = { ...bal, [login]: (bal[login] ?? STARTING_POINTS) + DAILY_POINTS };
          set((s) => ({ balances: next, lastDaily: { ...s.lastDaily, [login]: today } }));
          return `Daily +${DAILY_POINTS}. Balance ${next[login]}.`;
        }

        if (name === "redeem") {
          const def = redeemBy(args[0] ?? "");
          if (!def) return "Usage: !redeem hype|panda|cross|bow|versecard";
          const now = Date.now();
          if (get().globalCdUntil > now) {
            return `Overlay cooling down ${Math.ceil((get().globalCdUntil - now) / 1000)}s.`;
          }
          const userKey = `${login}:${def.id}`;
          const until = get().userCd[userKey] ?? 0;
          if (until > now) return `${def.name} ready in ${Math.ceil((until - now) / 1000)}s.`;
          const bal = ensureBalance(get().balances, login);
          const have = bal[login] ?? STARTING_POINTS;
          if (have < def.cost) return `Need ${def.cost} pts. You have ${have}.`;
          const nextBal = { ...bal, [login]: have - def.cost };
          set((s) => ({
            balances: nextBal,
            userCd: { ...s.userCd, [userKey]: now + def.userCdMs },
            globalCdUntil: now + def.globalCdMs,
            popup: {
              id: def.id,
              by: display,
              at: new Date().toISOString(),
              until: now + def.durationMs,
            },
          }));
          broadcastOverlay("popup");
          return `${display} redeemed ${def.name} (−${def.cost}). ${nextBal[login]} left.`;
        }

        if (name === "pick") {
          if (get().picksLocked) return "Picks are locked for this set.";
          const side = Number(args[0]);
          if (side !== 1 && side !== 2) {
            return `Usage: !pick 1 (${ctx.p1Tag}) or !pick 2 (${ctx.p2Tag})`;
          }
          set((s) => ({
            picks: [
              ...s.picks.filter((p) => p.login !== login),
              { login, display, side: side as 1 | 2, at: new Date().toISOString() },
            ],
          }));
          return `${display} picks ${side === 1 ? ctx.p1Tag : ctx.p2Tag}.`;
        }

        if (name === "timer") {
          if (!actor.isMod) return "Only mods run the overlay timer.";
          const sub = (args[0] ?? "").toLowerCase();
          if (sub === "pause") {
            get().pauseTimer();
            return "Timer paused.";
          }
          if (sub === "resume" || sub === "go") {
            get().resumeTimer();
            return "Timer resumed.";
          }
          if (sub === "clear" || sub === "off") {
            get().clearTimer();
            return "Timer cleared.";
          }
          if (sub === "up" || sub === "countup") {
            const label = args.slice(1).join(" ").trim() || "Elapsed";
            get().startTimer({ mode: "countup", durationMs: 0, label, accumulated: 0 });
            return `Count-up started (${label}).`;
          }
          const dur = parseDurationMs(args[0] ?? "");
          if (!dur) return "Usage: !timer 10 | !timer 5:00 Label | !timer up | !timer pause|resume|clear";
          const label = args.slice(1).join(" ").trim() || "Intermission";
          get().startTimer({ mode: "countdown", durationMs: dur, label, accumulated: 0 });
          return `Countdown ${Math.round(dur / 1000)}s · ${label}`;
        }

        if (name === "ad" || name === "ads" || name === "break") {
          if (!actor.isMod) return "Only mods run ad breaks.";
          const token = (args[0] ?? "").toLowerCase();
          if (!token || token === "list") {
            return "Ads: !ad loy · !ad mss · !ad preview [tourney|xiaoyu|mss|points] · !so @user [site] · !ad off";
          }
          if (token === "off" || token === "clear") {
            get().clearAd();
            return "Ad break cleared.";
          }
          if (token === "loy" || token === "software" || token === "softwares") {
            const site = get().loySite;
            get().playAd({
              kind: "loy",
              kicker: "LOY Softwares",
              title: "Built for this stream",
              body: "Design flow and functionality by LOY Softwares — the courtyard, overlays, and scoring desk.",
              site,
              twitch: "",
            });
            return site
              ? `LOY Softwares is responsible for the design flow and functionality of this stream. ${site}`
              : "LOY Softwares is responsible for the design flow and functionality of this stream. Set a site with !loysite https://…";
          }
          if (token === "mss" || token === "intro") {
            get().playAd({
              kind: "mss",
              kicker: "MSS",
              title: "Maiden Stream Suite",
              body: "Introduction — intermission, timer, scoring, prayer, and courtyard tools in one desk.",
              site: get().loySite,
              twitch: "",
            });
            return "MSS intro on overlay. Maiden Stream Suite.";
          }
          if (token === "preview" || token === "project" || token === "slot") {
            const proj = projectByToken(args[1] ?? "") ?? PROJECTS[2];
            if (!proj) return "Usage: !ad preview tourney|xiaoyu|mss|points";
            get().playAd({
              kind: "preview",
              kicker: "Preview slot",
              title: proj.name,
              body: proj.blurb,
              site: get().loySite,
              twitch: "",
              projectId: proj.id,
            });
            return `Preview slot: ${proj.name} (${proj.status}).`;
          }
          return "Usage: !ad loy|mss|preview|off";
        }

        if (name === "loysite") {
          if (!actor.isMod) return "Only mods set the LOY site.";
          const site = normalizeSite(args[0] ?? "");
          if (!site) return "Usage: !loysite https://yoursite.com";
          get().setLoySite(site);
          return `LOY Softwares site set to ${site}`;
        }

        if (name === "so" || name === "shoutout") {
          if (!actor.isMod) return "Only mods can shout out.";
          const handle = (args[0] ?? "").replace(/^@/, "");
          if (!handle) return "Usage: !so @user [website]";
          const soLogin = handle.toLowerCase();
          const known = get().shoutbook.find((e) => e.login === soLogin);
          const siteArg = args.slice(1).join(" ").trim();
          const site = siteArg ? normalizeSite(siteArg) : known?.site || "";
          const soDisplay = known?.display || handle;
          if (siteArg) get().setShoutSite(soLogin, soDisplay, site);
          get().playAd({
            kind: "shout",
            kicker: "Shoutout",
            title: soDisplay,
            body: "Go show them some love.",
            site,
            twitch: twitchUrl(soLogin),
          });
          return shoutLine(soDisplay.startsWith("@") ? soDisplay : `@${soDisplay}`, soLogin, site);
        }

        if (name === "site") {
          if (!actor.isMod) return "Only mods save shoutout sites.";
          const handle = (args[0] ?? "").replace(/^@/, "");
          const site = args[1] ?? "";
          if (!handle || !site) return "Usage: !site @user https://…";
          get().setShoutSite(handle, handle, site);
          return `Saved site for @${handle}: ${normalizeSite(site)}`;
        }

        if (name === "emotes" || name === "emote") {
          if (name === "emotes" || !args[0]) return emotesHelp();
          const def = emoteByToken(args[0] ?? "");
          if (!def) return "Usage: !emote pray|hype|joy|fight|love|word";
          return get().playEmote(def.id, display, { login });
        }

        if (name === "hype" || name === "cheer" || name === "pray" || name === "joy" || name === "fight" || name === "love" || name === "word") {
          const def = emoteByToken(name === "cheer" ? "hype" : name);
          if (!def) return null;
          return get().playEmote(def.id, display, { login });
        }

        if (name === "welcome" || name === "greet" || name === "hi") {
          const sub = (args[0] ?? "").toLowerCase();
          if (!args[0] || sub === "status") {
            const q = get().welcomeQueue.filter((j) => j.status === "queued").length;
            return `Welcomes ${get().welcomesArmed ? "ONLINE (auto first chat)" : "OFFLINE (manual / queue)"}. ${q} queued. !welcome on|off · !welcome @user [kind] · !queue @user 15`;
          }
          if (sub === "on" || sub === "live" || sub === "online") {
            if (!actor.isMod) return "Only mods arm live welcomes.";
            get().setWelcomesArmed(true);
            return "Welcomes ONLINE — first chat auto-queues. Manage devices anytime, live or offline.";
          }
          if (sub === "off" || sub === "offline") {
            if (!actor.isMod) return "Only mods change welcome mode.";
            get().setWelcomesArmed(false);
            return "Welcomes OFFLINE — queue and fire by hand. Devices stay editable.";
          }
          if (sub === "list") {
            return get()
              .welcomeDevices.map((d) => `${d.enabled ? "on" : "off"} ${d.kind} ${d.name} ${Math.round(d.delayMs / 1000)}s`)
              .join(" · ");
          }
          if (!actor.isMod) return "Only mods fire welcome devices.";
          const kindA = parseWelcomeKind(args[0]);
          const kindB = parseWelcomeKind(args[1]);
          const kind = kindA ?? kindB ?? "first";
          const handle = (kindA ? args[1] : args[0])?.replace(/^@/, "");
          if (!handle) return "Usage: !welcome @user [first|follow|sub|raid|vip|return|special|timed]";
          return get().queueWelcome({ kind, login: handle, display: handle });
        }

        if (name === "raid" || name === "follow" || name === "sub") {
          if (!actor.isMod) return `Only mods run !${name}.`;
          const handle = (args[0] ?? "").replace(/^@/, "");
          if (!handle) return `Usage: !${name} @user`;
          return get().queueWelcome({
            kind: name === "follow" ? "follow" : name === "sub" ? "sub" : "raid",
            login: handle,
            display: handle,
          });
        }

        if (name === "queue") {
          if (!actor.isMod) return "Only mods queue timed shoutouts.";
          const handle = (args[0] ?? "").replace(/^@/, "");
          if (!handle) return "Usage: !queue @user [seconds] [kind]";
          const sec = Number(args[1]);
          const kind = parseWelcomeKind(args[2]) ?? parseWelcomeKind(args[1]) ?? "timed";
          const delayMs = Number.isFinite(sec) && sec >= 0 ? sec * 1000 : undefined;
          return get().queueWelcome({ kind, login: handle, display: handle, delayMs });
        }

        if (name === "unqueue" || name === "cancelso") {
          if (!actor.isMod) return "Only mods cancel queued welcomes.";
          const key = args[0] ?? "";
          if (!key) return "Usage: !unqueue @user";
          return get().cancelWelcome(key);
        }

        if (name === "src" || name === "repos" || name === "source" || name === "dev") {
          if (args[0]?.toLowerCase() === "ending") {
            return get().endingNotice.line;
          }
          return reposChatLine();
        }

        if (name === "endmsg") {
          if (!actor.isMod) return "Only mods edit the Ending Soon chat notice.";
          const sub = (args[0] ?? "").toLowerCase();
          if (!sub || sub === "status") {
            const n = get().endingNotice;
            return `Ending notice ${n.enabled ? "on" : "off"} · ${Math.round(n.delayMs / 1000)}s · ${n.line}`;
          }
          if (sub === "on") {
            get().setEndingNotice({ enabled: true });
            return "Ending Soon chat notice armed.";
          }
          if (sub === "off") {
            get().setEndingNotice({ enabled: false });
            return "Ending Soon chat notice off.";
          }
          const raw = args.join(" ");
          const parts = raw.split("|");
          const delay = parseDurationMs((parts[0] ?? "").trim());
          const text = (parts[1] ?? "").trim();
          if (delay && text) {
            get().setEndingNotice({ delayMs: delay, line: text, enabled: true });
            return `Ending notice in ${Math.round(delay / 1000)}s: ${text}`;
          }
          if (text || raw) {
            get().setEndingNotice({ line: (parts[1] ?? raw).trim(), enabled: true });
            return "Ending notice line saved.";
          }
          return "Usage: !endmsg on|off · !endmsg 8s | Your close line · !src";
        }

        if (name === "lesson" || name === "study" || name === "lessons") {
          const sub = (args[0] ?? "").toLowerCase();
          if (!sub || sub === "list") {
            const rows = get().lessons.map((l) => `${l.title} [${l.format}/${l.status}]`);
            return rows.length ? `Lessons: ${rows.join(" · ")}` : "No lessons yet. Add them on the Events desk.";
          }
          if (sub === "off" || sub === "clear") {
            get().clearLesson();
            return "Study overlay cleared.";
          }
          if (!actor.isMod) return "Only mods take a lesson to air.";
          const q = args.slice(sub === "play" || sub === "air" ? 1 : 0).join(" ").toLowerCase();
          const hit = get().lessons.find(
            (l) => l.id === q || l.title.toLowerCase().includes(q) || l.format === q,
          );
          if (!hit) return "Usage: !lesson list · !lesson play [title] · !lesson off";
          return get().takeLessonLive(hit.id);
        }

        return null;
      },
    }),
    {
      name: "panda-events-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        layers: s.layers,
        giveawayOpen: s.giveawayOpen,
        giveawayPrize: s.giveawayPrize,
        entries: s.entries,
        winner: s.winner,
        claimUntil: s.claimUntil,
        verseRef: s.verseRef,
        verseText: s.verseText,
        prayers: s.prayers,
        shownPrayerId: s.shownPrayerId,
        balances: s.balances,
        lastDaily: s.lastDaily,
        userCd: s.userCd,
        globalCdUntil: s.globalCdUntil,
        popup: s.popup,
        picksOpen: s.picksOpen,
        picksLocked: s.picksLocked,
        picks: s.picks,
        lastPickResult: s.lastPickResult,
        scene: s.scene,
        timer: s.timer,
        ad: s.ad,
        shoutbook: s.shoutbook,
        loySite: s.loySite,
        emote: s.emote,
        welcomesArmed: s.welcomesArmed,
        welcomeDevices: s.welcomeDevices,
        welcomeQueue: s.welcomeQueue,
        welcomeSeen: s.welcomeSeen,
        welcomeLast: s.welcomeLast,
        endingNotice: s.endingNotice,
        lessons: s.lessons,
        activeLessonId: s.activeLessonId,
      }),
    },
  ),
);

function LAYER_IDS_OFF(): [LayerId, boolean][] {
  return [
    ["scene", false],
    ["timer", false],
    ["ad", false],
    ["chat", false],
    ["score", false],
    ["next", false],
    ["giveaway", false],
    ["verse", false],
    ["prayer", false],
    ["study", false],
    ["music", false],
    ["redeem", false],
  ];
}

export function shownPrayer(s: Pick<EventState, "prayers" | "shownPrayerId">) {
  return s.prayers.find((p) => p.id === s.shownPrayerId) ?? null;
}
