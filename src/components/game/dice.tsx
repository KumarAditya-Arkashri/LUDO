import { cn } from "@/lib/utils";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Dice({
  value,
  rolling,
  disabled,
  onRoll,
}: {
  value: number | null;
  rolling: boolean;
  disabled?: boolean;
  onRoll?: () => void;
}) {
  const pips = PIPS[value ?? 1] ?? [];
  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={disabled || rolling}
      aria-label={value ? `Dice shows ${value}` : "Roll dice"}
      className={cn(
        "grid size-16 grid-cols-3 grid-rows-3 gap-1 rounded-2xl bg-gradient-to-br from-primary to-primary/80 border border-white/20 p-2.5 text-primary-foreground shadow-[0_8px_16px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] transition-all duration-300",
        rolling && "animate-dice shadow-none scale-95",
        !disabled && !rolling && "hover:shadow-[0_12px_24px_rgba(var(--primary),0.3),inset_0_2px_4px_rgba(255,255,255,0.3)] hover:-translate-y-1 active:translate-y-0 active:shadow-md",
        disabled && "opacity-50 grayscale hover:scale-100",
      )}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full shadow-inner", 
            pips.includes(i) ? "bg-black/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" : "bg-transparent"
          )}
        />
      ))}
    </button>
  );
}
