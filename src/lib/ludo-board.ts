/**
 * Board geometry for a 15x15 Ludo board, shared by the renderer.
 * The server owns all movement logic; these tables only map a token's
 * numeric progress to a grid cell so the client can draw it.
 */

export type Cell = { col: number; row: number };

/** 52-cell outer ring, index 0 = red's start cell. */
export const RING: Cell[] = [
  { col: 1, row: 6 },
  { col: 2, row: 6 },
  { col: 3, row: 6 },
  { col: 4, row: 6 },
  { col: 5, row: 6 },
  { col: 6, row: 5 },
  { col: 6, row: 4 },
  { col: 6, row: 3 },
  { col: 6, row: 2 },
  { col: 6, row: 1 },
  { col: 6, row: 0 },
  { col: 7, row: 0 },
  { col: 8, row: 0 },
  { col: 8, row: 1 },
  { col: 8, row: 2 },
  { col: 8, row: 3 },
  { col: 8, row: 4 },
  { col: 8, row: 5 },
  { col: 9, row: 6 },
  { col: 10, row: 6 },
  { col: 11, row: 6 },
  { col: 12, row: 6 },
  { col: 13, row: 6 },
  { col: 14, row: 6 },
  { col: 14, row: 7 },
  { col: 14, row: 8 },
  { col: 13, row: 8 },
  { col: 12, row: 8 },
  { col: 11, row: 8 },
  { col: 10, row: 8 },
  { col: 9, row: 8 },
  { col: 8, row: 9 },
  { col: 8, row: 10 },
  { col: 8, row: 11 },
  { col: 8, row: 12 },
  { col: 8, row: 13 },
  { col: 8, row: 14 },
  { col: 7, row: 14 },
  { col: 6, row: 14 },
  { col: 6, row: 13 },
  { col: 6, row: 12 },
  { col: 6, row: 11 },
  { col: 6, row: 10 },
  { col: 6, row: 9 },
  { col: 5, row: 8 },
  { col: 4, row: 8 },
  { col: 3, row: 8 },
  { col: 2, row: 8 },
  { col: 1, row: 8 },
  { col: 0, row: 8 },
  { col: 0, row: 7 },
  { col: 0, row: 6 },
];

export const RING_LENGTH = RING.length;
export const TRACK_STEPS = 51; // progress 0..50 travels the ring
export const HOME_COLUMN_STEPS = 5; // progress 51..55
export const HOME_PROGRESS = 56; // progress 56 = token home

export const START_INDEX: Record<"red" | "blue", number> = { red: 0, blue: 26 };

export const HOME_COLUMN: Record<"red" | "blue", Cell[]> = {
  red: [
    { col: 1, row: 7 },
    { col: 2, row: 7 },
    { col: 3, row: 7 },
    { col: 4, row: 7 },
    { col: 5, row: 7 },
  ],
  blue: [
    { col: 13, row: 7 },
    { col: 12, row: 7 },
    { col: 11, row: 7 },
    { col: 10, row: 7 },
    { col: 9, row: 7 },
  ],
};

export const YARD: Record<"red" | "blue", Cell[]> = {
  red: [
    { col: 1.6, row: 10.6 },
    { col: 3.4, row: 10.6 },
    { col: 1.6, row: 12.4 },
    { col: 3.4, row: 12.4 },
  ],
  blue: [
    { col: 10.6, row: 1.6 },
    { col: 12.4, row: 1.6 },
    { col: 10.6, row: 3.4 },
    { col: 12.4, row: 3.4 },
  ],
};

export const SAFE_RING_INDEXES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/** Maps a token's progress to a board cell. */
export function cellForProgress(color: "red" | "blue", progress: number): Cell {
  if (progress <= TRACK_STEPS - 1) {
    return RING[(START_INDEX[color] + progress) % RING_LENGTH] ?? { col: 7, row: 7 };
  }
  if (progress < HOME_PROGRESS) {
    return HOME_COLUMN[color][progress - TRACK_STEPS] ?? { col: 7, row: 7 };
  }

  return { col: 7, row: 7 };
}

export function isSafeProgress(color: "red" | "blue", progress: number) {
  if (progress >= TRACK_STEPS) return true;
  return SAFE_RING_INDEXES.has((START_INDEX[color] + progress) % RING_LENGTH);
}
