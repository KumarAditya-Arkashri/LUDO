import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Coins, Gift, Swords, Trophy, Wallet, Play } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel, StatCard, StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { inr, shortDate } from "@/lib/format";
import { ENTRY_FEES } from "@/lib/constants";
import { useWalletStore } from "@/store/wallet-store";
import { useAuthStore } from "@/store/auth-store";
import { useGameStore } from "@/store/game-store";
import { useEffect, useState } from "react";
import { getMatchmakingSocket, SOCKET_EVENTS } from "@/lib/socket";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_player/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ludo Arena" },
      {
        name: "description",
        content: "Your wallets, live tables and recent 1v1 Ludo results in one place.",
      },
      { property: "og:title", content: "Dashboard — Ludo Arena" },
      { property: "og:description", content: "Wallet balances, live tables and recent games." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const wallets = useWalletStore((s) => s.wallets);
  const { openBattles, connectLobby, createBattle, acceptBattle, cancelBattle, rejectBattle, startBattle } = useGameStore();

  const [createFee, setCreateFee] = useState(100);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    connectLobby();

    // The game store handles joining the match data stream, but we need to handle the UI redirect.
    const socket = getMatchmakingSocket();
    
    const onMatchFound = () => {
      navigate({ to: "/game" });
    };
    
    socket.on(SOCKET_EVENTS.matchFound, onMatchFound);
    return () => {
      socket.off(SOCKET_EVENTS.matchFound, onMatchFound);
    };
  }, [connectLobby, navigate]);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      await createBattle(createFee);
      useWalletStore.getState().fetchWallet();
      toast.success(`Battle created for ${inr(createFee)}!`);
      setCreateDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create battle");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAccept = async (battleId: string) => {
    try {
      await acceptBattle(battleId);
      useWalletStore.getState().fetchWallet();
      toast.success("Battle requested!");
    } catch (err: any) {
      toast.error(err.message || "Failed to request battle");
    }
  };

  const handleStart = async (battleId: string) => {
    try {
      await startBattle(battleId);
      toast.success("Battle starting...");
      // Game store matchFound listener will redirect to match room automatically
    } catch (err: any) {
      toast.error(err.message || "Failed to start battle");
    }
  };
  
  const handleCancel = async (battleId: string) => {
    try {
      await cancelBattle(battleId);
      useWalletStore.getState().fetchWallet();
      toast.success("Battle cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel battle");
    }
  };

  const handleReject = async (battleId: string) => {
    try {
      await rejectBattle(battleId);
      useWalletStore.getState().fetchWallet();
      toast.success("Request rejected");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request");
    }
  };

  const matches: any[] = [];

  const myBattles = openBattles.filter(b => b.creatorId === user?.id);
  const otherBattles = openBattles.filter(b => b.creatorId !== user?.id);

  return (
    <div className="space-y-6">
      {/* Hero / Quick Match Section */}
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-surface-2 p-6 sm:p-8 glow-ring">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <span className="mb-2 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
              LIVE ARENA
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to <span className="text-primary">Play?</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base max-w-md">
              Join the next available table or create a custom match. Winner takes the pot!
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-14 w-full bg-primary text-lg font-bold text-primary-foreground shadow-[0_0_20px_rgba(209,170,55,0.4)] hover:bg-primary/90 sm:w-auto sm:px-10">
                  QUICK MATCH
                </Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40 sm:rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-extrabold">Select Entry Fee</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-3 gap-3">
                    {ENTRY_FEES.map((fee) => (
                      <Button
                        key={fee}
                        variant={createFee === fee ? "default" : "outline"}
                        className={createFee === fee ? "border-primary bg-primary/20 text-primary hover:bg-primary/30 font-bold" : "font-semibold"}
                        onClick={() => setCreateFee(fee)}
                      >
                        {inr(fee)}
                      </Button>
                    ))}
                  </div>
                  <Button className="h-14 w-full text-lg font-bold shadow-[0_0_20px_rgba(209,170,55,0.4)]" onClick={handleCreate} disabled={isCreating}>
                    Create for {inr(createFee)}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Wallets */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Main wallet"
          value={inr(wallets.main)}
          hint="Usable for entry fees"
          icon={<Wallet className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Winning wallet"
          value={inr(wallets.winning)}
          hint="Withdrawable to UPI"
          icon={<Trophy className="size-5" />}
          tone="accent"
        />
        <StatCard
          label="Referral wallet"
          value={inr(wallets.referral)}
          hint="Earned from invites"
          icon={<Gift className="size-5" />}
        />
      </div>

      {/* Live Battles Header */}
      <section className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-extrabold">Open Battles</h2>
      </section>

      {myBattles.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Battles</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {myBattles.map(b => (
              <GlassPanel key={b.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{inr(b.entryFee)}</p>
                  <p className="text-xs text-muted-foreground">Win: {inr(Math.round(b.entryFee * 2 * 0.95))}</p>
                </div>
                {b.status === "OPEN" && (
                  <Button size="sm" variant="destructive" onClick={() => handleCancel(b.id)}>
                    Cancel
                  </Button>
                )}
                {b.status === "ACCEPTED" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleReject(b.id)}>Reject</Button>
                    <Button size="sm" onClick={() => handleStart(b.id)}>Start ({b.accepterName})</Button>
                  </div>
                )}
              </GlassPanel>
            ))}
          </div>
        </section>
      )}

      {otherBattles.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Available Battles</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherBattles.map(b => (
              <GlassPanel key={b.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{b.creatorName}</span>
                    {b.status === "OPEN" && <StatusPill status="open" />}
                    {b.status === "ACCEPTED" && <StatusPill status="in progress" />}
                  </div>
                  <p className="font-bold text-lg">{inr(b.entryFee)}</p>
                </div>
                {b.status === "OPEN" && (
                  <Button size="sm" onClick={() => handleAccept(b.id)}>
                    Play
                  </Button>
                )}
                {b.status === "ACCEPTED" && b.accepterId === user?.id && (
                  <Button size="sm" variant="secondary" disabled>
                    Requested...
                  </Button>
                )}
              </GlassPanel>
            ))}
          </div>
        </section>
      )}

      {openBattles.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No battles open. Create one to start playing!
        </div>
      )}

    </div>
  );
}

