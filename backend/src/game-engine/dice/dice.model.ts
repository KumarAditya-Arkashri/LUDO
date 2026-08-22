export class DiceState {
  public readonly playerId: string;
  public readonly currentValue: number | null;
  public readonly previousValues: readonly number[];
  public readonly consecutiveSixes: number;
  public readonly rolledAt: Date | null;

  constructor(
    playerId: string,
    currentValue: number | null = null,
    previousValues: readonly number[] = [],
    consecutiveSixes: number = 0,
    rolledAt: Date | null = null,
  ) {
    this.playerId = playerId;
    this.currentValue = currentValue;
    this.previousValues = Object.freeze([...previousValues]);
    this.consecutiveSixes = consecutiveSixes;
    this.rolledAt = rolledAt ? new Date(rolledAt) : null;

    Object.freeze(this);
  }
}
