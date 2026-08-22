import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, QrCode, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { useWalletStore } from "@/store/wallet-store";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_player/wallet/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit — Ludo Arena" },
      {
        name: "description",
        content: "Add cash via UPI QR, submit your UTR and get verified by the admin.",
      },
      { property: "og:title", content: "Deposit — Ludo Arena" },
      { property: "og:description", content: "Scan the QR, pay and submit your UTR reference." },
    ],
  }),
  component: DepositPage,
});

const QUICK = [100, 200, 500, 1000];
const ADMIN_UPI = "ludoarena@okicici";

function DepositPage() {
  const navigate = useNavigate();
  const requestDeposit = useWalletStore((s) => s.requestDeposit);
  const [amount, setAmount] = useState<number>(200);
  const [utr, setUtr] = useState("");
  const [fileName, setFileName] = useState("");

  const [isPending, setIsPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 50) {
      toast.error("Minimum deposit is ₹50");
      return;
    }
    if (!/^\d{10,14}$/.test(utr) && !fileName) {
      toast.error("Enter a valid UTR or upload the payment screenshot");
      return;
    }

    setIsPending(true);
    try {
      await requestDeposit(amount, utr || "screenshot");
      toast.success("Deposit submitted — pending admin verification");
      navigate({ to: "/wallet" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to request deposit");
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
          <h1 className="text-2xl font-black text-gray-800">Deposit</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Add cash to main wallet</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-black text-gray-800 mb-4">
            <QrCode className="size-4 text-primary" /> Step 1 — Pay
          </h2>
          <div className="grid place-items-center rounded-2xl bg-gray-50 border border-gray-100 p-6">
            <div
              className="grid size-40 grid-cols-8 gap-0.5 rounded-xl bg-gray-900 p-2 shadow-sm"
              role="img"
              aria-label="Admin UPI QR code placeholder"
            >
              {Array.from({ length: 64 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    (i * 7 + (i % 5)) % 3 === 0 ? "rounded-[2px] bg-white" : "bg-transparent"
                  }
                />
              ))}
            </div>
            <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Admin UPI ID</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(ADMIN_UPI);
                toast.success("UPI ID copied");
              }}
              className="mt-1 flex items-center gap-2 text-lg font-black text-primary hover:text-primary/80 transition-colors"
            >
              {ADMIN_UPI} <Copy className="size-4" />
            </button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[11px] font-medium text-gray-500 leading-relaxed">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-500" />
            Deposits are credited to your main wallet only after the admin verifies the payment.
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="font-black text-gray-800 mb-4">Step 2 — Submit Proof</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-bold text-gray-500">Amount</Label>
              <Input
                id="amount"
                inputMode="numeric"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
                className="bg-gray-50 border-gray-200 font-bold"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      amount === q
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {inr(q)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="utr" className="text-xs font-bold text-gray-500">UTR / Reference Number</Label>
              <Input
                id="utr"
                inputMode="numeric"
                placeholder="12-digit UTR from your UPI app"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 14))}
                className="bg-gray-50 border-gray-200"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="screenshot" className="text-xs font-bold text-gray-500">Or Upload Screenshot</Label>
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                className="file:mr-3 file:text-xs file:font-semibold bg-gray-50 border-gray-200"
              />
              {fileName && <p className="text-[10px] font-bold text-green-600 mt-1">Attached: {fileName}</p>}
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit Request"}
              </Button>
              <p className="text-center text-[10px] font-medium text-gray-400 mt-3">
                Status stays <span className="font-bold text-orange-500">pending</span> until an
                admin approves it.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
