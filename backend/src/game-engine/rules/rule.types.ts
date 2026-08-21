import { TokenState } from '../token/token.model';

export interface MoveRequest {
  playerId: string;
  tokenId: string;
  diceValue: number;
  isThirdSix: boolean; // Flag to indicate if this roll was the 3rd consecutive 6
}

export interface RuleResultData {
  isValid: boolean;
  reason: string | null;
  nextPlayerId: string | null;
  extraTurn: boolean;
  capture: boolean;
  capturedTokenId: string | null;
  winner: string | null;
  gameOver: boolean;
}

export interface SerializedRuleResult {
  isValid: boolean;
  reason: string | null;
  nextPlayerId: string | null;
  extraTurn: boolean;
  capture: boolean;
  capturedTokenId: string | null;
  winner: string | null;
  gameOver: boolean;
}
