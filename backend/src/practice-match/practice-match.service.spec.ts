import { BadRequestException } from '@nestjs/common';
import { PracticeMatchService } from './practice-match.service';

class FakeRedisClient {
  private readonly values = new Map<string, string>();

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace('*', '');
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return keys.map((key) => this.values.get(key) ?? null);
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.values.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.values.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.values.has(key) ? 1 : 0;
  }
}

describe('PracticeMatchService', () => {
  let redisClient: FakeRedisClient;
  let service: PracticeMatchService;
  let roomManager: { createRoom: jest.Mock };

  beforeEach(() => {
    redisClient = new FakeRedisClient();
    roomManager = { createRoom: jest.fn().mockResolvedValue(undefined) };
    const redis = { getClient: () => redisClient } as any;
    service = new PracticeMatchService(redis, roomManager as any);
  });

  it('creates an OPEN battle and exposes it in the lobby', async () => {
    const battle = await service.create('p1', 'Player 1');

    expect(battle.status).toBe('OPEN');
    expect(battle.creatorId).toBe('p1');
    expect(await service.listOpen()).toEqual([battle]);
  });

  it('allows a second player to join but rejects the creator', async () => {
    const battle = await service.create('p1', 'Player 1');

    await expect(service.join('p1', 'Player 1', battle.id)).rejects.toThrow(
      'You cannot join your own practice battle',
    );

    const joined = await service.join('p2', 'Player 2', battle.id);
    expect(joined.status).toBe('JOINED');
    expect(joined.opponentId).toBe('p2');
    expect(joined.opponentName).toBe('Player 2');
  });

  it('only allows Player 1 to start after Player 2 joins', async () => {
    const battle = await service.create('p1', 'Player 1');

    await expect(service.start('p1', battle.id)).rejects.toThrow(
      'Player 2 must join before Player 1 can start',
    );

    await service.join('p2', 'Player 2', battle.id);

    const started = await service.start('p1', battle.id);
    expect(started.battleId).toBe(battle.id);
    expect(started.roomCode).toMatch(/^\d{6}$/);
    expect(started.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejects invalid room codes and accepts the valid code exactly once', async () => {
    const battle = await service.create('p1', 'Player 1');
    await service.join('p2', 'Player 2', battle.id);
    const started = await service.start('p1', battle.id);

    await expect(
      service.verifyCode('p2', battle.id, '000000'),
    ).rejects.toThrow('Invalid room code');

    const result = await service.verifyCode('p2', battle.id, started.roomCode);

    expect(result.battleId).toBe(battle.id);
    expect(result.matchId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(roomManager.createRoom).toHaveBeenCalledTimes(1);

    await expect(
      service.verifyCode('p2', battle.id, started.roomCode),
    ).rejects.toThrow('Practice battle not found or expired');
  });

  it('does not let Player 1 verify the room code', async () => {
    const battle = await service.create('p1', 'Player 1');
    await service.join('p2', 'Player 2', battle.id);
    const started = await service.start('p1', battle.id);

    await expect(
      service.verifyCode('p1', battle.id, started.roomCode),
    ).rejects.toThrow('Only Player 2 can verify this room code');
  });

  it('rejects malformed room codes before touching match state', async () => {
    const battle = await service.create('p1', 'Player 1');

    await expect(
      service.verifyCode('p2', battle.id, '12ab'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(roomManager.createRoom).not.toHaveBeenCalled();
  });
});
