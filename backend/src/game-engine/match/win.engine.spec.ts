import { WinEngine } from './win.engine';
import { TokenState } from '../token/token.model';
import { TokenStateEnum } from '../token/token.types';
import { MatchEngine } from './match.engine';
import { MatchStatus, MatchPlayer } from './match.types';

const makePlayer = (id: string): MatchPlayer => ({
  playerId: id,
  displayName: id,
  connectionState: 'CONNECTED',
  hasLeft: false,
  joinedAt: new Date(),
  disconnectedAt: null,
});

const finishedToken = (id: string, playerId: string) =>
  new TokenState(id, playerId, TokenStateEnum.FINISHED, 58);

const activeToken = (id: string, playerId: string, progress = 10) =>
  new TokenState(id, playerId, TokenStateEnum.ACTIVE, progress);

const homeToken = (id: string, playerId: string) =>
  new TokenState(id, playerId, TokenStateEnum.HOME, -1);

// ─── WinEngine.checkWinCondition ─────────────────────────────────────────────

describe('WinEngine.checkWinCondition', () => {
  it('returns false when 0 tokens are finished', () => {
    const tokens = [
      activeToken('t1', 'p1'),
      activeToken('t2', 'p1'),
      activeToken('t3', 'p1'),
      activeToken('t4', 'p1'),
    ];
    expect(WinEngine.checkWinCondition('p1', tokens)).toBe(false);
  });

  it('returns false when 3 tokens finished (not enough to win)', () => {
    const tokens = [
      finishedToken('t1', 'p1'),
      finishedToken('t2', 'p1'),
      finishedToken('t3', 'p1'),
      activeToken('t4', 'p1', 30),
    ];
    expect(WinEngine.checkWinCondition('p1', tokens)).toBe(false);
  });

  it('returns true when 4 tokens are already FINISHED', () => {
    const tokens = [
      finishedToken('t1', 'p1'),
      finishedToken('t2', 'p1'),
      finishedToken('t3', 'p1'),
      finishedToken('t4', 'p1'),
    ];
    expect(WinEngine.checkWinCondition('p1', tokens)).toBe(true);
  });

  it('returns true when 3 finished + isFinishingCurrentMove=true', () => {
    const tokens = [
      finishedToken('t1', 'p1'),
      finishedToken('t2', 'p1'),
      finishedToken('t3', 'p1'),
      activeToken('t4', 'p1', 57), // about to finish
    ];
    expect(WinEngine.checkWinCondition('p1', tokens, true)).toBe(true);
  });

  it('ignores opponent tokens when checking win for a player', () => {
    const tokens = [
      finishedToken('t1', 'p1'),
      finishedToken('t2', 'p1'),
      finishedToken('t3', 'p1'),
      finishedToken('t4', 'p2'), // opponent — should NOT count for p1
    ];
    expect(WinEngine.checkWinCondition('p1', tokens)).toBe(false);
  });
});

// ─── WinEngine.declareWinner ──────────────────────────────────────────────────

describe('WinEngine.declareWinner', () => {
  it('sets status to COMPLETED and records winner', () => {
    const playerA = makePlayer('p1');
    const playerB = makePlayer('p2');
    let state = MatchEngine.createMatch('m1', playerA);
    state = MatchEngine.joinMatch(state, playerB);

    const concluded = WinEngine.declareWinner(state, 'p1');
    expect(concluded.status).toBe(MatchStatus.COMPLETED);
    expect(concluded.winner).toBe('p1');
    expect(concluded.endedAt).not.toBeNull();
  });
});
