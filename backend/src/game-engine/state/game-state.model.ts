import { MatchState } from '../match/match.model';
import { GameEvent } from '../events/game-event.types';

export class GameState {
  public readonly matchState: MatchState;
  public readonly history: readonly GameEvent[];
  public readonly version: number;

  constructor(
    matchState: MatchState,
    history: readonly GameEvent[] = [],
    version: number = 0,
  ) {
    this.matchState = matchState;
    // Freeze the history array itself, and its elements are already treated as readonly by TS interfaces
    this.history = Object.freeze([...history]);
    this.version = version;

    Object.freeze(this);
  }
}
