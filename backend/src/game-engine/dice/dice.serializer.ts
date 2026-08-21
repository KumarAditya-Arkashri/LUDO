import { DiceState } from './dice.model';
import { SerializedDiceState } from './dice.types';
import { DiceValidator } from './dice.validator';

export class DiceSerializer {
  static serialize(state: DiceState): SerializedDiceState {
    return {
      playerId: state.playerId,
      currentValue: state.currentValue,
      previousValues: [...state.previousValues],
      consecutiveSixes: state.consecutiveSixes,
      rolledAt: state.rolledAt ? state.rolledAt.toISOString() : null,
    };
  }

  static deserialize(data: SerializedDiceState): DiceState {
    const rolledAt = data.rolledAt ? new Date(data.rolledAt) : null;
    const state = new DiceState(
      data.playerId,
      data.currentValue,
      data.previousValues,
      data.consecutiveSixes,
      rolledAt,
    );

    // Ensure the deserialized state is mathematically sound
    DiceValidator.validateState(state);

    return state;
  }
}
