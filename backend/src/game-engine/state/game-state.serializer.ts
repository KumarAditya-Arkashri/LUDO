import { GameState } from './game-state.model';
import { MatchState } from '../match/match.model';
import { GameEvent } from '../events/game-event.types';

export class GameStateSerializer {
  static snapshot(state: GameState): string {
    return JSON.stringify(state);
  }

  static restore(serialized: string): GameState {
    const raw = JSON.parse(serialized);
    
    // Revive dates
    if (raw.matchState.startedAt) raw.matchState.startedAt = new Date(raw.matchState.startedAt);
    if (raw.matchState.endedAt) raw.matchState.endedAt = new Date(raw.matchState.endedAt);
    
    for (const event of raw.history) {
      if (event.timestamp) event.timestamp = new Date(event.timestamp);
    }
    
    return new GameState(
      raw.matchState,
      raw.history,
      raw.version
    );
  }
}
