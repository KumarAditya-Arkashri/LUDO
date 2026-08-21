import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassPanel, PageHeader, StatCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Ludo Arena Admin" },
      {
        name: "description",
        content: "Weekly deposits versus payouts and exportable financial summaries.",
      },
      { property: "og:title", content: "Reports — Ludo Arena Admin" },
      {
        property: "og:description",
        content: "Weekly deposits versus payouts and exportable financial summaries.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReports,
});

function AdminReports() {
  const revenueSeries: any[] = [];
  const totalDeposits = revenueSeries.reduce((s, d) => s + d.deposits, 0);
  const totalPayouts = revenueSeries.reduce((s, d) => s + d.payouts, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Last 7 days"
        action={
          <Button variant="secondary" size="sm">
            Export CSV
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Deposits" value={inr(totalDeposits)} tone="primary" />
        <StatCard label="Payouts" value={inr(totalPayouts)} />
        <StatCard label="Gross margin" value={inr(totalDeposits - totalPayouts)} tone="accent" />
      </div>
      <GlassPanel className="p-5">
        <h2 className="font-bold">Deposits vs payouts</h2>
        <div className="mt-5 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Bar dataKey="deposits" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="payouts" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    </div>
  );
}
