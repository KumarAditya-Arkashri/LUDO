import { DiceState } from './dice.model';
import { DiceValidator } from './dice.validator';
import { DiceRandomProvider } from './dice.types';
import {
  DICE_MIN_VALUE,
  DICE_MAX_VALUE,
  EXTRA_TURN_VALUE,
  MAX_CONSECUTIVE_SIXES,
} from './dice.constants';

export class DiceEngine {
  /**
   * Rolls the dice and generates a completely new immutable DiceState.
   * @param state The current dice state for the player
   * @param provider The RNG provider
   */
  static roll(state: DiceState, provider: DiceRandomProvider): DiceState {
    DiceValidator.validateCanRoll(state);

    const value = provider.generate(DICE_MIN_VALUE, DICE_MAX_VALUE);

    // Construct new history array
    const previousValues = state.currentValue
      ? [...state.previousValues, state.currentValue]
      : [...state.previousValues];

    // Determine consecutive sixes
    let consecutiveSixes = state.consecutiveSixes;
    if (value === EXTRA_TURN_VALUE) {
      consecutiveSixes += 1;
    } else {
      consecutiveSixes = 0; // Reset consecutive counter if not a 6
    }

    // Three consecutive sixes rule: history clears (or we just reset the count/current).
    // The requirement says "Reset dice history".
    if (consecutiveSixes === MAX_CONSECUTIVE_SIXES) {
      return new DiceState(
        state.playerId,
        value,
        [], // Wipe history to enforce turn loss cleanly
        consecutiveSixes,
        new Date(),
      );
    }

    return new DiceState(
      state.playerId,
      value,
      previousValues,
      consecutiveSixes,
      new Date(),
    );
  }

  /**
   * Hard reset a player's dice state (e.g., when their turn is over or match restarts).
   */
  static reset(playerId: string): DiceState {
    return new DiceState(playerId);
  }

  /**
   * Determines if the player has effectively lost their turn due to 3 consecutive sixes.
   */
  static shouldLoseTurn(state: DiceState): boolean {
    return state.consecutiveSixes === MAX_CONSECUTIVE_SIXES;
  }

  /**
   * Determines if the player gets an extra turn purely based on the latest dice roll.
   */
  static grantExtraTurn(state: DiceState): boolean {
    return (
      state.currentValue === EXTRA_TURN_VALUE &&
      state.consecutiveSixes > 0 &&
      state.consecutiveSixes < MAX_CONSECUTIVE_SIXES
    );
  }
}
