export enum GameEventType {
  MATCH_START = 'MATCH_START',
  DICE_ROLL = 'DICE_ROLL',
  TOKEN_SPAWN = 'TOKEN_SPAWN',
  TOKEN_MOVE = 'TOKEN_MOVE',
  TOKEN_CAPTURE = 'TOKEN_CAPTURE',
  TOKEN_FINISH = 'TOKEN_FINISH',
  TURN_CHANGE = 'TURN_CHANGE',
  PLAYER_WIN = 'PLAYER_WIN',
  MATCH_END = 'MATCH_END',
  MATCH_PAUSE = 'MATCH_PAUSE',
  MATCH_RESUME = 'MATCH_RESUME',
  PLAYER_LEAVE = 'PLAYER_LEAVE',
}

export interface BaseGameEvent {
  id: string; // Unique event ID (UUID)
  matchId: string;
  type: GameEventType;
  version: number; // For optimistic concurrency / ordering
  timestamp: Date;
  playerId: string | null; // Nullable for system events like MATCH_START
  payload?: any;
}

export interface DiceRollEvent extends BaseGameEvent {
  type: GameEventType.DICE_ROLL;
  payload: {
    diceValue: number;
    isConsecutiveSix: boolean;
    consecutiveSixCount: number;
  };
}

export interface TokenSpawnEvent extends BaseGameEvent {
  type: GameEventType.TOKEN_SPAWN;
  payload: {
    tokenId: string;
    spawnCellId: string;
  };
}

export interface TokenMoveEvent extends BaseGameEvent {
  type: GameEventType.TOKEN_MOVE;
  payload: {
    tokenId: string;
    fromProgress: number;
    toProgress: number;
    stepsMoved: number;
    destinationCellId: string;
    isSafeCell: boolean;
  };
}

export interface TokenCaptureEvent extends BaseGameEvent {
  type: GameEventType.TOKEN_CAPTURE;
  payload: {
    capturedTokenId: string;
    capturedPlayerId: string;
  };
}

export interface TokenFinishEvent extends BaseGameEvent {
  type: GameEventType.TOKEN_FINISH;
  payload: {
    tokenId: string;
  };
}

export interface TurnChangeEvent extends BaseGameEvent {
  type: GameEventType.TURN_CHANGE;
  payload: {
    nextPlayerId: string;
    reason: 'NORMAL' | 'EXTRA_TURN_SIX' | 'EXTRA_TURN_CAPTURE' | 'THREE_SIXES' | 'NO_VALID_MOVES' | 'PLAYER_WON';
  };
}

export interface PlayerWinEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_WIN;
  payload: {
    rank: number; // 1st, 2nd, 3rd
  };
}

export type GameEvent =
  | BaseGameEvent // Match Start/End, Pause/Resume
  | DiceRollEvent
  | TokenSpawnEvent
  | TokenMoveEvent
  | TokenCaptureEvent
  | TokenFinishEvent
  | TurnChangeEvent
  | PlayerWinEvent;

export interface SerializedGameEvent {
  id: string;
  matchId: string;
  type: string;
  version: number;
  timestamp: string;
  playerId: string | null;
  payload?: any;
}
