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

const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const wsAllowedOrigins: string[] = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  wsAllowedOrigins.push(
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  );
}

@WebSocketGateway({
  cors: { 
    origin: wsAllowedOrigins.length > 0 ? wsAllowedOrigins : false,
    credentials: true,
  },
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
      this.logger.log(`Client ${client.id} joined personal room`);
    }
  }

  @SubscribeMessage('CREATE_PRIVATE_BATTLE')
  async handleCreatePrivateBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { entryFee: number },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return client.emit('BATTLE_ERROR', { message: 'Unauthorized' });

    try {
      const roomCode = await this.matchmakingService.createPrivateBattle(
        user.sub,
        user.name || `User-${user.sub.substring(0,4)}`,
        payload.entryFee
      );
      // Emit the room code back to the creator
      client.emit('PRIVATE_BATTLE_CREATED', { roomCode });
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }

  @SubscribeMessage('JOIN_PRIVATE_BATTLE')
  async handleJoinPrivateBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return client.emit('BATTLE_ERROR', { message: 'Unauthorized' });

    try {
      // The join method itself will emit 'MATCH_FOUND' to both players upon success
      await this.matchmakingService.joinPrivateBattle(
        user.sub,
        user.name || `User-${user.sub.substring(0,4)}`,
        payload.roomCode
      );
      // We can also emit a success message here, though MATCH_FOUND is what triggers the redirect
      client.emit('PRIVATE_BATTLE_JOINED', { roomCode: payload.roomCode });
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }

  @SubscribeMessage('CANCEL_PRIVATE_BATTLE')
  async handleCancelPrivateBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return;

    try {
      await this.matchmakingService.cancelPrivateBattle(user.sub, payload.roomCode);
      client.emit('PRIVATE_BATTLE_CANCELLED', { roomCode: payload.roomCode });
    } catch (error) {
      client.emit('BATTLE_ERROR', { message: error.message });
    }
  }
}
