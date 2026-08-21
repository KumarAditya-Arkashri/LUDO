import { MatchState } from './match.model';
import { MatchStatus } from './match.types';
import { MAX_PLAYERS } from './match.constants';

export class MatchValidator {
  static validateJoin(state: MatchState, playerId: string): void {
    if (state.status !== MatchStatus.WAITING) {
      throw new Error(`Cannot join match in status: ${state.status}`);
    }

    if (state.players.length >= MAX_PLAYERS) {
      throw new Error('Match is full.');
    }

    if (state.players.some((p) => p.playerId === playerId)) {
      throw new Error('Player is already in the match.');
    }
  }

  static validateStart(state: MatchState): void {
    if (state.status !== MatchStatus.READY) {
      throw new Error(`Cannot start match in status: ${state.status}`);
    }

    if (state.players.length !== MAX_PLAYERS) {
      throw new Error(`Cannot start match. Expected ${MAX_PLAYERS} players.`);
    }
  }

  static validatePause(state: MatchState, playerId: string): void {
    if (state.status !== MatchStatus.RUNNING) {
      throw new Error('Can only pause a running match.');
    }

    if (!state.players.some((p) => p.playerId === playerId)) {
      throw new Error('Player not found in match.');
    }
  }

  static validateResume(state: MatchState, playerId: string): void {
    if (state.status !== MatchStatus.PAUSED) {
      throw new Error('Match is not paused.');
    }

    if (!state.players.some((p) => p.playerId === playerId)) {
      throw new Error('Player not found in match.');
    }
  }

  static validateAction(state: MatchState, playerId: string): void {
    if (state.status !== MatchStatus.RUNNING) {
      throw new Error('Match is not running.');
    }

    if (state.currentPlayer !== playerId) {
      throw new Error('Not your turn.');
    }
  }
}
