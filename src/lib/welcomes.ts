import { twitchUrl, normalizeSite } from "@/lib/ads";
import type { EmoteId } from "@/lib/emotes";

export type WelcomeKind =
  | "first"
  | "follow"
  | "sub"
  | "raid"
  | "vip"
  | "return"
  | "special"
  | "timed";

export type WelcomeDevice = {
  id: string;
  kind: WelcomeKind;
  enabled: boolean;
  name: string;
  login: string;
  display: string;
  site: string;
  chatLine: string;
  delayMs: number;
  cooldownMs: number;
  overlay: boolean;
  emote: EmoteId | "";
};

export type WelcomeJob = {
  id: string;
  deviceId: string;
  kind: WelcomeKind;
  login: string;
  display: string;
  site: string;
  fireAt: number;
  status: "queued" | "sent" | "cancelled";
};

export type WelcomePlay = {
  id: string;
  kind: WelcomeKind;
  login: string;
  display: string;
  site: string;
  twitch: string;
  line: string;
  until: number;
};

export const WELCOME_KIND_LABEL: Record<WelcomeKind, string> = {
  first: "First chat",
  follow: "Follow",
  sub: "Subscribe",
  raid: "Raid",
  vip: "VIP",
  return: "Returning",
  special: "Special guest",
  timed: "Timed !so",
};

export const WELCOME_KINDS = Object.keys(WELCOME_KIND_LABEL) as WelcomeKind[];

export const WELCOME_TOAST_MS = 8000;

export const DEFAULT_DEVICES: WelcomeDevice[] = [
  {
    id: "w-first",
    kind: "first",
    enabled: true,
    name: "First chat",
    login: "",
    display: "",
    site: "",
    chatLine:
      "Welcome to the courtyard, {user} — {twitch}. Prayer · Bible · Tekken. Type !emotes when you're ready.",
    delayMs: 2500,
    cooldownMs: 0,
    overlay: false,
    emote: "love",
  },
  {
    id: "w-follow",
    kind: "follow",
    enabled: true,
    name: "New follow",
    login: "",
    display: "",
    site: "",
    chatLine: "Thank you for the follow, {user}! Sit with #lambs_shadow — {twitch}{site}",
    delayMs: 1500,
    cooldownMs: 20_000,
    overlay: true,
    emote: "love",
  },
  {
    id: "w-sub",
    kind: "sub",
    enabled: true,
    name: "New sub",
    login: "",
    display: "",
    site: "",
    chatLine: "A new lamb in the fold — thank you {user}! Go show them love {twitch}{site}",
    delayMs: 2000,
    cooldownMs: 15_000,
    overlay: true,
    emote: "joy",
  },
  {
    id: "w-raid",
    kind: "raid",
    enabled: true,
    name: "Raid in",
    login: "",
    display: "",
    site: "",
    chatLine: "RAID in from {user}! Welcome the flock — {twitch}{site}",
    delayMs: 3000,
    cooldownMs: 10_000,
    overlay: true,
    emote: "hype",
  },
  {
    id: "w-vip",
    kind: "vip",
    enabled: true,
    name: "VIP in chat",
    login: "",
    display: "",
    site: "",
    chatLine: "VIP in the courtyard — {user}. {twitch}",
    delayMs: 1000,
    cooldownMs: 30_000,
    overlay: false,
    emote: "",
  },
  {
    id: "w-return",
    kind: "return",
    enabled: true,
    name: "Welcome back",
    login: "",
    display: "",
    site: "",
    chatLine: "Welcome back, {user}. The courtyard saved you a seat. {twitch}",
    delayMs: 1500,
    cooldownMs: 60_000,
    overlay: false,
    emote: "pray",
  },
  {
    id: "w-special",
    kind: "special",
    enabled: true,
    name: "Special guest",
    login: "",
    display: "",
    site: "",
    chatLine: "Special welcome — {user} is in the courtyard. Go show them love {twitch}{site}",
    delayMs: 4000,
    cooldownMs: 15_000,
    overlay: true,
    emote: "word",
  },
  {
    id: "w-timed",
    kind: "timed",
    enabled: true,
    name: "Timed !so",
    login: "",
    display: "",
    site: "",
    chatLine: "Go show {user} some love — {twitch}{site}",
    delayMs: 15_000,
    cooldownMs: 0,
    overlay: true,
    emote: "",
  },
];

export function fillWelcome(
  template: string,
  guest: { display: string; login: string; site: string },
) {
  const tv = twitchUrl(guest.login);
  const site = guest.site && guest.site !== tv ? ` · ${guest.site}` : "";
  return template
    .replaceAll("{user}", guest.display)
    .replaceAll("{login}", guest.login)
    .replaceAll("{twitch}", tv || `https://twitch.tv/${guest.login}`)
    .replaceAll("{site}", site);
}

export function parseWelcomeKind(raw: string | undefined): WelcomeKind | null {
  const t = (raw ?? "").toLowerCase().replace(/^@/, "");
  if ((WELCOME_KINDS as string[]).includes(t)) return t as WelcomeKind;
  if (t === "so" || t === "shout") return "timed";
  if (t === "guest") return "special";
  if (t === "resub" || t === "gift") return "sub";
  if (t === "host") return "raid";
  if (t === "hello" || t === "hi" || t === "new") return "first";
  return null;
}

export function deviceByKind(devices: WelcomeDevice[], kind: WelcomeKind) {
  return devices.find((d) => d.kind === kind && d.enabled) ?? devices.find((d) => d.kind === kind);
}

export function secondsLabel(ms: number) {
  if (ms < 1000) return "now";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function welcomeKicker(kind: WelcomeKind) {
  return WELCOME_KIND_LABEL[kind];
}

export { twitchUrl, normalizeSite };
