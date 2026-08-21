import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History } from "lucide-react";
import { EmptyState, GlassPanel, PageHeader, StatusPill } from "@/components/common/ui-kit";
import { inr, shortDateTime } from "@/lib/format";

export const Route = createFileRoute("/_player/history")({
  head: () => ({
    meta: [
      { title: "Match history — Ludo Arena" },
      {
        name: "description",
        content: "Every 1v1 Ludo match you played: entry fee, opponent, winner and amount won.",
      },
      { property: "og:title", content: "Match history — Ludo Arena" },
      { property: "og:description", content: "Your full Ludo Arena match record." },
    ],
  }),
  component: HistoryPage,
});

const FILTERS = ["all", "won", "lost", "cancelled"] as const;

function HistoryPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const matches: any[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Match history"
        subtitle="Results are final once the server declares them."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <GlassPanel className="overflow-hidden">
        {matches.length === 0 ? (
          <EmptyState
            title="No matches here yet"
            description="Play a table and your results will show up in this list."
            icon={<History className="size-5" />}
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Match</th>
                  <th className="px-5 py-3 font-semibold">Entry fee</th>
                  <th className="px-5 py-3 font-semibold">Opponent</th>
                  <th className="px-5 py-3 font-semibold">Winner</th>
                  <th className="px-5 py-3 font-semibold">Amount won</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matches.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-3.5 font-semibold">{m.id}</td>
                    <td className="text-money px-5 py-3.5">{inr(m.entryFee)}</td>
                    <td className="px-5 py-3.5">{m.opponentName}</td>
                    <td className="px-5 py-3.5">{m.winnerName}</td>
                    <td
                      className={`text-money px-5 py-3.5 font-bold ${m.isWin ? "text-accent" : "text-muted-foreground"}`}
                    >
                      {m.isWin ? `+${inr(m.amountWon)}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {shortDateTime(m.playedAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="divide-y divide-border md:hidden">
              {matches.map((m) => (
                <li key={m.id} className="px-4 py-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">vs {m.opponentName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {m.id} · {shortDateTime(m.playedAt)}
                      </p>
                    </div>
                    <StatusPill status={m.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Entry{" "}
                      <span className="text-money font-bold text-foreground">
                        {inr(m.entryFee)}
                      </span>
                    </span>
                    <span
                      className={`text-money font-bold ${m.isWin ? "text-accent" : "text-muted-foreground"}`}
                    >
                      {m.isWin ? `Won +${inr(m.amountWon)}` : `Lost ${m.winnerName}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
