import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChatOverlay } from "@/components/chat-overlay";
import { listenOverlay } from "@/lib/overlay-bus";
import { useEvents } from "@/lib/event-store";
import { useTournament } from "@/lib/tournament-store";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  ssr: false,
});

function ChatPage() {
  const [, bump] = useState(0);

  useEffect(() => {
    void useTournament.persist.rehydrate();
    void useEvents.persist.rehydrate();
    useTournament.getState().markHydrated();
    useEvents.getState().markHydrated();
    const stop = listenOverlay(() => bump((n) => n + 1));
    const onStore = () => bump((n) => n + 1);
    window.addEventListener("storage", onStore);
    return () => {
      stop();
      window.removeEventListener("storage", onStore);
    };
  }, []);

  const hidden = useEvents((s) => s.layers.chat === false);

  return (
    <div className="ov-obs chat-obs">
      {hidden ? null : <ChatOverlay solo />}
    </div>
  );
}
