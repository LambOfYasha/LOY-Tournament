import { EmoteText } from "@/components/emote-overlay";
import { useTournament, type ChatLine } from "@/lib/tournament-store";

const VISIBLE = 8;

export function ChatOverlay({ solo = false }: { solo?: boolean }) {
  const chat = useTournament((s) => s.chat);
  const lines = chat.slice(-VISIBLE);

  return (
    <section
      className={`ov-chat${solo ? " is-solo" : ""}`}
      aria-label="Lambs_Shadow chat"
    >
      <img
        src="/overlays/lambs-chat-frame.png"
        alt=""
        className="ov-chat-frame"
      />
      <div className="ov-chat-log" role="log" aria-live="polite">
        {lines.length === 0 ? (
          <p className="ov-chat-idle">
            Courtyard is quiet. Prayer · Bible · Tekken.
          </p>
        ) : (
          lines.map((line) => <ChatRow key={line.id} line={line} />)
        )}
      </div>
    </section>
  );
}

function ChatRow({ line }: { line: ChatLine }) {
  return (
    <p className={`ov-chat-line ov-chat-${line.role}`}>
      <b>{line.user}</b>
      <span>
        <EmoteText text={line.text} />
      </span>
    </p>
  );
}
