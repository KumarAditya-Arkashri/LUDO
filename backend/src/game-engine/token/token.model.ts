import { TokenStateEnum } from './token.types';

export class TokenState {
  public readonly tokenId: string;
  public readonly playerId: string;
  public readonly state: TokenStateEnum;
  /**
   * Progress from player's start.
   * -1 = HOME
   * 0..51 = circular track
   * 52..57 = home lane
   * 58 = FINISHED
   */
  public readonly progress: number;

  constructor(
    tokenId: string,
    playerId: string,
    state: TokenStateEnum = TokenStateEnum.HOME,
    progress: number = -1,
  ) {
    this.tokenId = tokenId;
    this.playerId = playerId;
    this.state = state;
    this.progress = progress;

    // Enforce pure mathematical immutability
    Object.freeze(this);
  }
}
