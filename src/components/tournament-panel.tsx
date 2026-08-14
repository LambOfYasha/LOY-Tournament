import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import {
  BEST_OF_OPTIONS,
  STATUS_LABEL,
  livePreviewJson,
  useTournament,
  type MatchStatus,
  type RegisteredPlayer,
} from "@/lib/tournament-store";

function useHydrateStore() {
  useEffect(() => {
    void useTournament.persist.rehydrate();
    useTournament.getState().markHydrated();
  }, []);
}

function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function SelectMenu<T extends string | number>({
  value,
  options,
  onChange,
  format,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const label = format ? format(value) : String(value);
  return (
    <div className="field-select" ref={ref}>
      <button
        type="button"
        className="field-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <ChevronDown size={14} strokeWidth={2.2} />
      </button>
      {open ? (
        <div className="menu" role="listbox">
          {options.map((opt) => (
            <button
              key={String(opt)}
              type="button"
              role="option"
              className="menu-item"
              data-active={opt === value}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {format ? format(opt) : String(opt)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoadSignups({ side }: { side: 1 | 2 }) {
  const registered = useTournament((s) => s.registered);
  const loadSignup = useTournament((s) => s.loadSignup);
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div className="field-select" ref={ref}>
      <button
        type="button"
        className="load-bar"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Load from Signups
        <ChevronDown size={14} strokeWidth={2.2} />
      </button>
      {open ? (
        <div className="menu" data-wide="true" role="listbox">
          {registered.length === 0 ? (
            <div className="menu-item" style={{ pointerEvents: "none" }}>
              No registered players
            </div>
          ) : (
            registered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="menu-item"
                onClick={() => {
                  loadSignup(side, p);
                  setOpen(false);
                  toast(`${p.tag} loaded into Player ${side}`, {
                    className: "toast-gothic",
                  });
                }}
              >
                <span>
                  {p.tag}
                  <span className="roster-meta">
                    {p.character} · {p.platform} · {p.region}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlayerCard({
  side,
  title,
}: {
  side: 1 | 2;
  title: string;
}) {
  const player = useTournament((s) => (side === 1 ? s.player1 : s.player2));
  const bestOf = useTournament((s) => s.bestOf);
  const setPlayer = useTournament((s) => s.setPlayer);
  const bumpScore = useTournament((s) => s.bumpScore);
  const winsNeeded = Math.ceil(bestOf / 2);
  const isWinner = player.score >= winsNeeded && player.score > 0;

  return (
    <section className="panel" aria-label={title}>
      <h2 className="panel-title">
        {title}
        {isWinner ? <span className="winner-tag">Winner</span> : null}
      </h2>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">Name / Tag</span>
          <input
            className="field-input"
            value={player.tag}
            onChange={(e) => setPlayer(side, { tag: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">Character</span>
          <input
            className="field-input"
            value={player.character}
            onChange={(e) => setPlayer(side, { character: e.target.value })}
          />
        </label>
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <span className="field-label">Score</span>
        <div className="score-row">
          <button
            type="button"
            className="score-btn minus"
            aria-label={`Decrease player ${side} score`}
            onClick={() => bumpScore(side, -1)}
          >
            −
          </button>
          <div className="score-value" aria-live="polite">
            {player.score}
          </div>
          <button
            type="button"
            className="score-btn plus"
            aria-label={`Increase player ${side} score`}
            onClick={() => bumpScore(side, 1)}
          >
            +
          </button>
        </div>
      </div>
      <LoadSignups side={side} />
    </section>
  );
}

function JsonPreview() {
  const tournamentName = useTournament((s) => s.tournamentName);
  const round = useTournament((s) => s.round);
  const status = useTournament((s) => s.status);
  const bestOf = useTournament((s) => s.bestOf);
  const player1 = useTournament((s) => s.player1);
  const player2 = useTournament((s) => s.player2);
  const pushTick = useTournament((s) => s.pushTick);
  const lastPushed = useTournament((s) => s.lastPushed);
  const pretty = useMemo(
    () =>
      JSON.stringify(
        livePreviewJson({ tournamentName, round, status, bestOf, player1, player2 }),
        null,
        2,
      ),
    [tournamentName, round, status, bestOf, player1, player2],
  );
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!pushTick) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 700);
    return () => window.clearTimeout(t);
  }, [pushTick]);

  return (
    <section className={`panel preview-panel${flash ? " preview-flash" : ""}`} aria-label="Preview">
      <h2 className="panel-title">Preview</h2>
      <pre>{pretty}</pre>
      {lastPushed ? (
        <p className="pushed-note">
          Last push {new Date(lastPushed.pushedAt ?? "").toLocaleTimeString()} · overlay synced
        </p>
      ) : (
        <p className="pushed-note">Live payload — push to send to the overlay</p>
      )}
    </section>
  );
}

function AddSignup() {
  const addRegistered = useTournament((s) => s.addRegistered);
  const [tag, setTag] = useState("");
  const [character, setCharacter] = useState("");
  const [platform, setPlatform] = useState("PC");
  const [region, setRegion] = useState("NA");

  function submit() {
    const t = tag.trim();
    const c = character.trim();
    if (!t || !c) {
      toast("Tag and character are required", { className: "toast-gothic" });
      return;
    }
    addRegistered({
      tag: t,
      character: c,
      platform: platform.trim() || "PC",
      region: region.trim() || "NA",
    });
    setTag("");
    setCharacter("");
    toast(`${t} added to signups`, { className: "toast-gothic" });
  }

  return (
    <div className="add-row">
      <input
        className="field-input"
        placeholder="Tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <input
        className="field-input"
        placeholder="Character"
        value={character}
        onChange={(e) => setCharacter(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <input
        className="field-input"
        placeholder="Platform"
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Region"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
      />
      <button type="button" className="add-btn" onClick={submit}>
        Add
      </button>
    </div>
  );
}

export function TournamentPanel() {
  useHydrateStore();
  const tournamentName = useTournament((s) => s.tournamentName);
  const round = useTournament((s) => s.round);
  const bestOf = useTournament((s) => s.bestOf);
  const status = useTournament((s) => s.status);
  const registered = useTournament((s) => s.registered);
  const setField = useTournament((s) => s.setField);
  const setBestOf = useTournament((s) => s.setBestOf);
  const setStatus = useTournament((s) => s.setStatus);
  const resetScores = useTournament((s) => s.resetScores);
  const swapSides = useTournament((s) => s.swapSides);
  const pushMatchInfo = useTournament((s) => s.pushMatchInfo);
  const forcePushAll = useTournament((s) => s.forcePushAll);
  const loadSignup = useTournament((s) => s.loadSignup);
  const removeRegistered = useTournament((s) => s.removeRegistered);

  function loadInto(side: 1 | 2, player: RegisteredPlayer) {
    loadSignup(side, player);
    toast(`${player.tag} → Player ${side}`, { className: "toast-gothic" });
  }

  return (
    <div className="stage">
      <div className="stage-inner">
        <div className="ornate-shell">
          <img src="/ornaments/bow.png" alt="" className="ornament bow-tl" />
          <img src="/ornaments/bow.png" alt="" className="ornament bow-tr" />
          <img src="/ornaments/bow.png" alt="" className="ornament bow-bl" />
          <img src="/ornaments/cross.png" alt="" className="ornament cross-bl" />
          <img src="/ornaments/cross.png" alt="" className="ornament cross-br" />
          <img src="/ornaments/panda.png?v=xiaoyu" alt="Xiao PandaMaiden" className="ornament panda" />

          <header className="title-wrap">
            <img src="/ornaments/cross.png" alt="" className="title-cross top" />
            <div className="title-plaque">
              <h1 className="title-word">Tournament Control Panel</h1>
            </div>
            <img src="/ornaments/cross.png" alt="" className="title-cross mid" />
          </header>

          <div className="panel-grid">
            <section className="panel" aria-label="Match Info">
              <h2 className="panel-title">Match Info</h2>
              <div className="field-grid">
                <label className="field">
                  <span className="field-label">Tournament Name</span>
                  <input
                    className="field-input"
                    value={tournamentName}
                    onChange={(e) => setField("tournamentName", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Round / Phase</span>
                  <input
                    className="field-input"
                    value={round}
                    onChange={(e) => setField("round", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Best Of</span>
                  <SelectMenu
                    value={bestOf}
                    options={BEST_OF_OPTIONS}
                    onChange={setBestOf}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Status</span>
                  <SelectMenu
                    value={status}
                    options={["waiting", "in_progress", "paused", "complete"] as const}
                    onChange={(v) => setStatus(v as MatchStatus)}
                    format={(v) => STATUS_LABEL[v as MatchStatus]}
                  />
                </label>
              </div>
              <button
                type="button"
                className="rose-bar"
                onClick={() => {
                  pushMatchInfo();
                  toast("Match info pushed to overlay", { className: "toast-gothic" });
                }}
              >
                Push Match Info
              </button>
            </section>

            <PlayerCard side={1} title="Player 1 (Left)" />
            <PlayerCard side={2} title="Player 2 (Right)" />

            <section className="panel" aria-label="Quick Actions">
              <h2 className="panel-title">Quick Actions</h2>
              <div className="ghost-row">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    resetScores();
                    toast("Scores reset to 0", { className: "toast-gothic" });
                  }}
                >
                  Reset Scores to 0
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    swapSides();
                    toast("Sides swapped", { className: "toast-gothic" });
                  }}
                >
                  Swap Sides
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    forcePushAll();
                    toast("Full state force-pushed", { className: "toast-gothic" });
                  }}
                >
                  Force Push All
                </button>
              </div>

              <h2 className="panel-title" style={{ marginTop: 16 }}>
                Registered Players
              </h2>
              <div className="roster">
                {registered.map((p) => (
                  <div key={p.id} className="roster-item">
                    <div>
                      <span className="roster-name">{p.tag}</span>
                      <span className="roster-meta">
                        {p.character} · {p.platform} · {p.region}
                      </span>
                    </div>
                    <div className="roster-actions">
                      <button type="button" className="chip" onClick={() => loadInto(1, p)}>
                        P1
                      </button>
                      <button type="button" className="chip" onClick={() => loadInto(2, p)}>
                        P2
                      </button>
                      <button
                        type="button"
                        className="chip"
                        aria-label={`Remove ${p.tag}`}
                        onClick={() => removeRegistered(p.id)}
                      >
                        <X size={12} strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <AddSignup />
            </section>
          </div>

          <JsonPreview />
        </div>
      </div>
    </div>
  );
}
