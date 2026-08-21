import { MatchState } from '../match/match.model';
import { MatchStatus } from '../match/match.types';

export class TurnEngine {
  /**
   * Advances the turn to the next player.
   */
  static nextTurn(state: MatchState, nextPlayerId: string): MatchState {
    const turnNumber = state.turnNumber + 1;
    return new MatchState(
      state.matchId,
      state.status,
      state.players,
      nextPlayerId,
      state.startedAt,
      state.endedAt,
      state.winner,
      turnNumber,
      state.diceStates,
      state.tokenStates,
      state.metadata,
    );
  }

  /**
   * Grants the current player an extra turn.
   */
  static grantExtraTurn(state: MatchState): MatchState {
    // In our simplified model, an extra turn means we do NOT call nextTurn.
    // However, if we track extra turns explicitly, it could be handled here.
    return state;
  }
}
