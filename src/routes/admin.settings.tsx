import { createFileRoute } from "@tanstack/react-router";
import { GlassPanel, PageHeader } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ENTRY_FEES } from "@/lib/constants";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Ludo Arena Admin" },
      {
        name: "description",
        content: "Platform fee, entry fees, payout limits and maintenance mode.",
      },
      { property: "og:title", content: "Settings — Ludo Arena Admin" },
      {
        property: "og:description",
        content: "Platform fee, entry fees, payout limits and maintenance mode.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Platform configuration." />
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <h2 className="font-bold">Game & fees</h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="fee">Platform fee (%)</Label>
              <Input id="fee" defaultValue="5" inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timer">Turn timer (seconds)</Label>
              <Input id="timer" defaultValue="20" inputMode="numeric" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Active entry fees</Label>
              <div className="flex flex-wrap gap-2">
                {ENTRY_FEES.map((f) => (
                  <span
                    key={f}
                    className="text-money rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary"
                  >
                    {inr(f)}
                  </span>
                ))}
              </div>
            </div>
            <Button type="submit" className="sm:col-span-2">
              Save
            </Button>
          </form>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h2 className="font-bold">Payments</h2>
          <form className="mt-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="upi">Admin UPI ID</Label>
              <Input id="upi" defaultValue="ludoarena@okicici" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mindep">Min deposit</Label>
                <Input id="mindep" defaultValue="50" inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minwdl">Min withdrawal</Label>
                <Input id="minwdl" defaultValue="100" inputMode="numeric" />
              </div>
            </div>
            <Button type="submit" variant="secondary">
              Update
            </Button>
          </form>
          <Separator className="my-5" />
          <div className="space-y-4">
            {[
              { id: "maintenance", label: "Maintenance mode", hint: "Blocks new matches" },
              { id: "signups", label: "Allow new signups", hint: "Registration open" },
              {
                id: "auto",
                label: "Auto-approve deposits under ₹200",
                hint: "Skips manual review",
              },
            ].map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </div>
                <Switch id={t.id} defaultChecked={t.id === "signups"} />
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
