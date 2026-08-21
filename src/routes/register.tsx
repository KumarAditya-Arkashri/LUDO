import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { AuthLayout } from "./login";
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
    if (!/^\d{10}$/.test(form.mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
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
        payload.referralCode = form.referral.trim();
      }
      
      const response = await api.post("/auth/register", payload);
      const { user, accessToken, refreshToken } = response.data?.data || response.data;
      setAuth(user, accessToken, refreshToken);
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create account");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Mobile number and password — that's all it takes."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Rahul Sharma" value={form.name} onChange={set("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile number</Label>
          <Input
            id="mobile"
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            value={form.mobile}
            onChange={(e) =>
              setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 6 characters"
            value={form.password}
            onChange={set("password")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referral">Referral code (optional)</Label>
          <Input
            id="referral"
            placeholder="LUDO7X24"
            value={form.referral}
            onChange={set("referral")}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
