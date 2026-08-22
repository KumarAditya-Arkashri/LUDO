import { Injectable, Logger } from '@nestjs/common';
import { GameState } from '../../game-engine/state/game-state.model';
import { PlayerConnection } from './room.types';
import { GameStateEngine } from '../../game-engine/state/game-state.engine';
import { RedisService } from '../../redis/redis.service';
import { GameStateSerializer } from '../../game-engine/state/game-state.serializer';
import { MatchEngine } from '../../game-engine/match/match.engine';
import { GameEventType } from '../../game-engine/events/game-event.types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RoomManager {
  private readonly logger = new Logger(RoomManager.name);
  private readonly socketMap = new Map<string, PlayerConnection>();

  private readonly RECONNECT_TIMEOUT_MS = 60000;
  private readonly REDIS_PREFIX = 'gamestate:';
  private shuttingDown = false;
  private readonly pendingOperations = new Set<Promise<any>>();
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly redis: RedisService,
    @InjectQueue('match_timeout') private readonly matchTimeoutQueue: Queue
  ) {}

  async createRoom(matchId: string, initialState: GameState) {
    if (this.shuttingDown) return;
    const serialized = GameStateSerializer.snapshot(initialState);
    await this.redis.set(`${this.REDIS_PREFIX}${matchId}`, serialized);
    this.logger.log(`Room created in Redis: ${matchId}`);
  }

  async getGameState(matchId: string): Promise<GameState | null> {
    if (this.shuttingDown) return null;
    const stateStr = await this.redis.get(`${this.REDIS_PREFIX}${matchId}`);
    if (!stateStr) return null;
    try {
      return GameStateSerializer.restore(stateStr);
    } catch (e) {
      this.logger.error(`Failed to restore GameState for ${matchId}`, e.stack);
      return null;
    }
  }

  async updateGameState(
    matchId: string,
    newState: GameState,
    expectedVersion?: number,
  ) {
    if (this.shuttingDown) return;
    const serialized = GameStateSerializer.snapshot(newState);
    if (expectedVersion !== undefined) {
      const luaScript = `
        local current = redis.call('GET', KEYS[1])
        if current then
          local state = cjson.decode(current)
          if state.version ~= tonumber(ARGV[1]) then return 0 end
        end
        redis.call('SET', KEYS[1], ARGV[2])
        return 1
      `;
      const result = await this.redis.getClient().eval(
        luaScript,
        1,
        `${this.REDIS_PREFIX}${matchId}`,
        expectedVersion,
        serialized,
      );
      if (result === 0) throw new Error('StateConflictError: Version mismatch');
    } else {
      await this.redis.set(`${this.REDIS_PREFIX}${matchId}`, serialized);
    }
  }

  async joinRoom(socketId: string, matchId: string, playerId: string): Promise<boolean> {
    if (this.shuttingDown) return false;
    
    const lockKey = `lock:room:${matchId}`;
    let acquired: string | null = null;
    
    // Retry acquiring lock up to 5 times (1 second total wait) to handle simultaneous join requests
    for (let i = 0; i < 5; i++) {
      acquired = await this.redis.getClient().set(lockKey, 'locked', 'EX', 2, 'NX');
      if (acquired) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (!acquired) {
      this.logger.warn(`Could not acquire lock for room ${matchId} (Player ${playerId} join request)`);
      throw new Error(`StateConflictError: Version mismatch (could not acquire lock)`);
    }
    
    try {
      const state = await this.getGameState(matchId);
      if (!state) {
        this.logger.warn(`Room ${matchId} not found in Redis for join request by ${playerId}`);
        return false;
      }
      const isParticipant = state.matchState.players.some((p) => p.playerId === playerId);
      if (!isParticipant) {
        this.logger.warn(`Player ${playerId} is not a participant of match ${matchId}`);
        return false;
      }

      this.socketMap.set(socketId, { socketId, playerId, matchId, status: 'CONNECTED' });
      await this.redis.getClient().hset(`match_conns:${matchId}`, playerId, 'CONNECTED');

      const timerKey = `${matchId}_${playerId}`;
      
      if (this.matchTimeoutQueue) {
        await this.matchTimeoutQueue.remove(timerKey);
      }
      
      const resumedEvent = MatchEngine.generateEventBase(matchId, state.version, GameEventType.MATCH_RESUME, playerId);
      const resumedState = GameStateEngine.applyEvent(state, resumedEvent);
      await this.updateGameState(matchId, resumedState, state.version);
      this.logger.log(`Player ${playerId} reconnected to ${matchId}`);

      return true;
    } finally {
      await this.redis.getClient().del(lockKey);
    }
  }

  getExistingSocketIdForPlayer(matchId: string, playerId: string): string | null {
    for (const [sId, conn] of this.socketMap.entries()) {
      if (conn.matchId === matchId && conn.playerId === playerId) return sId;
    }
    return null;
  }

  removeSocketConnection(socketId: string): boolean {
    return this.socketMap.delete(socketId);
  }

  async leaveRoom(socketId: string, onAbandon?: (matchId: string, newState: GameState) => void) {
    if (this.shuttingDown) return;
    const operation = this.performLeaveRoom(socketId, onAbandon);
    this.pendingOperations.add(operation);
    try {
      return await operation;
    } finally {
      this.pendingOperations.delete(operation);
    }
  }

  async waitForPendingOperations(): Promise<void> {
    while (this.pendingOperations.size > 0) {
      await Promise.allSettled([...this.pendingOperations]);
    }
  }

  /** Stop new Redis-backed room work before Nest begins destroying providers. */
  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    for (const timer of this.disconnectTimers.values()) clearTimeout(timer);
    this.disconnectTimers.clear();
    this.socketMap.clear();
    await this.waitForPendingOperations();
  }

  private async performLeaveRoom(
    socketId: string,
    onAbandon?: (matchId: string, newState: GameState) => void
  ) {
    if (this.shuttingDown) return;
    const conn = this.socketMap.get(socketId);
    if (!conn) return;
    this.socketMap.delete(socketId);

    await this.redis.getClient().hset(`match_conns:${conn.matchId}`, conn.playerId, 'DISCONNECTED');
    const state = await this.getGameState(conn.matchId);
    if (state) {
      try {
        const pauseEvent = MatchEngine.generateEventBase(conn.matchId, state.version, GameEventType.MATCH_PAUSE, conn.playerId);
        const nextState = GameStateEngine.applyEvent(state, pauseEvent);
        await this.updateGameState(conn.matchId, nextState, state.version);
      } catch (e) {
        // Might fail if match is already ended or concurrently modified, ignore
      }

      this.logger.log(
        `Player ${conn.playerId} disconnected from ${conn.matchId}. Starting delayed job.`,
      );

      const timerKey = `${conn.matchId}_${conn.playerId}`;
      
      if (this.matchTimeoutQueue) {
        // Add a delayed job to BullMQ
        await this.matchTimeoutQueue.add(
          'match_timeout', 
          { matchId: conn.matchId, playerId: conn.playerId },
          { 
            jobId: timerKey, 
            delay: this.RECONNECT_TIMEOUT_MS,
            removeOnComplete: true,
          }
        );
      }
    }

    if (this.shuttingDown) return;
    this.logger.log(`Player ${conn.playerId} disconnected from ${conn.matchId}. Starting timer.`);
    const timerKey = `${conn.matchId}:${conn.playerId}`;
    const timer = setTimeout(async () => {
      if (this.shuttingDown) return;
      try {
        const connStatus = await this.redis.getClient().hget(`match_conns:${conn.matchId}`, conn.playerId);
        if (connStatus !== 'DISCONNECTED') return;
        let currentState = await this.getGameState(conn.matchId);
        if (!currentState || currentState.matchState.status === 'COMPLETED') return;
        try {
          const abandonEvent = MatchEngine.generateEventBase(conn.matchId, currentState.version, GameEventType.PLAYER_LEAVE, conn.playerId);
          currentState = GameStateEngine.applyEvent(currentState, abandonEvent);
          await this.updateGameState(conn.matchId, currentState, currentState.version - 1);
          onAbandon?.(conn.matchId, currentState);
        } catch (e) {
          this.logger.error(`Failed to abandon match ${conn.matchId}: ${e.message}`);
        }
      } catch (e) {
        if (!this.shuttingDown) {
          this.logger.debug(`Disconnect timer stopped for ${conn.matchId}/${conn.playerId}: ${e.message}`);
        }
      }
    }, this.RECONNECT_TIMEOUT_MS);
    this.disconnectTimers.set(timerKey, timer);
  }

  getPlayerConnection(socketId: string): PlayerConnection | null {
    return this.socketMap.get(socketId) || null;
  }

  async closeRoom(matchId: string) {
    // Remove from Redis (set expiry of 1 hour to keep it around briefly for debugging)
    const stateStr = await this.redis.get(`${this.REDIS_PREFIX}${matchId}`);
    if (stateStr) await this.redis.set(`${this.REDIS_PREFIX}${matchId}`, stateStr, 3600);
    for (const [sId, conn] of this.socketMap.entries()) {
      if (conn.matchId === matchId) this.socketMap.delete(sId);
    }
    this.logger.log(`Room ${matchId} closed`);
  }
}

