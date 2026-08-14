import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SourceBoard } from "@/components/source-board";
import { useEvents } from "@/lib/event-store";
import { useTournament } from "@/lib/tournament-store";
import { useWelcomeClock } from "@/components/welcome-board";

export const Route = createFileRoute("/dev")({
  component: DevPage,
  ssr: false,
});

function DevPage() {
  useEffect(() => {
    void useTournament.persist.rehydrate();
    void useEvents.persist.rehydrate();
    useTournament.getState().markHydrated();
    useEvents.getState().markHydrated();
  }, []);
  useWelcomeClock();

  return (
    <div className="watch-page">
      <header className="watch-bar">
        <div>
          <p className="np-desk-kicker">Xiao_PandaMaiden · developers</p>
          <h1 className="watch-title">Source</h1>
        </div>
        <nav className="np-desk-actions">
          <Link to="/events" className="np-mini">
            Events
          </Link>
          <Link to="/desk" className="np-mini">
            Desk
          </Link>
          <a href="https://github.com/LambOfYasha/LOY-Tournament" className="np-mini">
            LOY-Tournament
          </a>
          <a href="https://github.com/LambOfYasha/xiao_pandamaiden-ttv_bot" className="np-mini">
            Xiaoyu bot
          </a>
        </nav>
      </header>
      <p className="watch-note">
        Timed close fires in courtyard chat when Ending Soon is toggled.
        !src and !repos post these links. !endmsg edits the delay and line.
      </p>
      <section className="panel source-panel">
        <h2 className="panel-title">Repositories</h2>
        <SourceBoard />
      </section>
    </div>
  );
}
