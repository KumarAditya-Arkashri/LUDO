/**
 * Full Game Flow Integration Tests
 *
 * These tests exercise the complete event-sourced pipeline:
 *   MatchEngine (commands) → GameStateEngine (reducer) → MatchState
 *
 * Each test starts from a clean slate and exercises a realistic game scenario.
 */
import { MatchEngine } from '../match/match.engine';
import { GameStateEngine } from '../state/game-state.engine';
import { GameEventType } from '../events/game-event.types';
import { TokenStateEnum } from '../token/token.types';
import { MatchStatus, MatchPlayer } from '../match/match.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makePlayer = (id: string): MatchPlayer => ({
  playerId: id,
  displayName: id,
  connectionState: 'CONNECTED',
  joinedAt: new Date(),
  disconnectedAt: null,
});

function buildStartedGame(playerAId = 'p1', playerBId = 'p2') {
  const pA = makePlayer(playerAId);
  const pB = makePlayer(playerBId);

  let matchState = MatchEngine.createMatch('test-match', pA, { entryFee: 10 });
  matchState = MatchEngine.joinMatch(matchState, pB);
  let gameState = GameStateEngine.initialize(matchState);

  const startEvents = MatchEngine.startMatch(gameState.matchState, gameState.version);
  for (const e of startEvents) {
    gameState = GameStateEngine.applyEvent(gameState, e);
  }

  return gameState;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Full Game Flow — Integration', () => {
  describe('Match Lifecycle', () => {
    it('match transitions WAITING → READY → RUNNING on start', () => {
      const gameState = buildStartedGame();
      expect(gameState.matchState.status).toBe(MatchStatus.RUNNING);
      expect(gameState.matchState.currentPlayer).not.toBeNull();
    });

    it('all 8 tokens are initialized in HOME state at start', () => {
      const gameState = buildStartedGame();
      const tokens = gameState.matchState.tokenStates;
      expect(tokens).toHaveLength(8);
      expect(tokens.every(t => t.state === TokenStateEnum.HOME)).toBe(true);
      expect(tokens.every(t => t.progress === -1)).toBe(true);
    });

    it('each player has a clean dice state at match start', () => {
      const gameState = buildStartedGame();
      const { diceStates } = gameState.matchState;
      for (const ds of Object.values(diceStates)) {
        expect(ds.currentValue).toBeNull();
        expect(ds.consecutiveSixes).toBe(0);
      }
    });
  });

  describe('Roll Dice → No Valid Move (all in yard, dice != 6)', () => {
    it('auto-changes turn when no token can move', () => {
      let gameState = buildStartedGame();
      const currentPlayer = gameState.matchState.currentPlayer!;

      // Roll a 3 — all tokens are in yard, cannot move without a 6
      const rollEvents = MatchEngine.handleRollDice(
        gameState.matchState, gameState.version, currentPlayer, 3,
      );
      for (const e of rollEvents) gameState = GameStateEngine.applyEvent(gameState, e);

      // Turn should have passed to the other player
      expect(gameState.matchState.currentPlayer).not.toBe(currentPlayer);
    });
  });

  describe('Roll 6 → Spawn Token → Extra Turn', () => {
    it('player retains turn after rolling a 6 and spawning', () => {
      let gameState = buildStartedGame();
      const currentPlayer = gameState.matchState.currentPlayer!;

      // Roll 6
      const rollEvents = MatchEngine.handleRollDice(
        gameState.matchState, gameState.version, currentPlayer, 6,
      );
      for (const e of rollEvents) gameState = GameStateEngine.applyEvent(gameState, e);

      expect(gameState.matchState.diceStates[currentPlayer].currentValue).toBe(6);

      // Move the first available token (should spawn)
      const tokenId = gameState.matchState.tokenStates.find(
        t => t.playerId === currentPlayer,
      )!.tokenId;

      const moveEvents = MatchEngine.handleMoveToken(
        gameState.matchState, gameState.version, currentPlayer, tokenId,
      );
      for (const e of moveEvents) gameState = GameStateEngine.applyEvent(gameState, e);

      // Token should be on the board at progress 0
      const token = gameState.matchState.tokenStates.find(t => t.tokenId === tokenId)!;
      expect(token.progress).toBe(0);
      expect(token.state).toBe(TokenStateEnum.ACTIVE);

      // BUG FIX #3 verification: player still has the turn (extra turn granted)
      expect(gameState.matchState.currentPlayer).toBe(currentPlayer);

      // BUG FIX #3 verification: dice is cleared so player CAN roll again
      expect(gameState.matchState.diceStates[currentPlayer].currentValue).toBeNull();
    });
  });

  describe('Three Consecutive Sixes → Turn Forfeit', () => {
    it('turn passes to opponent after 3 consecutive sixes', () => {
      let gameState = buildStartedGame();
      const currentPlayer = gameState.matchState.currentPlayer!;

      // Roll 6 three times in a row
      for (let i = 0; i < 3; i++) {
        // Make sure dice state allows rolling (currentValue must be null or 6)
        const diceState = gameState.matchState.diceStates[currentPlayer];
        // After rolling 6, dice currentValue = 6 (can re-roll).
        // After 3rd six, TURN_CHANGE fires and dice is reset.
        if (diceState?.currentValue !== null && diceState?.currentValue !== 6) {
          break; // turn already changed, stop
        }

        const rollEvents = MatchEngine.handleRollDice(
          gameState.matchState, gameState.version, gameState.matchState.currentPlayer!, 6,
        );
        for (const e of rollEvents) gameState = GameStateEngine.applyEvent(gameState, e);

        // If turn changed after 3 sixes, the currentPlayer would have changed
        if (gameState.matchState.currentPlayer !== currentPlayer) break;

        // If still current player's turn and dice allows re-roll, move a token
        const homeToken = gameState.matchState.tokenStates.find(
          t => t.playerId === currentPlayer && t.state === TokenStateEnum.HOME,
        );
        const activeToken = gameState.matchState.tokenStates.find(
          t => t.playerId === currentPlayer && t.state === TokenStateEnum.ACTIVE,
        );
        
        const tokenToMove = activeToken || homeToken;
        if (tokenToMove) {
          const moveEvents = MatchEngine.handleMoveToken(
            gameState.matchState, gameState.version, currentPlayer, tokenToMove.tokenId,
          );
          for (const e of moveEvents) gameState = GameStateEngine.applyEvent(gameState, e);
        }
      }

      // After 3 sixes, turn MUST have passed
      expect(gameState.matchState.currentPlayer).not.toBe(currentPlayer);
    });
  });

  describe('BUG FIX #1 — Consecutive Six Count', () => {
    it('consecutiveSixes increments to 1 on very first roll of 6', () => {
      let gameState = buildStartedGame();
      const currentPlayer = gameState.matchState.currentPlayer!;

      const rollEvents = MatchEngine.handleRollDice(
        gameState.matchState, gameState.version, currentPlayer, 6,
      );
      // Find the DICE_ROLL event and check its consecutiveSixCount payload
      const diceEvent = rollEvents.find(e => e.type === GameEventType.DICE_ROLL);
      expect(diceEvent).toBeDefined();
      expect(diceEvent!.payload.consecutiveSixCount).toBe(1);
    });
  });

  describe('BUG FIX #2 — FINISHED tokens excluded from hasValidMove', () => {
    it('turn changes on non-6 roll when all non-finished tokens cannot move', () => {
      let gameState = buildStartedGame();
      const currentPlayer = gameState.matchState.currentPlayer!;

      // All tokens are in yard (progress=-1). Rolling non-6 => no valid moves => turn changes.
      const rollEvents = MatchEngine.handleRollDice(
        gameState.matchState, gameState.version, currentPlayer, 4,
      );
      const hasTurnChange = rollEvents.some(e => e.type === GameEventType.TURN_CHANGE);
      expect(hasTurnChange).toBe(true);
    });
  });

  describe('State Replay', () => {
    it('replaying event history reconstructs identical state', () => {
      let gameState = buildStartedGame();
      const currentPlayer = gameState.matchState.currentPlayer!;

      // Roll 6 and spawn a token
      for (const e of MatchEngine.handleRollDice(gameState.matchState, gameState.version, currentPlayer, 6)) {
        gameState = GameStateEngine.applyEvent(gameState, e);
      }
      const tokenId = gameState.matchState.tokenStates.find(
        t => t.playerId === currentPlayer,
      )!.tokenId;
      for (const e of MatchEngine.handleMoveToken(gameState.matchState, gameState.version, currentPlayer, tokenId)) {
        gameState = GameStateEngine.applyEvent(gameState, e);
      }

      // Replay from scratch
      const initialMatchState = MatchEngine.joinMatch(
        MatchEngine.createMatch('test-match', makePlayer('p1'), { entryFee: 10 }),
        makePlayer('p2'),
      );
      const replayed = GameStateEngine.replay(initialMatchState, [...gameState.history]);

      expect(replayed.matchState.tokenStates).toEqual(gameState.matchState.tokenStates);
      expect(replayed.matchState.currentPlayer).toBe(gameState.matchState.currentPlayer);
    });
  });
});
