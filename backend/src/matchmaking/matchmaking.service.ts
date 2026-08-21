import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletType, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { GameStateEngine } from '../game-engine/state/game-state.engine';
import { RoomManager } from '../realtime/rooms/room.manager';
import { Server } from 'socket.io';
import { OutgoingEvents } from '../realtime/events/event.types';
import { StateCompressor } from '../realtime/serializer/state.compressor';

import { MatchEngine } from '../game-engine/match/match.engine';

export interface Battle {
  id: string;
  creatorId: string;
  creatorName: string;
  entryFee: number;
  winningPrize: number;
  status: 'OPEN' | 'ACCEPTED';
  accepterId?: string;
  accepterName?: string;
  createdAt: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private server: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
    private readonly roomManager: RoomManager,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async getOpenBattles(): Promise<Battle[]> {
    const battles = await this.redis.getClient().hgetall('battles');
    return Object.values(battles).map(b => JSON.parse(b)).sort((a, b) => b.createdAt - a.createdAt);
  }

  private async deductBalance(userId: string, amount: number, refId: string, description: string): Promise<boolean> {
    const balances = await this.walletService.getBalance(userId);
    const mainBalance = balances[WalletType.MAIN].toNumber();
    const winningBalance = balances[WalletType.WINNING].toNumber();

    if (mainBalance + winningBalance < amount) {
      throw new BadRequestException('Insufficient balance to join this battle');
    }

    let remainingToDeduct = amount;
    try {
      const txs: any[] = [];
      let mainDeduction = 0;
      if (mainBalance > 0) {
        mainDeduction = Math.min(mainBalance, remainingToDeduct);
        txs.push({
          userId,
          walletType: WalletType.MAIN,
          transactionType: TransactionType.GAME_ENTRY,
          amount: -mainDeduction,
          referenceId: `${refId}_MAIN`,
          description: `${description} (Main)`,
        });
        remainingToDeduct -= mainDeduction;
      }

      if (remainingToDeduct > 0) {
        txs.push({
          userId,
          walletType: WalletType.WINNING,
          transactionType: TransactionType.GAME_ENTRY,
          amount: -remainingToDeduct,
          referenceId: `${refId}_WIN`,
          description: `${description} (Winning)`,
        });
      }

      await this.walletService.transactMultiple(txs);

      await this.redis.getClient().hset(`battle_tx:${refId}:${userId}`, {
        mainDeduction,
        winDeduction: remainingToDeduct > 0 ? remainingToDeduct : 0,
      });
      await this.redis.getClient().expire(`battle_tx:${refId}:${userId}`, 86400); // 1 day
      return true;
    } catch (error) {
      this.logger.error(`Failed to deduct entry fee for ${userId}: ${error.message}`);
      throw new BadRequestException('Failed to process entry fee deduction');
    }
  }

  private async refundBalance(userId: string, refId: string, description: string): Promise<boolean> {
    const txKey = `battle_tx:${refId}:${userId}`;
    const txData = await this.redis.getClient().hgetall(txKey);
    
    // If we can't find exact deduction, fallback to 0 (should not happen if flow is correct)
    if (!txData || Object.keys(txData).length === 0) {
        this.logger.error(`Could not find deduction data for refund: ${txKey}`);
        return false;
    }

    const mainDeduct = Number(txData.mainDeduction || 0);
    const winDeduct = Number(txData.winDeduction || 0);

    const txs: any[] = [];
    const refundRef = `REFUND_${refId}_${Date.now()}`;

    if (mainDeduct > 0) {
      txs.push({
        userId,
        walletType: WalletType.MAIN,
        transactionType: TransactionType.REFUND,
        amount: mainDeduct,
        referenceId: `${refundRef}_MAIN`,
        description: `${description} (Main)`,
      });
    }

    if (winDeduct > 0) {
      txs.push({
        userId,
        walletType: WalletType.WINNING,
        transactionType: TransactionType.REFUND,
        amount: winDeduct,
        referenceId: `${refundRef}_WIN`,
        description: `${description} (Winning)`,
      });
    }

    if (txs.length > 0) {
      await this.walletService.transactMultiple(txs);
    }
    await this.redis.getClient().del(txKey);
    return true;
  }

  private async withLock<T>(battleId: string, fn: () => Promise<T>): Promise<T> {
    const lockKey = `lock:battle:${battleId}`;
    const acquired = await this.redis.getClient().set(lockKey, 'locked', 'EX', 5, 'NX');
    if (!acquired) {
      throw new BadRequestException('Battle is currently being modified. Please try again.');
    }
    try {
      return await fn();
    } finally {
      await this.redis.getClient().del(lockKey);
    }
  }

  async createBattle(creatorId: string, creatorName: string, entryFee: number): Promise<Battle> {
    if (entryFee < 10 || entryFee % 10 !== 0) {
        // Just a basic check, we can enforce % 50 on frontend
        throw new BadRequestException('Invalid entry fee amount');
    }

    const battleId = uuidv4();
    await this.deductBalance(creatorId, entryFee, battleId, `Entry fee deduction for ${entryFee} INR battle creation`);

    const battle: Battle = {
      id: battleId,
      creatorId,
      creatorName,
      entryFee,
      winningPrize: Math.floor(entryFee * 1.9), // 10% platform fee
      status: 'OPEN',
      createdAt: Date.now(),
    };

    await this.redis.getClient().hset('battles', battleId, JSON.stringify(battle));
    this.logger.log(`Battle ${battleId} created by ${creatorId} for ${entryFee}`);
    return battle;
  }

