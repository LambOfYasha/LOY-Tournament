export type BotRole = "mod" | "player";

export type BotActor = {
  login: string;
  display: string;
  isMod: boolean;
};

export const BOT_LOGIN = "xiao_pandamaiden";
export const BOT_DISPLAY = "Xiao_PandaMaiden";
export const BOT_CHANNEL = "lambs_shadow";
export const BOT_TAGLINE = "Sunday Bible & Tekken · Faith · Focus · Fight";

export function normalizeName(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function parseCommand(raw: string): { name: string; args: string[] } | null {
  const text = raw.trim();
  if (!text.startsWith("!")) return null;
  const parts = text.slice(1).split(/\s+/).filter(Boolean);
  const name = parts.shift()?.toLowerCase();
  if (!name) return null;
  return { name, args: parts };
}

export function parseScorePair(args: string[]): { a: number; b: number } | null {
  const joined = args.join(" ");
  const m = joined.match(/(\d+)\s*[-:xto]\s*(\d+)/i) ?? joined.match(/^(\d+)\s+(\d+)$/);
  if (!m) return null;
  return { a: Number(m[1]), b: Number(m[2]) };
}

export function isValidSeriesScore(bestOf: number, win: number, lose: number) {
  const firstTo = Math.ceil(bestOf / 2);
  return win >= firstTo && lose < firstTo && lose >= 0 && win > lose;
}

export const BOT_HELP = [
  `${BOT_DISPLAY} · #${BOT_CHANNEL} · ${BOT_TAGLINE}`,
  "Tournament: !checkin !offstream @p1 @p2 !report 2-1 !confirm !dispute !dq @p !noshow @p !next @p1 @p2",
  "Giveaway: !enter · mods: !giveaway [prize] !draw !redraw !claim",
  "Faith: !verse !prayer … !faith · mods: !setverse Ref | Text  !approve · !lesson list|play|off",
  "Emotes: :pray: :hype: :joy: :fight: :love: :word: · !emote pray|hype|joy|fight|love|word · !emotes",
  "Points: !points !daily !redeem hype|panda|cross|bow|versecard !pick 1|2",
  "Overlay (mods): !overlay hide|show [scene|timer|ad|chat|score|…]  !scene starting|ending|prayer|scripture|off",
  "Timer (mods): !starting 10 · !ending 5 · !brb 5 · !timer 5:00 Label · !timer pause|resume|clear",
  "Ads (mods): !ad loy · !ad mss · !ad preview tourney|xiaoyu|mss|points · !so @user [site] · !loysite https://… · !site @user https://…",
  "Welcome (mods): !welcome on|off · !welcome @user [first|follow|sub|raid|vip|return|special] · !raid @u · !queue @u 15 · !unqueue @u",
  "Source (devs): !src · !repos · !endmsg on|off · !endmsg 8s | close line  (Ending Soon fires the timed chat)",
].join(" · ");
