import { GameState } from '../state/game-state.model';
import { GameEvent, GameEventType } from '../events/game-event.types';
import * as crypto from 'crypto';

export class ReplayEngine {
  /**
   * Records a new action into the history and increments the version.
   * Returns a new GameState with the updated history and version.
   */
  static record(
    state: GameState,
    type: GameEventType,
    playerId: string | null,
    payload?: any,
  ): GameState {
    const newVersion = state.version + 1;
    const entry: GameEvent = {
      id: crypto.randomUUID(),
      matchId: state.matchState.matchId,
      version: newVersion,
      type,
      playerId,
      timestamp: new Date(),
      payload,
    } as GameEvent;

    return new GameState(state.matchState, [...state.history, entry], newVersion);
  }

  /**
   * Replays a history to recreate a state. (Placeholder for advanced functionality)
   */
  static replay(history: GameEvent[]): GameState | null {
    if (!history || history.length === 0) return null;
    return null;
  }
}