  async cancelBattle(userId: string, battleId: string): Promise<boolean> {
    return this.withLock(battleId, async () => {
      const battleData = await this.redis.getClient().hget('battles', battleId);
      if (!battleData) throw new BadRequestException('Battle not found');
      
      const battle: Battle = JSON.parse(battleData);
      if (battle.creatorId !== userId) throw new BadRequestException('Only the creator can cancel this battle');
      if (battle.status !== 'OPEN') throw new BadRequestException('Cannot cancel battle that is already accepted or started');

      await this.refundBalance(userId, battleId, `Refund for cancelled battle ${battleId}`);
      await this.redis.getClient().hdel('battles', battleId);
      
      this.logger.log(`Battle ${battleId} cancelled by ${userId}`);
      return true;
    });
  }

  async acceptBattle(accepterId: string, accepterName: string, battleId: string): Promise<Battle> {
    return this.withLock(battleId, async () => {
      const battleData = await this.redis.getClient().hget('battles', battleId);
      if (!battleData) throw new BadRequestException('Battle not found');
      
      const battle: Battle = JSON.parse(battleData);
      if (battle.creatorId === accepterId) throw new BadRequestException('Cannot accept your own battle');
      if (battle.status !== 'OPEN') throw new BadRequestException('Battle is no longer open');

      await this.deductBalance(accepterId, battle.entryFee, battleId, `Entry fee deduction for accepting ${battle.entryFee} INR battle`);

      battle.status = 'ACCEPTED';
      battle.accepterId = accepterId;
      battle.accepterName = accepterName;

      await this.redis.getClient().hset('battles', battleId, JSON.stringify(battle));
      this.logger.log(`Battle ${battleId} accepted by ${accepterId}`);
      return battle;
    });
  }

  async rejectBattle(userId: string, battleId: string): Promise<Battle> {
    return this.withLock(battleId, async () => {
      const battleData = await this.redis.getClient().hget('battles', battleId);
      if (!battleData) throw new BadRequestException('Battle not found');
      
      const battle: Battle = JSON.parse(battleData);
      if (battle.creatorId !== userId) throw new BadRequestException('Only the creator can reject players in this battle');
      if (battle.status !== 'ACCEPTED' || !battle.accepterId) throw new BadRequestException('No player to reject');

      // Refund the accepter
      await this.refundBalance(battle.accepterId, battleId, `Refund for rejected battle ${battleId}`);

      // Reset battle
      battle.status = 'OPEN';
      const oldAccepter = battle.accepterId;
      delete battle.accepterId;
      delete battle.accepterName;

      await this.redis.getClient().hset('battles', battleId, JSON.stringify(battle));
      this.logger.log(`Battle ${battleId} accepter ${oldAccepter} rejected by ${userId}`);
      return battle;
    });
  }

  async startBattle(userId: string, battleId: string): Promise<string> {
    return this.withLock(battleId, async () => {
      const battleData = await this.redis.getClient().hget('battles', battleId);
      if (!battleData) throw new BadRequestException('Battle not found');
      
      const battle: Battle = JSON.parse(battleData);
      if (battle.creatorId !== userId) throw new BadRequestException('Only the creator can start this battle');
      if (battle.status !== 'ACCEPTED' || !battle.accepterId) throw new BadRequestException('Cannot start battle without an accepted opponent');

      // Create match
      const matchId = uuidv4();
      const playersInfo = [
          {
              playerId: battle.creatorId,
              displayName: battle.creatorName || 'Player 1',
              connectionState: 'CONNECTED' as any,
              hasLeft: false,
              joinedAt: new Date(),
              disconnectedAt: null,
          },
          {
              playerId: battle.accepterId,
              displayName: battle.accepterName || 'Player 2',
              connectionState: 'CONNECTED' as any,
              hasLeft: false,
              joinedAt: new Date(),
              disconnectedAt: null,
          }
      ];

      let matchState = MatchEngine.createMatch(matchId, playersInfo[0], { entryFee: battle.entryFee });
      matchState = MatchEngine.joinMatch(matchState, playersInfo[1]);
      let initialState = GameStateEngine.initialize(matchState);
      
      const startEvents = MatchEngine.startMatch(initialState.matchState, initialState.version);
      for (const event of startEvents) {
        initialState = GameStateEngine.applyEvent(initialState, event);
      }

      // Inject entry fee metadata so Settlement knows how much to payout
      const stateWithMeta = {
        ...initialState,
        matchState: {
          ...initialState.matchState,
          metadata: {
            ...initialState.matchState.metadata,
            entryFee: battle.entryFee,
          },
        },
      };

      // Store in Redis via RoomManager
      await this.roomManager.createRoom(matchId, stateWithMeta);

      // Remove battle from redis
      await this.redis.getClient().hdel('battles', battleId);
      
      // Clean up deduction records as they are now committed to the game
      await this.redis.getClient().del(`battle_tx:${battleId}:${battle.creatorId}`);
      await this.redis.getClient().del(`battle_tx:${battleId}:${battle.accepterId}`);

      // Notify users
      if (this.server) {
        this.server.to(`user:${battle.creatorId}`).emit('MATCH_FOUND', { matchId, entryFee: battle.entryFee });
        this.server.to(`user:${battle.accepterId}`).emit('MATCH_FOUND', { matchId, entryFee: battle.entryFee });
      }

      this.logger.log(`Battle ${battleId} started as Match ${matchId}`);
      return matchId;
    });
  }
}

