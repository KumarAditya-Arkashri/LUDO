import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Users, X } from "lucide-react";
import { GlassPanel } from "@/components/common/ui-kit";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { SOCKET_EVENTS } from "@/lib/socket";
import { useGameStore } from "@/store/game-store";

export const Route = createFileRoute("/waiting-room")({
  head: () => ({
    meta: [
      { title: "Waiting room — Ludo Arena" },
      {
        name: "description",
        content: "Matchmaking in progress. Your 1v1 Ludo table is being set up.",
      },
      { property: "og:title", content: "Waiting room — Ludo Arena" },
      { property: "og:description", content: "Pairing you with a live opponent." },
    ],
  }),
  component: WaitingRoom,
});

function WaitingRoom() {
  const navigate = useNavigate();
  const { roomId, entryFee, prizePool, players, phase, leaveQueue } = useGameStore();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (phase === "starting" || phase === "playing") {
      navigate({ to: "/game" });
    }
  }, [phase, navigate]);

  const opponent = players.find((p) => p.color === "blue");

  const handleCancel = () => {
    leaveQueue(entryFee);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="arena-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <GlassPanel className="w-full max-w-md p-6 text-center sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
          <Users className="size-3.5" /> {roomId || "WAITING"}
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">
          {phase === "starting" ? "Opponent found!" : "Finding your opponent"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {phase === "starting"
            ? `${opponent?.name} is at the table. Starting the match…`
            : `Searching a ${inr(entryFee)} table · ${seconds}s`}
        </p>

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Seat name="You" color="red" ready />
          <span className="text-money text-sm font-extrabold text-muted-foreground">VS</span>
          <Seat
            name={phase === "starting" ? (opponent?.name ?? "Rival") : "Searching…"}
            color="blue"
            ready={phase === "starting"}
          />
        </div>

        <div className="glass-soft mt-8 grid grid-cols-2 gap-3 rounded-xl p-4 text-left">
          <div>
            <p className="text-xs text-muted-foreground">Entry fee</p>
            <p className="text-money font-bold">{inr(entryFee)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prize pool</p>
            <p className="text-money font-bold text-accent">
              {inr(prizePool || Math.round(entryFee * 2 * 0.95))}
            </p>
          </div>
        </div>

        <Button variant="ghost" className="mt-6 text-muted-foreground" onClick={handleCancel}>
          <X className="size-4" /> Cancel & refund
        </Button>
      </GlassPanel>
    </div>
  );
}

function Seat({ name, color, ready }: { name: string; color: "red" | "blue"; ready: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`grid size-14 place-items-center rounded-2xl ${color === "red" ? "bg-player-red/20 text-player-red" : "bg-player-blue/20 text-player-blue"}`}
      >
        {ready ? (
          <span className="text-lg font-extrabold">{name.charAt(0)}</span>
        ) : (
          <Loader2 className="size-5 animate-spin" />
        )}
      </span>
      <span className="max-w-full truncate text-xs font-semibold">{name}</span>
    </div>
  );
}
