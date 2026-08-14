import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEvents } from "@/lib/event-store";
import { DOCTRINE_AFFIRMATIONS } from "@/lib/doctrine";
import {
  FORMAT_LABEL,
  FORMATS,
  lessonMedia,
  newLessonId,
  type Lesson,
  type LessonFormat,
} from "@/lib/lessons";

export function StudyBoard() {
  const lessons = useEvents((s) => s.lessons);
  const activeId = useEvents((s) => s.activeLessonId);
  const upsert = useEvents((s) => s.upsertLesson);
  const remove = useEvents((s) => s.removeLesson);
  const review = useEvents((s) => s.reviewLesson);
  const applyTightened = useEvents((s) => s.applyTightened);
  const setStatus = useEvents((s) => s.setLessonStatus);
  const takeLive = useEvents((s) => s.takeLessonLive);
  const clearLesson = useEvents((s) => s.clearLesson);

  const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<LessonFormat>("text");
  const [passage, setPassage] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [body, setBody] = useState("");
  const [affirmed, setAffirmed] = useState<Record<number, boolean>>({});

  const selected = useMemo(
    () => lessons.find((l) => l.id === selectedId) ?? lessons[0] ?? null,
    [lessons, selectedId],
  );
  const media = selected ? lessonMedia(selected) : null;
  const allAffirmed = DOCTRINE_AFFIRMATIONS.every((_, i) => affirmed[i]);

  function feedNew() {
    if (!title.trim()) {
      toast("Give the lesson a title", { className: "toast-gothic" });
      return;
    }
    const lesson: Lesson = {
      id: newLessonId(),
      title: title.trim(),
      format,
      passage: passage.trim(),
      sourceUrl: sourceUrl.trim(),
      body: body.trim(),
      notes: "",
      status: format === "text" ? "draft" : "cleared",
      tightened: "",
      flags: [],
      lastReview: null,
      createdAt: new Date().toISOString(),
    };
    upsert(lesson);
    setSelectedId(lesson.id);
    setTitle("");
    setBody("");
    setSourceUrl("");
    setPassage("");
    toast(`${FORMAT_LABEL[format]} lesson fed`, { className: "toast-gothic" });
  }

  function runSession() {
    if (!selected) return;
    const report = review(selected.id);
    if (!report) return;
    toast(
      report.verdict === "held"
        ? "Held — the Word must lead"
        : report.verdict === "revise"
          ? "Revise, then clear"
          : "Scan clear — affirm to air",
      { className: "toast-gothic" },
    );
  }

  function clearForAir() {
    if (!selected) return;
    if (!allAffirmed) {
      toast("Affirm the four doctrine checks first", { className: "toast-gothic" });
      return;
    }
    if (selected.status === "held") {
      toast("Still held. Tighten and review again.", { className: "toast-gothic" });
      return;
    }
    setStatus(selected.id, "cleared");
    toast("Cleared for Scripture Time", { className: "toast-gothic" });
  }

  return (
    <div className="study-board">
      <p className="off-meta">
        Feed Scripture Time with text, audio, video, or Canva / slideshows.
        Text lessons pass a doctrine-first session — the Word is immutable;
        the lesson is not.
      </p>

      <h3 className="off-sub">Feed a lesson</h3>
      <div className="add-row">
        <input
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Lesson title"
        />
        <select
          className="field-input"
          value={format}
          onChange={(e) => setFormat(e.target.value as LessonFormat)}
          aria-label="Lesson format"
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABEL[f]}
            </option>
          ))}
        </select>
      </div>
      <div className="add-row">
        <input
          className="field-input"
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
          placeholder="Passage · John 17:17"
          aria-label="Primary passage"
        />
        <input
          className="field-input"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Audio / video / Canva URL"
          aria-label="Media URL"
        />
      </div>
      <textarea
        className="field-input welcome-line"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Text body or teaching notes (required for the doctrine session)"
        aria-label="Lesson body"
      />
      <div className="ghost-row">
        <button type="button" className="add-btn" onClick={feedNew}>
          Feed lesson
        </button>
      </div>

      <h3 className="off-sub">Library</h3>
      {lessons.length === 0 ? (
        <p className="off-meta">No lessons yet.</p>
      ) : (
        <ul className="study-list">
          {lessons.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className="study-item"
                data-on={l.id === selected?.id}
                onClick={() => {
                  setSelectedId(l.id);
                  setAffirmed({});
                }}
              >
                <em>
                  {FORMAT_LABEL[l.format]} · {l.status}
                </em>
                <strong>{l.title}</strong>
                <span>{l.passage || "No passage yet"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="study-selected">
          <p className="off-report">
            {selected.title}
            {activeId === selected.id ? " · on air" : ""}
          </p>
          {media && media.kind !== "none" ? (
            <div className="study-media">
              {media.kind === "audio" ? (
                <audio controls src={media.src} preload="none">
                  <track kind="captions" />
                </audio>
              ) : null}
              {media.kind === "video" ? (
                <video controls src={media.src} preload="none">
                  <track kind="captions" />
                </video>
              ) : null}
              {media.kind === "youtube" || media.kind === "iframe" ? (
                <iframe
                  title={selected.title}
                  src={media.src}
                  allow="fullscreen; autoplay"
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>
          ) : null}

          {selected.format === "text" ? (
            <div className="study-session">
              <h3 className="off-sub">Doctrine-first session</h3>
              <p className="off-meta">
                The engine does not replace a pastor or the Spirit. It refuses
                extra-biblical voice and puts the passage first.
              </p>
              <ul className="study-affirm">
                {DOCTRINE_AFFIRMATIONS.map((line, i) => (
                  <li key={line}>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(affirmed[i])}
                        onChange={(e) =>
                          setAffirmed((s) => ({ ...s, [i]: e.target.checked }))
                        }
                      />
                      {line}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="ghost-row">
                <button type="button" className="ghost-btn" onClick={runSession}>
                  Run scan
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => applyTightened(selected.id)}
                  disabled={!selected.tightened}
                >
                  Apply tightened text
                </button>
                <button type="button" className="add-btn" onClick={clearForAir}>
                  Clear for air
                </button>
              </div>
              {selected.lastReview ? (
                <div className="study-report">
                  <p className="off-meta">
                    Verdict: {selected.lastReview.verdict}
                    {selected.lastReview.flags.length
                      ? ` · ${selected.lastReview.flags.length} flag(s)`
                      : " · no flags"}
                  </p>
                  {selected.lastReview.flags.map((f) => (
                    <p key={f.id} className={`study-flag study-flag-${f.severity}`}>
                      {f.severity}: {f.note}
                    </p>
                  ))}
                  {selected.tightened ? (
                    <pre className="study-tight">{selected.tightened}</pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="off-meta">
              Media lessons still need a passage on the card. Capture the
              player on Study OBS if the embed will not sit in the HUD.
            </p>
          )}

          <div className="ghost-row">
            <button
              type="button"
              className="add-btn"
              onClick={() => toast(takeLive(selected.id), { className: "toast-gothic" })}
            >
              Take to Scripture Time
            </button>
            <button type="button" className="ghost-btn" onClick={() => clearLesson()}>
              Clear air
            </button>
            <button type="button" className="ghost-btn" onClick={() => remove(selected.id)}>
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
