import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel, PageHeader } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { useWalletStore } from "@/store/wallet-store";

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
    <div className="space-y-6">
      <PageHeader title="Deposit" subtitle="Pay to the admin UPI, then submit your reference." />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <GlassPanel className="p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <QrCode className="size-4 text-primary" /> Step 1 — Pay
          </h2>
          <div className="mt-4 grid place-items-center rounded-2xl bg-secondary p-6">
            <div
              className="grid size-40 grid-cols-8 gap-0.5 rounded-xl bg-foreground p-2"
              role="img"
              aria-label="Admin UPI QR code placeholder"
            >
              {Array.from({ length: 64 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    (i * 7 + (i % 5)) % 3 === 0 ? "rounded-[2px] bg-background" : "bg-transparent"
                  }
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Admin UPI ID</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(ADMIN_UPI);
                toast.success("UPI ID copied");
              }}
              className="mt-1 flex items-center gap-2 text-sm font-bold text-primary"
            >
              {ADMIN_UPI} <Copy className="size-3.5" />
            </button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            Deposits are credited to your main wallet only after the admin verifies the payment.
          </p>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h2 className="font-bold">Step 2 — Submit proof</h2>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="numeric"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      amount === q
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border bg-secondary text-muted-foreground"
                    }`}
                  >
                    {inr(q)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utr">UTR / Reference number</Label>
              <Input
                id="utr"
                inputMode="numeric"
                placeholder="12-digit UTR from your UPI app"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 14))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Or upload payment screenshot</Label>
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                className="file:mr-3 file:text-xs file:font-semibold"
              />
              {fileName && <p className="text-xs text-accent">Attached: {fileName}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit deposit request"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Status stays <span className="font-semibold text-warning">pending</span> until an
              admin approves it.
            </p>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
}
