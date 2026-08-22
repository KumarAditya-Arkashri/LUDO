import { RuleEngine } from './rule.engine';
import { TokenState } from '../token/token.model';
import { TokenStateEnum } from '../token/token.types';
import { STANDARD_RULES, RuleConfig } from './rule.config';
import { MoveRequest } from './rule.types';
import { PlayerId } from '../models/cell.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeToken = (
  id: string,
  playerId: string,
  progress: number,
  state: TokenStateEnum = TokenStateEnum.ACTIVE,
) => new TokenState(id, playerId, state, progress);

const yardToken = (id: string, playerId: string) =>
  new TokenState(id, playerId, TokenStateEnum.HOME, -1);

const finishedToken = (id: string, playerId: string) =>
  new TokenState(id, playerId, TokenStateEnum.FINISHED, 58);

const request = (
  playerId: PlayerId,
  tokenId: string,
  diceValue: number,
): MoveRequest => ({ playerId, tokenId, diceValue, isThirdSix: false });


const mockPlayerColors: Record<string, PlayerId> = {
  [PlayerId.RED]: PlayerId.RED,
  [PlayerId.GREEN]: PlayerId.GREEN,
  [PlayerId.YELLOW]: PlayerId.YELLOW,
  [PlayerId.BLUE]: PlayerId.BLUE,
};

const players = [PlayerId.RED, PlayerId.GREEN];

// ─── evaluateMove ─────────────────────────────────────────────────────────────

describe('RuleEngine.evaluateMove', () => {
  describe('basic validation', () => {
    it('returns invalid when trying to move an opponent token', () => {
      const token = makeToken('t1', PlayerId.GREEN, 5); // belongs to p2
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 3),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('opponent');
    });

    it('returns invalid for already-FINISHED token', () => {
      const token = finishedToken('t1', PlayerId.RED);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 3),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(false);
    });

    it('returns invalid when dice != 6 for a token in YARD', () => {
      const token = yardToken('t1', PlayerId.RED);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 3),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(false);
    });

    it('returns valid when dice = 6 for a token in YARD', () => {
      const token = yardToken('t1', PlayerId.RED);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 6),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(true);
    });

    it('returns invalid when move overshoots finish line', () => {
      // progress 56 + dice 4 = 60 > 58
      const token = makeToken('t1', PlayerId.RED, 56);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 4),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(false);
    });
  });

  describe('capture', () => {
    it('captures opponent token on a non-safe cell', () => {
      // p1 token at progress 5 → global = (0+5)%52 = 5 (non-safe)
      // p2 token at the same global position
      const p1Token = makeToken('t1', PlayerId.RED, 4); // after moving +1 dice lands on 5
      const p2Token = makeToken('t2', PlayerId.GREEN, 5 - 13 + 52, TokenStateEnum.ACTIVE);
      // p2 (start=13), progress = 5-13+52 = 44 → global = (13+44)%52 = 5 ✓

      const allTokens = [p1Token, p2Token];
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 1), // dice=1 → p1 moves from 4 to 5
        players,
        p1Token,
        allTokens,
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(true);
      expect(result.capture).toBe(true);
      expect(result.capturedTokenId).toBe('t2');
    });

    it('does NOT capture on a safe cell (global pos in safe list)', () => {
      // Safe cells: [0,8,13,21,26,34,39,47]
      // p1 at progress 7 → global=7, moving +1 to 8 (safe)
      const p1Token = makeToken('t1', PlayerId.RED, 7);
      // p2 at global 8: start=13, progress = (8-13+52)%52 = 47
      const p2Token = makeToken('t2', PlayerId.GREEN, 47);
      const allTokens = [p1Token, p2Token];

      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 1),
        players,
        p1Token,
        allTokens,
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(true);
      expect(result.capture).toBe(false);
    });
  });

  describe('extra turn', () => {
    it('grants extra turn when rolling 6 (extraTurnOnSix=true)', () => {
      const token = makeToken('t1', PlayerId.RED, 10);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 6),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.extraTurn).toBe(true);
    });

    it('does NOT grant extra turn when rolling non-6', () => {
      const token = makeToken('t1', PlayerId.RED, 10);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 3),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.extraTurn).toBe(false);
    });
  });

  describe('win condition', () => {
    it('declares winner when 4th token finishes', () => {
      // p1 has 3 finished tokens and 1 about to finish
      const tokens = [
        finishedToken('t1', PlayerId.RED),
        finishedToken('t2', PlayerId.RED),
        finishedToken('t3', PlayerId.RED),
        makeToken('t4', PlayerId.RED, 57), // moves +1 to 58 = FINISH
      ];
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't4', 1),
        players,
        tokens[3],
        tokens,
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(true);
      expect(result.winner).toBe(PlayerId.RED);
      expect(result.gameOver).toBe(true);
    });

    it('no winner when only 3 tokens are finished', () => {
      const tokens = [
        finishedToken('t1', PlayerId.RED),
        finishedToken('t2', PlayerId.RED),
        finishedToken('t3', PlayerId.RED),
        makeToken('t4', PlayerId.RED, 50), // moves to 53 (home lane, not finish)
      ];
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't4', 3),
        players,
        tokens[3],
        tokens,
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.winner).toBeNull();
    });
  });

  describe('next player', () => {
    it('advances to next player after normal move', () => {
      const token = makeToken('t1', PlayerId.RED, 10);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 3),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.nextPlayerId).toBe(PlayerId.GREEN);
    });

    it('keeps current player when extra turn granted', () => {
      const token = makeToken('t1', PlayerId.RED, 10);
      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 6),
        players,
        token,
        [token],
        STANDARD_RULES,
        mockPlayerColors,
      );
      expect(result.nextPlayerId).toBe(PlayerId.RED);
    });
  });

  describe('blockade', () => {
    it('blocks move when 2 opponent tokens occupy destination (allowBlockade=true)', () => {
      // Enable blockade for this test
      const rules: RuleConfig = { ...STANDARD_RULES, allowBlockade: true };
      // p1 token at progress 4, moves to 5 (global=5)
      const p1Token = makeToken('t1', PlayerId.RED, 4);
      // p2 has 2 tokens at global 5
      const p2TokenA = makeToken('t2a', PlayerId.GREEN, 44); // (13+44)%52=5
      const p2TokenB = makeToken('t2b', PlayerId.GREEN, 44);

      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 1),
        players,
        p1Token,
        [p1Token, p2TokenA, p2TokenB],
        rules,
        mockPlayerColors,
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('blockade');
    });

    it('does NOT block when allowBlockade=false (STANDARD_RULES)', () => {
      const p1Token = makeToken('t1', PlayerId.RED, 4);
      const p2TokenA = makeToken('t2a', PlayerId.GREEN, 44);
      const p2TokenB = makeToken('t2b', PlayerId.GREEN, 44);

      const result = RuleEngine.evaluateMove(
        request(PlayerId.RED, 't1', 1),
        players,
        p1Token,
        [p1Token, p2TokenA, p2TokenB],
        STANDARD_RULES, // allowBlockade: false
        mockPlayerColors,
      );
      // Standard rules don't enforce blockade, so move is valid (capture instead)
      expect(result.isValid).toBe(true);
    });
  });
});

