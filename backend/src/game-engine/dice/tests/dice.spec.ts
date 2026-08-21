import { DiceEngine } from '../dice.engine';
import { DiceState } from '../dice.model';
import { CryptoDiceRandomProvider } from '../dice.random-provider';
import { DiceSerializer } from '../dice.serializer';
import { DiceValidator } from '../dice.validator';

// A predictable mock provider for logic tests
class MockDiceRandomProvider {
  private nextValues: number[] = [];

  setNextValues(values: number[]) {
    this.nextValues = [...values];
  }

  generate(min: number, max: number): number {
    if (this.nextValues.length > 0) {
      return this.nextValues.shift()!;
    }
    return min; // Fallback
  }
}

describe('Dice Engine', () => {
  const playerId = 'player1';
  let mockProvider: MockDiceRandomProvider;

  beforeEach(() => {
    mockProvider = new MockDiceRandomProvider();
  });

  describe('Core Roll Logic', () => {
    it('should roll a value and update state correctly', () => {
      mockProvider.setNextValues([4]);
      let state = DiceEngine.reset(playerId);
      state = DiceEngine.roll(state, mockProvider);

      expect(state.currentValue).toBe(4);
      expect(state.previousValues.length).toBe(0);
      expect(state.consecutiveSixes).toBe(0);
      expect(DiceEngine.grantExtraTurn(state)).toBe(false);
      expect(DiceEngine.shouldLoseTurn(state)).toBe(false);
    });

    it('should grant extra turn on a 6', () => {
      mockProvider.setNextValues([6]);
      let state = DiceEngine.reset(playerId);
      state = DiceEngine.roll(state, mockProvider);

      expect(state.currentValue).toBe(6);
      expect(state.consecutiveSixes).toBe(1);
      expect(DiceEngine.grantExtraTurn(state)).toBe(true);
      expect(DiceEngine.shouldLoseTurn(state)).toBe(false);
    });

    it('should accumulate history for multiple valid rolls', () => {
      mockProvider.setNextValues([6, 3]);
      let state = DiceEngine.reset(playerId);

      state = DiceEngine.roll(state, mockProvider);
      expect(state.currentValue).toBe(6);

      // Roll again since we got a 6
      state = DiceEngine.roll(state, mockProvider);
      expect(state.currentValue).toBe(3);
      expect(state.previousValues).toEqual([6]);
      expect(state.consecutiveSixes).toBe(0);
      expect(DiceEngine.grantExtraTurn(state)).toBe(false);
    });

    it('should reset history and lose turn on three consecutive sixes', () => {
      mockProvider.setNextValues([6, 6, 6]);
      let state = DiceEngine.reset(playerId);

      state = DiceEngine.roll(state, mockProvider); // 1st six
      expect(state.consecutiveSixes).toBe(1);

      state = DiceEngine.roll(state, mockProvider); // 2nd six
      expect(state.consecutiveSixes).toBe(2);

      state = DiceEngine.roll(state, mockProvider); // 3rd six

      // Rule enforcement: Lose turn and reset history
      expect(state.currentValue).toBe(6);
      expect(state.consecutiveSixes).toBe(3);
      expect(state.previousValues.length).toBe(0);
      expect(DiceEngine.shouldLoseTurn(state)).toBe(true);
      expect(DiceEngine.grantExtraTurn(state)).toBe(false);
    });
  });

  describe('Validation Rules', () => {
    it('should throw if rolling without an extra turn granted', () => {
      mockProvider.setNextValues([4, 2]);
      let state = DiceEngine.reset(playerId);
      state = DiceEngine.roll(state, mockProvider); // Rolls a 4

      // Cannot roll again
      expect(() => DiceEngine.roll(state, mockProvider)).toThrow(
        'Cannot roll again',
      );
    });

    it('should throw if rolling after three sixes', () => {
      mockProvider.setNextValues([6, 6, 6, 4]);
      let state = DiceEngine.reset(playerId);
      state = DiceEngine.roll(state, mockProvider);
      state = DiceEngine.roll(state, mockProvider);
      state = DiceEngine.roll(state, mockProvider);

      // Try 4th roll
      expect(() => DiceEngine.roll(state, mockProvider)).toThrow(
        'Cannot roll after three consecutive sixes',
      );
    });

    it('should throw for structurally invalid deserialized states', () => {
      expect(() =>
        DiceValidator.validateState(new DiceState(playerId, 7)),
      ).toThrow('Invalid dice value: 7');
      expect(() =>
        DiceValidator.validateState(new DiceState(playerId, 0)),
      ).toThrow('Invalid dice value: 0');
      expect(() =>
        DiceValidator.validateState(new DiceState(playerId, 4, [8])),
      ).toThrow('Invalid previous dice value: 8');
    });
  });

  describe('Serialization', () => {
    it('should accurately serialize and deserialize', () => {
      const state = new DiceState(playerId, 6, [4, 5], 1, new Date());
      const json = DiceSerializer.serialize(state);
      const restored = DiceSerializer.deserialize(json);

      expect(restored.playerId).toBe(state.playerId);
      expect(restored.currentValue).toBe(state.currentValue);
      expect(restored.previousValues).toEqual(state.previousValues);
      expect(restored.consecutiveSixes).toBe(state.consecutiveSixes);
      expect(restored.rolledAt?.toISOString()).toBe(
        state.rolledAt?.toISOString(),
      );
    });
  });

  describe('Random Distribution (Crypto PRNG)', () => {
    it('should uniformly distribute 100,000 rolls', () => {
      const cryptoProvider = new CryptoDiceRandomProvider();
      const TOTAL_ROLLS = 100000;
      const expectedAvg = TOTAL_ROLLS / 6;
      const tolerance = TOTAL_ROLLS * 0.02; // 2% tolerance margin

      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      for (let i = 0; i < TOTAL_ROLLS; i++) {
        const val = cryptoProvider.generate(1, 6);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        counts[val as keyof typeof counts]++;
      }

      for (let i = 1; i <= 6; i++) {
        const count = counts[i as keyof typeof counts];
        expect(Math.abs(count - expectedAvg)).toBeLessThan(tolerance);
      }
    });
  });
});
