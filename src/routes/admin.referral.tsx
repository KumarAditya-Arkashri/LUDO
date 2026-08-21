import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassPanel, PageHeader, StatCard, StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, shortDate } from "@/lib/format";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/referral")({
  head: () => ({
    meta: [
      { title: "Referral — Ludo Arena Admin" },
      { name: "description", content: "Configure referral payout rate and audit invite earnings." },
      { property: "og:title", content: "Referral — Ludo Arena Admin" },
      {
        property: "og:description",
        content: "Configure referral payout rate and audit invite earnings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReferral,
});

function AdminReferral() {
  const queryClient = useQueryClient();
  const [rewardAmount, setRewardAmount] = useState("10");

  const { data: config } = useQuery({
    queryKey: ["admin", "referral", "config"],
    queryFn: async () => {
      const res = await api.get("/admin/referral/config");
      return res.data;
    },
  });

  useEffect(() => {
    if (config?.rewardAmount) {
      setRewardAmount(config.rewardAmount.toString());
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (amount: number) => {
      await api.put("/admin/referral/config", { rewardAmount: amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "referral", "config"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(Number(rewardAmount));
  };

  const referrals: any[] = [];

  return (
    <div className="space-y-6">
      <PageHeader title="Referral" subtitle="Program settings and payout ledger." />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Referred users" value="486" />
        <StatCard label="Bonus paid" value={inr(24800)} tone="accent" />
        <StatCard label="Reward Amount" value={inr(config?.rewardAmount || 10)} tone="primary" />
      </div>
      <GlassPanel className="max-w-lg p-5">
        <h2 className="font-bold">Program settings</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="reward">Reward Amount</Label>
            <Input
              id="reward"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={updateMutation.isPending}>
            Save settings
          </Button>
        </form>
      </GlassPanel>
      <GlassPanel className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold">Referral ledger</h2>
        </div>
        <ul className="divide-y divide-border">
          {referrals.length === 0 && (
            <li className="text-sm text-muted-foreground px-5 py-4">No referrals found</li>
          )}
          {referrals.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.mobile} · {shortDate(r.joinedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusPill status={r.status} />
                <span className="text-money text-sm font-bold text-accent">{inr(r.earned)}</span>
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
