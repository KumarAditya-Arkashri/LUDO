import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { GlassPanel, PageHeader, StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, shortDate } from "@/lib/format";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — Ludo Arena Admin" },
      { name: "description", content: "Search players, inspect wallets and block accounts." },
      { property: "og:title", content: "Users — Ludo Arena Admin" },
      {
        property: "og:description",
        content: "Search players, inspect wallets and block accounts.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const [query, setQuery] = useState("");
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
  });

  const users = allUsers.filter(
    (u: any) => u.name?.toLowerCase().includes(query.toLowerCase()) || u.mobile?.includes(query),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle={`${allUsers.length} registered players`} />
      <div className="relative max-w-sm">
        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name or mobile"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <GlassPanel className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-3 font-semibold">Player</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
            {users.map((u: any) => (
              <tr key={u.id}>
                <td className="px-5 py-3.5">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.mobile}</p>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{shortDate(u.createdAt)}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={u.status || "active"} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Button size="sm" variant="secondary" disabled>
                    Block
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
