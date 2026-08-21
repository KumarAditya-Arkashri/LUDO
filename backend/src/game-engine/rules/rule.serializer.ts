import { RuleResult } from './rule.model';
import { SerializedRuleResult } from './rule.types';

export class RuleSerializer {
  static serialize(result: RuleResult): SerializedRuleResult {
    return {
      isValid: result.isValid,
      reason: result.reason,
      nextPlayerId: result.nextPlayerId,
      extraTurn: result.extraTurn,
      capture: result.capture,
      capturedTokenId: result.capturedTokenId,
      winner: result.winner,
      gameOver: result.gameOver,
    };
  }

  static deserialize(data: SerializedRuleResult): RuleResult {
    return new RuleResult({
      isValid: data.isValid,
      reason: data.reason,
      nextPlayerId: data.nextPlayerId,
      extraTurn: data.extraTurn,
      capture: data.capture,
      capturedTokenId: data.capturedTokenId,
      winner: data.winner,
      gameOver: data.gameOver,
    });
  }
}
