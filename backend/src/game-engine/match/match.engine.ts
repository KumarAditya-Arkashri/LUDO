import { MatchState } from './match.model';
import { MatchStatus, MatchPlayer } from './match.types';
import { MatchValidator } from './match.validator';
import { TokenState } from '../token/token.model';
import { TokenStateEnum } from '../token/token.types';
import { DiceState } from '../dice/dice.model';
import { TOKENS_PER_PLAYER } from '../token/token.constants';
import { GameEvent, GameEventType } from '../events/game-event.types';
import * as crypto from 'crypto';
import { RuleEngine } from '../rules/rule.engine';
import { STANDARD_RULES } from '../rules/rule.config';
import { MoveRequest } from '../rules/rule.types';
import { DiceEngine } from '../dice/dice.engine';
import { BoardEngine } from '../board/board.engine';
import { PlayerId } from '../models/cell.model';

export class MatchEngine {
  /**
   * Initializes a new match with the creator. (No events needed before game starts)
   */
  static createMatch(matchId: string, player: MatchPlayer, metadata: Record<string, any> = {}): MatchState {
    return new MatchState(matchId, MatchStatus.WAITING, [player], null, new Date(), null, null, 1, {}, [], metadata);
  }

  /**
   * Allows a player to join an existing waiting match. (No events needed before game starts)
   */
  static joinMatch(state: MatchState, player: MatchPlayer): MatchState {
    MatchValidator.validateJoin(state, player.playerId);

    const newPlayers = [...state.players, player];
    const newStatus = MatchStatus.READY; // Assuming 2 players = ready

    return new MatchState(
      state.matchId,
      newStatus,
      newPlayers,
      state.currentPlayer,
      state.startedAt,
      state.endedAt,
      state.winner,
      state.turnNumber,
      state.diceStates,
      state.tokenStates,
      state.metadata,
    );
  }

  // --- Commands (Return GameEvent[]) ---

  static generateEventBase(matchId: string, version: number, type: GameEventType, playerId: string | null): any {
    return {
      id: crypto.randomUUID(),
      matchId,
      type,
      version: version + 1,
      timestamp: new Date(),
      playerId,
    };
  }

  /**
   * Starts the match, initializing tokens and dispatching MATCH_START.
   */
  static startMatch(state: MatchState, currentVersion: number): GameEvent[] {
    MatchValidator.validateStart(state);
    const starterIndex = crypto.randomInt(0, state.players.length);
    const starter = state.players[starterIndex].playerId;

    return [{
      ...this.generateEventBase(state.matchId, currentVersion, GameEventType.MATCH_START, null),
      payload: { starterId: starter }
    }];
  }

