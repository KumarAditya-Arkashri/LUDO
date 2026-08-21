import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { RedisService } from '../redis/redis.service';
import { RoomManager } from '../realtime/rooms/room.manager';
import { MatchEngine } from '../game-engine/match/match.engine';
import { GameStateEngine } from '../game-engine/state/game-state.engine';

export type PracticeBattleStatus = 'OPEN' | 'JOINED' | 'CODE_PENDING' | 'STARTED';

export interface PracticeBattle {
  id: string;
  creatorId: string;
  creatorName: string;
  opponentId?: string;
  opponentName?: string;
  status: PracticeBattleStatus;
  createdAt: number;
}

interface PracticeBattleRecord extends PracticeBattle {
  roomCode?: string;
  codeExpiresAt?: number;
}

const BATTLE_TTL_SECONDS = 30 * 60;
const CODE_TTL_SECONDS = 5 * 60;

@Injectable()
export class PracticeMatchService {
  private readonly logger = new Logger(PracticeMatchService.name);
  private readonly prefix = 'practice:battle:';
  private readonly codePrefix = 'practice:code:';

  constructor(
    private readonly redis: RedisService,
    private readonly roomManager: RoomManager,
  ) {}

  async listOpen(): Promise<PracticeBattle[]> {
    const keys = await this.redis.getClient().keys(`${this.prefix}*`);
    if (!keys.length) return [];

    const values = await this.redis.getClient().mget(keys);
    return values
      .filter((value): value is string => Boolean(value))
      .map((value) => JSON.parse(value) as PracticeBattleRecord)
      .filter((battle) => battle.status === 'OPEN' || battle.status === 'JOINED')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ roomCode: _roomCode, codeExpiresAt: _expires, ...battle }) => battle);
  }

  async create(creatorId: string, creatorName: string): Promise<PracticeBattle> {
    const battle: PracticeBattleRecord = {
      id: randomUUID(),
      creatorId,
      creatorName: creatorName || 'Player 1',
      status: 'OPEN',
      createdAt: Date.now(),
    };

    await this.save(battle);
    return battle;
  }

  async join(userId: string, userName: string, battleId: string): Promise<PracticeBattle> {
    const battle = await this.getBattle(battleId);
    if (battle.status !== 'OPEN') {
      throw new BadRequestException('Practice battle is no longer open');
    }
    if (battle.creatorId === userId) {
      throw new BadRequestException('You cannot join your own practice battle');
    }

    battle.opponentId = userId;
    battle.opponentName = userName || 'Player 2';
    battle.status = 'JOINED';
    await this.save(battle);
    return battle;
  }

  async getForNotification(battleId: string, allowStarted = false): Promise<PracticeBattleRecord> {
    const battle = await this.getBattle(battleId);
    if (!allowStarted && battle.status === 'STARTED') {
      throw new BadRequestException('Practice battle is already started');
    }
    return battle;
  }

  async leave(userId: string, battleId: string): Promise<void> {
    const battle = await this.getBattle(battleId);
    if (battle.creatorId !== userId && battle.opponentId !== userId) {
      throw new BadRequestException('You are not part of this practice battle');
    }

    await this.redis.getClient().del(`${this.prefix}${battleId}`);
    if (battle.roomCode) {
      await this.redis.getClient().del(`${this.codePrefix}${battle.roomCode}`);
    }
  }

  async start(creatorId: string, battleId: string): Promise<{ battleId: string; roomCode: string; expiresAt: number }> {
    const battle = await this.getBattle(battleId);
    if (battle.creatorId !== creatorId) {
      throw new BadRequestException('Only Player 1 can start this practice battle');
    }
    if (battle.status !== 'JOINED' || !battle.opponentId) {
      throw new BadRequestException('Player 2 must join before Player 1 can start');
    }

    const roomCode = await this.generateUniqueCode();
    const expiresAt = Date.now() + CODE_TTL_SECONDS * 1000;

    battle.status = 'CODE_PENDING';
    battle.roomCode = roomCode;
    battle.codeExpiresAt = expiresAt;
    await this.save(battle, CODE_TTL_SECONDS);
    await this.redis.getClient().set(`${this.codePrefix}${roomCode}`, battleId, 'EX', CODE_TTL_SECONDS);

    return { battleId, roomCode, expiresAt };
  }

  async verifyCode(userId: string, battleId: string, code: string): Promise<{ matchId: string; battleId: string }> {
    const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
    if (normalizedCode.length !== 6) {
      throw new BadRequestException('Room code must contain 6 digits');
    }

    const battle = await this.getBattle(battleId);
    if (battle.status !== 'CODE_PENDING' || !battle.opponentId) {
      throw new BadRequestException('This practice battle is not waiting for a room code');
    }
    if (battle.opponentId !== userId) {
      throw new BadRequestException('Only Player 2 can verify this room code');
    }
    if (!battle.codeExpiresAt || battle.codeExpiresAt < Date.now()) {
      throw new BadRequestException('Room code has expired');
    }
    if (battle.roomCode !== normalizedCode) {
      throw new BadRequestException('Invalid room code');
    }

    const mappedBattleId = await this.redis.getClient().get(`${this.codePrefix}${normalizedCode}`);
    if (mappedBattleId !== battleId) {
      throw new BadRequestException('Invalid room code');
    }

    const matchId = randomUUID();
    const players = [
      {
        playerId: battle.creatorId,
        displayName: battle.creatorName,
        connectionState: 'CONNECTED' as any,
        hasLeft: false,
        joinedAt: new Date(),
        disconnectedAt: null,
      },
      {
        playerId: battle.opponentId,
        displayName: battle.opponentName || 'Player 2',
        connectionState: 'CONNECTED' as any,
        hasLeft: false,
        joinedAt: new Date(),
        disconnectedAt: null,
      },
    ];

    let matchState = MatchEngine.createMatch(matchId, players[0], { practice: true });
    matchState = MatchEngine.joinMatch(matchState, players[1]);
    
    let gameState = GameStateEngine.initialize(matchState);
    const startEvents = MatchEngine.startMatch(gameState.matchState, gameState.version);
    gameState = startEvents.reduce((state, ev) => GameStateEngine.applyEvent(state, ev), gameState);

    await this.roomManager.createRoom(matchId, gameState);

    await this.redis.getClient().del(`${this.prefix}${battleId}`);
    await this.redis.getClient().del(`${this.codePrefix}${normalizedCode}`);

    this.logger.log(`Practice battle ${battleId} verified; match ${matchId} created`);
    return { matchId, battleId };
  }

  private async getBattle(battleId: string): Promise<PracticeBattleRecord> {
    const value = await this.redis.getClient().get(`${this.prefix}${battleId}`);
    if (!value) throw new BadRequestException('Practice battle not found or expired');
    return JSON.parse(value) as PracticeBattleRecord;
  }

  private async save(battle: PracticeBattleRecord, ttl = BATTLE_TTL_SECONDS) {
    await this.redis.getClient().set(`${this.prefix}${battle.id}`, JSON.stringify(battle), 'EX', ttl);
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = String(randomInt(100000, 1000000));
      const exists = await this.redis.getClient().exists(`${this.codePrefix}${code}`);
      if (!exists) return code;
    }
    throw new BadRequestException('Unable to allocate a room code. Please retry.');
  }
}
