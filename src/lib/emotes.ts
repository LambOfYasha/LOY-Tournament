export type EmoteId = "pray" | "hype" | "joy" | "fight" | "love" | "word";
export type MatchMoment = "before" | "during" | "after";

export type EmoteDef = {
  id: EmoteId;
  name: string;
  token: string;
  aliases: string[];
  moment: MatchMoment;
  momentLabel: string;
  ref: string;
  verse: string;
  cost: number;
  durationMs: number;
  userCdMs: number;
  globalCdMs: number;
  blurb: string;
};

export const EMOTES: EmoteDef[] = [
  {
    id: "pray",
    name: "Pray",
    token: ":pray:",
    aliases: ["pray", "amen", "prayerful"],
    moment: "before",
    momentLabel: "Before the set",
    ref: "Philippians 4:6",
    verse:
      "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.",
    cost: 50,
    durationMs: 7500,
    userCdMs: 45_000,
    globalCdMs: 10_000,
    blurb: "Hands together before the first round.",
  },
  {
    id: "hype",
    name: "Hype",
    token: ":hype:",
    aliases: ["hype", "cheer", "letsgo", "go"],
    moment: "during",
    momentLabel: "During the set",
    ref: "Philippians 4:13",
    verse: "I can do all things through him who strengthens me.",
    cost: 50,
    durationMs: 7000,
    userCdMs: 40_000,
    globalCdMs: 10_000,
    blurb: "Cheer the courtyard through a big round.",
  },
  {
    id: "joy",
    name: "Joy",
    token: ":joy:",
    aliases: ["joy", "gg", "rejoice", "win"],
    moment: "after",
    momentLabel: "After the set",
    ref: "Psalm 118:24",
    verse: "This is the day that the Lord has made; let us rejoice and be glad in it.",
    cost: 50,
    durationMs: 7500,
    userCdMs: 45_000,
    globalCdMs: 10_000,
    blurb: "Gladness when the bracket settles.",
  },
  {
    id: "fight",
    name: "Fight",
    token: ":fight:",
    aliases: ["fight", "clutch", "courage", "stand"],
    moment: "during",
    momentLabel: "During the set",
    ref: "Joshua 1:9",
    verse:
      "Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.",
    cost: 50,
    durationMs: 7000,
    userCdMs: 40_000,
    globalCdMs: 10_000,
    blurb: "Courage mid-match. Stand firm.",
  },
  {
    id: "love",
    name: "Love",
    token: ":love:",
    aliases: ["love", "heart", "glhf", "encourage"],
    moment: "after",
    momentLabel: "After the set",
    ref: "1 Thessalonians 5:11",
    verse: "Therefore encourage one another and build one another up, just as you are doing.",
    cost: 40,
    durationMs: 7000,
    userCdMs: 35_000,
    globalCdMs: 8_000,
    blurb: "Build each other up — win or lose.",
  },
  {
    id: "word",
    name: "Word",
    token: ":word:",
    aliases: ["word", "bible", "scripture"],
    moment: "before",
    momentLabel: "Before the set",
    ref: "Psalm 119:105",
    verse: "Your word is a lamp to my feet and a light to my path.",
    cost: 60,
    durationMs: 8500,
    userCdMs: 50_000,
    globalCdMs: 12_000,
    blurb: "Open the Word. Light for the next round.",
  },
];

export const EMOTE_INTRO =
  "Courtyard emotes are live — drop :pray: :hype: :joy: :fight: :love: :word: in chat. Each one carries a verse for before, during, and after the set. !emotes for the list. Pray. Train. Trust.";

export const EMOTE_INTRO_MS = 5500;
export const CHAT_EMOTE_GLOBAL_MS = 8000;

export type EmotePlay = {
  id: EmoteId;
  by: string;
  at: string;
  until: number;
};

export function emoteSrc(id: EmoteId) {
  return `/emotes/${id}.png`;
}

export function emoteByToken(raw: string) {
  const t = raw.trim().toLowerCase().replace(/^:/, "").replace(/:$/, "");
  return EMOTES.find((e) => e.id === t || e.token === `:${t}:` || e.aliases.includes(t));
}

const TOKEN_RE = /:(pray|hype|joy|fight|love|word):/gi;

export function findEmoteTokens(text: string): EmoteId[] {
  const found: EmoteId[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const id = m[1]?.toLowerCase() as EmoteId | undefined;
    if (id && EMOTES.some((e) => e.id === id) && !found.includes(id)) found.push(id);
  }
  return found;
}

export type EmotePiece =
  | { type: "text"; value: string }
  | { type: "emote"; id: EmoteId };

export function splitEmoteText(text: string): EmotePiece[] {
  const parts: EmotePiece[] = [];
  let last = 0;
  const re = /:(pray|hype|joy|fight|love|word):/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "emote", id: m[1]!.toLowerCase() as EmoteId });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length ? parts : [{ type: "text", value: text }];
}

export function emotesHelp() {
  return EMOTES.map(
    (e) => `${e.token} ${e.name} · ${e.momentLabel} · ${e.ref} · ${e.cost}pts`,
  ).join(" · ");
}
