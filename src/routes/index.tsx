import { createFileRoute, Link } from "@tanstack/react-router";
import { Dices, IndianRupee, ShieldCheck, Timer, Trophy, Zap } from "lucide-react";
import heroImage from "@/assets/ludo-hero.jpg";
import { Logo } from "@/components/brand/logo";
import { GlassPanel } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { ENTRY_FEES } from "@/lib/constants";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ludo Arena — Play Real-Money 1v1 Ludo Online" },
      {
        name: "description",
        content:
          "Join a 2 player Ludo table in seconds. Entry from ₹50, server-verified moves, instant UPI withdrawals.",
      },
      { property: "og:title", content: "Ludo Arena — Play Real-Money 1v1 Ludo Online" },
      {
        property: "og:description",
        content: "2 player real-time Ludo with a secure wallet and fast payouts.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Server-verified moves",
    body: "Every dice roll and token move is validated on the backend. No client-side tampering, ever.",
  },
  {
    icon: Zap,
    title: "Matchmaking in seconds",
    body: "Pick an entry fee and you're paired with a live opponent on a private socket room.",
  },
  {
    icon: IndianRupee,
    title: "Fast UPI payouts",
    body: "Winnings land in your winning wallet instantly and withdraw straight to any UPI ID.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Add cash",
    body: "Scan the UPI QR, submit your UTR and the admin verifies it.",
  },
  {
    n: "02",
    title: "Pick a table",
    body: "₹50 to ₹500 entry. Waiting room pairs you with one rival.",
  },
  {
    n: "03",
    title: "Win the pot",
    body: "Get all four tokens home first and take the prize pool.",
  },
];

function Landing() {
  return (
    <div className="arena-bg min-h-screen relative overflow-hidden">
      {/* Subtle ambient light blurs in the background for extra depth */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[400px] w-[400px] rounded-full bg-accent/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[150px]" />

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <div className="flex shrink-0 items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5">
              <Link to="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6 lg:pt-24 lg:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div className="min-w-0">
              <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
                <Dices className="size-4 animate-dice" /> Real-time 1v1 · 2 players only
              </span>
              <h1 className="mt-6 text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                The Ludo table where <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-sm">every roll pays</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
                Head-to-head Ludo with standard rules, a 20-second turn timer and a wallet built for
                real money. Entry from {inr(50)}.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button asChild size="lg" className="h-14 px-8 text-base shadow-xl shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-1">
                  <Link to="/register">Play now</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base glass-soft border-border hover:bg-white/5 transition-all hover:-translate-y-1">
                  <Link to="/login">I have an account</Link>
                </Button>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border/50 pt-8">
                {[
                  { k: "Turn timer", v: "20s" },
                  { k: "Platform fee", v: "5%" },
                  { k: "Tokens", v: "4 each" },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="text-sm font-medium text-muted-foreground">{s.k}</dt>
                    <dd className="text-money mt-1.5 text-2xl font-extrabold text-foreground">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative group">
              {/* Decorative glow behind the image */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary/30 to-accent/30 opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <GlassPanel className="relative overflow-hidden p-3 transition-transform duration-500 group-hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-10 pointer-events-none mix-blend-overlay" />
                <img
                  src={heroImage}
                  alt="Premium dark Ludo board with glowing tokens and a golden dice"
                  width={1280}
                  height={960}
                  className="w-full rounded-xl object-cover shadow-2xl"
                />
              </GlassPanel>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Choose your table</h2>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl">
              Winner takes the pot minus a 5% platform fee. All games are strictly 1v1.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {ENTRY_FEES.map((fee) => (
              <GlassPanel key={fee} className="group relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Entry
                </p>
                <p className="text-money mt-2 text-4xl font-black text-foreground transition-colors group-hover:text-primary">{inr(fee)}</p>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-bold text-accent">
                  <Trophy className="size-4" /> Win {inr(Math.round(fee * 2 * 0.95))}
                </div>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <GlassPanel key={f.title} className="group p-8 transition-all duration-300 hover:border-primary/20 hover:bg-white/[0.02]">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                  <f.icon className="size-6" />
                </span>
                <h3 className="mt-6 text-xl font-bold">{f.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">{f.body}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-28 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-center">How it works</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="glass-soft group relative rounded-3xl p-8 transition-all duration-300 hover:bg-white/[0.03] hover:border-primary/30">
                <span className="text-money text-5xl font-black text-primary/20 transition-colors duration-300 group-hover:text-primary/40 absolute top-6 right-8 pointer-events-none">{s.n}</span>
                <h3 className="mt-4 text-xl font-bold text-foreground">{s.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground relative z-10">{s.body}</p>
              </li>
            ))}
          </ol>
          <GlassPanel className="relative mt-16 flex flex-col items-center gap-6 overflow-hidden rounded-3xl p-10 text-center sm:flex-row sm:text-left sm:justify-between sm:px-12 sm:py-10">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-2xl font-extrabold sm:text-3xl">Your rival is already waiting</h3>
              <p className="mt-2 flex items-center justify-center sm:justify-start gap-2 text-base text-muted-foreground">
                <Timer className="size-5 text-accent" /> Average pairing time under 8 seconds
              </p>
            </div>
            <Button asChild size="lg" className="relative z-10 h-14 px-8 text-base shadow-xl shadow-primary/20 transition-all hover:scale-105">
              <Link to="/register">Create free account</Link>
            </Button>
          </GlassPanel>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/40 bg-background/40 backdrop-blur-lg py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden sm:inline-block h-4 w-px bg-border"></span>
            <p className="text-xs font-medium">18+ only. Play responsibly.</p>
          </div>
          <p className="text-xs">© 2026 Ludo Arena Pro. Skill-based gaming.</p>
        </div>
      </footer>
    </div>
  );
}
