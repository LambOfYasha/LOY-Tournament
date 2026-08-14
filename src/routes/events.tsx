import { createFileRoute } from "@tanstack/react-router";
import { EventsDesk } from "@/components/events-desk";

export const Route = createFileRoute("/events")({
  component: Page,
  ssr: false,
});

function Page() {
  return <EventsDesk />;
}
