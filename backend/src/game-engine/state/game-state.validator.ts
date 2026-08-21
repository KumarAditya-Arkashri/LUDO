import { GameState } from './game-state.model';
import { MatchStatus } from '../match/match.types';

export class GameStateValidator {
  static validateAction(state: GameState, playerId: string): void {
    if (state.matchState.status !== MatchStatus.RUNNING) {
      throw new Error(
        `Cannot perform action. Match is in status: ${state.matchState.status}`,
      );
    }

    if (state.matchState.currentPlayer !== playerId) {
      throw new Error('Not your turn.');
    }
  }

  static validateRoll(state: GameState, playerId: string): void {
    GameStateValidator.validateAction(state, playerId);

    const diceState = state.matchState.diceStates[playerId];
    if (diceState && diceState.currentValue !== null) {
      throw new Error(
        'You have already rolled the dice. You must move a token.',
      );
    }
  }

  static validateMove(
    state: GameState,
    playerId: string,
    tokenId: string,
  ): void {
    GameStateValidator.validateAction(state, playerId);

    const diceState = state.matchState.diceStates[playerId];
    if (!diceState || diceState.currentValue === null) {
      throw new Error('You must roll the dice before moving.');
    }

    const tokenState = state.matchState.tokenStates.find(
      (t) => t.tokenId === tokenId,
    );
    if (!tokenState) {
      throw new Error('Token not found.');
    }

    if (tokenState.playerId !== playerId) {
      throw new Error('You do not own this token.');
    }
  }
}
