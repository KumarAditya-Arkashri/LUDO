import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Gift, Trophy, Wallet } from "lucide-react";
import { PageHeader, StatusPill } from "@/components/common/ui-kit";
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
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Wallet</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Manage your funds</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 h-9 font-bold">
            <Link to="/wallet/deposit">
              Deposit
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-lg px-4 h-9 font-bold text-gray-700 bg-white shadow-sm border-gray-200">
            <Link to="/wallet/withdraw">
              Withdraw
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Main Wallet */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Main Wallet</p>
              <p className="text-gray-400 text-[10px]">Deposits + refunds</p>
            </div>
          </div>
          <p className="font-black text-xl text-gray-800">{inr(wallets.main)}</p>
        </div>
        
        {/* Winning Wallet */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Winning Wallet</p>
              <p className="text-gray-400 text-[10px]">Withdrawable</p>
            </div>
          </div>
          <p className="font-black text-xl text-gray-800">{inr(wallets.winning)}</p>
        </div>

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
          <p className="font-black text-xl text-gray-800">{inr(wallets.referral)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="border-b border-gray-100 px-5 py-4 bg-gray-50">
          <h2 className="font-bold text-sm text-gray-700">Transaction History</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {isLoading && (
            <li className="px-5 py-8 text-center text-sm font-medium text-gray-400">Loading...</li>
          )}
          {!isLoading && transactions.length === 0 && (
            <li className="px-5 py-12 text-center text-sm font-medium text-gray-400">
              No transactions found
            </li>
          )}
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-800">{TYPE_LABEL[t.type] ?? t.type}</p>
                <p className="truncate text-xs text-gray-400 font-medium mt-0.5">
                  {t.reference ?? t.id} · {shortDateTime(t.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-sm font-black ${t.amount >= 0 ? "text-success" : "text-gray-800"}`}
                >
                  {t.amount >= 0 ? "+" : "−"}
                  {inr(Math.abs(t.amount))}
                </span>
                <StatusPill status={t.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
