import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History, Swords } from "lucide-react";
import { StatusPill } from "@/components/common/ui-kit";
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
    <div className="p-4 space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-black text-gray-800">History</h1>
        <p className="text-xs text-gray-500 font-medium mt-1">Past match results</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
              filter === f
                ? "bg-primary text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {matches.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-gray-50">
            <div className="mb-3 opacity-50">
              <History className="size-10 mx-auto" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No matches found</p>
            <p className="text-xs mt-1 max-w-[200px] mx-auto leading-relaxed">
              Play a table and your results will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {matches.map((m) => (
              <li key={m.id} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Swords className="size-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">vs {m.opponentName}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400 font-medium tracking-wide">
                        {shortDateTime(m.playedAt)}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={m.status} />
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Entry Fee</p>
                    <p className="font-bold text-gray-700">{inr(m.entryFee)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Result</p>
                    <p className={`font-black ${m.isWin ? "text-success" : "text-gray-500"}`}>
                      {m.isWin ? `Won +${inr(m.amountWon)}` : `Lost to ${m.winnerName}`}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
