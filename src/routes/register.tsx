import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Ludo Arena" },
      {
        name: "description",
        content: "Register with your mobile number and start playing 1v1 Ludo for cash.",
      },
      { property: "og:title", content: "Create account — Ludo Arena" },
      { property: "og:description", content: "Register and claim your referral code." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: "", mobile: "", password: "", referral: "" });

  const [isPending, setIsPending] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 3) {
      toast.error("Enter your full name");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsPending(true);
    try {
      const payload: Record<string, string> = {
        name: form.name,
        mobile: form.mobile,
        password: form.password,
      };
      if (form.referral.trim()) {
        payload['referralCode'] = form.referral.trim();
      }
      
      const slowWarningTimeout = setTimeout(() => {
        toast.info("Backend is waking up (Render free tier), please wait...", { duration: 6000 });
      }, 4000);

      const response = await api.post("/auth/register", payload);
      clearTimeout(slowWarningTimeout);
      const { user, accessToken, refreshToken } = response.data?.data || response.data;
      setAuth(user, accessToken, refreshToken);
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      const targetUrl = error.config?.baseURL || "unknown url";
      toast.error(`Error: ${errorMessage} (Target: ${targetUrl})`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10 relative">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 mt-8">
        <div className="flex flex-col items-center mb-6">
          <div className="scale-125 mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Register</h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Input id="name" placeholder="Full Name" value={form.name} onChange={set("name")} className="h-11 bg-gray-50/50 border-gray-300 focus-visible:ring-primary text-base" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none border-r border-gray-200 pr-3 h-10 mt-0.5">
              <span className="text-gray-500 font-semibold text-sm">+91</span>
            </div>
            <Input
              id="mobile"
              inputMode="numeric"
              maxLength={10}
              placeholder="Enter Mobile Number"
              value={form.mobile}
              onChange={(e) =>
                setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))
              }
              className="pl-[60px] h-11 bg-gray-50/50 border-gray-300 focus-visible:ring-primary text-base"
            />
          </div>
          <div className="relative">
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
              className="h-11 bg-gray-50/50 border-gray-300 focus-visible:ring-primary text-base"
            />
          </div>
          <div className="relative">
            <Input
              id="referral"
              placeholder="Referral code (optional)"
              value={form.referral}
              onChange={set("referral")}
              className="h-11 bg-gray-50/50 border-gray-300 focus-visible:ring-primary text-base"
            />
          </div>
          <Button type="submit" className="w-full h-11 bg-black hover:bg-black/90 text-white font-bold text-lg rounded-xl mt-2" disabled={isPending}>
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
      
      <Link to="/" className="mt-8 text-sm font-semibold text-gray-500 hover:text-gray-800">
        ← Back to home
      </Link>
    </div>
  );
}
