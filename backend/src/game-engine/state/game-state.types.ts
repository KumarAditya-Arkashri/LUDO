export enum ActionType {
  MATCH_START = 'MATCH_START',
  ROLL = 'ROLL',
  MOVE = 'MOVE',
  SPAWN = 'SPAWN',
  CAPTURE = 'CAPTURE',
  FINISH = 'FINISH',
  TURN_CHANGE = 'TURN_CHANGE',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  ABANDON = 'ABANDON',
  END = 'END',
}

export interface ActionHistoryEntry {
  readonly version: number;
  readonly action: ActionType;
  readonly playerId: string | null;
  readonly timestamp: Date;
  readonly payload: Record<string, any>;
}

export interface SerializedActionHistoryEntry {
  version: number;
  action: string;
  playerId: string | null;
  timestamp: string;
  payload: Record<string, any>;
}
