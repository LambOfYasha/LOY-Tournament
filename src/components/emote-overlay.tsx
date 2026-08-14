import { emoteSrc, splitEmoteText, type EmoteDef, type EmoteId, type EmotePlay } from "@/lib/emotes";

export function EmoteBurst({
  play,
  def,
}: {
  play: EmotePlay;
  def: EmoteDef;
}) {
  return (
    <article
      className={`ov-emote ov-emote-${def.id}`}
      aria-live="polite"
      aria-label={`${def.name} emote`}
    >
      <img src={emoteSrc(def.id)} alt="" className="ov-emote-art" />
      <div className="ov-emote-card">
        <p className="ov-kicker">
          {def.momentLabel} · {def.token}
        </p>
        <strong>{def.name}</strong>
        <blockquote>{def.verse}</blockquote>
        <cite>{def.ref}</cite>
        <span>from {play.by}</span>
      </div>
    </article>
  );
}

export function EmoteText({ text }: { text: string }) {
  const parts = splitEmoteText(text);
  return (
    <>
      {parts.map((p, i) =>
        p.type === "emote" ? (
          <img
            key={`${p.id}-${i}`}
            src={emoteSrc(p.id as EmoteId)}
            alt={p.id}
            className="emote-inline"
          />
        ) : (
          <span key={`t-${i}`}>{p.value}</span>
        ),
      )}
    </>
  );
}
