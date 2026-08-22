import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { WalletModule } from '../wallet/wallet.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RoomExpiryProcessor } from './room-expiry.processor';

@Module({
  imports: [
    WalletModule,
    RealtimeModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'room-expiry',
    }),
  ],
  providers: [MatchmakingService, MatchmakingGateway, RoomExpiryProcessor],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
