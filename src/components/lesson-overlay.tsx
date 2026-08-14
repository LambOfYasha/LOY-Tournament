import { lessonAirText, lessonMedia, FORMAT_LABEL, type Lesson } from "@/lib/lessons";
import { verseFor } from "@/lib/doctrine";

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const quoted = verseFor(lesson.passage);
  const media = lessonMedia(lesson);
  const body = lesson.format === "text" ? lessonAirText(lesson) : lesson.notes || lesson.body;

  return (
    <article className="ov-study" aria-label="Scripture study">
      <p className="ov-kicker">
        Scripture Time · {FORMAT_LABEL[lesson.format]}
      </p>
      <strong>{lesson.title}</strong>
      {lesson.passage ? <cite>{lesson.passage}</cite> : null}
      {quoted ? <blockquote>{quoted}</blockquote> : null}
      {lesson.format === "text" && body ? (
        <p className="ov-study-body">{body.split("\n").filter(Boolean).slice(0, 4).join(" ")}</p>
      ) : null}
      {media.kind !== "none" && media.src ? (
        <span className="ov-fine">{FORMAT_LABEL[lesson.format]} ready on Study</span>
      ) : null}
    </article>
  );
}
