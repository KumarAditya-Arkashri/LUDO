import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Unit/e2e tests should not require a live PostgreSQL instance.
    // Prisma queries remain available for tests that explicitly mock the client.
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.$disconnect();
  }
}
