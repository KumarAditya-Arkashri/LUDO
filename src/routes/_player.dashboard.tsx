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
  const { waitingRoomCode, createPrivateBattle, cancelPrivateBattle, joinPrivateBattle } = useGameStore();

  const [createFee, setCreateFee] = useState(100);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {

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
      await createPrivateBattle(createFee);
      useWalletStore.getState().fetchWallet();
      toast.success(`Private room created for ${inr(createFee)}!`);
      setCreateDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create private room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = async () => {
    if (!waitingRoomCode) return;
    try {
      await cancelPrivateBattle(waitingRoomCode);
      useWalletStore.getState().fetchWallet();
      toast.success("Room cancelled and fee refunded");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel room");
    }
  };

  const handleJoin = async () => {
    if (!joinCode || joinCode.length !== 6) {
      toast.error("Please enter a valid 6-character room code");
      return;
    }
    try {
      setIsJoining(true);
      await joinPrivateBattle(joinCode);
      useWalletStore.getState().fetchWallet();
      toast.success("Joined room successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

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

      {/* Active Waiting Room State */}
      {waitingRoomCode ? (
        <div className="px-4 pb-6 mt-4">
          <div className="bg-white border-2 border-primary/20 rounded-xl p-6 shadow-sm text-center">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Your Private Room</h3>
            <p className="text-xs text-gray-400 mb-4">Share this code with your opponent. The match will start automatically when they join.</p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <span className="text-4xl font-black tracking-[0.2em] text-gray-800">{waitingRoomCode}</span>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                className="font-bold border-gray-300 text-gray-600"
                onClick={() => {
                  navigator.clipboard.writeText(waitingRoomCode);
                  toast.success("Room code copied to clipboard!");
                }}
              >
                Copy Code
              </Button>
              <Button variant="destructive" className="font-bold" onClick={handleCancel}>
                Cancel Room
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-6 mt-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Swords className="text-primary size-5" />
              Join Private Room
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 font-bold text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
              />
              <Button 
                className="bg-primary hover:bg-primary/90 text-white font-bold h-auto rounded-xl px-6"
                onClick={handleJoin}
                disabled={isJoining || joinCode.length !== 6}
              >
                {isJoining ? "..." : "Join"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
