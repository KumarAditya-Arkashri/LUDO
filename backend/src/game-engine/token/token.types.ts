export enum TokenStateEnum {
  HOME = 'HOME',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
}

export interface SerializedTokenState {
  tokenId: string;
  playerId: string;
  state: string;
  progress: number;
}
