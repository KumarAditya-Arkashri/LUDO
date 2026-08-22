import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, compact, noLink }: { className?: string; compact?: boolean; noLink?: boolean }) {
  const content = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)]">
        <span className="grid grid-cols-2 gap-[3px]">
          <i className="size-[5px] rounded-full bg-current" />
          <i className="size-[5px] rounded-full bg-current" />
          <i className="size-[5px] rounded-full bg-current" />
          <i className="size-[5px] rounded-full bg-current" />
        </span>
      </span>
      {!compact && (
        <span className="font-display text-lg leading-none font-extrabold tracking-tight">
          Ludo<span className="text-primary">Arena</span>
        </span>
      )}
    </>
  );

  if (noLink) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      {content}
    </Link>
  );
}
