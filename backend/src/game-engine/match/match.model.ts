import { MatchPlayer, MatchStatus } from './match.types';
import { DiceState } from '../dice/dice.model';
import { TokenState } from '../token/token.model';

export class MatchState {
  public readonly matchId: string;
  public readonly status: MatchStatus;
  public readonly players: MatchPlayer[];
  public readonly currentPlayer: string | null;
  public readonly startedAt: Date | null;
  public readonly endedAt: Date | null;
  public readonly winner: string | null;
  public readonly turnNumber: number;
  public readonly diceStates: Record<string, DiceState>; // Keyed by playerId
  public readonly tokenStates: TokenState[]; // Array of 8 tokens (4 per player)
  public readonly metadata: Record<string, any>;

  constructor(
    matchId: string,
    status: MatchStatus,
    players: MatchPlayer[],
    currentPlayer: string | null = null,
    startedAt: Date | null = null,
    endedAt: Date | null = null,
    winner: string | null = null,
    turnNumber: number = 0,
    diceStates: Record<string, DiceState> = {},
    tokenStates: TokenState[] = [],
    metadata: Record<string, any> = {},
  ) {
    this.matchId = matchId;
    this.status = status;
    // Deep clone players to preserve immutability
    this.players = players.map((p) => ({
      ...p,
      joinedAt: new Date(p.joinedAt),
      disconnectedAt: p.disconnectedAt
        ? new Date(p.disconnectedAt)
        : null,
    }));
    this.currentPlayer = currentPlayer;
    this.startedAt = startedAt ? new Date(startedAt) : null;
    this.endedAt = endedAt ? new Date(endedAt) : null;
    this.winner = winner;
    this.turnNumber = turnNumber;

    this.diceStates = { ...diceStates };
    this.tokenStates = [...tokenStates];
    this.metadata = { ...metadata };

    Object.freeze(this.players);
    Object.freeze(this.diceStates);
    Object.freeze(this.tokenStates);
    Object.freeze(this.metadata);
    Object.freeze(this);
  }
}
