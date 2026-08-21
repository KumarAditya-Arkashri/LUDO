import { SerializedTokenState } from '../token/token.types';
import { SerializedDiceState } from '../dice/dice.types';

export enum MatchStatus {
  WAITING = 'WAITING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export type ConnectionState = 'CONNECTED' | 'DISCONNECTED';

export interface MatchPlayer {
  playerId: string;
  displayName: string;
  connectionState: ConnectionState;
  joinedAt: Date;
  disconnectedAt: Date | null;
}

export interface SerializedMatchPlayer {
  playerId: string;
  displayName: string;
  connectionState: string;
  joinedAt: string;
  disconnectedAt: string | null;
}

export interface SerializedMatchState {
  matchId: string;
  status: string;
  players: SerializedMatchPlayer[];
  currentPlayer: string | null;
  startedAt: string | null;
  endedAt: string | null;
  winner: string | null;
  turnNumber: number;
  diceStates: Record<string, SerializedDiceState>;
  tokenStates: SerializedTokenState[];
  metadata: Record<string, any>;
}
