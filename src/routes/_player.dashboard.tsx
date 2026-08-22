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

import heroImage from "@/assets/ludo-hero.jpg";

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

  const myBattles = openBattles.filter(b => b.creatorId === user?.id);
  const otherBattles = openBattles.filter(b => b.creatorId !== user?.id);

  return (
    <div className="flex flex-col min-h-full">
      {/* Top Notice Marquee */}
      <div className="bg-primary py-2 px-4 text-center text-sm text-white overflow-hidden whitespace-nowrap">
        <span>Commission: 5% &bull; Referral: 3% For All Games</span>
      </div>

      {/* Helpline Marquee */}
      <div className="bg-[#e6f4ea] py-2 px-4 border-b border-[#cce5d3] text-[#1e7e34] overflow-hidden whitespace-nowrap">
        <span className="animate-pulse">Support available 24/7. Play Responsibly.</span>
      </div>

      {/* Main Content: Game Cards */}
      <div className="p-4 grid grid-cols-2 gap-4 mt-2">
        {/* Card 1: Classic Ludo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] text-success font-bold mb-1">
            <div className="size-2 rounded-full bg-success animate-pulse"></div>
            LIVE
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <button className="block w-full text-left focus:outline-none">
                <div className="rounded-xl overflow-hidden shadow-md aspect-square bg-gray-100 border-2 border-transparent hover:border-primary transition-colors">
                  <img src={heroImage} alt="Classic Ludo" className="w-full h-full object-cover" />
                </div>
                <div className="mt-2 h-2 w-3/4 mx-auto bg-gray-200 rounded-full"></div>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border/40 sm:rounded-3xl w-[90%] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold text-gray-800">Select Entry Fee</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-3 gap-3">
                  {ENTRY_FEES.map((fee) => (
                    <Button
                      key={fee}
                      variant={createFee === fee ? "default" : "outline"}
                      className={createFee === fee ? "border-primary bg-primary/10 text-primary hover:bg-primary/20 font-bold" : "font-semibold text-gray-700 bg-white hover:bg-gray-50"}
                      onClick={() => setCreateFee(fee)}
                    >
                      {inr(fee)}
                    </Button>
                  ))}
                </div>
                <Button className="h-14 w-full text-lg font-bold bg-primary hover:bg-primary/90 text-white rounded-xl" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Creating..." : `Create for ${inr(createFee)}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Card 2: Ludo Gold (Coming Soon) */}
        <div className="flex flex-col items-center opacity-80">
          <div className="flex items-center gap-1 text-[10px] text-success font-bold mb-1">
            <div className="size-2 rounded-full bg-success"></div>
            COMING SOON
          </div>
          <div className="w-full">
            <div className="rounded-xl overflow-hidden shadow-md aspect-square bg-gray-100 grayscale">
              <img src={heroImage} alt="Ludo Variants" className="w-full h-full object-cover opacity-80" />
            </div>
            <div className="mt-2 h-2 w-3/4 mx-auto bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Live Battles */}
      <div className="px-4 pb-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Swords className="text-primary size-5" />
            Open Battles
          </h2>
        </div>

        {myBattles.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">My Battles</h3>
            <div className="space-y-3">
              {myBattles.map(b => (
                <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-black text-xl text-gray-800">{inr(b.entryFee)}</p>
                    <p className="text-xs text-gray-500 font-medium">Win: <span className="text-success font-bold">{inr(Math.round(b.entryFee * 2 * 0.95))}</span></p>
                  </div>
                  {b.status === "OPEN" && (
                    <Button size="sm" variant="destructive" className="rounded-lg font-bold px-4" onClick={() => handleCancel(b.id)}>
                      Cancel
                    </Button>
                  )}
                  {b.status === "ACCEPTED" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-lg font-semibold" onClick={() => handleReject(b.id)}>Reject</Button>
                      <Button size="sm" className="bg-success hover:bg-success/90 text-white rounded-lg font-bold px-4" onClick={() => handleStart(b.id)}>
                        Start <span className="ml-1 opacity-80 text-xs">({b.accepterName})</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {otherBattles.length > 0 && (
          <div>
            <h3 className="mb-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Available Battles</h3>
            <div className="space-y-3">
              {otherBattles.map(b => (
                <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-700">{b.creatorName}</span>
                      {b.status === "OPEN" ? (
                        <span className="text-[9px] font-bold bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full">OPEN</span>
                      ) : (
                        <span className="text-[9px] font-bold bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">PLAYING</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="font-black text-xl text-gray-800">{inr(b.entryFee)}</p>
                      <p className="text-[11px] text-gray-500 font-medium">Win: {inr(Math.round(b.entryFee * 2 * 0.95))}</p>
                    </div>
                  </div>
                  {b.status === "OPEN" && (
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-lg font-bold px-6 h-9" onClick={() => handleAccept(b.id)}>
                      Play
                    </Button>
                  )}
                  {b.status === "ACCEPTED" && b.accepterId === user?.id && (
                    <Button size="sm" variant="secondary" className="rounded-lg font-semibold bg-gray-100 text-gray-500 h-9" disabled>
                      Requested
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {openBattles.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-2">
            <div className="mb-3 opacity-50">
              <Swords className="size-8 mx-auto" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No battles open</p>
            <p className="text-xs mt-1">Tap Classic Ludo to create one!</p>
          </div>
        )}
      </div>
    </div>
  );
}

