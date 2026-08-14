import { createFileRoute, Link } from "@tanstack/react-router";
import { TournamentPanel } from "@/components/tournament-panel";

export const Route = createFileRoute("/desk")({
  component: Desk,
  ssr: false,
});

function Desk() {
  return (
    <>
      <div className="np-desk-actions np-float-link">
        <Link to="/events" className="np-mini">
          Events
        </Link>
        <Link to="/offstream" className="np-mini">
          Offstream
        </Link>
        <Link to="/" className="np-mini">
          Now Playing
        </Link>
      </div>
      <TournamentPanel />
    </>
  );
}
