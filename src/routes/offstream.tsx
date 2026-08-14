import { createFileRoute } from "@tanstack/react-router";
import { OffstreamDesk } from "@/components/offstream-desk";

export const Route = createFileRoute("/offstream")({
  component: Page,
  ssr: false,
});

function Page() {
  return <OffstreamDesk />;
}