// ─── calculateNextPlayer ─────────────────────────────────────────────────────

describe('RuleEngine.calculateNextPlayer', () => {
  it('cycles to the next player in order', () => {
    expect(RuleEngine.calculateNextPlayer(PlayerId.RED, [PlayerId.RED, PlayerId.GREEN, 'p3'])).toBe(PlayerId.GREEN);
    expect(RuleEngine.calculateNextPlayer(PlayerId.GREEN, [PlayerId.RED, PlayerId.GREEN, 'p3'])).toBe('p3');
    expect(RuleEngine.calculateNextPlayer('p3', [PlayerId.RED, PlayerId.GREEN, 'p3'])).toBe(PlayerId.RED);
  });

  it('returns current player when there is only 1 player', () => {
    expect(RuleEngine.calculateNextPlayer(PlayerId.RED, [PlayerId.RED])).toBe(PlayerId.RED);
  });

  it('returns first player when current is not found', () => {
    expect(RuleEngine.calculateNextPlayer('unknown', [PlayerId.RED, PlayerId.GREEN])).toBe(PlayerId.RED);
  });
});

// ─── isBlockade ──────────────────────────────────────────────────────────────

describe('RuleEngine.isBlockade', () => {
  it('returns true when 2+ opponent tokens are on the same global position', () => {
    const p2TokenA = makeToken('t2a', PlayerId.GREEN, 44); // global=5
    const p2TokenB = makeToken('t2b', PlayerId.GREEN, 44); // global=5
    expect(RuleEngine.isBlockade(5, PlayerId.RED, [p2TokenA, p2TokenB], mockPlayerColors)).toBe(true);
  });

  it('returns false when only 1 opponent token is on the position', () => {
    const p2Token = makeToken('t2', PlayerId.GREEN, 44); // global=5
    expect(RuleEngine.isBlockade(5, PlayerId.RED, [p2Token], mockPlayerColors)).toBe(false);
  });

  it('returns false when tokens at that position belong to the moving player', () => {
    const p1TokenA = makeToken('t1a', PlayerId.RED, 5);
    const p1TokenB = makeToken('t1b', PlayerId.RED, 5);
    expect(RuleEngine.isBlockade(5, PlayerId.RED, [p1TokenA, p1TokenB], mockPlayerColors)).toBe(false);
  });
});
