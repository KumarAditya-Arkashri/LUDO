import { MoveRequest } from './rule.types';
import { RuleResult } from './rule.model';
import { TokenState } from '../token/token.model';
import { TokenStateEnum } from '../token/token.types';
import { WinEngine } from '../match/win.engine';
import { BoardEngine } from '../board/board.engine';
import { RuleConfig } from './rule.config';
import { PlayerId } from '../models/cell.model';

export class RuleEngine {
  /**
   * Evaluates a player's move request mathematically without mutating state.
   */
  static evaluateMove(
    request: MoveRequest,
    activePlayerIds: string[],
    targetToken: TokenState,
    allTokens: TokenState[],
    rules: RuleConfig,
    playerColors: Record<string, PlayerId>,
  ): RuleResult {
    const nextPlayerInCycle = this.calculateNextPlayer(
      request.playerId,
      activePlayerIds,
    );

    // 1. Validate the token ownership
    if (targetToken.playerId !== request.playerId) {
      return RuleResult.invalid(
        'Cannot move an opponent token.',
        nextPlayerInCycle,
      );
    }

    if (targetToken.state === TokenStateEnum.FINISHED) {
      return RuleResult.invalid('Token is already finished.', nextPlayerInCycle);
    }

    // 2. Validate move legality
    let nextProgress: number;
    try {
      nextProgress = BoardEngine.calculateNextProgress(targetToken.progress, request.diceValue);
    } catch (e: any) {
      return RuleResult.invalid(e.message, nextPlayerInCycle);
    }

    // Determine if reaching finish
    const isReachingFinish = nextProgress === 58;

    let extraTurn = rules.extraTurnOnSix && request.diceValue === 6;
    let capture = false;
    let capturedTokenId: string | null = null;
    let capturedTokens: TokenState[] = [];

    // 3. Evaluate Capture
    // Capture can only happen if the token is on the main track (progress 0..51)
    const actorColor = playerColors[request.playerId] || PlayerId.RED;
    const targetGlobalPosition = BoardEngine.getGlobalPosition(
      actorColor,
      nextProgress,
    );

    const isSafe = BoardEngine.isSafePosition(targetGlobalPosition);

    // 3a. Blockade check — if allowBlockade is true, two tokens of the SAME
    // player on a cell form a blockade that opponents cannot land on or pass.
    // We always run the check but only enforce it when `rules.allowBlockade`
    // is true (STANDARD_RULES currently has it false; flip to enable).
    if (rules.allowBlockade && targetGlobalPosition !== null && !isSafe) {
      const isBlocked = this.isBlockade(
        targetGlobalPosition,
        request.playerId,
        allTokens,
        playerColors,
      );
      if (isBlocked) {
        return RuleResult.invalid(
          'Destination is blocked by an opponent blockade.',
          nextPlayerInCycle,
        );
      }
    }

    if (targetGlobalPosition !== null && !isSafe) {
      const vulnerableTokens = this.findVulnerableTokens(
        targetGlobalPosition,
        request.playerId,
        allTokens,
        playerColors,
      );

      // Simple capture rule: if there are vulnerable tokens, capture them. 
      // (Blockade logic is omitted for simple capture, but can be added if needed)
      if (vulnerableTokens.length > 0) {
        capture = true;
        capturedTokenId = vulnerableTokens[0].tokenId;
        capturedTokens = vulnerableTokens;
        
        if (rules.extraTurnOnCapture) {
          extraTurn = true;
        }
      }
    }

    // Extra turn on finish
    if (isReachingFinish && rules.extraTurnOnFinish) {
      extraTurn = true;
    }

    // 4. Evaluate Win Condition
    let winner: string | null = null;
    let gameOver = false;

    if (WinEngine.checkWinCondition(request.playerId, allTokens, isReachingFinish)) {
      winner = request.playerId;
      // If we only have 2 players in the array, and 1 wins, the game is over.
      if (activePlayerIds.length <= 2) {
        gameOver = true;
      }
    }

    // 5. Next Player calculation
    let nextPlayerId: string | null = request.playerId;

    // We do not give extra turn if the player has won (since they leave)
    if (!extraTurn || winner) {
      nextPlayerId = nextPlayerInCycle;
    }

    return new RuleResult({
      isValid: true,
      reason: null,
      nextPlayerId,
      extraTurn,
      capture,
      capturedTokenId,
      winner,
      gameOver,
    });
  }

  /**
   * Determines the next player in the cycle array.
   */
  static calculateNextPlayer(
    currentPlayerId: string,
    activePlayerIds: string[],
  ): string {
    if (activePlayerIds.length <= 1) return currentPlayerId;

    const currentIndex = activePlayerIds.indexOf(currentPlayerId);
    if (currentIndex === -1) {
      return activePlayerIds[0];
    }

    const nextIndex = (currentIndex + 1) % activePlayerIds.length;
    return activePlayerIds[nextIndex];
  }

  /**
   * Identifies which opponent tokens are vulnerable to capture on a given global position.
   */
  static findVulnerableTokens(
    globalPosition: number,
    movingPlayerId: string,
    allTokens: TokenState[],
    playerColors: Record<string, PlayerId>,
  ): TokenState[] {
    return allTokens.filter((t) => {
      if (t.playerId === movingPlayerId || t.state !== TokenStateEnum.ACTIVE) {
        return false;
      }
      
      const tColor = playerColors[t.playerId] || PlayerId.RED;
    const tGlobalPosition = BoardEngine.getGlobalPosition(tColor, t.progress);
      return tGlobalPosition === globalPosition;
    });
  }

  /**
   * Checks whether a global position is a blockade held by the opposing player.
   * A blockade is 2 or more tokens of the SAME player (not the mover) on one cell.
   */
  static isBlockade(
    globalPosition: number,
    movingPlayerId: string,
    allTokens: TokenState[],
    playerColors: Record<string, PlayerId>,
  ): boolean {
    const byPlayer = new Map<string, number>();
    for (const t of allTokens) {
      if (t.playerId === movingPlayerId || t.state !== TokenStateEnum.ACTIVE) {
        continue;
      }
      const tColor = playerColors[t.playerId] || PlayerId.RED;
      const gPos = BoardEngine.getGlobalPosition(tColor, t.progress);
      if (gPos === globalPosition) {
        byPlayer.set(t.playerId, (byPlayer.get(t.playerId) ?? 0) + 1);
      }
    }
    // Any opposing player with 2+ tokens at that position forms a blockade
    for (const count of byPlayer.values()) {
      if (count >= 2) return true;
    }
    return false;
  }
}
