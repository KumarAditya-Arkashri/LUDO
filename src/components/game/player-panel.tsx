import { Timer } from "lucide-react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GamePlayer, PlayerColor } from "@/types";

export function PlayerPanel({
  player,
  isTurn,
  secondsLeft,
  turnSeconds = 20,
}: {
  player: GamePlayer;
  isTurn: boolean;
  secondsLeft: number;
  turnSeconds?: number;
}) {
  const dot: Record<PlayerColor, string> = {
    red: "bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-900/50",
    blue: "bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-900/50",
  };

  return (
    <div
      className={cn(
        "glass-soft rounded-2xl p-3.5 transition-all duration-300 relative overflow-hidden",
        isTurn ? "border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.15)] ring-1 ring-primary/20 bg-primary/5" : "border-white/5 opacity-80"
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white border border-white/20",
            dot[player.color],
          )}
        >
          {initials(player.name)}
        </span>
        <div className="min-w-0">
          <p className={cn("truncate font-bold", isTurn ? "text-base text-foreground" : "text-sm text-muted-foreground")}>{player.name}</p>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <span className={cn("size-2 rounded-full", player.color === 'red' ? 'bg-red-500' : 'bg-blue-500')} />
            {player.tokensHome}/4 tokens home
          </p>
        </div>
        {isTurn && (
          <span className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner transition-colors",
            secondsLeft <= 5 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-primary/20 text-primary"
          )}>
            <Timer className="size-4" /> {secondsLeft}s
          </span>
        )}
      </div>
      {isTurn && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/40 shadow-inner">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear shadow-[0_0_10px_rgba(currentColor,0.5)]",
              secondsLeft <= 5 ? "bg-red-500" : "bg-primary"
            )}
            style={{ width: `${(secondsLeft / turnSeconds) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
