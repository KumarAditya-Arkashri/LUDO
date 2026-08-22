import { MatchEngine } from '../match/match.engine';
import { GameStateEngine } from '../state/game-state.engine';
import { GameEventType } from '../events/game-event.types';
import { TokenStateEnum } from '../token/token.types';
import { MatchStatus, MatchPlayer } from '../match/match.types';
import { MatchState } from '../match/match.model';
import { TokenState } from '../token/token.model';

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

function applyRoll(gameState: any, playerId: string, value: number) {
  const rollEvents = MatchEngine.handleRollDice(
    gameState.matchState, gameState.version, playerId, value,
  );
  for (const e of rollEvents) gameState = GameStateEngine.applyEvent(gameState, e);
  return gameState;
}

function applyMove(gameState: any, playerId: string, tokenId: string) {
  const moveEvents = MatchEngine.handleMoveToken(
    gameState.matchState, gameState.version, playerId, tokenId,
  );
  for (const e of moveEvents) gameState = GameStateEngine.applyEvent(gameState, e);
  return gameState;
}

function forceTokenPosition(gameState: any, playerId: string, tokenIndex: number, progress: number, state: TokenStateEnum) {
    const newTokenStates = gameState.matchState.tokenStates.map((t: TokenState) => {
        if (t.playerId === playerId && t.tokenId === `tkn_${playerId}_${tokenIndex}`) {
            return new TokenState(t.tokenId, t.playerId, state, progress);
        }
        return t;
    });
    
    const newMatchState = new MatchState(
        gameState.matchState.matchId,
        gameState.matchState.status,
        gameState.matchState.players,
        gameState.matchState.currentPlayer,
        gameState.matchState.startedAt,
        gameState.matchState.endedAt,
        gameState.matchState.winner,
        gameState.matchState.turnNumber,
        gameState.matchState.diceStates,
        newTokenStates,
        gameState.matchState.metadata
    );

    return {
        ...gameState,
        matchState: newMatchState
    };
}

function forceCurrentPlayer(gameState: any, playerId: string) {
    const newMatchState = new MatchState(
        gameState.matchState.matchId,
        gameState.matchState.status,
        gameState.matchState.players,
        playerId,
        gameState.matchState.startedAt,
        gameState.matchState.endedAt,
        gameState.matchState.winner,
        gameState.matchState.turnNumber,
        gameState.matchState.diceStates,
        gameState.matchState.tokenStates,
        gameState.matchState.metadata
    );
    return {
        ...gameState,
        matchState: newMatchState
    };
}

