import { createFileRoute } from "@tanstack/react-router";
import { GlassPanel, PageHeader, StatCard, StatusPill } from "@/components/common/ui-kit";
import { inr, shortDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/matches")({
  head: () => ({
    meta: [
      { title: "Matches — Ludo Arena Admin" },
      { name: "description", content: "Monitor live tables and audit completed 1v1 results." },
      { property: "og:title", content: "Matches — Ludo Arena Admin" },
      {
        property: "og:description",
        content: "Monitor live tables and audit completed 1v1 results.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMatches,
});

function AdminMatches() {
  const liveTables: any[] = [];
  const matches: any[] = [];

  return (
    <div className="space-y-6">
      <PageHeader title="Matches" subtitle="Server-recorded results, no manual edits." />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Live tables" value={String(liveTables.length)} tone="accent" />
        <StatCard label="Completed today" value="0" />
        <StatCard label="Fee collected" value={inr(0)} tone="primary" />
      </div>
      <GlassPanel className="p-5">
        <h2 className="font-bold">Live now</h2>
        <ul className="mt-4 divide-y divide-border text-sm">
          {liveTables.length === 0 && (
            <li className="text-muted-foreground py-2">No live tables</li>
          )}
          {liveTables.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 truncate">
                {t.id} · {t.players}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-money font-bold text-primary">{inr(t.entryFee)}</span>
                <StatusPill status="live" />
              </span>
            </li>
          ))}
        </ul>
      </GlassPanel>
      <GlassPanel className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-3 font-semibold">Match</th>
              <th className="px-5 py-3 font-semibold">Entry</th>
              <th className="px-5 py-3 font-semibold">Winner</th>
              <th className="px-5 py-3 font-semibold">Payout</th>
              <th className="px-5 py-3 font-semibold">Played</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                  No matches found
                </td>
              </tr>
            )}
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3.5 font-semibold">{m.id}</td>
                <td className="text-money px-5 py-3.5">{inr(m.entryFee)}</td>
                <td className="px-5 py-3.5">{m.winnerName}</td>
                <td className="text-money px-5 py-3.5">{m.amountWon ? inr(m.amountWon) : "—"}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{shortDateTime(m.playedAt)}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
