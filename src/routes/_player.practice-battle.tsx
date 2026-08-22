import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, Play, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel, PageHeader, StatusPill } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { useGameStore } from "@/store/game-store";
import { connectPracticeSocket, getPracticeSocket, SOCKET_EVENTS } from "@/lib/socket";

export const Route = createFileRoute("/_player/practice-battle")({
  head: () => ({
    meta: [
      { title: "Practice Battle — Ludo Arena" },
      {
        name: "description",
        content: "Two-player practice battle with server-generated room code verification.",
      },
    ],
  }),
  component: PracticeBattlePage,
});

type PracticeBattle = {
  id: string;
  creatorId: string;
  creatorName: string;
  opponentId?: string;
  opponentName?: string;
  status: "OPEN" | "JOINED" | "CODE_PENDING" | "STARTED";
  createdAt: number;
};

function PracticeBattlePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const joinMatch = useGameStore((state) => state.joinMatch);
  const [battles, setBattles] = useState<PracticeBattle[]>([]);
  const [selected, setSelected] = useState<PracticeBattle | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [busyState, setBusyState] = useState(false);
  const setBusy = (val: boolean) => {
    console.log('SET_BUSY:', val, new Error().stack?.split('\\n')[2]);
    setBusyState(val);
  };
  const busy = busyState;
  const [secondsLeft, setSecondsLeft] = useState(0);

  const socket = useMemo(() => connectPracticeSocket(), []);

  useEffect(() => {
    const sync = (items: PracticeBattle[]) => setBattles(items);
    const created = (battle: PracticeBattle) => {
      if (battle.player1Id === user.id) {
        setSelected(battle);
        setBusy(false);
        toast.success("Practice battle created. Waiting for Player 2.");
      }
    };
    const joined = (battle: PracticeBattle) => {
      setSelected((current) => {
        if (!current || current.id === battle.id) return battle;
        return current;
      });
      setBattles((current) => current.map((item) => (item.id === battle.id ? battle : item)));
      setBusy(false);
      toast.success("Player 2 joined the table.");
    };
    const codeReady = (payload: { battleId: string; roomCode: string; expiresAt: number }) => {
      setRoomCode(payload.roomCode);
      setCodeExpiresAt(payload.expiresAt);
      setBusy(false);
      setBattles((currentBattles) => {
        const battle = currentBattles.find(b => b.id === payload.battleId);
        if (battle) setSelected({ ...battle, status: "CODE_PENDING" });
        return currentBattles;
      });
      toast.success("Room code generated. Share it with Player 2.");
    };
    const codeRequired = (payload: { battleId: string; expiresAt: number }) => {
      setCodeExpiresAt(payload.expiresAt);
      setBusy(false);
      setBattles((currentBattles) => {
        const battle = currentBattles.find(b => b.id === payload.battleId);
        if (battle) setSelected({ ...battle, status: "CODE_PENDING" });
        return currentBattles;
      });
      toast.message("Player 1 started the battle. Enter the room code.");
    };
    const ready = (payload: { matchId: string }) => {
      setBusy(false);
      joinMatch(payload.matchId);
      navigate({ to: "/game" });
    };
    const error = (payload: { message: string }) => {
      setBusy(false);
      toast.error(payload.message || "Practice battle failed");
    };

    socket.on(SOCKET_EVENTS.practiceBattlesSync, sync);
    socket.on(SOCKET_EVENTS.practiceBattleCreated, created);
    socket.on(SOCKET_EVENTS.practicePlayerJoined, joined);
    socket.on(SOCKET_EVENTS.practiceCodeReady, codeReady);
    socket.on(SOCKET_EVENTS.practiceCodeRequired, codeRequired);
    socket.on(SOCKET_EVENTS.practiceMatchReady, ready);
    socket.on(SOCKET_EVENTS.practiceError, error);
    socket.emit(SOCKET_EVENTS.practiceBattlesSync);

    return () => {
      socket.off(SOCKET_EVENTS.practiceBattlesSync, sync);
      socket.off(SOCKET_EVENTS.practiceBattleCreated, created);
      socket.off(SOCKET_EVENTS.practicePlayerJoined, joined);
      socket.off(SOCKET_EVENTS.practiceCodeReady, codeReady);
      socket.off(SOCKET_EVENTS.practiceCodeRequired, codeRequired);
      socket.off(SOCKET_EVENTS.practiceMatchReady, ready);
      socket.off(SOCKET_EVENTS.practiceError, error);
    };
  }, [navigate, socket, joinMatch]);

  useEffect(() => {
    if (!codeExpiresAt) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((codeExpiresAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [codeExpiresAt]);

  const myBattle = selected ?? battles.find((battle) => battle.creatorId === user?.id && battle.status !== "STARTED");
  const joinedBattle = battles.find((battle) => battle.opponentId === user?.id && battle.status !== "STARTED");
  const activeBattle = myBattle ?? joinedBattle;
  const isCreator = activeBattle?.creatorId === user?.id;
  const isOpponent = activeBattle?.opponentId === user?.id;

  const create = () => {
    setBusy(true);
    socket.emit(SOCKET_EVENTS.practiceCreate);
  };

  const join = (battleId: string) => {
    setBusy(true);
    setSelected(battles.find((battle) => battle.id === battleId) ?? null);
    socket.emit(SOCKET_EVENTS.practiceJoin, { battleId });
  };

  const start = () => {
    if (!activeBattle) return;
    setBusy(true);
    socket.emit(SOCKET_EVENTS.practiceStart, { battleId: activeBattle.id });
  };

  const verify = () => {
    if (!activeBattle || codeInput.length !== 6) return;
    setBusy(true);
    socket.emit(SOCKET_EVENTS.practiceVerifyCode, {
      battleId: activeBattle.id,
      code: codeInput,
    });
  };

  const leave = () => {
    if (!activeBattle) return;
    socket.emit(SOCKET_EVENTS.practiceLeave, { battleId: activeBattle.id });
    setSelected(null);
    setRoomCode("");
    setCodeInput("");
    setCodeExpiresAt(null);
  };

  const copyCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    toast.success("Room code copied");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice Battle"
        subtitle="No cash, no payout — just the complete two-player battle and room-code flow."
        action={
          <Button onClick={create} disabled={busy || Boolean(myBattle)}>
            <Plus className="size-4" /> Create Battle
          </Button>
        }
      />

      {activeBattle && (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="font-bold">Two-player table</span>
                <StatusPill status={activeBattle.status === "OPEN" ? "open" : "in progress"} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Player 1: <strong>{activeBattle.creatorName}</strong>
                {activeBattle.opponentName ? ` · Player 2: ${activeBattle.opponentName}` : " · Waiting for Player 2"}
              </p>
            </div>
            <Button variant="ghost" onClick={leave}>Leave</Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <State label="1. Create" done={activeBattle.status !== "OPEN" || isCreator} />
            <State label="2. Join" done={Boolean(activeBattle.opponentId)} />
            <State label="3. Verify code" done={activeBattle.status === "STARTED"} />
          </div>

          {isCreator && activeBattle.status === "JOINED" && !roomCode && (
            <div className="mt-6 rounded-xl border border-border/60 p-5">
              <p className="font-bold">Player 2 is ready</p>
              <p className="mt-1 text-sm text-muted-foreground">Click Start to generate a six-digit room code.</p>
              <Button className="mt-4" onClick={start} disabled={busy}>
                <Play className="size-4" /> Start & Generate Code
              </Button>
            </div>
          )}

          {isCreator && roomCode && (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Share this room code</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="font-mono text-4xl font-black tracking-[0.25em]">{roomCode}</span>
                <Button variant="ghost" size="icon" onClick={copyCode} aria-label="Copy room code">
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {secondsLeft > 0 ? `Expires in ${secondsLeft}s` : "Code expired — restart the battle."}
              </p>
            </div>
          )}

          {isOpponent && activeBattle.status === "JOINED" && !codeExpiresAt && (
            <div className="mt-6 rounded-xl border border-border/60 p-5">
              <p className="font-bold">Waiting for Player 1</p>
              <p className="mt-1 text-sm text-muted-foreground">Player 1 must press Start before you can enter a room code.</p>
            </div>
          )}

          {isOpponent && codeExpiresAt && activeBattle.status !== "STARTED" && (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary" />
                <div>
                  <p className="font-bold">Enter Room Code</p>
                  <p className="text-xs text-muted-foreground">Ask Player 1 for the six-digit code.</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="font-mono text-lg tracking-[0.25em]"
                />
                <Button onClick={verify} disabled={busy || codeInput.length !== 6 || secondsLeft === 0}>
                  Verify
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{secondsLeft > 0 ? `Code expires in ${secondsLeft}s` : "Code expired"}</p>
            </div>
          )}
        </GlassPanel>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Open Practice Battles</h2>
          <span className="text-xs text-muted-foreground">{battles.length} available</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {battles.filter((battle) => battle.status === "OPEN" && battle.creatorId !== user?.id).map((battle) => (
            <GlassPanel key={battle.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-bold">{battle.creatorName}</p>
                <p className="text-xs text-muted-foreground">Waiting for Player 2 · practice table</p>
              </div>
              <Button onClick={() => join(battle.id)} disabled={busy}>
                Join
              </Button>
            </GlassPanel>
          ))}
          {battles.filter((battle) => battle.status === "OPEN" && battle.creatorId !== user?.id).length === 0 && (
            <GlassPanel soft className="p-6 text-center text-sm text-muted-foreground sm:col-span-2">
              No open practice battles. Create one and open another browser tab/account to test the full flow.
            </GlassPanel>
          )}
        </div>
      </section>
    </div>
  );
}

function State({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
      {done ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Loader2 className="size-4 text-muted-foreground" />}
      <span className={done ? "font-semibold" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
