export enum PlayerId {
  RED = 'RED',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  BLUE = 'BLUE',
}

export enum CellType {
  MAIN = 'MAIN',
  HOME = 'HOME',
  START = 'START',
  FINISH = 'FINISH',
}

export interface Coordinate {
  x: number;
  y: number;
}

export class Cell {
  public readonly id: string;
  public readonly index: number;
  public readonly type: CellType;
  public readonly coordinate: Coordinate;
  public readonly owner: PlayerId | null;
  public readonly isSafe: boolean;
  public readonly isHome: boolean;
  public readonly isStart: boolean;

  constructor(
    id: string,
    index: number,
    type: CellType,
    coordinate: Coordinate,
    owner: PlayerId | null = null,
    isSafe: boolean = false,
    isHome: boolean = false,
    isStart: boolean = false,
  ) {
    this.id = id;
    this.index = index;
    this.type = type;
    this.coordinate = coordinate;
    this.owner = owner;
    this.isSafe = isSafe;
    this.isHome = isHome;
    this.isStart = isStart;
  }
}
