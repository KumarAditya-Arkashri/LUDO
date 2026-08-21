export interface RuleConfig {
  players: number;
  tokensPerPlayer: number;
  requiresSixToEnter: boolean;
  extraTurnOnSix: boolean;
  extraTurnOnCapture: boolean;
  extraTurnOnFinish: boolean;
  safePositions: number[];
  allowBlockade: boolean;
  blockadeSize: number;
  exactRollToFinish: boolean;
  maxConsecutiveSixes: number;
}

export const STANDARD_RULES: RuleConfig = {
  players: 4,
  tokensPerPlayer: 4,
  requiresSixToEnter: true,
  extraTurnOnSix: true,
  extraTurnOnCapture: true,
  extraTurnOnFinish: true,
  safePositions: [0, 8, 13, 21, 26, 34, 39, 47],
  allowBlockade: false,
  blockadeSize: 2,
  exactRollToFinish: true,
  maxConsecutiveSixes: 3,
};
