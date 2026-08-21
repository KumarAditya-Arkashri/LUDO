import { RuleResultData } from './rule.types';

export class RuleResult {
  public readonly isValid: boolean;
  public readonly reason: string | null;
  public readonly nextPlayerId: string | null;
  public readonly extraTurn: boolean;
  public readonly capture: boolean;
  public readonly capturedTokenId: string | null;
  public readonly winner: string | null;
  public readonly gameOver: boolean;

  constructor(data: RuleResultData) {
    this.isValid = data.isValid;
    this.reason = data.reason;
    this.nextPlayerId = data.nextPlayerId;
    this.extraTurn = data.extraTurn;
    this.capture = data.capture;
    this.capturedTokenId = data.capturedTokenId;
    this.winner = data.winner;
    this.gameOver = data.gameOver;

    // Mathematical immutability
    Object.freeze(this);
  }

  /**
   * Helper to quickly create a failed rule result.
   */
  static invalid(
    reason: string,
    nextPlayerId: string | null = null,
  ): RuleResult {
    return new RuleResult({
      isValid: false,
      reason,
      nextPlayerId, // If the move is invalid and turn passes, we need to know who is next. If we don't pass turn, we can send the current player.
      extraTurn: false,
      capture: false,
      capturedTokenId: null,
      winner: null,
      gameOver: false,
    });
  }
}
