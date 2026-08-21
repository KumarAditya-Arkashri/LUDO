import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  onModuleInit() {
    // Optionally log connection status
  }

  onModuleDestroy() {
    this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async pushToQueue(queueName: string, value: string): Promise<void> {
    await this.client.rpush(queueName, value);
  }

  async popPlayersAtomically(
    queueName: string,
    count: number,
  ): Promise<string[]> {
    const luaScript = `
      local len = redis.call('LLEN', KEYS[1])
      if len >= tonumber(ARGV[1]) then
        local players = {}
        for i=1, tonumber(ARGV[1]) do
          table.insert(players, redis.call('LPOP', KEYS[1]))
        end
        return players
      end
      return nil
    `;
    const results = await this.client.eval(luaScript, 1, queueName, count);
    if (!results) return [];
    return Array.isArray(results) ? (results as string[]) : [results as string];
  }

  async removeFromQueue(queueName: string, value: string): Promise<number> {
    return this.client.lrem(queueName, 0, value);
  }

  async getQueueLength(queueName: string): Promise<number> {
    return this.client.llen(queueName);
  }
}
