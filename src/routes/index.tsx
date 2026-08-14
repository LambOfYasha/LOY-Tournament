import { createFileRoute } from "@tanstack/react-router";
import { MusicStudio } from "@/components/music-studio";

export const Route = createFileRoute("/")({
  component: Home,
  ssr: false,
});

function Home() {
  return <MusicStudio />;
}
