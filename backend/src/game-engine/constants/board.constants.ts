import { PlayerId } from '../models/cell.model';

export const TOTAL_MAIN_CELLS = 52;

// The 8 standard safe stars on a Ludo board.
export const SAFE_CELL_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Standard Ludo starts
export const START_CELL_INDICES: Record<PlayerId, number> = {
  [PlayerId.RED]: 0,
  [PlayerId.GREEN]: 13,
  [PlayerId.YELLOW]: 26,
  [PlayerId.BLUE]: 39,
};

export const HOME_CELL_COUNT = 5;

// Generate logical coordinates for the main board
export function getLogicalCoordinateForMainCell(index: number) {
  return { x: index % 15, y: Math.floor(index / 15) };
}

export function getLogicalCoordinateForHomeCell(
  playerId: PlayerId,
  index: number,
) {
  return { x: 7, y: index };
}

export function getLogicalCoordinateForFinish(playerId: PlayerId) {
  return { x: 7, y: 7 }; // Center of the board
}

