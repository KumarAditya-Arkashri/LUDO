import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { WSAuthMiddleware } from '../realtime/middleware/ws-auth.middleware';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/matchmaking',
})
export class MatchmakingGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchmakingGateway.name);

  constructor(private readonly matchmakingService: MatchmakingService) {}

  afterInit(server: Server) {
    server.use(WSAuthMiddleware());
    this.matchmakingService.setServer(server);
    this.logger.log('MatchmakingGateway initialized');
  }

  async handleConnection(client: Socket) {
    const user = (client as any).user;
    if (user && user.sub) {
      client.join(`user:${user.sub}`);
      client.join('lobby'); // Join global lobby room
      this.logger.log(`Client ${client.id} joined personal room and lobby`);
      
      // Send initial battles to the connecting client
      const battles = await this.matchmakingService.getOpenBattles();
      client.emit('BATTLES_SYNC', battles);
    }
  }

  @SubscribeMessage('CREATE_BATTLE')
  async handleCreateBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { entryFee: number },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return client.emit('BATTLE_ERROR', { message: 'Unauthorized' });

    try {
      const battle = await this.matchmakingService.createBattle(user.sub, user.name || `User-${user.sub.substring(0,4)}`, payload.entryFee);
      this.server.to('lobby').emit('BATTLE_ADDED', battle);
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }

  @SubscribeMessage('CANCEL_BATTLE')
  async handleCancelBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return;

    try {
      await this.matchmakingService.cancelBattle(user.sub, payload.battleId);
      this.server.to('lobby').emit('BATTLE_REMOVED', { battleId: payload.battleId });
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }

  @SubscribeMessage('ACCEPT_BATTLE')
  async handleAcceptBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return;

    try {
      const battle = await this.matchmakingService.acceptBattle(user.sub, user.name || `User-${user.sub.substring(0,4)}`, payload.battleId);
      this.server.to('lobby').emit('BATTLE_UPDATED', battle);
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }

  @SubscribeMessage('REJECT_BATTLE')
  async handleRejectBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return;

    try {
      const battle = await this.matchmakingService.rejectBattle(user.sub, payload.battleId);
      this.server.to('lobby').emit('BATTLE_UPDATED', battle);
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }

  @SubscribeMessage('START_BATTLE')
  async handleStartBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return;

    try {
      await this.matchmakingService.startBattle(user.sub, payload.battleId);
      this.server.to('lobby').emit('BATTLE_REMOVED', { battleId: payload.battleId });
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }
}
