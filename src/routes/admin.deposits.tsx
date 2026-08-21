import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassPanel, PageHeader, StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { inr, shortDateTime } from "@/lib/format";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/deposits")({
  head: () => ({
    meta: [
      { title: "Deposits — Ludo Arena Admin" },
      { name: "description", content: "Verify UTR references and credit player main wallets." },
      { property: "og:title", content: "Deposits — Ludo Arena Admin" },
      {
        property: "og:description",
        content: "Verify UTR references and credit player main wallets.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDeposits,
});

function AdminDeposits() {
  const queryClient = useQueryClient();

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["admin", "deposits", "pending"],
    queryFn: async () => {
      const res = await api.get("/admin/deposit/pending");
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/deposit/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits", "pending"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/deposit/${id}/reject`, { reason: "Admin rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits", "pending"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Deposits" subtitle="Approve to credit the main wallet instantly." />
      <GlassPanel className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-3 font-semibold">Request</th>
              <th className="px-5 py-3 font-semibold">Player</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">UTR</th>
              <th className="px-5 py-3 font-semibold">Submitted</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && deposits.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                  No pending deposits
                </td>
              </tr>
            )}
            {deposits.map((d: any) => (
              <tr key={d.id}>
                <td className="px-5 py-3.5 font-semibold text-xs">{d.id}</td>
                <td className="px-5 py-3.5">
                  <p className="font-semibold">{d.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{d.user?.mobile}</p>
                </td>
                <td className="text-money px-5 py-3.5 font-bold">{inr(d.amount)}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{d.utr}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{shortDateTime(d.createdAt)}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={d.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  {d.status === "PENDING" ? (
                    <span className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(d.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => rejectMutation.mutate(d.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
