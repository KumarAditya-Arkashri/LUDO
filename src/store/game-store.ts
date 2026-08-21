import { create } from "zustand";
import { unzlibSync } from "fflate";
import type { EntryFee, GamePlayer, GameState, PlayerColor, Token } from "@/types";
import { useAuthStore } from "./auth-store";
import {
  connectGameSocket,
  getGameSocket,
  SOCKET_EVENTS,
  connectMatchmakingSocket,
  getMatchmakingSocket,
  disconnectAllSockets,
} from "@/lib/socket";

const TURN_SECONDS = 20;

const initialState: GameState = {
  roomId: "",
  entryFee: 100,
  prizePool: 0,
  isPractice: false,
  phase: "waiting",
  players: [],
  turnColor: "red",
  dice: null,
  rolling: false,
  turnSecondsLeft: TURN_SECONDS,
  winnerColor: null,
  log: [],
};

interface GameStore extends GameState {
  myColor: PlayerColor;
  openBattles: any[];
  connectLobby: () => void;
  createBattle: (entryFee: number) => Promise<boolean>;
  cancelBattle: (battleId: string) => Promise<boolean>;
  acceptBattle: (battleId: string) => Promise<boolean>;
  rejectBattle: (battleId: string) => Promise<boolean>;
  startBattle: (battleId: string) => Promise<boolean>;
  joinQueue: (entryFee: EntryFee) => Promise<boolean>;
  leaveQueue: (entryFee: EntryFee) => void;
  joinMatch: (matchId: string) => void;
  rollDice: () => void;
  moveToken: (tokenId: string) => void;
  tickTimer: () => void;
  reset: () => void;
  leaveMatch: () => void;
}

function parseCompressedState(compressedBase64: string): any {
  if (!compressedBase64) return null;
  const buffer = Uint8Array.from(atob(compressedBase64), (c) => c.charCodeAt(0));
  const decompressed = unzlibSync(buffer);
  const jsonStr = new TextDecoder().decode(decompressed);
  return JSON.parse(jsonStr);
}

