import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { validateEnv } from './config/env.config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AuditModule } from './audit/audit.module';
import { WalletModule } from './wallet/wallet.module';
import { AdminModule } from './admin/admin.module';
import { ReferralModule } from './referral/referral.module';
import { DepositModule } from './deposit/deposit.module';
import { WithdrawalModule } from './withdrawal/withdrawal.module';
import { RedisModule } from './redis/redis.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { SettlementModule } from './settlement/settlement.module';
import { BullModule } from '@nestjs/bullmq';
import { PracticeMatchModule } from './practice-match/practice-match.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: new (require('ioredis'))(
          configService.get('REDIS_URL', 'redis://localhost:6379'),
          { maxRetriesPerRequest: null }
        ),
      }),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    AuditModule,
    WalletModule,
    AdminModule,
    ReferralModule,
    DepositModule,
    WithdrawalModule,
    RedisModule,
    RealtimeModule,
    MatchmakingModule,
    SettlementModule,
    PracticeMatchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
