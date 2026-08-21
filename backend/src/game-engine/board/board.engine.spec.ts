import { BoardEngine } from './board.engine';
import { PlayerId } from '../models/cell.model';

describe('BoardEngine', () => {
  // ─── getGlobalPosition ────────────────────────────────────────────────────

  describe('getGlobalPosition', () => {
    it('returns null for yard (progress = -1)', () => {
      expect(BoardEngine.getGlobalPosition(PlayerId.RED, -1)).toBeNull();
    });

    it('returns null when progress >= 52 (home straight)', () => {
      expect(BoardEngine.getGlobalPosition(PlayerId.RED, 52)).toBeNull();
      expect(BoardEngine.getGlobalPosition(PlayerId.RED, 57)).toBeNull();
      expect(BoardEngine.getGlobalPosition(PlayerId.RED, 58)).toBeNull();
    });

    it('RED at progress 0 is global position 0 (its own start)', () => {
      expect(BoardEngine.getGlobalPosition(PlayerId.RED, 0)).toBe(0);
    });

    it('GREEN at progress 0 is global position 13 (its own start)', () => {
      expect(BoardEngine.getGlobalPosition(PlayerId.GREEN, 0)).toBe(13);
    });

    it('YELLOW at progress 0 is global position 26 (its own start)', () => {
      expect(BoardEngine.getGlobalPosition(PlayerId.YELLOW, 0)).toBe(26);
    });

    it('BLUE at progress 0 is global position 39 (its own start)', () => {
      expect(BoardEngine.getGlobalPosition(PlayerId.BLUE, 0)).toBe(39);
    });

    it('wraps around the 52-cell track correctly (RED at progress 51)', () => {
      // RED start=0, progress=51 → (0+51) % 52 = 51
      expect(BoardEngine.getGlobalPosition(PlayerId.RED, 51)).toBe(51);
    });

    it('wraps around past cell 52 for BLUE (progress=13 → (39+13)%52=0)', () => {
      // BLUE start=39, progress=13 → (39+13)%52 = 0
      expect(BoardEngine.getGlobalPosition(PlayerId.BLUE, 13)).toBe(0);
    });
  });

  // ─── calculateNextProgress ────────────────────────────────────────────────

  describe('calculateNextProgress', () => {
    it('entering yard: dice=6 from progress -1 returns 0', () => {
      expect(BoardEngine.calculateNextProgress(-1, 6)).toBe(0);
    });

    it('entering yard: dice != 6 from progress -1 throws', () => {
      expect(() => BoardEngine.calculateNextProgress(-1, 3)).toThrow(
        'Token cannot enter board without a 6',
      );
    });

    it('normal move advances progress by dice value', () => {
      expect(BoardEngine.calculateNextProgress(10, 4)).toBe(14);
    });

    it('exact finish (progress 52 + 6 = 58) is allowed', () => {
      expect(BoardEngine.calculateNextProgress(52, 6)).toBe(58);
    });

    it('overshoot beyond 58 throws', () => {
      expect(() => BoardEngine.calculateNextProgress(55, 6)).toThrow(
        'Move exceeds finish line',
      );
    });

    it('one step before finish is allowed', () => {
      expect(BoardEngine.calculateNextProgress(57, 1)).toBe(58);
    });
  });

  // ─── isSafePosition ───────────────────────────────────────────────────────

  describe('isSafePosition', () => {
    it('returns true for null (home path / yard)', () => {
      expect(BoardEngine.isSafePosition(null)).toBe(true);
    });

    it.each([0, 8, 13, 21, 26, 34, 39, 47])(
      'global position %i is safe (standard safe cells)',
      (pos) => {
        expect(BoardEngine.isSafePosition(pos)).toBe(true);
      },
    );

    it('non-safe positions return false', () => {
      expect(BoardEngine.isSafePosition(1)).toBe(false);
      expect(BoardEngine.isSafePosition(7)).toBe(false);
      expect(BoardEngine.isSafePosition(25)).toBe(false);
    });
  });

  // ─── getCellId ────────────────────────────────────────────────────────────

  describe('getCellId', () => {
    it('returns YARD id for progress -1', () => {
      expect(BoardEngine.getCellId(PlayerId.RED, -1)).toBe('RED_YARD');
    });

    it('returns FINISH id for progress 58', () => {
      expect(BoardEngine.getCellId(PlayerId.RED, 58)).toBe('RED_FINISH');
    });

    it('returns HOME lane id for progress 52–57', () => {
      expect(BoardEngine.getCellId(PlayerId.RED, 52)).toBe('RED_HOME_1');
      expect(BoardEngine.getCellId(PlayerId.RED, 57)).toBe('RED_HOME_6');
    });

    it('returns MAIN cell id for progress 0..51', () => {
      // RED at progress 0 → globalPosition 0 → MAIN_0
      expect(BoardEngine.getCellId(PlayerId.RED, 0)).toBe('MAIN_0');
    });
  });
});
