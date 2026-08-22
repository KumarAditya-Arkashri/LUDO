import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

export const SOCKET_EVENTS = {
  joinRoom: "JOIN_ROOM",
  leaveRoom: "LEAVE_ROOM",
  gameStart: "MATCH_START",
  rollDice: "ROLL_DICE",
  moveToken: "MOVE_TOKEN",
  turnChange: "TURN_CHANGE",
  stateSync: "GAME_STATE",
  winner: "MATCH_END",
  gameEnd: "MATCH_END",
  error: "ERROR",
  duplicateConnection: "DUPLICATE_CONNECTION",

  joinQueue: "JOIN_QUEUE",
  leaveQueue: "LEAVE_QUEUE",
  queueJoined: "QUEUE_JOINED",
  queueLeft: "QUEUE_LEFT",
  queueError: "QUEUE_ERROR",
  matchFound: "MATCH_FOUND",

  battlesSync: "BATTLES_SYNC",
  battleAdded: "BATTLE_ADDED",
  battleRemoved: "BATTLE_REMOVED",
  battleUpdated: "BATTLE_UPDATED",
  createBattle: "CREATE_BATTLE",
  cancelBattle: "CANCEL_BATTLE",
  acceptBattle: "ACCEPT_BATTLE",
  rejectBattle: "REJECT_BATTLE",
  startBattle: "START_BATTLE",
  battleError: "BATTLE_ERROR",

  practiceBattlesSync: "PRACTICE_BATTLES_SYNC",
  practiceCreate: "PRACTICE_CREATE",
  practiceBattleCreated: "PRACTICE_BATTLE_CREATED",
  practiceJoin: "PRACTICE_JOIN",
  practicePlayerJoined: "PRACTICE_PLAYER_JOINED",
  practiceStart: "PRACTICE_START",
  practiceCodeReady: "PRACTICE_CODE_READY",
  practiceCodeRequired: "PRACTICE_CODE_REQUIRED",
  practiceVerifyCode: "PRACTICE_VERIFY_CODE",
  practiceMatchReady: "PRACTICE_MATCH_READY",
  practiceLeave: "PRACTICE_LEAVE",
  practiceError: "PRACTICE_ERROR",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
export const SOCKET_URL = import.meta.env['VITE_SOCKET_URL'] ?? "";

class SocketManager {
  private static gameInstance: Socket | null = null;
  private static matchmakingInstance: Socket | null = null;
  private static practiceInstance: Socket | null = null;

  private static createSocket(namespace: string, reconnection = true): Socket {
    const token = useAuthStore.getState().token;
    const socket = io(`${SOCKET_URL}${namespace}`, {
      path: "/socket.io",
      auth: { token: token || undefined },
      autoConnect: false,
      reconnection,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on("reconnect_attempt", () => {
      const currentToken = useAuthStore.getState().token;
      socket.auth = { token: currentToken || undefined };
    });

    return socket;
  }

  static getGameInstance(): Socket {
    if (!this.gameInstance) this.gameInstance = this.createSocket("/game");
    return this.gameInstance;
  }

  static getMatchmakingInstance(): Socket {
    if (!this.matchmakingInstance) this.matchmakingInstance = this.createSocket("/matchmaking", true);
    return this.matchmakingInstance;
  }

  static getPracticeInstance(): Socket {
    if (!this.practiceInstance) this.practiceInstance = this.createSocket("/practice");
    return this.practiceInstance;
  }

  static connectGame() {
    const socket = this.getGameInstance();
    if (!socket.connected) socket.connect();
    return socket;
  }

  static connectMatchmaking() {
    const socket = this.getMatchmakingInstance();
    if (!socket.connected) socket.connect();
    return socket;
  }

  static connectPractice() {
    const socket = this.getPracticeInstance();
    if (!socket.connected) socket.connect();
    return socket;
  }

  static disconnectAll() {
    for (const key of ["gameInstance", "matchmakingInstance", "practiceInstance"] as const) {
      const socket = this[key];
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        this[key] = null;
      }
    }
  }
}

export const getGameSocket = () => SocketManager.getGameInstance();
export const getMatchmakingSocket = () => SocketManager.getMatchmakingInstance();
export const getPracticeSocket = () => SocketManager.getPracticeInstance();
export const connectGameSocket = () => SocketManager.connectGame();
export const connectMatchmakingSocket = () => SocketManager.connectMatchmaking();
export const connectPracticeSocket = () => SocketManager.connectPractice();
export const disconnectAllSockets = () => SocketManager.disconnectAll();
