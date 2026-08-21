import { HOME_PROGRESS, RING, SAFE_RING_INDEXES, YARD, cellForProgress } from "@/lib/ludo-board";
import { cn } from "@/lib/utils";
import { Star, ChevronRight, ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import type { GamePlayer, PlayerColor, Token } from "@/types";

const SIZE = 15;

const colorClass: Record<PlayerColor, string> = {
  red: "from-[#ff3b3b] to-[#c70000] border-[#ff8c8c] shadow-[0_4px_6px_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.2)]",
  blue: "from-[#3b82f6] to-[#0047c7] border-[#8cb1ff] shadow-[0_4px_6px_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.2)]",
};

const bgColors = {
  red: "bg-[#e53935]",
  blue: "bg-[#1e88e5]",
  green: "bg-[#43a047]",
  yellow: "bg-[#fdd835]",
};

const ringSet = new Set(RING.map((c) => `${c.col}-${c.row}`));
const safeSet = new Set([...SAFE_RING_INDEXES].map((i) => `${RING[i]!.col}-${RING[i]!.row}`));

const isHomeColumn = (col: number, row: number) => {
  if (row === 7 && col >= 1 && col <= 5) return 'red';
  if (row === 7 && col >= 9 && col <= 13) return 'blue';
  if (col === 7 && row >= 1 && row <= 5) return 'green';
  if (col === 7 && row >= 9 && row <= 13) return 'yellow';
  return null;
};

const isStartCell = (col: number, row: number) => {
  if (col === 1 && row === 6) return 'red';
  if (col === 8 && row === 1) return 'green';
  if (col === 13 && row === 8) return 'blue';
  if (col === 6 && row === 13) return 'yellow';
  return null;
};

function Yard({ plate, col, row }: { plate: 'red'|'blue'|'green'|'yellow'; col: number; row: number }) {
  return (
    <div
      className={cn("pointer-events-none absolute flex items-center justify-center border-[3px] border-slate-800", bgColors[plate])}
      style={{
        left: `calc(100% / 15 * ${col})`,
        top: `calc(100% / 15 * ${row})`,
        width: `calc(100% / 15 * 6)`,
        height: `calc(100% / 15 * 6)`,
      }}
    >
      <div className="relative w-[65%] h-[65%] bg-white rounded-2xl shadow-inner border-[3px] border-slate-800 grid grid-cols-2 grid-rows-2 gap-3 p-3">
        {[0, 1, 2, 3].map(i => (
           <div key={i} className={cn("rounded-full border-[3px] border-slate-800 shadow-inner", bgColors[plate])} />
        ))}
      </div>
    </div>
  );
}

export function LudoBoard({
  players,
  turnColor,
  myColor,
  dice,
  onTokenClick,
}: {
  players: GamePlayer[];
  turnColor: PlayerColor;
  myColor: PlayerColor;
  dice: number | null;
  onTokenClick?: (tokenId: string) => void;
}) {
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => ({
    col: i % SIZE,
    row: Math.floor(i / SIZE),
  }));

  const movable = (token: Token) => {
    if (token.color !== myColor || turnColor !== myColor || dice === null) return false;
    if (token.state === "home") return false;
    if (token.state === "yard") return dice === 6;
    return token.position + dice <= HOME_PROGRESS;
  };

  return (
    <div
      className={cn(
        "aspect-square w-full max-w-[560px] rounded-md p-2 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-transform duration-500",
        myColor === "blue" && "rotate-180"
      )}
    >
      <div className="relative grid size-full grid-cols-15 grid-rows-15 border-[3px] border-slate-800 bg-white">
        {cells.map(({ col, row }) => {
          const key = `${col}-${row}`;
          const onRing = ringSet.has(key);
          const homeColor = isHomeColumn(col, row);
          const startColor = isStartCell(col, row);
          const center = col >= 6 && col <= 8 && row >= 6 && row <= 8;
          const isSafe = safeSet.has(key);

          // We only render individual cell borders for the path.
          // The yards and center will overlap or be drawn differently.
          const isPath = onRing || homeColor;
          
          if (center) {
            // We handle the center as a single absolute element later
            return <div key={key} className="bg-transparent" />;
          }

          if (!isPath) {
            return <div key={key} className="bg-transparent" />;
          }

          return (
            <div
              key={key}
              className={cn(
                "relative flex items-center justify-center border border-slate-300",
                startColor && bgColors[startColor as keyof typeof bgColors],
                homeColor && bgColors[homeColor as keyof typeof bgColors]
              )}
            >
              {isSafe && !startColor && (
                <Star className="size-4 text-slate-400" fill="currentColor" />
              )}
              {startColor === 'red' && <ChevronRight className="size-5 text-white/80" />}
              {startColor === 'green' && <ChevronDown className="size-5 text-white/80" />}
              {startColor === 'blue' && <ChevronLeft className="size-5 text-white/80" />}
              {startColor === 'yellow' && <ChevronUp className="size-5 text-white/80" />}
            </div>
          );
        })}

        {/* Center Triangles */}
        <div 
          className="absolute border-[3px] border-slate-800"
          style={{
            left: `calc(100% / 15 * 6)`,
            top: `calc(100% / 15 * 6)`,
            width: `calc(100% / 15 * 3)`,
            height: `calc(100% / 15 * 3)`,
            background: `conic-gradient(
              from 45deg,
              #1e88e5 0deg 90deg,
              #fdd835 90deg 180deg,
              #e53935 180deg 270deg,
              #43a047 270deg 360deg
            )`
          }}
        >
          {/* Diagonal lines for center */}
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 100">
            <line x1="0" y1="0" x2="100" y2="100" stroke="#1e293b" strokeWidth="4" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="#1e293b" strokeWidth="4" />
          </svg>
        </div>

        {/* Yard plates */}
        <Yard plate="green" col={0} row={0} />
        <Yard plate="blue" col={9} row={0} />
        <Yard plate="red" col={0} row={9} />
        <Yard plate="yellow" col={9} row={9} />

        {/* Tokens */}
        {players.flatMap((player) =>
          player.tokens.map((token, index) => {
            const cell =
              token.state === "yard"
                ? YARD[token.color][index]!
                : cellForProgress(token.color, token.position);
            const canMove = movable(token);
            return (
              <button
                key={token.id}
                type="button"
                disabled={!canMove}
                onClick={() => canMove && onTokenClick?.(token.id)}
                aria-label={`${token.color} token ${index + 1}`}
                className={cn(
                  "absolute grid size-[calc(100%/15*0.8)] place-items-center rounded-full border-[1.5px] bg-gradient-to-br transition-all duration-300 z-10",
                  colorClass[token.color],
                  canMove && token.color === "red" && "ring-4 ring-red-400/80 animate-pulse z-20 scale-110",
                  canMove && token.color === "blue" && "ring-4 ring-blue-400/80 animate-pulse z-20 scale-110",
                  token.state === "home" && "opacity-0 scale-50 pointer-events-none", // hide if finished in center
                  !canMove && "hover:scale-105"
                )}
                style={{
                  left: `calc(100% / 15 * ${cell.col + 0.1})`,
                  top: `calc(100% / 15 * ${cell.row + 0.1})`,
                }}
              >
                {/* 3D Pawn highlight effect */}
                <span className="absolute inset-[2px] rounded-full border border-white/40 bg-gradient-to-tr from-transparent via-white/10 to-white/30" />
                <span className="absolute top-[15%] left-[15%] size-[35%] rounded-full bg-white/70 blur-[1px]" />
                <span className="absolute bottom-[10%] right-[15%] size-[40%] rounded-full bg-black/20 blur-[2px]" />
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
