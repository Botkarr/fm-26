import { createFileRoute } from "@tanstack/react-router";
import { useSeason } from "@/game/store";
import { TeamPicker, Dashboard } from "@/game/ui";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { state, ready, start } = useSeason();
  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!state) return <TeamPicker onPick={start} />;
  return <Dashboard />;
}
