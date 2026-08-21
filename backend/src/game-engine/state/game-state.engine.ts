import { GameState } from './game-state.model';
import { MatchState } from '../match/match.model';
import { GameEvent, GameEventType } from '../events/game-event.types';
import { DiceEngine } from '../dice/dice.engine';
import { DiceState } from '../dice/dice.model';
import { TokenState } from '../token/token.model';
import { TokenStateEnum } from '../token/token.types';
import { MatchStatus } from '../match/match.types';

export class GameStateEngine {
  /**
   * Initializes a brand new GameState from a fresh MatchState.
   */
  static initialize(matchState: MatchState): GameState {
    return new GameState(matchState, [], 0);
  }

  /**
   * Core Reducer: Applies a single GameEvent to the current GameState
   * to produce the next GameState.
   */
  static applyEvent(state: GameState, event: GameEvent): GameState {
    let newMatchState = state.matchState;
    const { payload, type, playerId } = event;

    switch (type) {
      case GameEventType.MATCH_START: {
        const diceStates: Record<string, DiceState> = {};
        const tokenStates: TokenState[] = [];
        
        for (const p of newMatchState.players) {
           diceStates[p.playerId] = DiceEngine.reset(p.playerId);
           for (let i = 0; i < 4; i++) { // Using 4 since TOKENS_PER_PLAYER might not be imported, let's check
             const tokenId = `tkn_${p.playerId}_${i}`; // Predictable token ID instead of crypto for ease, or use a short UUID
             tokenStates.push(new TokenState(tokenId, p.playerId, TokenStateEnum.HOME, -1));
           }
        }

        newMatchState = new MatchState(
          newMatchState.matchId,
          MatchStatus.RUNNING,
          newMatchState.players,
          payload?.starterId || newMatchState.currentPlayer,
          event.timestamp,
          null,
          null,
          1,
          diceStates,
          tokenStates,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.DICE_ROLL: {
        if (!playerId) break;
        const diceState = newMatchState.diceStates[playerId];
        const newDiceState = DiceEngine.roll(diceState, { generate: () => payload.diceValue });
        newMatchState = new MatchState(
          newMatchState.matchId,
          newMatchState.status,
          newMatchState.players,
          newMatchState.currentPlayer,
          newMatchState.startedAt,
          newMatchState.endedAt,
          newMatchState.winner,
          newMatchState.turnNumber,
          { ...newMatchState.diceStates, [playerId]: newDiceState },
          newMatchState.tokenStates,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.TOKEN_SPAWN: {
        const { tokenId } = payload;
        const newTokens = newMatchState.tokenStates.map(t => {
          if (t.tokenId === tokenId) {
            return new TokenState(t.tokenId, t.playerId, TokenStateEnum.ACTIVE, 0);
          }
          return t;
        });

        // Clear the dice value so the player can roll again if they get an extra turn
        const newDiceStates = { ...newMatchState.diceStates };
        if (playerId && newDiceStates[playerId]) {
           newDiceStates[playerId] = new DiceState(
             playerId,
             null,
             newDiceStates[playerId].previousValues,
             newDiceStates[playerId].consecutiveSixes,
             newDiceStates[playerId].rolledAt
           );
        }

        newMatchState = new MatchState(
          newMatchState.matchId,
          newMatchState.status,
          newMatchState.players,
          newMatchState.currentPlayer,
          newMatchState.startedAt,
          newMatchState.endedAt,
          newMatchState.winner,
          newMatchState.turnNumber,
          newDiceStates,
          newTokens,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.TOKEN_MOVE: {
        const { tokenId, toProgress } = payload;
        const newTokens = newMatchState.tokenStates.map(t => {
          if (t.tokenId === tokenId) {
            return new TokenState(t.tokenId, t.playerId, TokenStateEnum.ACTIVE, toProgress);
          }
          return t;
        });

        // Clear the dice value so the player can roll again if they get an extra turn
        const newDiceStates = { ...newMatchState.diceStates };
        if (playerId && newDiceStates[playerId]) {
           newDiceStates[playerId] = new DiceState(
             playerId,
             null,
             newDiceStates[playerId].previousValues,
             newDiceStates[playerId].consecutiveSixes,
             newDiceStates[playerId].rolledAt
           );
        }

        newMatchState = new MatchState(
          newMatchState.matchId,
          newMatchState.status,
          newMatchState.players,
          newMatchState.currentPlayer,
          newMatchState.startedAt,
          newMatchState.endedAt,
          newMatchState.winner,
          newMatchState.turnNumber,
          newDiceStates,
          newTokens,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.TOKEN_CAPTURE: {
        const { capturedTokenId } = payload;
        const newTokens = newMatchState.tokenStates.map(t => {
          if (t.tokenId === capturedTokenId) {
            return new TokenState(t.tokenId, t.playerId, TokenStateEnum.HOME, -1);
          }
          return t;
        });
        newMatchState = new MatchState(
          newMatchState.matchId,
          newMatchState.status,
          newMatchState.players,
          newMatchState.currentPlayer,
          newMatchState.startedAt,
          newMatchState.endedAt,
          newMatchState.winner,
          newMatchState.turnNumber,
          newMatchState.diceStates,
          newTokens,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.TOKEN_FINISH: {
        const { tokenId } = payload;
        const newTokens = newMatchState.tokenStates.map(t => {
          if (t.tokenId === tokenId) {
            return new TokenState(t.tokenId, t.playerId, TokenStateEnum.FINISHED, 58);
          }
          return t;
        });
        newMatchState = new MatchState(
          newMatchState.matchId,
          newMatchState.status,
          newMatchState.players,
          newMatchState.currentPlayer,
          newMatchState.startedAt,
          newMatchState.endedAt,
          newMatchState.winner,
          newMatchState.turnNumber,
          newMatchState.diceStates,
          newTokens,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.TURN_CHANGE: {
        const { nextPlayerId } = payload;
        
        // Reset dice for the current player when turn changes
        const currentPlayerId = newMatchState.currentPlayer;
        const newDiceStates = { ...newMatchState.diceStates };
        if (currentPlayerId && currentPlayerId !== nextPlayerId) {
           newDiceStates[currentPlayerId] = DiceEngine.reset(currentPlayerId);
        }

        newMatchState = new MatchState(
          newMatchState.matchId,
          newMatchState.status,
          newMatchState.players,
          nextPlayerId,
          newMatchState.startedAt,
          newMatchState.endedAt,
          newMatchState.winner,
          newMatchState.turnNumber + 1,
          newDiceStates,
          newMatchState.tokenStates,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.PLAYER_WIN:
      case GameEventType.MATCH_END: {
        newMatchState = new MatchState(
          newMatchState.matchId,
          MatchStatus.COMPLETED,
          newMatchState.players,
          newMatchState.currentPlayer,
          newMatchState.startedAt,
          event.timestamp,
          payload?.winner || newMatchState.winner,
          newMatchState.turnNumber,
          newMatchState.diceStates,
          newMatchState.tokenStates,
          newMatchState.metadata
        );
        break;
      }

      case GameEventType.MATCH_PAUSE:
      case GameEventType.MATCH_RESUME:
      case GameEventType.PLAYER_LEAVE:
        // Keep simple for now
        break;
    }

    return new GameState(
      newMatchState,
      [...state.history, event],
      event.version
    );
  }

  /**
   * Replays a history to recreate a state.
   */
  static replay(initialState: MatchState, history: GameEvent[]): GameState {
    let state = this.initialize(initialState);
    const sorted = [...history].sort((a, b) => a.version - b.version);

    for (const event of sorted) {
      state = this.applyEvent(state, event);
    }
    
    return state;
  }
}
