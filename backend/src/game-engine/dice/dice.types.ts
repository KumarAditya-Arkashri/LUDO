export interface DiceRandomProvider {
  /**
   * Generates a random integer.
   * @param min Inclusive minimum
   * @param max Inclusive maximum
   */
  generate(min: number, max: number): number;
}

export interface SerializedDiceState {
  playerId: string;
  currentValue: number | null;
  previousValues: number[];
  consecutiveSixes: number;
  rolledAt: string | null;
}
