import { DiceEngine } from './dice.engine';
import { DiceState } from './dice.model';

const freshState = (playerId = 'p1') => new DiceState(playerId);
const stateWith = (
  playerId: string,
  currentValue: number | null,
  consecutiveSixes = 0,
) => new DiceState(playerId, currentValue, [], consecutiveSixes, null);

describe('DiceEngine', () => {
  // ─── roll ────────────────────────────────────────────────────────────────

  describe('roll', () => {
    const provider = (val: number) => ({ generate: () => val });

    it('produces a new state with the rolled value', () => {
      const state = freshState();
      const next = DiceEngine.roll(state, provider(4));
      expect(next.currentValue).toBe(4);
    });

    it('resets consecutiveSixes to 0 when rolling non-6', () => {
      const state = stateWith('p1', null, 1); // had one 6 before
      const next = DiceEngine.roll(state, provider(3));
      expect(next.consecutiveSixes).toBe(0);
    });

    it('increments consecutiveSixes when rolling 6', () => {
      const state = stateWith('p1', null, 1);
      const next = DiceEngine.roll(state, provider(6));
      expect(next.consecutiveSixes).toBe(2);
    });

    it('on first 6, consecutiveSixes becomes 1', () => {
      const state = freshState(); // consecutiveSixes = 0
      const next = DiceEngine.roll(state, provider(6));
      expect(next.consecutiveSixes).toBe(1);
    });

    it('on 3rd consecutive 6, history is cleared (turn loss)', () => {
      const state = stateWith('p1', null, 2); // 2 sixes so far
      const next = DiceEngine.roll(state, provider(6));
      expect(next.consecutiveSixes).toBe(3);
      expect(next.previousValues).toHaveLength(0); // history wiped
    });

    it('throws if trying to roll when currentValue is a non-6', () => {
      const state = stateWith('p1', 4); // already rolled 4
      expect(() => DiceEngine.roll(state, provider(2))).toThrow();
    });

    it('allows re-roll when currentValue is 6 (extra turn)', () => {
      const state = stateWith('p1', 6, 1); // rolled 6, extra turn
      const next = DiceEngine.roll(state, provider(3));
      expect(next.currentValue).toBe(3);
    });

    it('throws if consecutiveSixes already = 3', () => {
      const state = stateWith('p1', null, 3);
      expect(() => DiceEngine.roll(state, provider(6))).toThrow(
        'Cannot roll after three consecutive sixes',
      );
    });
  });

  // ─── reset ───────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('returns a clean dice state with nulls and zero counters', () => {
      const state = DiceEngine.reset('p1');
      expect(state.currentValue).toBeNull();
      expect(state.consecutiveSixes).toBe(0);
      expect(state.previousValues).toHaveLength(0);
      expect(state.playerId).toBe('p1');
    });
  });

  // ─── shouldLoseTurn ──────────────────────────────────────────────────────

  describe('shouldLoseTurn', () => {
    it('returns true when consecutiveSixes = 3', () => {
      const state = stateWith('p1', 6, 3);
      expect(DiceEngine.shouldLoseTurn(state)).toBe(true);
    });

    it('returns false when consecutiveSixes < 3', () => {
      expect(DiceEngine.shouldLoseTurn(stateWith('p1', 6, 2))).toBe(false);
      expect(DiceEngine.shouldLoseTurn(stateWith('p1', 6, 1))).toBe(false);
    });
  });

  // ─── grantExtraTurn ──────────────────────────────────────────────────────

  describe('grantExtraTurn', () => {
    it('returns true when currentValue=6 and consecutiveSixes in 1..2', () => {
      expect(DiceEngine.grantExtraTurn(stateWith('p1', 6, 1))).toBe(true);
      expect(DiceEngine.grantExtraTurn(stateWith('p1', 6, 2))).toBe(true);
    });

    it('returns false when consecutiveSixes = 3 (turn lost, no extra)', () => {
      expect(DiceEngine.grantExtraTurn(stateWith('p1', 6, 3))).toBe(false);
    });

    it('returns false when currentValue is not 6', () => {
      expect(DiceEngine.grantExtraTurn(stateWith('p1', 4, 0))).toBe(false);
    });
  });
});
