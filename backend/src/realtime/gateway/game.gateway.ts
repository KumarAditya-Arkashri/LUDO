import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket, Namespace } from 'socket.io';
import { Logger, Inject, forwardRef, UseGuards, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { RoomManager } from '../rooms/room.manager';
import { WSAuthMiddleware } from '../middleware/ws-auth.middleware';
import type { JoinRoomPayload, RollDicePayload, MoveTokenPayload, ErrorPayload } from '../events/event.types';
import { IncomingEvents as IE, OutgoingEvents as OE } from '../events/event.types';
import { GameStateEngine } from '../../game-engine/state/game-state.engine';
import { MatchEngine } from '../../game-engine/match/match.engine';
import { StateCompressor } from '../serializer/state.compressor';
import { SettlementService } from '../../settlement/settlement.service';
import { TurnTimeoutService } from '../../game-engine/timeout/turn-timeout.service';
import { RuleEngine } from '../../game-engine/rules/rule.engine';
import { GameEventType } from '../../game-engine/events/game-event.types';

// Allowed origins are read from ALLOWED_ORIGINS env var (comma-separated).
// In non-production environments, localhost origins are automatically included.
// This must mirror the CORS config in main.ts.
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
  namespace: '/game',
})

export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Namespace;
  private readonly logger = new Logger(GameGateway.name);
  constructor(
    private readonly roomManager: RoomManager,
    @Inject(forwardRef(() => SettlementService)) private readonly settlementService: SettlementService,
    private readonly turnTimeoutService: TurnTimeoutService,
  ) {}
  afterInit(server: Namespace) { this.server = server; server.use(WSAuthMiddleware()); this.logger.log('GameGateway initialized with WSAuthMiddleware'); }
  async onModuleDestroy() {
    this.turnTimeoutService.clearAll();
    await this.roomManager.shutdown();
  }
  handleConnection(client: Socket) { const user = (client as any).user; if (user?.sub) client.join(`user:${user.sub}`); this.logger.log(`Client connected: ${client.id} (User: ${user?.sub || 'Unknown'})`); }
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const user = (client as any).user;
    if (user) {
      const conn = this.roomManager.getPlayerConnection(client.id);
      if (conn) {
        // Cancel any running turn timer for this match
        this.turnTimeoutService.cancelTimer(conn.matchId);

        this.server
          .to(conn.matchId)
          .emit(OE.PLAYER_DISCONNECT, { playerId: conn.playerId });

        this.roomManager.leaveRoom(client.id);
      }
    }
  }
  @SubscribeMessage(IE.JOIN_ROOM)
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    const user = (client as any).user; if (!user?.sub) return this.sendError(client, 'UNAUTHORIZED', 'User context not found on socket.');
    const { matchId } = payload; const playerId = user.sub; const existingSocketId = this.roomManager.getExistingSocketIdForPlayer(matchId, playerId);
    const joined = await this.roomManager.joinRoom(client.id, matchId, playerId); if (!joined) return this.sendError(client, 'JOIN_FAILED', 'Could not join room. Verify match ID and participation.');
    client.join(matchId); this.logger.log(`Client ${client.id} joined room ${matchId} as player ${playerId}`);
    if (existingSocketId && existingSocketId !== client.id) { const oldSocket = this.server?.sockets?.get(existingSocketId); this.roomManager.removeSocketConnection(existingSocketId); if (oldSocket && !oldSocket.disconnected) { const duplicatePayload: ErrorPayload = { code: 'DUPLICATE_CONNECTION', message: 'You joined from another device.' }; oldSocket.emit(OE.DUPLICATE_CONNECTION, duplicatePayload); oldSocket.emit(OE.ERROR, duplicatePayload); setTimeout(() => { if (!oldSocket.disconnected) oldSocket.disconnect(true); }, 250); } }
    client.to(matchId).emit(OE.PLAYER_RECONNECT, { playerId }); const state = await this.roomManager.getGameState(matchId); if (state) client.emit(OE.GAME_STATE, { matchId, compressedState: StateCompressor.compress(state) });
  }
  @SubscribeMessage(IE.LEAVE_ROOM)
  async handleLeaveRoom(@ConnectedSocket() client: Socket) { const conn = this.roomManager.getPlayerConnection(client.id); if (conn) { client.leave(conn.matchId); await this.roomManager.leaveRoom(client.id); } }
  @SubscribeMessage(IE.HEARTBEAT)
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const conn = this.roomManager.getPlayerConnection(client.id);
    if (conn) {
      const state = await this.roomManager.getGameState(conn.matchId);
      if (state) {
        // Heartbeat doesn't change state, so we can omit it or safely skip OCC check for heartbeats
        // Or not even update game state if nothing changed!
        // We removed state update here to save IO, or if we must, just touch Redis expiry.
      }
    }
  }

  @UseGuards(ThrottlerGuard)
  @SubscribeMessage(IE.ROLL_DICE)
  async handleRollDice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RollDicePayload,
  ) {
    const conn = this.roomManager.getPlayerConnection(client.id);
    if (!conn || conn.matchId !== payload.matchId) {
      return this.sendError(
        client,
        'INVALID_ROOM',
        'You are not active in this room.',
      );
    }

    const state = await this.roomManager.getGameState(conn.matchId);
    if (!state) {
      return this.sendError(
        client,
        'STATE_NOT_FOUND',
        'Match state not found.',
      );
    }

    try {
      const rolledValue = crypto.randomInt(1, 7); // Secure random dice roll (1-6)
      const events = MatchEngine.handleRollDice(state.matchState, state.version, conn.playerId, rolledValue);
      let nextState = state;
      for (const event of events) {
        nextState = GameStateEngine.applyEvent(nextState, event);
      }

      await this.roomManager.updateGameState(
        conn.matchId,
        nextState,
        state.version,
      );

      this.server.to(conn.matchId).emit(OE.GAME_STATE, {
        matchId: conn.matchId,
        compressedState: StateCompressor.compress(nextState),
      });

      // Start move-deadline timer: after rolling, player must move within 30s.
      // If turn already changed (3 sixes / no valid moves), no timer needed.
      const turnChangedImmediately = nextState.matchState.currentPlayer !== conn.playerId;
      if (!turnChangedImmediately) {
        this.turnTimeoutService.startTimer(
          conn.matchId,
          conn.playerId,
          (matchId, timedOutPlayerId) => this.handleTurnTimeout(matchId, timedOutPlayerId),
        );
      }
    } catch (error) {
      if (error.message.includes('StateConflictError')) {
        this.logger.warn(
          `OCC conflict for rollDice by ${conn.playerId} in ${conn.matchId}`,
        );
        return this.sendError(
          client,
          'SYNC_ERROR',
          'Game state was modified concurrently. Syncing...',
        );
      }
      this.sendError(client, 'ROLL_ERROR', error.message);
    }
  }

  @UseGuards(ThrottlerGuard)
  @SubscribeMessage(IE.MOVE_TOKEN)
  async handleMoveToken(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MoveTokenPayload,
  ) {
    const conn = this.roomManager.getPlayerConnection(client.id);
    if (!conn || conn.matchId !== payload.matchId) {
      return this.sendError(
        client,
        'INVALID_ROOM',
        'You are not active in this room.',
      );
    }

    const state = await this.roomManager.getGameState(conn.matchId);
    if (!state) {
      return this.sendError(
        client,
        'STATE_NOT_FOUND',
        'Match state not found.',
      );
    }

    try {
      // Player acted — cancel the move deadline timer immediately
      this.turnTimeoutService.cancelTimer(conn.matchId);

      const events = MatchEngine.handleMoveToken(state.matchState, state.version, conn.playerId, payload.tokenId);
      let nextState = state;
      for (const event of events) {
        nextState = GameStateEngine.applyEvent(nextState, event);
      }

      await this.roomManager.updateGameState(
        conn.matchId,
        nextState,
        state.version,
      );

      this.server.to(conn.matchId).emit(OE.GAME_STATE, {
        matchId: conn.matchId,
        compressedState: StateCompressor.compress(nextState),
      });

      if (nextState.matchState.winner) {
        this.server.to(conn.matchId).emit(OE.MATCH_END, {
          matchId: conn.matchId,
          winnerId: nextState.matchState.winner,
          compressedState: StateCompressor.compress(nextState),
        });

        await this.settlementService.settleMatch(conn.matchId, nextState);
      }
    } catch (error) {
      if (error.message.includes('StateConflictError')) {
        this.logger.warn(
          `OCC conflict for moveToken by ${conn.playerId} in ${conn.matchId}`,
        );
        return this.sendError(
          client,
          'SYNC_ERROR',
          'Game state was modified concurrently. Syncing...',
        );
      }
      this.sendError(client, 'MOVE_ERROR', error.message);
    }
  }

  /**
   * Called by TurnTimeoutService when a player fails to move within 30 seconds.
   * Emits a TURN_CHANGE to the room, forfeiting the idle player's turn.
   */
  private async handleTurnTimeout(matchId: string, timedOutPlayerId: string): Promise<void> {
    try {
      const state = await this.roomManager.getGameState(matchId);
      if (!state) return;

      // Only forfeit if it is still this player's turn
      if (state.matchState.currentPlayer !== timedOutPlayerId) return;

      const players = state.matchState.players.map(p => p.playerId);
      const events = MatchEngine.handleRollDice(
        state.matchState,
        state.version,
        timedOutPlayerId,
        // Roll a 1 to trigger the no-valid-move path for locked tokens,
        // or just force a TURN_CHANGE by building the event directly.
        1,
      );

      // Build a forced TURN_CHANGE event to forfeit the idle player's turn
      const nextPlayerId = RuleEngine.calculateNextPlayer(timedOutPlayerId, players);
      const timeoutEvent = {
        id: crypto.randomUUID(),
        matchId,
        type: GameEventType.TURN_CHANGE,
        version: state.version + 1,
        timestamp: new Date(),
        playerId: timedOutPlayerId,
        payload: { nextPlayerId, reason: 'TURN_TIMEOUT' },
      };

      const nextState = GameStateEngine.applyEvent(state, timeoutEvent);
      await this.roomManager.updateGameState(matchId, nextState, state.version);

      this.server.to(matchId).emit(OE.GAME_STATE, {
        matchId,
        compressedState: StateCompressor.compress(nextState),
      });

      this.logger.warn(`Turn forfeited by timeout: match=${matchId}, player=${timedOutPlayerId}`);
    } catch (err) {
      this.logger.error(`handleTurnTimeout failed for ${matchId}: ${err.message}`);
    }
  }

  private sendError(client: Socket, code: string, message: string) {
    const errorPayload: ErrorPayload = { code, message };
    client.emit(OE.ERROR, errorPayload);
    this.logger.error(`Sent error to ${client.id}: [${code}] ${message}`);
  }
}
