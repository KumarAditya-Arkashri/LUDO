import { TokenState } from './token.model';
import { TokenStateEnum } from './token.types';
import { BoardEngine } from '../board/board.engine';

export class TokenValidator {
  /**
   * Validates if a token is legally allowed to move N steps.
   */
  static validateMove(state: TokenState, steps: number): void {
    if (state.state === TokenStateEnum.FINISHED) {
      throw new Error('Cannot move a finished token.');
    }
    
    if (steps <= 0) {
      throw new Error('Move steps must be positive.');
    }

    if (state.progress === -1 && steps !== 6) {
      throw new Error('Needs exactly a 6 to enter the board.');
    }

    if (state.progress + steps > 58) {
      throw new Error(
        `Cannot move token past finish line. Needs exactly ${58 - state.progress} steps.`,
      );
    }
  }

  /**
   * Validates if a token can legally be captured.
   */
  static validateCapture(state: TokenState): void {
    if (state.state !== TokenStateEnum.ACTIVE) {
      throw new Error(`Cannot capture a token in state: ${state.state}`);
    }
    
    if (state.progress >= 52) {
      throw new Error('Cannot capture a token on home path.');
    }
  }
}
