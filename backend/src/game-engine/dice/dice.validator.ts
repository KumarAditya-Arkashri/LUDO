import { DiceState } from './dice.model';
import { MAX_CONSECUTIVE_SIXES } from './dice.constants';

export class DiceValidator {
  /**
   * Determines if it is mathematically legal to roll the dice based on the given state.
   */
  static validateCanRoll(state: DiceState): void {
    if (!state.playerId) {
      throw new Error('DiceState must have a valid playerId');
    }

    if (state.consecutiveSixes >= MAX_CONSECUTIVE_SIXES) {
      throw new Error(
        'Cannot roll after three consecutive sixes. Turn is lost.',
      );
    }

    // A player can only roll if they haven't rolled yet (currentValue is null)
    // OR they rolled a 6 on their last roll (and thus get an extra roll).
    if (state.currentValue !== null && state.currentValue !== 6) {
      throw new Error(
        'Cannot roll again without an extra turn granted by a six.',
      );
    }
  }

  /**
   * Validates if a loaded state is structurally sound.
   */
  static validateState(state: DiceState): void {
    if (state.currentValue !== null) {
      if (state.currentValue < 1 || state.currentValue > 6) {
        throw new Error(`Invalid dice value: ${state.currentValue}`);
      }
    }

    if (
      state.consecutiveSixes < 0 ||
      state.consecutiveSixes > MAX_CONSECUTIVE_SIXES
    ) {
      throw new Error(
        `Invalid consecutive sixes count: ${state.consecutiveSixes}`,
      );
    }

    for (const val of state.previousValues) {
      if (val < 1 || val > 6) {
        throw new Error(`Invalid previous dice value: ${val}`);
      }
    }
  }
}
