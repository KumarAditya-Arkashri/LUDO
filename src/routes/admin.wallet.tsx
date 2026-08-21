import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { GlassPanel, PageHeader, StatCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet control — Ludo Arena Admin" },
      { name: "description", content: "Platform float, wallet totals and manual adjustments." },
      { property: "og:title", content: "Wallet control — Ludo Arena Admin" },
      {
        property: "og:description",
        content: "Platform float, wallet totals and manual adjustments.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminWallet,
});

function AdminWallet() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const creditMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/wallet/credit", {
        userId,
        amount: Number(amount),
        walletType: "MAIN",
        description: reason,
      });
    },
    onSuccess: () => {
      setUserId("");
      setAmount("");
      setReason("");
      alert("Credited successfully");
    },
  });

  const debitMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/wallet/debit", {
        userId,
        amount: Number(amount),
        walletType: "MAIN",
        description: reason,
      });
    },
    onSuccess: () => {
      setUserId("");
      setAmount("");
      setReason("");
      alert("Debited successfully");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet control" subtitle="Liability held across all player wallets." />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Main wallets" value={inr(0)} tone="primary" />
        <StatCard label="Winning wallets" value={inr(0)} tone="accent" />
        <StatCard label="Referral wallets" value={inr(0)} />
      </div>
      <GlassPanel className="max-w-xl p-5">
        <h2 className="font-bold">Manual adjustment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Credit or debit a player wallet. Every adjustment is logged with your admin ID.
        </p>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="user">Player ID</Label>
            <Input
              id="user"
              placeholder="User ID UUID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amt">Amount</Label>
            <Input
              id="amt"
              placeholder="500"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="Goodwill credit for cancelled match"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="button"
              onClick={() => creditMutation.mutate()}
              disabled={creditMutation.isPending || debitMutation.isPending || !userId || !amount}
            >
              Credit
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => debitMutation.mutate()}
              disabled={creditMutation.isPending || debitMutation.isPending || !userId || !amount}
            >
              Debit
            </Button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
