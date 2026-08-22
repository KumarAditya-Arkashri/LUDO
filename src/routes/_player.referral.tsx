import { createFileRoute } from "@tanstack/react-router";
import { Copy, Gift, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { inr, shortDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useWalletStore } from "@/store/wallet-store";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_player/referral")({
  head: () => ({
    meta: [
      { title: "Referral — Ludo Arena" },
      {
        name: "description",
        content: "Share your referral link, earn a bonus on every friend who plays.",
      },
      { property: "og:title", content: "Referral — Ludo Arena" },
      { property: "og:description", content: "Invite friends and grow your referral wallet." },
    ],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const user = useAuthStore((s) => s.user);
  const referral = useWalletStore((s) => s.wallets.referral);

  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["referral-dashboard"],
    queryFn: async () => {
      const res = await api.get("/referral/dashboard");
      return res.data;
    },
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["referral-history"],
    queryFn: async () => {
      const res = await api.get("/referral/history");
      return res.data;
    },
  });

  const code = dashboard?.referralCode ?? user?.referralCode ?? "LUDO7X24";
  const link = dashboard?.referralLink ?? `https://ludoarena.app/register?ref=${code}`;
  const totalEarned = dashboard?.totalEarned ?? 0;
  const friendsJoined = dashboard?.referredCount ?? 0;
  const referrals = historyData?.users ?? [];

  const copy = (value: string, label: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-black text-gray-800">Referral</h1>
        <p className="text-xs text-gray-500 font-medium mt-1">Earn 2% of every entry fee your invites play.</p>
      </div>

      <div className="space-y-3">
        {/* Referral Wallet */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <Gift className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Referral Wallet</p>
              <p className="text-gray-400 text-[10px]">Invite earnings</p>
            </div>
          </div>
          <p className="font-black text-xl text-gray-800">{inr(referral)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="size-4 text-blue-500" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Earned</p>
            </div>
            <p className="font-black text-xl text-gray-800">{inr(totalEarned)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="size-4 text-primary" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Friends</p>
            </div>
            <p className="font-black text-xl text-gray-800">{friendsJoined}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <h2 className="font-black text-gray-800 mb-4">Your Invite</h2>
        
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Invite Code</p>
          <p className="text-2xl font-black text-primary tracking-widest">
            {isLoadingDashboard ? "..." : code}
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3 overflow-hidden">
            <span className="truncate text-xs font-medium text-gray-600">
              {isLoadingDashboard ? "Loading link..." : link}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 rounded-xl"
              onClick={() => copy(link, "Referral link")}
              disabled={isLoadingDashboard}
            >
              <Copy className="size-4 mr-2" /> Copy Link
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white text-gray-700 hover:bg-gray-50 font-bold h-11 rounded-xl border-gray-200"
              onClick={() => copy(code, "Referral code")}
              disabled={isLoadingDashboard}
            >
              Copy Code
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="border-b border-gray-100 px-5 py-4 bg-gray-50">
          <h2 className="font-bold text-sm text-gray-700">Referral History</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {isLoadingHistory && (
            <li className="px-5 py-8 text-center text-sm font-medium text-gray-400">Loading...</li>
          )}
          {!isLoadingHistory && referrals.length === 0 && (
            <li className="px-5 py-12 text-center text-sm font-medium text-gray-400">
              No referrals yet
            </li>
          )}
          {referrals.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-800">{r.name}</p>
                <p className="truncate text-xs text-gray-400 font-medium mt-0.5">
                  joined {shortDate(r.createdAt)}
                </p>
              </div>
              <div className="shrink-0">
                <StatusPill status={"active"} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
