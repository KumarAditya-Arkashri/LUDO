import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
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
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Profile</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Manage your account</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 font-bold"
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="size-4 mr-1.5" /> Sign out
        </Button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 flex items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
            {initials(user?.name ?? "Player")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black text-gray-800">{user?.name ?? "Player"}</p>
            <p className="truncate text-xs font-semibold text-gray-400 mt-0.5">
              {user?.mobile ?? "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 uppercase tracking-wide">
                <BadgeCheck className="size-3" /> Verified
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                Joined {user ? shortDate(user.createdAt || user.joinedAt) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Balance</p>
          <p className="font-black text-xl text-primary">{inr(wallets.main + wallets.winning + wallets.referral)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Win Rate</p>
          <p className="font-black text-xl text-gray-800">
            {played > 0 ? Math.round((wins / played) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-black text-gray-800">Personal Details</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile({ name });
            toast.success("Profile updated");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-gray-500">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-50 border-gray-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-xs font-bold text-gray-500">Mobile number</Label>
            <Input id="mobile" value={user?.mobile ?? ""} disabled className="bg-gray-100 border-gray-200 text-gray-500" />
            <p className="text-[10px] font-semibold text-gray-400">
              Mobile number is your login ID and cannot be changed.
            </p>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl">
            Save Changes
          </Button>
        </form>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="flex items-center gap-2 font-black text-gray-800">
          <Shield className="size-4 text-primary" /> Security
        </h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Password updated");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="current" className="text-xs font-bold text-gray-500">Current password</Label>
            <Input id="current" type="password" placeholder="••••••••" className="bg-gray-50 border-gray-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next" className="text-xs font-bold text-gray-500">New password</Label>
            <Input id="next" type="password" placeholder="Minimum 6 characters" className="bg-gray-50 border-gray-200" />
          </div>
          <Button type="submit" variant="secondary" className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold h-12 rounded-xl border border-gray-200">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
