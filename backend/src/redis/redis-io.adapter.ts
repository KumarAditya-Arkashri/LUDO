import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis, RedisOptions } from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(app: INestApplicationContext) {
    super(app);
    const configService = app.get(ConfigService);

    const host = configService.get<string>('REDIS_HOST', 'localhost');
    const port = configService.get<number>('REDIS_PORT', 6379);
    const password = configService.get<string>('REDIS_PASSWORD') || undefined;

    const redisOptions: RedisOptions = {
      host,
      port,
      ...(password ? { password } : {}),
      // Retry strategy: exponential back-off, give up after 10 retries
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error(
            `Redis pub/sub adapter: gave up after ${times} retries`,
          );
          return null; // stop retrying
        }
        const delay = Math.min(times * 100, 3000);
        this.logger.warn(
          `Redis pub/sub adapter: retry #${times}, reconnecting in ${delay}ms`,
        );
        return delay;
      },
    };

    const pubClient = new Redis(redisOptions);
    // sub client must be a separate connection from pub client
    const subClient = pubClient.duplicate();

    pubClient.on('connect', () =>
      this.logger.log('Redis pub client connected (Socket.IO adapter)'),
    );
    pubClient.on('error', (err) =>
      this.logger.error(`Redis pub client error: ${err.message}`),
    );
    subClient.on('connect', () =>
      this.logger.log('Redis sub client connected (Socket.IO adapter)'),
    );
    subClient.on('error', (err) =>
      this.logger.error(`Redis sub client error: ${err.message}`),
    );

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log(
      `RedisIoAdapter initialised — ${host}:${port} (multi-node scaling enabled)`,
    );
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
