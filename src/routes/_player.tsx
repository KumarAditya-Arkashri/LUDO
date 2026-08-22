import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlayerShell } from "@/components/layout/player-shell";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/_player")({
  beforeLoad: () => {
    // Only throw redirects on the client.
    // SSR doesn't have localStorage, and throwing redirect here crashes the server.
    if (typeof window !== "undefined") {
      if (!useAuthStore.getState().isAuthenticated) {
        throw redirect({
          to: "/login",
        });
      }
    }
  },
  component: PlayerShell,
});
