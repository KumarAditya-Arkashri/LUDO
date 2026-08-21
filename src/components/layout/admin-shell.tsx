import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  FileText,
  LayoutDashboard,
  Settings,
  Swords,
  Users,
  Users2,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/wallet", label: "Wallet", icon: Wallet },
  { to: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { to: "/admin/matches", label: "Matches", icon: Swords },
  { to: "/admin/referral", label: "Referral", icon: Users2 },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/admin" ? pathname === "/admin" : pathname === to);

  return (
    <div className="arena-bg min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar/80 px-3 py-5 backdrop-blur-xl lg:flex">
        <div className="px-1">
          <Logo />
          <p className="mt-2 px-1 text-[11px] font-bold tracking-widest text-primary uppercase">
            Admin console
          </p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                isActive(item.to) && "bg-primary/12 text-primary",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <FileText className="size-4" /> Back to app
        </Link>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Logo compact />
            <span className="text-sm font-bold">Admin console</span>
          </div>
          <div className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground",
                  isActive(item.to) ? "bg-primary/15 text-primary" : "bg-secondary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
