import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { RoomManager } from './room.manager';
import { MatchEngine } from '../../game-engine/match/match.engine';
import { GameEventType } from '../../game-engine/events/game-event.types';
import { GameStateEngine } from '../../game-engine/state/game-state.engine';
import { RedisService } from '../../redis/redis.service';
import { GameGateway } from '../gateway/game.gateway';
import { SettlementService } from '../../settlement/settlement.service';
import { OutgoingEvents as OE } from '../events/event.types';
import { StateCompressor } from '../serializer/state.compressor';

@Processor('match_timeout')
export class RoomTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(RoomTimeoutProcessor.name);

  constructor(
    private readonly roomManager: RoomManager,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gameGateway: GameGateway,
    @Inject(forwardRef(() => SettlementService))
    private readonly settlementService: SettlementService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { matchId, playerId } = job.data;
    
    this.logger.log(`Processing disconnect timeout for player ${playerId} in match ${matchId}`);

    const connStatus = await this.redis
      .getClient()
      .hget(`match_conns:${matchId}`, playerId);
      
    if (connStatus !== 'DISCONNECTED') {
      this.logger.log(
        `Job fired, but player ${playerId} is no longer DISCONNECTED in Redis. Skipping abandon.`,
      );
      return;
    }

    let currentState = await this.roomManager.getGameState(matchId);
    if (currentState) {
      if (currentState.matchState.status === 'COMPLETED') {
        this.logger.log(
          `Match ${matchId} already completed. Skipping abandon.`,
        );
        return;
      }
      try {
        const abandonEvent = MatchEngine.generateEventBase(matchId, currentState.version, GameEventType.PLAYER_LEAVE, playerId);
        currentState = GameStateEngine.applyEvent(currentState, abandonEvent);
        
        // Let's end the match and assign a winner (first other player)
        const otherPlayers = currentState.matchState.players.filter(p => p.playerId !== playerId);
        const winner = otherPlayers[0]?.playerId; 
        
        const endEvent = MatchEngine.generateEventBase(matchId, currentState.version, GameEventType.MATCH_END, null);
        endEvent.payload = { winner };
        currentState = GameStateEngine.applyEvent(currentState, endEvent);

        await this.roomManager.updateGameState(
          matchId,
          currentState,
        );
        
        this.logger.log(`Match ${matchId} abandoned due to timeout by ${playerId}`);
        
        const compressedState = StateCompressor.compress(currentState);
        this.gameGateway.server.to(matchId).emit(OE.MATCH_END, {
          matchId,
          winnerId: currentState.matchState.winner,
          compressedState,
        });

        if (currentState.matchState.winner) {
          await this.settlementService.settleMatch(matchId, currentState);
        }
        
      } catch (e) {
        this.logger.error(`Failed to abandon match ${matchId}: ${e.message}`);
      }
    }
  }
}
