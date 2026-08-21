import { TokenState } from '../token/token.model';
import { TokenStateEnum } from '../token/token.types';
import { TOKENS_TO_WIN } from '../rules/rule.constants';
import { MatchState } from '../match/match.model';
import { MatchStatus } from '../match/match.types';

export class WinEngine {
  /**
   * Checks if a player has reached the win condition.
   */
  static checkWinCondition(
    playerId: string,
    allTokens: TokenState[],
    isFinishingCurrentMove: boolean = false,
  ): boolean {
    const finishedTokensCount = allTokens.filter(
      (t) => t.playerId === playerId && t.state === TokenStateEnum.FINISHED,
    ).length;

    const projectedFinishedCount = isFinishingCurrentMove
      ? finishedTokensCount + 1
      : finishedTokensCount;

    return projectedFinishedCount >= TOKENS_TO_WIN;
  }

  /**
   * Concludes the match and sets the winner.
   */
  static declareWinner(state: MatchState, winnerId: string): MatchState {
    return new MatchState(
      state.matchId,
      MatchStatus.COMPLETED,
      state.players,
      state.currentPlayer,
      state.startedAt,
      new Date(),
      winnerId,
      state.turnNumber,
      state.diceStates,
      state.tokenStates,
      state.metadata,
    );
  }
}
