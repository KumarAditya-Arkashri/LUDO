import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated || auth.user?.role !== "admin") {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: AdminShell,
});
