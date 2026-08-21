import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { GlassPanel } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";

import { api } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Ludo Arena" },
      { name: "description", content: "Sign in with your mobile number and password to play." },
      { property: "og:title", content: "Log in — Ludo Arena" },
      { property: "og:description", content: "Sign in to your Ludo Arena account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [isPending, setIsPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsPending(true);
    try {
      const slowWarningTimeout = setTimeout(() => {
        toast.info("Backend is waking up (Render free tier), please wait...", { duration: 6000 });
      }, 4000);

      const response = await api.post("/auth/login", { mobile, password });
      clearTimeout(slowWarningTimeout);
      const { user, accessToken, refreshToken } = response.data?.data || response.data;
      setAuth(user, accessToken, refreshToken);
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      const targetUrl = error.config?.baseURL || "unknown url";
      toast.error(`Error: ${errorMessage} (Target: ${targetUrl})`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to jump straight back to the table."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile number</Label>
          <Input
            id="mobile"
            inputMode="numeric"
            placeholder="9876543210"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="arena-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <GlassPanel className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </GlassPanel>
      <Link to="/" className="mt-6 text-xs text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
    </div>
  );
}
