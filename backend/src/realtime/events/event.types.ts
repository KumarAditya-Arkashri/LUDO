export enum IncomingEvents {
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  ROLL_DICE = 'ROLL_DICE',
  MOVE_TOKEN = 'MOVE_TOKEN',
  HEARTBEAT = 'HEARTBEAT',
}

export enum OutgoingEvents {
  GAME_STATE = 'GAME_STATE',
  TURN_CHANGE = 'TURN_CHANGE',
  MATCH_START = 'MATCH_START',
  MATCH_END = 'MATCH_END',
  PLAYER_DISCONNECT = 'PLAYER_DISCONNECT',
  PLAYER_RECONNECT = 'PLAYER_RECONNECT',
  ERROR = 'ERROR',
  DUPLICATE_CONNECTION = 'DUPLICATE_CONNECTION',
}

export interface JoinRoomPayload {
  matchId: string;
}

export interface RollDicePayload {
  matchId: string;
}

export interface MoveTokenPayload {
  matchId: string;
  tokenId: string;
}

export interface GameStatePayload {
  matchId: string;
  compressedState: string;
}

export interface TurnChangePayload {
  matchId: string;
  currentPlayerId: string;
  reason?: string;
}

export interface MatchStartPayload {
  matchId: string;
  compressedState: string;
}

export interface MatchEndPayload {
  matchId: string;
  winnerId: string;
  compressedState: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
