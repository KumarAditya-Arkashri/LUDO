import { GameState } from '../../game-engine/state/game-state.model';

export interface RoomMetadata {
  matchId: string;
  gameState: GameState;
  // Track player disconnections for timeout logic
  disconnectTimers: Map<string, NodeJS.Timeout>;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface PlayerConnection {
  socketId: string;
  playerId: string;
  matchId: string;
  status: 'CONNECTED' | 'DISCONNECTED';
}
