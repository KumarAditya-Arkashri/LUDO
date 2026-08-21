import { createFileRoute, Link } from "@tanstack/react-router";
import { Frown, Home, Trophy } from "lucide-react";
import { GlassPanel } from "@/components/common/ui-kit";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { useGameStore } from "@/store/game-store";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Result — Ludo Arena" },
      { name: "description", content: "Match result and rematch options." },
      { property: "og:title", content: "Result — Ludo Arena" },
      { property: "og:description", content: "See the final result of your Ludo match." },
    ],
  }),
  component: ResultScreen,
});

function ResultScreen() {
  const { players, winnerColor, myColor, entryFee, prizePool, roomId, isPractice } = useGameStore();
  const iWon = winnerColor === myColor;
  const winner = players.find((p) => p.color === (winnerColor ?? "red"));
  const opponent = players.find((p) => p.color !== myColor);

  return (
    <div className="arena-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <GlassPanel className="w-full max-w-md p-7 text-center">
        <span
          className={`mx-auto grid size-16 place-items-center rounded-2xl ${iWon ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
        >
          {iWon ? <Trophy className="size-8" /> : <Frown className="size-8" />}
        </span>
        <h1 className="mt-5 text-3xl font-extrabold">{iWon ? "You won!" : "You lost"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {winner?.name ?? "—"} got all four tokens home first · {roomId}
        </p>

        <div className="mt-7 rounded-2xl bg-secondary p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {isPractice ? "Practice result" : iWon ? "Credited to winning wallet" : "Entry fee lost"}
          </p>
          {!isPractice && (
            <p className={`mt-1 text-4xl font-extrabold ${iWon ? "text-accent" : "text-foreground"}`}>
              {iWon ? `+${inr(prizePool)}` : `−${inr(entryFee)}`}
            </p>
          )}
          {isPractice && <p className="mt-1 text-lg font-bold">No monetary value</p>}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-left text-xs">
          <div className="glass-soft rounded-xl p-3">
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="mt-1 font-bold">{isPractice ? "Practice" : "Live"}</dd>
          </div>
          <div className="glass-soft rounded-xl p-3">
            <dt className="text-muted-foreground">Opponent</dt>
            <dd className="mt-1 truncate font-bold">{opponent?.name ?? "—"}</dd>
          </div>
          <div className="glass-soft rounded-xl p-3">
            <dt className="text-muted-foreground">Tokens home</dt>
            <dd className="mt-1 font-bold">{winner?.tokensHome ?? 0}/4</dd>
          </div>
        </dl>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link to={isPractice ? "/practice-battle" : "/dashboard"}>
              {isPractice ? "Practice again" : "Play again"}
            </Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link to="/dashboard">
              <Home className="size-4" /> Dashboard
            </Link>
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