describe('P2 Ludo Complete Rules Verification', () => {

  describe('Normal Movement & Path Integrity', () => {
    it('moves token by exact dice value on track', () => {
      let gameState = buildStartedGame();
      const p1 = gameState.matchState.currentPlayer!;
      gameState = forceTokenPosition(gameState, p1, 0, 10, TokenStateEnum.ACTIVE);
      
      gameState = applyRoll(gameState, p1, 4);
      gameState = applyMove(gameState, p1, `tkn_${p1}_0`);

      const t1 = gameState.matchState.tokenStates.find((t: any) => t.tokenId === `tkn_${p1}_0`)!;
      expect(t1.progress).toBe(14);
    });
  });

  describe('Multiple Tokens / Selection', () => {
    it('allows selecting a specific token among multiple legal tokens', () => {
      let gameState = buildStartedGame();
      const p1 = gameState.matchState.currentPlayer!;
      gameState = forceTokenPosition(gameState, p1, 0, 5, TokenStateEnum.ACTIVE);
      gameState = forceTokenPosition(gameState, p1, 1, 10, TokenStateEnum.ACTIVE);

      gameState = applyRoll(gameState, p1, 3);
      // Move token 1
      gameState = applyMove(gameState, p1, `tkn_${p1}_1`);

      const t0 = gameState.matchState.tokenStates.find((t: any) => t.tokenId === `tkn_${p1}_0`)!;
      const t1 = gameState.matchState.tokenStates.find((t: any) => t.tokenId === `tkn_${p1}_1`)!;
      
      expect(t0.progress).toBe(5); // Unchanged
      expect(t1.progress).toBe(13); // Changed
    });
  });

  describe('Capture & Safe Cells', () => {
    it('captures opponent token on a non-safe cell and grants extra turn', () => {
      let gameState = buildStartedGame();
      const p1 = gameState.matchState.players[0].playerId;
      const p2 = gameState.matchState.players[1].playerId;
      
      gameState = forceCurrentPlayer(gameState, p1);
      
      // P1 starts at 0. Global 5 (since roll is 3 from 2).
      // P2 (BLUE) starts at 39. Global 5 => Progress 18.
      gameState = forceTokenPosition(gameState, p1, 0, 2, TokenStateEnum.ACTIVE);
      gameState = forceTokenPosition(gameState, p2, 0, 18, TokenStateEnum.ACTIVE); 

      // P1 rolls 3 -> progress 5 (global 5). 
      // Cell 5 is not safe (Safe cells: 0, 8, 13, 21, 26, 34, 39, 47)
      gameState = applyRoll(gameState, p1, 3);
      gameState = applyMove(gameState, p1, `tkn_${p1}_0`);

      const p2t0 = gameState.matchState.tokenStates.find((t: any) => t.tokenId === `tkn_${p2}_0`)!;
      expect(p2t0.state).toBe(TokenStateEnum.HOME); // Sent to yard
      expect(p2t0.progress).toBe(-1);
      
      // Extra turn on capture
      expect(gameState.matchState.currentPlayer).toBe(p1);
    });

    it('does not capture opponent on a safe cell', () => {
      let gameState = buildStartedGame();
      const p1 = gameState.matchState.players[0].playerId;
      const p2 = gameState.matchState.players[1].playerId;
      
      gameState = forceCurrentPlayer(gameState, p1);
      
      // Target safe cell: 8
      // P1 starts at 0. Global 8 => Progress 8.
      // P2 (BLUE) starts at 39. Global 8 => Progress 21.
      gameState = forceTokenPosition(gameState, p1, 0, 5, TokenStateEnum.ACTIVE);
      gameState = forceTokenPosition(gameState, p2, 0, 21, TokenStateEnum.ACTIVE);

      gameState = applyRoll(gameState, p1, 3); // Lands on 8
      gameState = applyMove(gameState, p1, `tkn_${p1}_0`);

      const p2t0 = gameState.matchState.tokenStates.find((t: any) => t.tokenId === `tkn_${p2}_0`)!;
      // Should NOT be captured
      expect(p2t0.state).toBe(TokenStateEnum.ACTIVE);
      expect(p2t0.progress).toBe(21);
    });
  });

  describe('Home Path & Exact Finish', () => {
    it('moves into home path and exact finish', () => {
      let gameState = buildStartedGame();
      const p1 = gameState.matchState.currentPlayer!;
      
      // Move to progress 56 (2 steps away from finish 58)
      gameState = forceTokenPosition(gameState, p1, 0, 56, TokenStateEnum.ACTIVE);
      
      gameState = applyRoll(gameState, p1, 2);
      gameState = applyMove(gameState, p1, `tkn_${p1}_0`);

      const t0 = gameState.matchState.tokenStates.find((t: any) => t.tokenId === `tkn_${p1}_0`)!;
      expect(t0.progress).toBe(58);
      expect(t0.state).toBe(TokenStateEnum.FINISHED);
      // Extra turn on finish
      expect(gameState.matchState.currentPlayer).toBe(p1);
    });

    it('rejects overshoot movement', () => {
      let gameState = buildStartedGame();
      const p1 = gameState.matchState.currentPlayer!;
      
      gameState = forceTokenPosition(gameState, p1, 0, 56, TokenStateEnum.ACTIVE);
      // Activate another token so the turn doesn't automatically pass when rolling a 3
      gameState = forceTokenPosition(gameState, p1, 1, 0, TokenStateEnum.ACTIVE);
      
      gameState = applyRoll(gameState, p1, 3); // Would go to 59 for tkn 0
      
      // The rule engine returns RuleResult.invalid("Move exceeds finish line").
      // GameStateEngine would throw Error("Invalid move: Move exceeds finish line") if we pass invalid move,
      // but MatchEngine.handleMoveToken actually throws the reason if ruleResult.isValid is false.
      expect(() => applyMove(gameState, p1, `tkn_${p1}_0`)).toThrow('Move exceeds finish line');
    });
  });

  describe('Win Condition', () => {
    it('declares winner and stops game when 4 tokens finish', () => {
      let gameState = buildStartedGame();
      const p1 = gameState.matchState.currentPlayer!;
      
      // Put 3 tokens already finished
      gameState = forceTokenPosition(gameState, p1, 0, 58, TokenStateEnum.FINISHED);
      gameState = forceTokenPosition(gameState, p1, 1, 58, TokenStateEnum.FINISHED);
      gameState = forceTokenPosition(gameState, p1, 2, 58, TokenStateEnum.FINISHED);
      
      // Put last token at 57
      gameState = forceTokenPosition(gameState, p1, 3, 57, TokenStateEnum.ACTIVE);
      
      gameState = applyRoll(gameState, p1, 1);
      gameState = applyMove(gameState, p1, `tkn_${p1}_3`);

      expect(gameState.matchState.status).toBe(MatchStatus.COMPLETED);
      expect(gameState.matchState.winner).toBe(p1);
    });
  });
});