  /**
   * Handles a dice roll command.
   */
  static handleRollDice(state: MatchState, currentVersion: number, playerId: string, rolledValue: number): GameEvent[] {
    if (state.currentPlayer !== playerId) {
      throw new Error('Not your turn');
    }

    const diceState = state.diceStates[playerId];
    if (diceState && diceState.currentValue !== null) {
      throw new Error('You have already rolled');
    }

    const events: GameEvent[] = [];
    let version = currentVersion;

    // BUG FIX #1: Read previous consecutive-six count from existing state (handles
    // first-roll case where diceState may exist but consecutiveSixes is 0, and
    // also new-turn case where diceState was reset). Using nullish coalescing
    // ensures we never compute NaN on a fresh state.
    const prevConsecutive = diceState?.consecutiveSixes ?? 0;
    const consecutiveSixCount = rolledValue === 6 ? prevConsecutive + 1 : 0;

    events.push({
      ...this.generateEventBase(state.matchId, version++, GameEventType.DICE_ROLL, playerId),
      payload: {
        diceValue: rolledValue,
        isConsecutiveSix: rolledValue === 6,
        consecutiveSixCount,
      }
    });

    if (consecutiveSixCount >= 3) {
      // 3 consecutive 6s -> End turn
      const nextPlayerId = RuleEngine.calculateNextPlayer(playerId, state.players.map(p => p.playerId));
      events.push({
        ...this.generateEventBase(state.matchId, version++, GameEventType.TURN_CHANGE, playerId),
        payload: { nextPlayerId, reason: 'THREE_SIXES' }
      });
    } else {
      // BUG FIX #2: Exclude FINISHED tokens — they cannot move and must not
      // be counted when checking for valid moves, otherwise a player whose
      // remaining tokens are all stuck could avoid a turn-change incorrectly.
      const playerTokens = state.tokenStates.filter(
        t => t.playerId === playerId && t.state !== TokenStateEnum.FINISHED,
      );
      let hasValidMove = false;
      for (const token of playerTokens) {
        try {
          BoardEngine.calculateNextProgress(token.progress, rolledValue);
          hasValidMove = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!hasValidMove) {
        const nextPlayerId = RuleEngine.calculateNextPlayer(playerId, state.players.map(p => p.playerId));
        events.push({
          ...this.generateEventBase(state.matchId, version++, GameEventType.TURN_CHANGE, playerId),
          payload: { nextPlayerId, reason: 'NO_VALID_MOVES' }
        });
      }
    }

    return events;
  }

  /**
   * Handles a move token command.
   */
  static handleMoveToken(state: MatchState, currentVersion: number, playerId: string, tokenId: string): GameEvent[] {
    if (state.currentPlayer !== playerId) throw new Error('Not your turn');
    
    const diceState = state.diceStates[playerId];
    if (!diceState || diceState.currentValue === null) throw new Error('You must roll first');

    const token = state.tokenStates.find(t => t.tokenId === tokenId);
    if (!token) throw new Error('Token not found');

    const moveRequest: MoveRequest = {
      playerId,
      tokenId,
      diceValue: diceState.currentValue,
      isThirdSix: false,
    };

    const destProgress = BoardEngine.calculateNextProgress(token.progress, moveRequest.diceValue);
    const actorColor = BoardEngine.resolvePlayerColor(state, playerId);
    const destGlobalPos = BoardEngine.getGlobalPosition(actorColor, destProgress);
    const isSafe = BoardEngine.isSafePosition(destGlobalPos);
    const destCellId = BoardEngine.getCellId(actorColor, destProgress);

    const playerColors: Record<string, PlayerId> = {};
    state.players.forEach(p => {
      playerColors[p.playerId] = BoardEngine.resolvePlayerColor(state, p.playerId);
    });

    const ruleResult = RuleEngine.evaluateMove(
      moveRequest,
      state.players.map(p => p.playerId),
      token,
      state.tokenStates,
      STANDARD_RULES,
      playerColors
    );

    if (!ruleResult.isValid) {
      throw new Error(ruleResult.reason || 'Invalid move');
    }

    const events: GameEvent[] = [];
    let version = currentVersion;

    if (token.progress === -1) {
      events.push({
        ...this.generateEventBase(state.matchId, version++, GameEventType.TOKEN_SPAWN, playerId),
        payload: { tokenId, spawnCellId: destCellId }
      });
    } else {
      events.push({
        ...this.generateEventBase(state.matchId, version++, GameEventType.TOKEN_MOVE, playerId),
        payload: { 
          tokenId, 
          fromProgress: token.progress, 
          toProgress: destProgress,
          stepsMoved: moveRequest.diceValue,
          destinationCellId: destCellId,
          isSafeCell: isSafe
        }
      });
      
      if (destProgress === 58) {
        events.push({
          ...this.generateEventBase(state.matchId, version++, GameEventType.TOKEN_FINISH, playerId),
          payload: { tokenId }
        });
      }
    }

    if (ruleResult.capture && ruleResult.capturedTokenId) {
      const capturedToken = state.tokenStates.find(t => t.tokenId === ruleResult.capturedTokenId);
      events.push({
        ...this.generateEventBase(state.matchId, version++, GameEventType.TOKEN_CAPTURE, playerId),
        payload: { capturedTokenId: ruleResult.capturedTokenId, capturedPlayerId: capturedToken?.playerId }
      });
    }

    if (ruleResult.winner) {
      events.push({
        ...this.generateEventBase(state.matchId, version++, GameEventType.PLAYER_WIN, playerId),
        payload: { rank: 1 }
      });
      if (ruleResult.gameOver) {
        events.push({
          ...this.generateEventBase(state.matchId, version++, GameEventType.MATCH_END, null),
          payload: { winner: ruleResult.winner }
        });
      }
    } else {
      if (ruleResult.extraTurn) {
        // BUG FIX #3: On extra turn (rolled 6 or captured), we do NOT emit
        // TURN_CHANGE. The GAME_STATE_ENGINE already cleared diceState.currentValue
        // to null after TOKEN_SPAWN / TOKEN_MOVE, so the same player can legally
        // call handleRollDice again. No additional event is needed here.
      } else if (ruleResult.nextPlayerId) {
        events.push({
          ...this.generateEventBase(state.matchId, version++, GameEventType.TURN_CHANGE, playerId),
          payload: { nextPlayerId: ruleResult.nextPlayerId, reason: 'NORMAL' }
        });
      }
    }

    return events;
  }
}
