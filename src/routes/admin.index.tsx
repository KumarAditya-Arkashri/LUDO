import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, IndianRupee, Users } from "lucide-react";
import { GlassPanel, PageHeader, StatCard, StatusPill } from "@/components/common/ui-kit";
import { inr, shortDateTime } from "@/lib/format";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Overview — Ludo Arena Admin" },
      { name: "description", content: "Platform KPIs, pending approvals and live tables." },
      { property: "og:title", content: "Overview — Ludo Arena Admin" },
      { property: "og:description", content: "Platform KPIs, pending approvals and live tables." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const res = await api.get("/admin/overview");
      return res.data;
    },
  });

  const { data: pendingDeposits = [], isLoading: isLoadingDeposits } = useQuery({
    queryKey: ["admin", "deposits", "pending"],
    queryFn: async () => {
      const res = await api.get("/admin/deposit/pending");
      return res.data;
    },
  });

  const { data: pendingWithdrawals = [], isLoading: isLoadingWithdrawals } = useQuery({
    queryKey: ["admin", "withdrawals", "pending"],
    queryFn: async () => {
      const res = await api.get("/admin/withdrawal/pending");
      return res.data;
    },
  });

  const liveTables: any[] = []; // Can be enhanced later to fetch from game gateway

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle="Today at a glance." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={isLoadingOverview ? "..." : (overview?.totalUsers ?? 0).toLocaleString()}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Deposits today"
          value={isLoadingOverview ? "..." : inr(overview?.depositsToday ?? 0)}
          tone="primary"
          icon={<ArrowDownToLine className="size-5" />}
        />
        <StatCard
          label="Payouts today"
          value={isLoadingOverview ? "..." : inr(overview?.payoutsToday ?? 0)}
          icon={<ArrowUpFromLine className="size-5" />}
        />
        <StatCard
          label="Platform revenue"
          value={isLoadingOverview ? "..." : inr(overview?.platformRevenue ?? 0)}
          tone="accent"
          icon={<IndianRupee className="size-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <GlassPanel className="p-5">
          <h2 className="font-bold">Pending deposits</h2>
          <ul className="mt-4 divide-y divide-border">
            {isLoadingDeposits && (
              <li className="text-sm text-muted-foreground py-2">Loading...</li>
            )}
            {!isLoadingDeposits && pendingDeposits.length === 0 && (
              <li className="text-sm text-muted-foreground py-2">No pending deposits</li>
            )}
            {pendingDeposits.map((d: any) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{d.user?.name}</p>
                  <p className="text-xs text-muted-foreground">UTR {d.utr}</p>
                </div>
                <span className="text-money text-sm font-bold text-primary">{inr(d.amount)}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2 className="font-bold">Pending withdrawals</h2>
          <ul className="mt-4 divide-y divide-border">
            {isLoadingWithdrawals && (
              <li className="text-sm text-muted-foreground py-2">Loading...</li>
            )}
            {!isLoadingWithdrawals && pendingWithdrawals.length === 0 && (
              <li className="text-sm text-muted-foreground py-2">No pending withdrawals</li>
            )}
            {pendingWithdrawals.map((w: any) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{w.user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{w.upiId}</p>
                </div>
                <span className="text-money text-sm font-bold">{inr(w.amount)}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2 className="font-bold">Live tables</h2>
          <ul className="mt-4 divide-y divide-border">
            {liveTables.length === 0 && (
              <li className="text-sm text-muted-foreground py-2">No live tables</li>
            )}
          </ul>
        </GlassPanel>
      </div>

      <GlassPanel className="p-5">
        <h2 className="font-bold">Latest approvals</h2>
        <ul className="mt-4 divide-y divide-border text-sm">
          {isLoadingOverview && <li className="text-muted-foreground py-2">Loading...</li>}
          {!isLoadingOverview && overview?.latestApprovals?.length === 0 && (
            <li className="text-muted-foreground py-2">No recent approvals</li>
          )}
          {overview?.latestApprovals?.map((a: any) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {a.user?.name}
                  <StatusPill status={a.status} className="ml-2" />
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.type} · {shortDateTime(a.verifiedAt)} · by {a.verifiedBy?.name}
                </p>
              </div>
              <span className="text-money font-bold">{inr(a.amount)}</span>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
