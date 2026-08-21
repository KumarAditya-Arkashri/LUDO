import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, Radio } from "lucide-react";
import { Dice } from "@/components/game/dice";
import { LudoBoard } from "@/components/game/ludo-board";
import { PlayerPanel } from "@/components/game/player-panel";
import { GlassPanel } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { useGameStore } from "@/store/game-store";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Live table — Ludo Arena" },
      {
        name: "description",
        content: "Server-authoritative 1v1 Ludo table with a 20-second turn timer.",
      },
      { property: "og:title", content: "Live table — Ludo Arena" },
      { property: "og:description", content: "Roll, move and race all four tokens home." },
    ],
  }),
  component: GameScreen,
});

function GameScreen() {
  const navigate = useNavigate();
  const {
    players,
    turnColor,
    myColor,
    dice,
    rolling,
    entryFee,
    prizePool,
    isPractice,
    roomId,
    turnSecondsLeft,
    phase,
    winnerColor,
    log,
    rollDice,
    moveToken,
    tickTimer,
    leaveMatch,
  } = useGameStore();

  useEffect(() => {
    const id = setInterval(tickTimer, 1000);
    return () => clearInterval(id);
  }, [tickTimer]);

  useEffect(() => {
    if (winnerColor) {
      const t = setTimeout(() => navigate({ to: "/result" }), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [winnerColor, navigate]);

  const handleLeave = () => {
    leaveMatch();
    navigate({ to: "/dashboard" });
  };

  const me = players.find((p) => p.color === myColor);
  const opponent = players.find((p) => p.color !== myColor);
  const myTurn = turnColor === myColor;

  if (!me || !opponent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <GlassPanel className="p-8 text-center max-w-sm w-full space-y-4">
          <h2 className="text-xl font-bold">Match not found</h2>
          <p className="text-sm text-muted-foreground">The match has ended or you disconnected.</p>
          <Button onClick={handleLeave} className="w-full">
            Back to Dashboard
          </Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="arena-bg min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-accent">
              <Radio className="size-3.5" /> LIVE · {roomId}
            </p>
            <h1 className="truncate text-lg font-extrabold sm:text-xl">
              {isPractice ? "Practice Match · Room verified" : `${inr(entryFee)} table · pot `}
              {!isPractice && <span className="text-accent">{inr(prizePool)}</span>}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={handleLeave}
          >
            <LogOut className="size-4" /> Leave
          </Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            <PlayerPanel
              player={opponent}
              isTurn={!myTurn && phase === "playing"}
              secondsLeft={turnSecondsLeft}
            />
            <div className="flex justify-center">
              <LudoBoard
                players={players}
                turnColor={turnColor}
                myColor={myColor}
                dice={dice}
                onTokenClick={moveToken}
              />
            </div>
            <PlayerPanel
              player={me}
              isTurn={myTurn && phase === "playing"}
              secondsLeft={turnSecondsLeft}
            />
          </div>

          <div className="space-y-4">
            <GlassPanel className="flex flex-col items-center gap-3 p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {myTurn ? (dice === null ? "Your roll" : "Pick a token") : "Opponent's turn"}
              </p>
              <Dice
                value={dice}
                rolling={rolling}
                disabled={!myTurn || dice !== null || phase !== "playing"}
                onRoll={rollDice}
              />
              <p className="text-center text-xs text-muted-foreground">
                Six grants an extra turn. Captures send the token back to its yard. Safe cells are highlighted.
              </p>
            </GlassPanel>

            <GlassPanel soft className="p-4">
              <h2 className="text-sm font-bold">Move log</h2>
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-xs text-muted-foreground">
                {log.length === 0 && <li>Waiting for the first roll…</li>}
                {log.slice(0, 14).map((entry, i) => (
                  <li key={i} className="capitalize">
                    • {entry}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
