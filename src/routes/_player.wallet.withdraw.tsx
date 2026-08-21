import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel, PageHeader } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { useWalletStore } from "@/store/wallet-store";

export const Route = createFileRoute("/_player/wallet/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw — Ludo Arena" },
      {
        name: "description",
        content: "Withdraw your winning wallet balance to any UPI ID. Admin approves and pays.",
      },
      { property: "og:title", content: "Withdraw — Ludo Arena" },
      { property: "og:description", content: "Send winnings to your UPI ID." },
    ],
  }),
  component: WithdrawPage,
});

const MIN = 100;

function WithdrawPage() {
  const navigate = useNavigate();
  const { wallets, requestWithdraw } = useWalletStore();
  const [amount, setAmount] = useState<number>(MIN);
  const [upiId, setUpiId] = useState("");

  const [isPending, setIsPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
      toast.error("Enter a valid UPI ID, e.g. name@okaxis");
      return;
    }
    if (amount < MIN) {
      toast.error(`Minimum withdrawal is ${inr(MIN)}`);
      return;
    }
    if (amount > wallets.winning) {
      toast.error("Amount exceeds your winning wallet balance");
      return;
    }

    setIsPending(true);
    try {
      await requestWithdraw(amount, upiId);
      toast.success("Withdrawal requested — pending admin approval");
      navigate({ to: "/wallet" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to request withdrawal");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Withdraw" subtitle="Only the winning wallet can be withdrawn." />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <GlassPanel className="p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Available to withdraw
          </p>
          <p className="text-money mt-1 text-3xl font-extrabold text-accent">
            {inr(wallets.winning)}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upi">UPI ID</Label>
              <Input
                id="upi"
                placeholder="yourname@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="numeric"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
              />
              <div className="flex gap-2 pt-1">
                {[100, 500, wallets.winning].map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAmount(q)}
                    className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground"
                  >
                    {i === 2 ? "Max" : inr(q)}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Submitting..." : "Request withdrawal"}
            </Button>
          </form>
        </GlassPanel>

        <GlassPanel soft className="p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Info className="size-4 text-primary" /> How payouts work
          </h2>
          <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
            {[
              `Request is created with status pending (minimum ${inr(MIN)}).`,
              "Admin reviews the UPI ID and your match history.",
              "Payment is sent and the admin records the payout UTR.",
              "Status flips to paid and appears in your transaction history.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-money grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </GlassPanel>
      </div>
    </div>
  );
}
