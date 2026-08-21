import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { WalletType, TransactionType } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { GameState } from '../game-engine/state/game-state.model';
import { RoomManager } from '../realtime/rooms/room.manager';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private readonly HOUSE_COMMISSION_PERCENT = 5;

  constructor(
    private readonly walletService: WalletService,
    private readonly redis: RedisService,
    private readonly roomManager: RoomManager,
  ) {}

  async settleMatch(matchId: string, state: GameState) {
    const lockKey = `lock:settlement:${matchId}`;

    const acquired = await this.redis
      .getClient()
      .set(lockKey, 'locked', 'EX', 10, 'NX');
    if (!acquired) {
      this.logger.warn(`Settlement for match ${matchId} is already in progress.`);
      return;
    }

    try {
      const winnerId = state.matchState.winner;
      if (!winnerId) {
        throw new BadRequestException(`Cannot settle match ${matchId} without a winner`);
      }

      const settledKey = `settled:${matchId}`;
      const alreadySettled = await this.redis.get(settledKey);
      if (alreadySettled) {
        this.logger.log(`Match ${matchId} has already been settled.`);
        return;
      }

      // Practice matches never touch wallets, payouts, or monetary settlement.
      if (state.matchState.metadata?.practice === true) {
        await this.roomManager.closeRoom(matchId);
        await this.redis.set(settledKey, 'practice');
        this.logger.log(`Practice match ${matchId} closed without monetary settlement.`);
        return;
      }

      const entryFee = state.matchState.metadata?.entryFee;
      if (!entryFee) {
        this.logger.error(`Match ${matchId} metadata is missing entryFee. Cannot settle.`);
        await this.redis.set(settledKey, 'failed');
        return;
      }

      const numPlayers = state.matchState.players.length;
      const totalPot = entryFee * numPlayers;
      const houseCommission = (totalPot * this.HOUSE_COMMISSION_PERCENT) / 100;
      const winnerPayout = totalPot - houseCommission;

      this.logger.log(
        `Settling match ${matchId}. Pot: ${totalPot}, Winner: ${winnerPayout}, Commission: ${houseCommission}`,
      );

      const refId = `MATCH_WIN_${matchId}_${winnerId}`;
      await this.walletService.transact(
        winnerId,
        WalletType.WINNING,
        TransactionType.GAME_WIN,
        winnerPayout,
        refId,
        `Winnings from match ${matchId} (Pot: ${totalPot}, House: ${houseCommission})`,
      );

      await this.roomManager.closeRoom(matchId);
      await this.redis.set(settledKey, 'success');
      this.logger.log(`Match ${matchId} successfully settled.`);
    } catch (error) {
      this.logger.error(`Error settling match ${matchId}: ${error.message}`);
      throw error;
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
