import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';

@Processor('room-expiry')
export class RoomExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(RoomExpiryProcessor.name);

  constructor(private readonly matchmakingService: MatchmakingService) {
    super();
  }

  async process(job: Job<{ roomCode: string }>): Promise<any> {
    const { roomCode } = job.data;
    this.logger.log(`Processing room expiry for roomCode: ${roomCode}`);
    
    try {
      await this.matchmakingService.expireBattle(roomCode);
      this.logger.log(`Successfully processed room expiry for ${roomCode}`);
    } catch (error) {
      this.logger.error(`Failed to process room expiry for ${roomCode}: ${error.message}`);
      throw error; // Will be handled by BullMQ retry mechanisms if configured
    }
  }
}
