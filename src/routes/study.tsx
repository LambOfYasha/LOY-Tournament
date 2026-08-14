import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { LessonCard } from "@/components/lesson-overlay";
import { lessonMedia } from "@/lib/lessons";
import { listenOverlay } from "@/lib/overlay-bus";
import { useEvents } from "@/lib/event-store";
import { useTournament } from "@/lib/tournament-store";

export const Route = createFileRoute("/study")({
  component: StudyPage,
  ssr: false,
});

function StudyPage() {
  useEffect(() => {
    void useTournament.persist.rehydrate();
    void useEvents.persist.rehydrate();
    useTournament.getState().markHydrated();
    useEvents.getState().markHydrated();
  }, []);

  useEffect(() => {
    return listenOverlay(() => undefined);
  }, []);

  const lessons = useEvents((s) => s.lessons);
  const activeId = useEvents((s) => s.activeLessonId);
  const hidden = useEvents((s) => s.layers.study === false);
  const lesson = lessons.find((l) => l.id === activeId) ?? null;
  const media = lesson ? lessonMedia(lesson) : null;

  return (
    <div className="ov-obs study-obs">
      {hidden || !lesson ? (
        <div className="study-idle">
          <p className="np-desk-kicker">Scripture Time</p>
          <p>No lesson on air. Take one live from Events.</p>
          <Link to="/events" className="np-mini">
            Events desk
          </Link>
        </div>
      ) : (
        <>
          <LessonCard lesson={lesson} />
          {media && media.kind !== "none" && media.src ? (
            <div className="study-stage">
              {media.kind === "audio" ? (
                <audio controls autoPlay src={media.src}>
                  <track kind="captions" />
                </audio>
              ) : null}
              {media.kind === "video" ? (
                <video controls autoPlay src={media.src}>
                  <track kind="captions" />
                </video>
              ) : null}
              {media.kind === "youtube" || media.kind === "iframe" ? (
                <iframe title={lesson.title} src={media.src} allow="fullscreen; autoplay" />
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
