import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Info, ArrowLeft, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { useWalletStore } from "@/store/wallet-store";
import { Link } from "@tanstack/react-router";

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
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link to="/wallet" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="size-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-800">Withdraw</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Send winnings to your UPI ID.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available to withdraw</p>
              <p className="font-black text-3xl text-gray-800">{inr(wallets.winning)}</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="upi" className="text-xs font-bold text-gray-500">UPI ID</Label>
              <Input
                id="upi"
                placeholder="yourname@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="amount" className="text-xs font-bold text-gray-500">Amount</Label>
              <Input
                id="amount"
                inputMode="numeric"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
                className="bg-gray-50 border-gray-200 font-bold"
              />
              <div className="flex gap-2 pt-2">
                {[100, 500, wallets.winning].map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAmount(q)}
                    className="rounded-full border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 transition-colors"
                  >
                    {i === 2 ? "Max" : inr(q)}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl" disabled={isPending}>
                {isPending ? "Submitting..." : "Request Withdrawal"}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
          <h2 className="flex items-center gap-2 font-black text-gray-800 mb-4">
            <Info className="size-4 text-primary" /> How payouts work
          </h2>
          <ol className="space-y-4 text-sm font-medium text-gray-600">
            {[
              `Request is created with status pending (minimum ${inr(MIN)}).`,
              "Admin reviews the UPI ID and your match history.",
              "Payment is sent and the admin records the payout UTR.",
              "Status flips to paid and appears in your transaction history.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="grid size-6 mt-0.5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
