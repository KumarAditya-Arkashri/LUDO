import { createFileRoute } from "@tanstack/react-router";
import { Copy, Gift, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, PageHeader, StatCard, StatusPill } from "@/components/common/ui-kit";
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
    <div className="space-y-6">
      <PageHeader title="Referral" subtitle="Earn 2% of every entry fee your invites play." />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Referral wallet"
          value={inr(referral)}
          icon={<Gift className="size-5" />}
          tone="accent"
        />
        <StatCard
          label="Total earned"
          value={inr(totalEarned)}
          icon={<Share2 className="size-5" />}
        />
        <StatCard
          label="Friends joined"
          value={String(friendsJoined)}
          icon={<UserPlus className="size-5" />}
        />
      </div>

      <GlassPanel className="p-5">
        <h2 className="font-bold">Your invite</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="glass-soft rounded-xl px-5 py-4 text-center">
            <p className="text-xs text-muted-foreground">Code</p>
            <p className="text-money mt-1 text-2xl font-extrabold tracking-widest text-primary">
              {isLoadingDashboard ? "..." : code}
            </p>
          </div>
          <div className="min-w-0 space-y-3">
            <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-3">
              <span className="truncate text-sm text-muted-foreground">
                {isLoadingDashboard ? "Loading link..." : link}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => copy(link, "Referral link")}
                disabled={isLoadingDashboard}
              >
                <Copy className="size-4" /> Copy link
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copy(code, "Referral code")}
                disabled={isLoadingDashboard}
              >
                Copy code
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold">Referral history</h2>
        </div>
        <ul className="divide-y divide-border">
          {isLoadingHistory && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</li>
          )}
          {!isLoadingHistory && referrals.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              No referrals yet
            </li>
          )}
          {referrals.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">joined {shortDate(r.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusPill status={"active"} />
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
