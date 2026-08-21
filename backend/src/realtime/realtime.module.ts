import { Module, forwardRef } from '@nestjs/common';
import { GameGateway } from './gateway/game.gateway';
import { RoomManager } from './rooms/room.manager';
import { SettlementModule } from '../settlement/settlement.module';
import { RedisModule } from '../redis/redis.module';
import { TurnTimeoutService } from '../game-engine/timeout/turn-timeout.service';

import { BullModule } from '@nestjs/bullmq';
import { RoomTimeoutProcessor } from './rooms/room-timeout.processor';

@Module({
  imports: [
    forwardRef(() => SettlementModule),
    RedisModule,
    BullModule.registerQueue({
      name: 'match_timeout',
    }),
  ],
  providers: [GameGateway, RoomManager, RoomTimeoutProcessor, TurnTimeoutService],
  exports: [GameGateway, RoomManager, TurnTimeoutService],
})
export class RealtimeModule {}
