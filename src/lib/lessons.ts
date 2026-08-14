import { verseFor, type GuardrailReport, type GuardrailVerdict } from "@/lib/doctrine";

export type LessonFormat = "text" | "audio" | "video" | "canva" | "slides";

export type Lesson = {
  id: string;
  title: string;
  format: LessonFormat;
  passage: string;
  sourceUrl: string;
  body: string;
  notes: string;
  status: GuardrailVerdict | "draft";
  tightened: string;
  flags: string[];
  lastReview: GuardrailReport | null;
  createdAt: string;
};

export const FORMAT_LABEL: Record<LessonFormat, string> = {
  text: "Text",
  audio: "Audio",
  video: "Video",
  canva: "Canva",
  slides: "Slideshow",
};

export const FORMATS = Object.keys(FORMAT_LABEL) as LessonFormat[];

export function newLessonId() {
  return `ls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const SEED_LESSONS: Lesson[] = [
  {
    id: "ls-lamp",
    title: "A lamp to our feet",
    format: "text",
    passage: "Psalm 119:105",
    sourceUrl: "",
    body: "The Word is not a suggestion for the courtyard. It is a lamp. We do not invent a path and ask Scripture to bless it — we open the text and walk where it shines. Application: read the next verse slowly before the set.",
    notes: "Sunday Scripture Time opener.",
    status: "cleared",
    tightened: "",
    flags: [],
    lastReview: null,
    createdAt: "2026-08-14T00:00:00.000Z",
  },
  {
    id: "ls-peace",
    title: "Peace I leave with you",
    format: "text",
    passage: "John 14:27",
    sourceUrl: "",
    body: "Christ gives peace unlike the world. We do not manufacture calm for the bracket — we receive what He leaves with His people. Let the verse be read aloud before prayer.",
    notes: "",
    status: "draft",
    tightened: "",
    flags: [],
    lastReview: null,
    createdAt: "2026-08-14T00:00:00.000Z",
  },
];

export function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return m?.[1] ?? "";
}

export function canvaEmbed(url: string) {
  const t = url.trim();
  if (!t) return "";
  if (t.includes("/view?embed")) return t;
  const design = t.match(/canva\.com\/design\/([^/?#]+)/i);
  if (design) return `https://www.canva.com/design/${design[1]}/view?embed`;
  return t;
}

export function lessonMedia(lesson: Lesson) {
  const url = lesson.sourceUrl.trim();
  if (lesson.format === "video" || youtubeId(url)) {
    const id = youtubeId(url);
    if (id) return { kind: "youtube" as const, src: `https://www.youtube.com/embed/${id}` };
    if (url) return { kind: "video" as const, src: url };
  }
  if (lesson.format === "canva" || /canva\.com/i.test(url)) {
    return { kind: "iframe" as const, src: canvaEmbed(url) };
  }
  if (lesson.format === "slides" && url) return { kind: "iframe" as const, src: url };
  if (lesson.format === "audio" && url) return { kind: "audio" as const, src: url };
  return { kind: "none" as const, src: "" };
}

export function lessonAirText(lesson: Lesson) {
  if (lesson.tightened.trim()) return lesson.tightened;
  const quoted = verseFor(lesson.passage);
  const body = lesson.body.trim();
  return [lesson.title, lesson.passage, quoted ? `“${quoted}”` : "", body].filter(Boolean).join("\n");
}
