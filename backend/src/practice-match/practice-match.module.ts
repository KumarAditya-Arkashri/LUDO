import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PracticeMatchGateway } from './practice-match.gateway';
import { PracticeMatchService } from './practice-match.service';

@Module({
  imports: [RedisModule, RealtimeModule],
  providers: [PracticeMatchService, PracticeMatchGateway],
  exports: [PracticeMatchService],
})
export class PracticeMatchModule {}
