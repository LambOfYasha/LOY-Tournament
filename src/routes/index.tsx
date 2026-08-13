import { createFileRoute } from "@tanstack/react-router";
import { TournamentPanel } from "@/components/tournament-panel";

export const Route = createFileRoute("/")({
  component: Home,
  ssr: false,
});

function Home() {
  return <TournamentPanel />;
}
