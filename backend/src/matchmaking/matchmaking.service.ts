import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletType, TransactionType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { GameStateEngine } from '../game-engine/state/game-state.engine';
import { RoomManager } from '../realtime/rooms/room.manager';
import { Server } from 'socket.io';
import { MatchEngine } from '../game-engine/match/match.engine';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface Battle {
  id: string; // The room code (e.g. LUDO-XXXX)
  creatorId: string;
  creatorName: string;
  entryFee: number;
  winningPrize: number;
  status: 'OPEN' | 'MATCH_INITIALIZING';
  matchId?: string;
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
    private readonly prisma: PrismaService,
    @InjectQueue('room-expiry') private readonly roomExpiryQueue: Queue,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
      return true;
    } catch (error) {
      this.logger.error(`Failed to deduct entry fee for ${userId}: ${error.message}`);
      throw new BadRequestException('Failed to process entry fee deduction');
    }
  }

  private async refundBalance(roomCode: string, description: string): Promise<boolean> {
    const deductions = await this.prisma.ledger.findMany({
      where: {
        transactionType: TransactionType.GAME_ENTRY,
        referenceId: { in: [`${roomCode}_MAIN`, `${roomCode}_WIN`] }
      }
    });

    if (deductions.length === 0) {
      this.logger.warn(`No deduction data found for refunding room ${roomCode}.`);
      return false;
    }

    const txs: any[] = [];
    
    for (const ded of deductions) {
      if (!ded.referenceId) continue;
      const walletType = ded.referenceId.endsWith('_MAIN') ? WalletType.MAIN : WalletType.WINNING;
      txs.push({
        userId: ded.userId,
        walletType,
        transactionType: TransactionType.REFUND,
        amount: Math.abs(Number(ded.amount)),
        referenceId: `REFUND_${ded.referenceId}`,
        description: `${description} (${walletType})`,
      });
    }

    if (txs.length > 0) {
      await this.walletService.transactMultiple(txs);
    }
    
    return true;
  }

  private async withLock<T>(lockId: string, fn: () => Promise<T>): Promise<T> {
    const lockKey = `lock:battle:${lockId}`;
    const token = randomUUID();
    
    const acquired = await this.redis.getClient().set(lockKey, token, 'EX', 30, 'NX');
    if (!acquired) {
      throw new BadRequestException('Room is currently being modified. Please try again.');
    }
    
    try {
      return await fn();
    } finally {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
      `;
      await this.redis.getClient().eval(script, 1, lockKey, token);
    }
  }

  async createPrivateBattle(creatorId: string, creatorName: string, entryFee: number): Promise<string> {
    if (entryFee < 10 || entryFee % 10 !== 0) {
        throw new BadRequestException('Invalid entry fee amount');
    }

    let roomCode = '';
    let isUnique = false;
    
    // Generate a unique room code
    for (let i = 0; i < 5; i++) {
      roomCode = this.generateRoomCode();
      const existing = await this.redis.getClient().hget('battles', roomCode);
      if (!existing) {
        isUnique = true;
        break;
      }
    }
    if (!isUnique) throw new BadRequestException('Failed to generate a unique room code. Try again.');

    await this.deductBalance(creatorId, entryFee, roomCode, `Entry fee deduction for ${entryFee} INR private room`);

    const battle: Battle = {
      id: roomCode,
      creatorId,
      creatorName,
      entryFee,
      winningPrize: Math.floor(entryFee * 1.9), // 10% platform fee
      status: 'OPEN',
      createdAt: Date.now(),
    };

    await this.redis.getClient().hset('battles', roomCode, JSON.stringify(battle));
    
    // Queue background expiry job for 30 minutes from now (configurable via env if needed)
    const expiryMs = parseInt(process.env.ROOM_EXPIRY_MS || '1800000', 10);
    await this.roomExpiryQueue.add('expire-room', { roomCode }, { delay: expiryMs, attempts: 3, backoff: { type: "fixed", delay: 2000 }, removeOnComplete: true });

    this.logger.log(`Private Room ${roomCode} created by ${creatorId} for ${entryFee}`);
    return roomCode;
  }

  async joinPrivateBattle(accepterId: string, accepterName: string, roomCode: string): Promise<string> {
    roomCode = roomCode.toUpperCase().trim();
    return this.withLock(roomCode, async () => {
      const battleData = await this.redis.getClient().hget('battles', roomCode);
      if (!battleData) throw new BadRequestException('Room code invalid or expired');
      
      const battle: Battle = JSON.parse(battleData);
      if (battle.creatorId === accepterId) throw new BadRequestException('Cannot join your own room');
      if (battle.status !== 'OPEN') throw new BadRequestException('Room is no longer open');

      // 1. Deduct joining player's balance first.
      await this.deductBalance(accepterId, battle.entryFee, roomCode, `Entry fee deduction for joining ${battle.entryFee} INR private room`);

      // 2. Try to initialize the match. If it fails, refund the joining player immediately.
      try {
        const matchId = randomUUID();
        
        // Write MATCH_INITIALIZING to Redis
        battle.status = 'MATCH_INITIALIZING';
        battle.matchId = matchId;
        await this.redis.getClient().hset('battles', roomCode, JSON.stringify(battle));
        
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
                playerId: accepterId,
                displayName: accepterName || 'Player 2',
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

        // Persist active match state
        await this.roomManager.createRoom(matchId, stateWithMeta);

        // Remove battle from waiting list
        await this.redis.getClient().hdel('battles', roomCode);
        
        // No explicit financial cleanup needed since we query Ledger dynamically and hdel the battle

        // Notify users
        if (this.server) {
          this.server.to(`user:${battle.creatorId}`).emit('MATCH_FOUND', { matchId, entryFee: battle.entryFee });
          this.server.to(`user:${accepterId}`).emit('MATCH_FOUND', { matchId, entryFee: battle.entryFee });
        }

        this.logger.log(`Room ${roomCode} successfully started as Match ${matchId}`);
        return matchId;

      } catch (error) {
        // Critical recovery: If room creation failed after deduction, refund ALL users who paid for this room (creator and joiner).
        this.logger.error(`Failed to initialize match for room ${roomCode}. Triggering full refund. Error: ${error.message}`);
        await this.refundBalance(roomCode, `Auto-refund for failed match start in room ${roomCode}`);
        // Remove the room since it's broken
        await this.redis.getClient().hdel('battles', roomCode);
        throw new BadRequestException('Failed to start the match. Please try again.');
      }
    });
  }

  async cancelPrivateBattle(userId: string, roomCode: string): Promise<boolean> {
    roomCode = roomCode.toUpperCase().trim();
    return this.withLock(roomCode, async () => {
      const battleData = await this.redis.getClient().hget('battles', roomCode);
      if (!battleData) throw new BadRequestException('Room not found or already started');
      
      const battle: Battle = JSON.parse(battleData);
      if (battle.creatorId !== userId) throw new BadRequestException('Only the creator can cancel this room');
      if (battle.status !== 'OPEN') throw new BadRequestException('Cannot cancel room that is no longer open');

      await this.refundBalance(roomCode, `Refund for cancelled room ${roomCode}`);
      await this.redis.getClient().hdel('battles', roomCode);
      
      this.logger.log(`Room ${roomCode} cancelled by ${userId}`);
      return true;
    });
  }

  async expireBattle(roomCode: string): Promise<boolean> {
    return this.withLock(roomCode, async () => {
      const battleData = await this.redis.getClient().hget('battles', roomCode);
      if (!battleData) {
        // Already started or manually cancelled. Safely ignore.
        return true;
      }
      
      const battle: Battle = JSON.parse(battleData);
      if (battle.status === 'OPEN') {
        this.logger.log(`Room ${roomCode} expired in OPEN state. Initiating refund for users.`);
        await this.refundBalance(roomCode, `Refund for expired room ${roomCode}`);
        await this.redis.getClient().hdel('battles', roomCode);
        
        // Optionally emit to creator that room expired
        if (this.server) {
          this.server.to(`user:${battle.creatorId}`).emit('PRIVATE_BATTLE_EXPIRED', { roomCode });
        }
      } else if (battle.status === 'MATCH_INITIALIZING' && battle.matchId) {
        // Recovery scenario: Crash happened during initialization
        const matchState = await this.roomManager.getGameState(battle.matchId);
        if (matchState) {
          this.logger.log(`Room ${roomCode} recovered. Match ${battle.matchId} was successfully initialized. Cleaning up battles hash without refund.`);
          await this.redis.getClient().hdel('battles', roomCode);
        } else {
          this.logger.log(`Room ${roomCode} failed initialization. Match ${battle.matchId} not found. Triggering full refund.`);
          await this.refundBalance(roomCode, `Auto-refund for failed match start in room ${roomCode}`);
          await this.redis.getClient().hdel('battles', roomCode);
        }
      }
      return true;
    });
  }
}
