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
  const user = useAuthStore((s) => s.user);
  const { wallets, fetchWallet } = useWalletStore();

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const total = wallets.main + wallets.winning + wallets.referral;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="text-foreground p-1">
            <Menu size={28} className="text-gray-600" />
          </button>
          <div className="scale-75 origin-left">
            <Logo />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link to="/wallet" className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 border border-gray-200">
            <WalletIcon size={16} className="text-primary" />
            <span className="text-sm font-bold text-gray-800">{inr(total)}</span>
          </Link>
          <Link to="/profile" className="flex items-center justify-center size-8 bg-gray-200 rounded-full text-gray-600">
            <UserIcon size={18} />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
