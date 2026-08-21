import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { GlassPanel, PageHeader, StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, shortDateTime } from "@/lib/format";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/withdrawals")({
  head: () => ({
    meta: [
      { title: "Withdrawals — Ludo Arena Admin" },
      { name: "description", content: "Approve UPI payouts and record the payment UTR." },
      { property: "og:title", content: "Withdrawals — Ludo Arena Admin" },
      { property: "og:description", content: "Approve UPI payouts and record the payment UTR." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminWithdrawals,
});

function AdminWithdrawals() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ["admin", "withdrawals", "pending"],
    queryFn: async () => {
      const res = await api.get("/admin/withdrawal/pending");
      return res.data;
    },
  });

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["admin", "withdrawals", "history"],
    queryFn: async () => {
      const res = await api.get("/admin/withdrawal/history");
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, utr }: { id: string; utr: string }) => {
      await api.post(`/admin/withdrawal/${id}/approve`, { utr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/withdrawal/${id}/reject`, { reason: "Admin rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Withdrawals" subtitle="Pay out, then store the UTR against the request." />
      
      <div className="flex gap-4 border-b border-border pb-2">
        <button 
          className={`font-semibold ${activeTab === "pending" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending
        </button>
        <button 
          className={`font-semibold ${activeTab === "history" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      <div className="grid gap-3">
        {activeTab === "pending" && (
          <>
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && withdrawals.length === 0 && (
              <p className="text-muted-foreground">No pending withdrawals</p>
            )}
            {withdrawals.map((w: any) => (
              <WithdrawalCard
                key={w.id}
                w={w}
                onApprove={(utr) => approveMutation.mutate({ id: w.id, utr })}
                onReject={() => rejectMutation.mutate(w.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </>
        )}

        {activeTab === "history" && (
          <>
            {isLoadingHistory && <p className="text-muted-foreground">Loading history...</p>}
            {!isLoadingHistory && history.length === 0 && (
              <p className="text-muted-foreground">No history available</p>
            )}
            {history.map((w: any) => (
              <WithdrawalCard
                key={w.id}
                w={w}
                onApprove={() => {}}
                onReject={() => {}}
                disabled={true}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function WithdrawalCard({
  w,
  onApprove,
  onReject,
  disabled,
}: {
  w: any;
  onApprove: (utr: string) => void;
  onReject: () => void;
  disabled: boolean;
}) {
  const [utr, setUtr] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApprove(utr);
  };

  return (
    <GlassPanel className="p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-bold">{w.user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {w.id} · {w.upiId} · {shortDateTime(w.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-money font-extrabold">{inr(w.amount)}</span>
          <StatusPill status={w.status} />
        </div>
      </div>
      {w.status === "PENDING" ? (
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
          <Input
            placeholder="Payout UTR"
            className="sm:max-w-xs"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            disabled={disabled}
            required
          />
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={disabled}>
              Mark paid
            </Button>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={onReject}
              disabled={disabled}
            >
              Reject
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Payout UTR: {w.utr ?? "—"}</p>
      )}
    </GlassPanel>
  );
}
