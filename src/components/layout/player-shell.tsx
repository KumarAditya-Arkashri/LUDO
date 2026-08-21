import { useEffect } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Gamepad2,
  History,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Users,
  Wallet as WalletIcon,
  Menu,
  Bell
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inr, initials } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useWalletStore } from "@/store/wallet-store";
import { api } from "@/lib/api";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/practice-battle", label: "Play Ludo", icon: Gamepad2 },
  { to: "/history", label: "Matches", icon: History },
  { to: "/referral", label: "Referral", icon: Users },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function PlayerShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { wallets, fetchWallet } = useWalletStore();

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Logout locally even if the server is unavailable.
    } finally {
      logout();
    }
  };

  const total = wallets.main + wallets.winning + wallets.referral;
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="arena-bg min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar/80 px-4 py-5 backdrop-blur-xl lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                isActive(item.to) && "bg-primary/12 text-primary",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/practice-battle"
          className="glass-soft mb-3 flex items-center gap-3 rounded-xl border border-primary/20 p-3 text-sm transition-colors hover:bg-primary/10"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Gamepad2 className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Ready to play?</span>
            <span className="block font-bold">Find a Ludo battle</span>
          </span>
        </Link>
        <div className="glass-soft mb-3 rounded-xl p-3 text-sm">
          <span className="block text-xs text-muted-foreground">Account balance</span>
          <span className="text-money block font-bold">{inr(total)}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded-md p-1 -ml-1 text-muted-foreground hover:text-foreground lg:hidden">
                <Menu className="size-6" />
                <span className="sr-only">Menu</span>
              </button>
              <Link to="/dashboard" className="flex items-center gap-2">
                <Logo compact className="lg:hidden" />
                <Logo className="hidden lg:block" />
              </Link>
            </div>
            
            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              <div className="glass-soft hidden rounded-xl px-3 py-1.5 sm:block">
                <span className="text-money text-sm font-bold text-primary">{inr(total)}</span>
              </div>
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Link to="/wallet/deposit">Add cash</Link>
              </Button>
              
              <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <Bell className="size-5" />
                <span className="sr-only">Notifications</span>
              </button>
              
              <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden">
                <UserIcon className="size-5" />
                <span className="sr-only">Profile</span>
              </button>

              <span className="hidden size-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary lg:grid">
                {initials(user?.name ?? "Player")}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground",
                isActive(item.to) && "text-primary",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
