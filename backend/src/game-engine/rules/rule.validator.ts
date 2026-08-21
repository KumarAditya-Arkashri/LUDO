import { TokenState } from '../token/token.model';
import { TokenStateEnum } from '../token/token.types';
import { BoardEngine } from '../board/board.engine';
import { PlayerId } from '../models/cell.model';

export class RuleValidator {
  /**
   * Validates if a specific token is legally allowed to move with the given dice value.
   * Returns a reason string if invalid, or null if perfectly valid.
   */
  static validateTokenMove(
    token: TokenState,
    diceValue: number,
    isThirdSix: boolean,
  ): string | null {
    if (isThirdSix) {
      return 'Turn lost due to three consecutive sixes.';
    }

    if (token.state === TokenStateEnum.FINISHED) {
      return 'Cannot move a finished token.';
    }

    if (token.progress === -1) {
      if (diceValue !== 6) {
        return `A roll of 6 is required to spawn a locked token.`;
      }
    } else {
      if (token.progress + diceValue > 58) {
        return 'Cannot move token past the finish line.';
      }
    }

    return null; // Valid
  }

  /**
   * Identifies which opponent tokens are vulnerable to capture on a given global position.
   */
  static findVulnerableTokens(
    globalPosition: number,
    movingPlayerId: string,
    allTokens: TokenState[],
  ): TokenState[] {
    return allTokens.filter((t) => {
      if (t.playerId === movingPlayerId || t.state !== TokenStateEnum.ACTIVE) {
        return false;
      }
      
      const tGlobalPosition = BoardEngine.getGlobalPosition(t.playerId as PlayerId, t.progress);
      return tGlobalPosition === globalPosition;
    });
  }
}
