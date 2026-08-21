import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlassPanel({
  children,
  className,
  soft,
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
}) {
  return (
    <div className={cn(soft ? "glass-soft" : "glass", "rounded-2xl", className)}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "accent";
}) {
  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p
            className={cn(
              "text-money mt-2 text-2xl font-extrabold",
              tone === "primary" && "text-primary",
              tone === "accent" && "text-accent",
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground",
              tone === "primary" && "bg-primary/15 text-primary",
              tone === "accent" && "bg-accent/15 text-accent",
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </GlassPanel>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && (
        <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
          {icon}
        </span>
      )}
      <p className="font-display font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  paid: "bg-success/15 text-success border-success/30",
  active: "bg-success/15 text-success border-success/30",
  completed: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  live: "bg-primary/15 text-primary border-primary/30",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        statusStyles[status] ?? "bg-secondary text-secondary-foreground border-border",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
