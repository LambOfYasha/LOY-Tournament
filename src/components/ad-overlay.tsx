import { useState } from "react";
import { toast } from "sonner";
import {
  AD_MS,
  MSS_POINTS,
  PROJECTS,
  STATUS_LABEL,
  type AdPlay,
} from "@/lib/ads";
import { useEvents } from "@/lib/event-store";
import { MOD_ACTOR, useTournament } from "@/lib/tournament-store";

export function AdBreak({ ad, now }: { ad: AdPlay; now: number }) {
  if (ad.until <= now) return null;
  const remain = Math.max(0, ad.until - now);
  const total = Math.max(1, AD_MS[ad.kind]);
  const leftPct = Math.min(100, (remain / total) * 100);
  const project = ad.projectId ? PROJECTS.find((p) => p.id === ad.projectId) : undefined;
  const twitchHost = ad.twitch.replace(/^https?:\/\//, "");
  const siteHost = ad.site.replace(/^https?:\/\//, "");

  return (
    <article
      className={`ov-ad ov-ad-${ad.kind}`}
      aria-label={`${ad.kicker} ad`}
      style={{ ["--ad-left" as string]: `${leftPct}%` }}
    >
      <img src="/ornaments/bow.png" alt="" className="ov-ad-bow" />
      <img src="/ornaments/panda.png?v=xiaoyu" alt="" className="ov-ad-mark" />
      <img src="/ornaments/cross.png" alt="" className="ov-ad-cross" />
      <p className="ov-kicker">{ad.kicker}</p>
      {project ? <span className="ov-ad-status">{STATUS_LABEL[project.status]}</span> : null}
      <h2>{ad.kind === "shout" && !ad.title.startsWith("@") ? `@${ad.title}` : ad.title}</h2>
      <p className="ov-ad-body">{ad.body}</p>
      {ad.kind === "mss" ? (
        <ul className="ov-ad-points">
          {MSS_POINTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {ad.kind === "preview" ? (
        <ul className="ov-ad-slots">
          {PROJECTS.map((p) => (
            <li key={p.id} data-on={p.id === ad.projectId}>
              {p.name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="ov-ad-links">
        {twitchHost ? <span>{twitchHost}</span> : null}
        {siteHost && siteHost !== twitchHost ? <span>{siteHost}</span> : null}
      </div>
      {ad.kind === "loy" ? (
        <p className="ov-ad-foot">Faith · Focus · Fight · Pray. Train. Trust.</p>
      ) : null}
      {ad.kind === "mss" ? (
        <p className="ov-ad-foot">ttv lambs_shadow · Sunday Bible & Tekken</p>
      ) : null}
      {ad.kind === "shout" ? (
        <p className="ov-ad-foot">Xiao_PandaMaiden · #lambs_shadow · go show them love</p>
      ) : null}
      <span className="ov-ad-bar" aria-hidden="true">
        <i />
      </span>
    </article>
  );
}

export function AdBoard() {
  const clearAd = useEvents((s) => s.clearAd);
  const setLoySite = useEvents((s) => s.setLoySite);
  const setShoutSite = useEvents((s) => s.setShoutSite);
  const loySite = useEvents((s) => s.loySite);
  const shoutbook = useEvents((s) => s.shoutbook);
  const ad = useEvents((s) => s.ad);
  const runChat = useTournament((s) => s.runChat);
  const [site, setSite] = useState(loySite);
  const [soUser, setSoUser] = useState("xiao_pandamaiden");
  const [soSite, setSoSite] = useState("");

  function send(text: string) {
    const reply = runChat(MOD_ACTOR, text);
    if (reply) toast(reply.split(" · ")[0] ?? reply, { className: "toast-gothic" });
  }

  const live = ad && ad.until > Date.now() ? ad : null;

  return (
    <div className="ad-board">
      <p className="off-meta">
        House ads credit LOY Softwares for the design flow and functionality.
        !so pops a card and names twitch.tv plus their website in chat. OBS uses
        the HUD overlay source.
      </p>
      {live ? (
        <p className="ad-live">
          Playing · {live.kicker} · {live.title}
        </p>
      ) : null}
      <div className="ghost-row">
        <button type="button" className="ghost-btn" onClick={() => send("!ad loy")}>
          LOY Softwares
        </button>
        <button type="button" className="ghost-btn" onClick={() => send("!ad mss")}>
          MSS intro
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            clearAd();
            toast("Ad cleared", { className: "toast-gothic" });
          }}
        >
          Clear ad
        </button>
      </div>

      <h3 className="off-sub">Preview slots</h3>
      <ul className="ad-slots">
        {PROJECTS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="ad-slot"
              data-status={p.status}
              onClick={() => send(`!ad preview ${p.id}`)}
            >
              <em>{STATUS_LABEL[p.status]}</em>
              <strong>{p.name}</strong>
              <span>{p.blurb}</span>
            </button>
          </li>
        ))}
      </ul>

      <h3 className="off-sub">LOY site</h3>
      <div className="add-row">
        <input
          className="field-input"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="https://your-loy-site.com"
          aria-label="LOY Softwares website"
        />
        <button
          type="button"
          className="add-btn"
          onClick={() => {
            setLoySite(site);
            toast(site ? `LOY site ${site}` : "Site cleared", { className: "toast-gothic" });
          }}
        >
          Save
        </button>
      </div>

      <h3 className="off-sub">Shoutout</h3>
      <p className="off-meta">
        Chat line always names twitch.tv/user. Add a website so !so mentions it.
      </p>
      <div className="add-row">
        <input
          className="field-input"
          value={soUser}
          onChange={(e) => setSoUser(e.target.value)}
          placeholder="@user"
          aria-label="Shoutout username"
        />
        <input
          className="field-input"
          value={soSite}
          onChange={(e) => setSoSite(e.target.value)}
          placeholder="website (optional)"
          aria-label="Shoutout website"
        />
        <button
          type="button"
          className="add-btn"
          onClick={() => {
            if (soSite) setShoutSite(soUser, soUser, soSite);
            send(`!so ${soUser} ${soSite}`.trim());
          }}
        >
          !so
        </button>
      </div>
      {shoutbook.length ? (
        <ul className="off-results">
          {shoutbook.map((e) => (
            <li key={e.login}>
              <strong>@{e.display}</strong>
              <span>{e.site || "no site saved"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
