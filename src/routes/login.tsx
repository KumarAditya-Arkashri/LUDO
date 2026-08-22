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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10 relative">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="scale-125 mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sign in/Register</h1>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none border-r border-gray-200 pr-3 h-10 mt-1">
              <span className="text-gray-500 font-semibold text-sm">+91</span>
            </div>
            <Input
              id="mobile"
              inputMode="numeric"
              placeholder="Enter Mobile Number"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              className="pl-[60px] h-12 bg-gray-50/50 border-gray-300 focus-visible:ring-primary text-base"
            />
          </div>

          <div className="relative">
            <Input
              id="password"
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-gray-50/50 border-gray-300 focus-visible:ring-primary text-base"
            />
          </div>

          <Button type="submit" className="w-full h-12 bg-black hover:bg-black/90 text-white font-bold text-lg rounded-xl mt-2" disabled={isPending}>
            {isPending ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          New here?{" "}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Create an account
          </Link>
        </div>
      </div>
      
      <Link to="/" className="mt-8 text-sm font-semibold text-gray-500 hover:text-gray-800">
        ← Back to home
      </Link>
    </div>
  );
}
