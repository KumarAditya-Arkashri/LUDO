import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Gift, Trophy, Wallet } from "lucide-react";
import { GlassPanel, PageHeader, StatCard, StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { inr, shortDateTime } from "@/lib/format";
import { useWalletStore } from "@/store/wallet-store";
import { useEffect } from "react";

export const Route = createFileRoute("/_player/wallet/")({
  head: () => ({
    meta: [
      { title: "Wallet — Ludo Arena" },
      {
        name: "description",
        content: "Track your main, winning and referral wallets plus every transaction.",
      },
      { property: "og:title", content: "Wallet — Ludo Arena" },
      { property: "og:description", content: "Balances, deposits, withdrawals and history." },
    ],
  }),
  component: WalletPage,
});

const TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdraw: "Withdrawal",
  entry_fee: "Entry fee",
  win: "Match win",
  referral_bonus: "Referral bonus",
  refund: "Refund",
};

function WalletPage() {
  const { wallets, transactions, fetchHistory, isLoading } = useWalletStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        subtitle="Main balance plays, winning balance withdraws."
        action={
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/wallet/deposit">
                <ArrowDownToLine className="size-4" /> Deposit
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/wallet/withdraw">
                <ArrowUpFromLine className="size-4" /> Withdraw
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Main wallet"
          value={inr(wallets.main)}
          hint="Deposits + refunds"
          icon={<Wallet className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Winning wallet"
          value={inr(wallets.winning)}
          hint="Withdrawable"
          icon={<Trophy className="size-5" />}
          tone="accent"
        />
        <StatCard
          label="Referral wallet"
          value={inr(wallets.referral)}
          hint="Invite earnings"
          icon={<Gift className="size-5" />}
        />
      </div>

      <GlassPanel className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold">Transaction history</h2>
        </div>
        <ul className="divide-y divide-border">
          {isLoading && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</li>
          )}
          {!isLoading && transactions.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              No transactions found
            </li>
          )}
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{TYPE_LABEL[t.type] ?? t.type}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.reference ?? t.id} · {shortDateTime(t.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusPill status={t.status} />
                <span
                  className={`text-money text-sm font-bold ${t.amount >= 0 ? "text-accent" : "text-muted-foreground"}`}
                >
                  {t.amount >= 0 ? "+" : "−"}
                  {inr(Math.abs(t.amount))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
