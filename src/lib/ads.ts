export type AdKind = "loy" | "mss" | "preview" | "shout";

export type ProjectStatus = "live" | "dev" | "soon";

export type ProjectSlot = {
  id: string;
  name: string;
  status: ProjectStatus;
  blurb: string;
};

export type ShoutEntry = {
  login: string;
  display: string;
  site: string;
};

export type AdPlay = {
  kind: AdKind;
  until: number;
  kicker: string;
  title: string;
  body: string;
  site: string;
  twitch: string;
  projectId?: string;
};

export const AD_MS: Record<AdKind, number> = {
  loy: 12_000,
  mss: 15_000,
  preview: 16_000,
  shout: 12_000,
};

export const PROJECTS: ProjectSlot[] = [
  {
    id: "tourney",
    name: "LOY Tournament",
    status: "live",
    blurb: "Gothic control desk, dual-confirm offstream, next-up, and scorebug.",
  },
  {
    id: "xiaoyu",
    name: "Xiao_PandaMaiden",
    status: "live",
    blurb: "Courtyard chat for twitch.tv/xiao_pandamaiden · #lambs_shadow.",
  },
  {
    id: "mss",
    name: "Maiden Stream Suite",
    status: "dev",
    blurb: "Intermission boards, timer, ads, and personal Watch toggles.",
  },
  {
    id: "points",
    name: "Courtyard Points",
    status: "dev",
    blurb: "Redeems, match picks, and giveaway overlay states.",
  },
];

export const DEFAULT_SHOUTS: ShoutEntry[] = [
  { login: "xiao_pandamaiden", display: "Xiao_PandaMaiden", site: "https://twitch.tv/xiao_pandamaiden" },
  { login: "lambs_shadow", display: "lambs_shadow", site: "https://twitch.tv/lambs_shadow" },
];

export function twitchUrl(login: string) {
  const handle = login.replace(/^@/, "").trim().toLowerCase();
  return handle ? `https://twitch.tv/${handle}` : "";
}

export function normalizeSite(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function shoutLine(display: string, login: string, site: string) {
  const tv = twitchUrl(login);
  const web = site && site !== tv ? ` · site ${site}` : "";
  return `Go show ${display} some love — ${tv}${web}`;
}

export function projectByToken(raw: string) {
  const t = raw.trim().toLowerCase();
  return PROJECTS.find((p) => p.id === t || p.name.toLowerCase().includes(t));
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: "Live now",
  dev: "In development",
  soon: "Coming soon",
};

export const MSS_POINTS = [
  "Intermission boards",
  "Overlay timer",
  "Dual-confirm scoring",
  "Prayer and verse",
  "Courtyard points",
];
