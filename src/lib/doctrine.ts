export type FlagSeverity = "block" | "warn";

export type DoctrineFlag = {
  id: string;
  severity: FlagSeverity;
  note: string;
};

export type GuardrailVerdict = "cleared" | "revise" | "held";

export type GuardrailReport = {
  at: string;
  verdict: GuardrailVerdict;
  flags: DoctrineFlag[];
  tightened: string;
  passage: string;
};

export const DOCTRINE_AFFIRMATIONS = [
  "The Bible is the inspired, inerrant, and immutable Word of God.",
  "This lesson sits under Scripture. It is not a new revelation.",
  "Claims are bound to cited chapter and verse — not feeling, culture, or private voice.",
  "Christ is not set aside for experience. The Word judges the lesson.",
];

const VERSE_BANK: Record<string, string> = {
  "psalm 119:105": "Your word is a lamp to my feet and a light to my path.",
  "john 14:27": "Peace I leave with you; my peace I give to you. Not as the world gives do I give to you.",
  "john 17:17": "Sanctify them in the truth; your word is truth.",
  "2 timothy 3:16": "All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness.",
  "isaiah 40:8": "The grass withers, the flower fades, but the word of our God will stand forever.",
  "hebrews 13:8": "Jesus Christ is the same yesterday and today and forever.",
  "philippians 4:6": "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.",
  "philippians 4:13": "I can do all things through him who strengthens me.",
  "joshua 1:9": "Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.",
  "psalm 118:24": "This is the day that the Lord has made; let us rejoice and be glad in it.",
  "1 thessalonians 5:11": "Therefore encourage one another and build one another up, just as you are doing.",
  "matthew 24:35": "Heaven and earth will pass away, but my words will not pass away.",
  "proverbs 30:5": "Every word of God proves true; he is a shield to those who take refuge in him.",
  "galatians 1:8": "But even if we or an angel from heaven should preach to you a gospel contrary to the one we preached to you, let him be accursed.",
};

const PASSAGE_RE =
  /\b(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm|psalms|proverbs|ecclesiastes|song|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\b\.?\s*\d+:\d+(?:\s*[-–]\s*\d+)?/gi;

const BLOCKS: { id: string; re: RegExp; note: string }[] = [
  {
    id: "new-revelation",
    re: /\b(god told me|the lord told me|new revelation|fresh word beyond (the )?scripture|scripture is outdated)\b/i,
    note: "Sounds like extra-biblical revelation. The canon is closed. Bind it to written Scripture or cut it.",
  },
  {
    id: "mutable-word",
    re: /\b(the word (has )?changed|times have changed the (bible|word)|my truth|your truth|outdated bible)\b/i,
    note: "Treats the Word as mutable. Heaven and earth pass away; His words do not (Matt 24:35).",
  },
  {
    id: "other-gospel",
    re: /\b(earn (your |our )?salvation|saved by works alone|another gospel)\b/i,
    note: "Watch the gospel. Salvation is of the Lord — do not add a contrary gospel (Gal 1:8).",
  },
];

const WARNS: { id: string; re: RegExp; note: string }[] = [
  {
    id: "prosperity",
    re: /\b(name it and claim it|sow a seed for (a )?breakthrough|god owes|guaranteed wealth)\b/i,
    note: "Prosperity framing. Test it against the whole counsel of God, not a slogan.",
  },
  {
    id: "feeling-first",
    re: /\b(just follow your heart|if it feels right)\b/i,
    note: "Feeling is not the rule of faith. The heart is not the canon.",
  },
  {
    id: "equal-to-word",
    re: /\b(this lesson is (also )?scripture|my notes are the word)\b/i,
    note: "Lesson and Scripture are not the same voice. Label teaching as teaching.",
  },
];

export function findPassages(text: string) {
  const found = new Set<string>();
  const blob = text || "";
  for (const m of blob.matchAll(PASSAGE_RE)) {
    found.add(m[0].replace(/\s+/g, " ").trim());
  }
  return [...found];
}

export function verseFor(ref: string) {
  const key = ref.trim().toLowerCase().replace(/\s+/g, " ");
  return VERSE_BANK[key] ?? "";
}

export function runGuardrail(input: { passage: string; body: string; title?: string }): GuardrailReport {
  const blob = `${input.passage}\n${input.body}`;
  const flags: DoctrineFlag[] = [];
  const citations = findPassages(blob);
  if (!input.passage.trim() && citations.length === 0) {
    flags.push({
      id: "no-citation",
      severity: "block",
      note: "No chapter and verse. The Word must lead. Add a passage before this airs.",
    });
  }
  if (input.body.trim().length < 40) {
    flags.push({
      id: "too-thin",
      severity: "warn",
      note: "Body is thin. Exposition should open the text, not replace it with a slogan.",
    });
  }
  for (const rule of BLOCKS) {
    if (rule.re.test(blob)) flags.push({ id: rule.id, severity: "block", note: rule.note });
  }
  for (const rule of WARNS) {
    if (rule.re.test(blob)) flags.push({ id: rule.id, severity: "warn", note: rule.note });
  }

  const blocked = flags.some((f) => f.severity === "block");
  const warned = flags.some((f) => f.severity === "warn");
  const verdict: GuardrailVerdict = blocked ? "held" : warned ? "revise" : "cleared";

  return {
    at: new Date().toISOString(),
    verdict,
    flags,
    tightened: tightenLesson(input),
    passage: input.passage.trim() || citations[0] || "",
  };
}

export function tightenLesson(input: { passage: string; body: string; title?: string }) {
  const citations = findPassages(`${input.passage}\n${input.body}`);
  const passage = input.passage.trim() || citations[0] || "Scripture not cited";
  const quoted = verseFor(passage);
  const raw = input.body.replace(/\s+/g, " ").trim();
  const cleaned = raw
    .replace(/\b(god told me|the lord told me personally)\b/gi, "as the written Word says")
    .replace(/\b(my truth|your truth)\b/gi, "the truth of Scripture")
    .trim();

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const apply = sentences.filter((s) => /^(so |therefore |let us |we |go )/i.test(s));
  const teach = sentences.filter((s) => !apply.includes(s));

  const lines = [
    input.title ? `${input.title.trim()}` : "",
    "",
    "THE WORD",
    passage,
    quoted ? `“${quoted}”` : "",
    citations.filter((c) => c.toLowerCase() !== passage.toLowerCase()).join(" · "),
    "",
    "TEACHING (not Scripture)",
    teach.join(" ") || "Open the passage. Do not add to it.",
    "",
    apply.length ? "TO WALK" : "",
    apply.join(" "),
    "",
    "The Word stands forever (Isaiah 40:8). This lesson does not add to it.",
  ];
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n").trim();
}
