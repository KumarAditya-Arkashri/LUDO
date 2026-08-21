import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlayerShell } from "@/components/layout/player-shell";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/_player")({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: PlayerShell,
});
