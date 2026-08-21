/** Shared domain types for Ludo Arena (frontend contract for the NestJS API). */

export type UserRole = "player" | "admin";

export interface User {
  id: string;
  mobile: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  referralCode: string;
  kycVerified: boolean;
  joinedAt: string;
}

export interface Wallets {
  main: number;
  winning: number;
  referral: number;
}

export type TxnType = "deposit" | "withdraw" | "entry_fee" | "win" | "referral_bonus" | "refund";
export type TxnStatus = "pending" | "approved" | "rejected" | "paid" | "failed";

export interface Transaction {
  id: string;
  type: TxnType;
  status: TxnStatus;
  amount: number;
  wallet: keyof Wallets;
  reference?: string;
  createdAt: string;
  note?: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  mobile: string;
  amount: number;
  utr: string;
  screenshotUrl?: string;
  status: TxnStatus;
  createdAt: string;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  userName: string;
  mobile: string;
  amount: number;
  upiId: string;
  utr?: string;
  status: TxnStatus;
  createdAt: string;
}

export type EntryFee = 50 | 100 | 200 | 500;

export interface MatchRecord {
  id: string;
  entryFee: EntryFee;
  opponentName: string;
  winnerName: string;
  isWin: boolean;
  amountWon: number;
  playedAt: string;
  status: "completed" | "live" | "cancelled";
}

export interface ReferralEntry {
  id: string;
  name: string;
  mobile: string;
  joinedAt: string;
  earned: number;
  status: "active" | "pending";
}

export type PlayerColor = "red" | "blue";
export type TokenState = "yard" | "track" | "home";

export interface Token {
  id: string;
  color: PlayerColor;
  position: number;
  state: TokenState;
}

export interface GamePlayer {
  id: string;
  name: string;
  color: PlayerColor;
  tokens: Token[];
  tokensHome: number;
}

export type GamePhase = "waiting" | "starting" | "playing" | "finished";

export interface GameState {
  roomId: string;
  entryFee: EntryFee;
  prizePool: number;
  isPractice?: boolean;
  phase: GamePhase;
  players: GamePlayer[];
  turnColor: PlayerColor;
  dice: number | null;
  rolling: boolean;
  turnSecondsLeft: number;
  winnerColor: PlayerColor | null;
  log: string[];
}
