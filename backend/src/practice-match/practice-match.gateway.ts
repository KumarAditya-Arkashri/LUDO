import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PracticeMatchService } from './practice-match.service';
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
  namespace: '/practice',
})
export class PracticeMatchGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PracticeMatchGateway.name);

  constructor(private readonly practiceMatchService: PracticeMatchService) {}

  afterInit(server: Server) {
    server.use(WSAuthMiddleware());
    this.logger.log('PracticeMatchGateway initialized');
  }

  async handleConnection(client: Socket) {
    const user = (client as any).user;
    if (!user?.sub) return;
    client.join(`practice:user:${user.sub}`);
    await this.emitLobby(client);
  }

  @SubscribeMessage('PRACTICE_BATTLES_SYNC')
  async handleSync(@ConnectedSocket() client: Socket) {
    await this.emitLobby(client);
  }

  @SubscribeMessage('PRACTICE_CREATE')
  async handleCreate(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    if (!user?.sub) return this.error(client, 'Unauthorized');

    try {
      const battle = await this.practiceMatchService.create(user.sub, user.name);
      client.emit('PRACTICE_BATTLE_CREATED', battle);
      await this.broadcastLobby();
    } catch (error) {
      this.error(client, this.message(error));
    }
  }

  @SubscribeMessage('PRACTICE_JOIN')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const user = (client as any).user;
    if (!user?.sub) return this.error(client, 'Unauthorized');

    try {
      const battle = await this.practiceMatchService.join(user.sub, user.name, payload?.battleId);
      this.server.to(`practice:user:${battle.creatorId}`).emit('PRACTICE_PLAYER_JOINED', battle);
      client.emit('PRACTICE_PLAYER_JOINED', battle);
      await this.broadcastLobby();
    } catch (error) {
      this.error(client, this.message(error));
    }
  }

  @SubscribeMessage('PRACTICE_START')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const user = (client as any).user;
    if (!user?.sub) return this.error(client, 'Unauthorized');

    try {
      const battle = await this.practiceMatchService.getForNotification(payload?.battleId);
      const result = await this.practiceMatchService.start(user.sub, payload?.battleId);
      this.server.to(`practice:user:${user.sub}`).emit('PRACTICE_CODE_READY', result);
      if (battle.opponentId) {
        this.server.to(`practice:user:${battle.opponentId}`).emit('PRACTICE_CODE_REQUIRED', {
          battleId: result.battleId,
          expiresAt: result.expiresAt,
        });
      }
      await this.broadcastLobby();
    } catch (error) {
      this.error(client, this.message(error));
    }
  }

  @SubscribeMessage('PRACTICE_VERIFY_CODE')
  async handleVerify(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string; code: string },
  ) {
    const user = (client as any).user;
    if (!user?.sub) return this.error(client, 'Unauthorized');

    try {
      const battle = await this.practiceMatchService.getForNotification(payload?.battleId);
      const result = await this.practiceMatchService.verifyCode(
        user.sub,
        payload?.battleId,
        payload?.code,
      );
      this.server.to(`practice:user:${user.sub}`).emit('PRACTICE_MATCH_READY', result);
      this.server.to(`practice:user:${battle.creatorId}`).emit('PRACTICE_MATCH_READY', result);
    } catch (error) {
      this.error(client, this.message(error));
    }
  }

  @SubscribeMessage('PRACTICE_LEAVE')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const user = (client as any).user;
    if (!user?.sub) return;

    try {
      await this.practiceMatchService.leave(user.sub, payload?.battleId);
      await this.broadcastLobby();
    } catch (error) {
      this.error(client, this.message(error));
    }
  }

  private async emitLobby(client: Socket) {
    client.emit('PRACTICE_BATTLES_SYNC', await this.practiceMatchService.listOpen());
  }

  private async broadcastLobby() {
    this.server.emit('PRACTICE_BATTLES_SYNC', await this.practiceMatchService.listOpen());
  }

  private error(client: Socket, message: string) {
    client.emit('PRACTICE_ERROR', { message });
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Practice match operation failed';
  }
}
