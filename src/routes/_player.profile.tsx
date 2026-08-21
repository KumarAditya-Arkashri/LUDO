import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel, PageHeader, StatCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { initials, inr, shortDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useWalletStore } from "@/store/wallet-store";

export const Route = createFileRoute("/_player/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Ludo Arena" },
      { name: "description", content: "Manage your Ludo Arena profile, password and session." },
      { property: "og:title", content: "Profile — Ludo Arena" },
      { property: "og:description", content: "Your account details and play stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuthStore();
  const wallets = useWalletStore((s) => s.wallets);
  const [name, setName] = useState(user?.name ?? "");

  const wins = 0;
  const played = 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Account details, stats and security." />

      <GlassPanel className="p-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <span className="text-money grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/15 text-xl font-extrabold text-primary">
            {initials(user?.name ?? "Player")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{user?.name ?? "Player"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.mobile ?? "—"} · joined{" "}
              {user ? shortDate(user.createdAt || user.joinedAt) : "—"}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
              <BadgeCheck className="size-3.5" /> Mobile verified
            </p>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Matches played" value={String(played)} />
        <StatCard label="Matches won" value={String(wins)} tone="accent" />
        <StatCard
          label="Total balance"
          value={inr(wallets.main + wallets.winning + wallets.referral)}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <h2 className="font-bold">Personal details</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile({ name });
              toast.success("Profile updated");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input id="mobile" value={user?.mobile ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Mobile number is your login ID and cannot be changed.
              </p>
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Shield className="size-4 text-primary" /> Security
          </h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Password updated");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">New password</Label>
              <Input id="next" type="password" placeholder="Minimum 6 characters" />
            </div>
            <Button type="submit" variant="secondary">
              Update password
            </Button>
          </form>
          <Separator className="my-5" />
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </GlassPanel>
      </div>
    </div>
  );
}