function mapBackendStateToFrontend(
  backendState: any,
  myUserId: string,
): Partial<GameState> & { myColor: PlayerColor } {
  const match = backendState?.matchState;
  if (!match) return { myColor: "red", phase: "waiting", players: [] };

  let players: GamePlayer[] = [];
  let myColor: PlayerColor = "red";

  if (Array.isArray(match.players)) {
    players = match.players.map((p: any, idx: number) => {
      const color: PlayerColor = idx === 0 ? "red" : "blue";
      if (p.playerId === myUserId) myColor = color;

      const tokens: Token[] = (match.tokenStates || [])
        .filter((t: any) => t.playerId === p.playerId)
        .map((t: any) => ({
          id: t.tokenId,
          color,
          position: t.stepsMoved >= 0 ? t.stepsMoved : -1,
          state:
            t.state === "LOCKED" || t.state === "CAPTURED"
              ? "yard"
              : t.state === "HOME" || t.state === "FINISHED"
                ? "home"
                : "track",
        }));

      return {
        id: p.playerId,
        name: p.displayName,
        color,
        tokens,
        tokensHome: tokens.filter((t) => t.state === "home").length,
      };
    });
  }

  let turnColor: PlayerColor = "red";
  if (match.currentPlayer && Array.isArray(match.players)) {
    const idx = match.players.findIndex((p: any) => p.playerId === match.currentPlayer);
    if (idx === 1) turnColor = "blue";
  }

  let dice: number | null = null;
  const diceState = match.currentPlayer && match.diceStates?.[match.currentPlayer];
  if (diceState?.currentValue != null) {
    dice = diceState.currentValue;
  }

  let winnerColor: PlayerColor | null = null;
  if (match.winner && Array.isArray(match.players)) {
    const idx = match.players.findIndex((p: any) => p.playerId === match.winner);
    if (idx === 0) winnerColor = "red";
    else if (idx === 1) winnerColor = "blue";
  }

  let phase: GameState["phase"] = "waiting";
  if (match.status === "READY") phase = "starting";
  else if (match.status === "RUNNING") phase = "playing";
  else if (match.status === "COMPLETED" || match.status === "ABANDONED") phase = "finished";

  const log =
    Array.isArray(backendState.history)
      ? backendState.history
          .map((h: any) => {
            const pColor = players.find((p) => p.id === h.playerId)?.color || "System";
            if (h.action === "ROLL") return `${pColor} rolled ${h.payload?.value ?? "?"}`;
            if (h.action === "MOVE") return `${pColor} moved a token`;
            if (h.action === "CAPTURE") return `${pColor} captured a token`;
            return `${h.action}`;
          })
          .reverse()
      : [];

  const isPractice = match.metadata?.practice === true;
  const rawEntryFee = match.metadata?.entryFee;
  const parsedEntryFee = typeof rawEntryFee === "number" ? rawEntryFee : Number(rawEntryFee);

  return {
    roomId: match.matchId,
    phase,
    players,
    turnColor,
    dice,
    winnerColor,
    myColor,
    isPractice,
    ...(Number.isFinite(parsedEntryFee) && parsedEntryFee > 0 && {
      entryFee: parsedEntryFee,
      prizePool: Math.round(parsedEntryFee * 2 * 0.95),
    }),
    log,
    // A received GAME_STATE is authoritative; clear the optimistic rolling flag.
    rolling: false,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  myColor: "red",
  openBattles: [],

  connectLobby: () => {
    const socket = connectMatchmakingSocket();
    socket.off(SOCKET_EVENTS.battlesSync);
    socket.on(SOCKET_EVENTS.battlesSync, (battles: any[]) => set({ openBattles: battles }));
    socket.off(SOCKET_EVENTS.matchFound);
    socket.on(SOCKET_EVENTS.matchFound, (payload: { matchId: string; entryFee: number }) => {
      get().joinMatch(payload.matchId);
    });
  },

    connectLobby: () => {
      const socket = connectMatchmakingSocket();
      
      socket.off(SOCKET_EVENTS.battlesSync);
      socket.on(SOCKET_EVENTS.battlesSync, (battles: any[]) => {
        set({ openBattles: battles });
      });

      socket.off(SOCKET_EVENTS.battleAdded);
      socket.on(SOCKET_EVENTS.battleAdded, (battle: any) => {
        set((state) => ({
          openBattles: [...state.openBattles, battle],
        }));
      });

      socket.off(SOCKET_EVENTS.battleRemoved);
      socket.on(SOCKET_EVENTS.battleRemoved, ({ battleId }: { battleId: string }) => {
        set((state) => ({
          openBattles: state.openBattles.filter((b) => b.id !== battleId),
        }));
      });

      socket.off(SOCKET_EVENTS.battleUpdated);
      socket.on(SOCKET_EVENTS.battleUpdated, (battle: any) => {
        set((state) => ({
          openBattles: state.openBattles.map((b) => (b.id === battle.id ? battle : b)),
        }));
      });

      socket.off(SOCKET_EVENTS.matchFound);
      socket.on(SOCKET_EVENTS.matchFound, (payload: { matchId: string; entryFee: number }) => {
        get().joinMatch(payload.matchId);
      });
    },

  cancelBattle: (battleId) => new Promise((resolve, reject) => {
    const socket = getMatchmakingSocket();
    const onError = (payload: any) => reject(new Error(payload.message));
    socket.once(SOCKET_EVENTS.battleError, onError);
    socket.emit(SOCKET_EVENTS.cancelBattle, { battleId });
    setTimeout(() => {
      socket.off(SOCKET_EVENTS.battleError, onError);
      resolve(true);
    }, 500);
  }),

  acceptBattle: (battleId) => new Promise((resolve, reject) => {
    const socket = getMatchmakingSocket();
    const onError = (payload: any) => reject(new Error(payload.message));
    socket.once(SOCKET_EVENTS.battleError, onError);
    socket.emit(SOCKET_EVENTS.acceptBattle, { battleId });
    setTimeout(() => {
      socket.off(SOCKET_EVENTS.battleError, onError);
      resolve(true);
    }, 500);
  }),

  rejectBattle: (battleId) => new Promise((resolve, reject) => {
    const socket = getMatchmakingSocket();
    const onError = (payload: any) => reject(new Error(payload.message));
    socket.once(SOCKET_EVENTS.battleError, onError);
    socket.emit(SOCKET_EVENTS.rejectBattle, { battleId });
    setTimeout(() => {
      socket.off(SOCKET_EVENTS.battleError, onError);
      resolve(true);
    }, 500);
  }),

  startBattle: (battleId) => new Promise((resolve, reject) => {
    const socket = getMatchmakingSocket();
    const onError = (payload: any) => reject(new Error(payload.message));
    socket.once(SOCKET_EVENTS.battleError, onError);
    socket.emit(SOCKET_EVENTS.startBattle, { battleId });
    setTimeout(() => {
      socket.off(SOCKET_EVENTS.battleError, onError);
      resolve(true);
    }, 500);
  }),

  joinQueue: (entryFee) => new Promise((resolve, reject) => {
    set({ entryFee, prizePool: Math.round(entryFee * 2 * 0.95), isPractice: false });
    const socket = connectMatchmakingSocket();
    socket.once(SOCKET_EVENTS.queueJoined, () => resolve(true));
    socket.once(SOCKET_EVENTS.queueError, (payload: any) => reject(new Error(payload.message)));
    socket.emit(SOCKET_EVENTS.joinQueue, { entryFee });
    socket.off(SOCKET_EVENTS.matchFound);
    socket.on(SOCKET_EVENTS.matchFound, (payload: { matchId: string; entryFee: number }) => get().joinMatch(payload.matchId));
  }),

  leaveQueue: (entryFee) => {
    const socket = getMatchmakingSocket();
    if (socket.connected) socket.emit(SOCKET_EVENTS.leaveQueue, { entryFee });
  },

  joinMatch: (matchId) => {
    if (!matchId) return;
    const socket = connectGameSocket();

    const sendJoin = () => socket.emit(SOCKET_EVENTS.joinRoom, { matchId });
    if (socket.connected) sendJoin();
    else socket.once("connect", sendJoin);

    socket.off(SOCKET_EVENTS.stateSync);
    socket.on(SOCKET_EVENTS.stateSync, (payload: { matchId: string; compressedState: string }) => {
      if (!payload?.compressedState || payload.matchId !== matchId) return;
      try {
        const userId = useAuthStore.getState().user?.id || "";
        const backendState = parseCompressedState(payload.compressedState);
        const frontendUpdates = mapBackendStateToFrontend(backendState, userId);
        set((state) => ({
          ...frontendUpdates,
          turnSecondsLeft: state.turnColor !== frontendUpdates.turnColor ? TURN_SECONDS : state.turnSecondsLeft,
        }));
      } catch {
        set({ rolling: false });
      }
    });

    socket.off(SOCKET_EVENTS.gameEnd);
    socket.on(SOCKET_EVENTS.gameEnd, (payload: { matchId: string; winnerId: string; compressedState: string }) => {
      if (!payload?.compressedState || payload.matchId !== matchId) return;
      try {
        const userId = useAuthStore.getState().user?.id || "";
        const backendState = parseCompressedState(payload.compressedState);
        set({ ...mapBackendStateToFrontend(backendState, userId), rolling: false });
      } catch {
        set({ phase: "finished", rolling: false });
      }
    });
  },

  rollDice: () => {
    const { rolling, phase, roomId, myColor, turnColor } = get();
    if (rolling || phase !== "playing" || !roomId || myColor !== turnColor) return;
    set({ rolling: true });
    getGameSocket().emit(SOCKET_EVENTS.rollDice, { matchId: roomId });
  },

  moveToken: (tokenId) => {
    const { roomId, phase, myColor, turnColor, dice } = get();
    if (!roomId || phase !== "playing" || myColor !== turnColor || dice === null) return;
    getGameSocket().emit(SOCKET_EVENTS.moveToken, { matchId: roomId, tokenId });
  },

  tickTimer: () => {
    const { turnSecondsLeft, phase } = get();
    if (phase === "playing" && turnSecondsLeft > 0) set({ turnSecondsLeft: turnSecondsLeft - 1 });
  },

  leaveMatch: () => {
    const socket = getGameSocket();
    if (socket.connected) socket.emit(SOCKET_EVENTS.leaveRoom);
    get().reset();
  },

  reset: () => {
    disconnectAllSockets();
    set({ ...initialState, myColor: "red", openBattles: [] });
  },
}));
