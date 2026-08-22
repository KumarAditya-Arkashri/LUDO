import { PlayerId } from '../models/cell.model';
import {
  SAFE_CELL_INDICES,
  START_CELL_INDICES,
  TOTAL_MAIN_CELLS,
} from '../constants/board.constants';

import { MatchState } from '../match/match.model';

export class BoardEngine {
  /**
   * Resolves a raw playerId string to the logical PlayerId enum color based on index.
   */
  static resolvePlayerColor(state: MatchState, playerId: string): PlayerId {
    const idx = state.players.findIndex(p => p.playerId === playerId);
    if (idx === 0) return PlayerId.RED;
    if (idx === 1) return PlayerId.BLUE;
    if (idx === 2) return PlayerId.YELLOW;
    if (idx === 3) return PlayerId.GREEN;
    return PlayerId.RED;
  }
  /**
   * Returns the global position on the 0-51 track for a token given its progress.
   * Returns null if the token is in the yard (-1) or on the home straight (>= 52).
   */
  static getGlobalPosition(playerId: PlayerId, progress: number): number | null {
    if (progress < 0 || progress >= 52) {
      return null;
    }
    const start = START_CELL_INDICES[playerId];
    return (start + progress) % TOTAL_MAIN_CELLS;
  }

  /**
   * Returns the next progress value for a token.
   * Throws an error if the move exceeds the finish line.
   */
  static calculateNextProgress(currentProgress: number, diceValue: number): number {
    if (currentProgress === -1) {
      if (diceValue !== 6) {
        throw new Error('Token cannot enter board without a 6');
      }
      return 0; // Enters the board at progress 0
    }

    const nextProgress = currentProgress + diceValue;
    
    if (nextProgress > 58) {
      throw new Error('Move exceeds finish line');
    }

    return nextProgress;
  }

  /**
   * Checks if a global position is a safe cell.
   */
  static isSafePosition(globalPosition: number | null): boolean {
    if (globalPosition === null) return true; // Home path or yard is safe
    return SAFE_CELL_INDICES.includes(globalPosition);
  }

  /**
   * Calculates a string identifier for the cell (useful for frontend state serialization)
   */
  static getCellId(playerId: PlayerId, progress: number): string {
    if (progress === -1) return `${playerId}_YARD`;
    if (progress === 58) return `${playerId}_FINISH`;
    if (progress >= 52) return `${playerId}_HOME_${progress - 51}`;
    
    const globalPosition = this.getGlobalPosition(playerId, progress);
    return `MAIN_${globalPosition}`;
  }
}
