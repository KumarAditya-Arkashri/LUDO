import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

const TURN_TIMEOUT_SECONDS = 30;
const TIMEOUT_KEY_PREFIX = 'turn_timeout:';

/**
 * TurnTimeoutService
 *
 * Manages server-side turn timers using Redis TTL keys.
 * When a player does not roll within TURN_TIMEOUT_SECONDS, the timer
 * fires and the caller (GameGateway) is responsible for emitting
 * a TURN_CHANGE event to forfeit the idle player's turn.
 *
 * Design: Redis key `turn_timeout:<matchId>` stores the current player's ID.
 * The GameGateway polls via a lightweight interval rather than relying on
 * Redis keyspace notifications (which require special server configuration).
 *
 * Usage:
 *   - Call `startTimer(matchId, playerId, onTimeout)` when a turn begins.
 *   - Call `cancelTimer(matchId)` when the player rolls / moves / game ends.
 */
@Injectable()
export class TurnTimeoutService {
  private readonly logger = new Logger(TurnTimeoutService.name);
  // Local node timers, keyed by matchId. Redis TTL is the source of truth for
  // distributed enforcement; Node timers are used for the callback.
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly redis: RedisService) {}

  /**
   * Starts a turn timer for `playerId` in `matchId`.
   * If a previous timer exists for this match it is cleared first.
   * After TURN_TIMEOUT_SECONDS, `onTimeout` is called.
   */
  startTimer(
    matchId: string,
    playerId: string,
    onTimeout: (matchId: string, timedOutPlayerId: string) => void,
  ): void {
    this.cancelTimer(matchId);

    const key = `${TIMEOUT_KEY_PREFIX}${matchId}`;
    // Store player ID in Redis so distributed nodes can see who the timer is for.
    this.redis
      .set(key, playerId, TURN_TIMEOUT_SECONDS + 5) // +5s grace over local timer
      .catch((err) =>
        this.logger.error(`Failed to set timeout key for ${matchId}: ${err.message}`),
      );

    const nodeTimer = setTimeout(() => {
      this.timers.delete(matchId);
      // Verify Redis key still matches (guard against stale callbacks)
      this.redis
        .get(key)
        .then((storedPlayerId) => {
          if (storedPlayerId === playerId) {
            this.logger.warn(
              `Turn timeout! Match ${matchId}, player ${playerId} forfeited their turn.`,
            );
            // Delete the key so a second fire is impossible
            this.redis.del(key).catch(() => {});
            onTimeout(matchId, playerId);
          }
        })
        .catch((err) =>
          this.logger.error(
            `Timeout verification failed for ${matchId}: ${err.message}`,
          ),
        );
    }, TURN_TIMEOUT_SECONDS * 1000);

    this.timers.set(matchId, nodeTimer);
    this.logger.debug(
      `Turn timer started: match=${matchId}, player=${playerId}, timeout=${TURN_TIMEOUT_SECONDS}s`,
    );
  }

  /**
   * Cancels the active turn timer for `matchId`.
   * Call this when a player acts (rolls dice, moves token) or game ends.
   */
  cancelTimer(matchId: string): void {
    const existing = this.timers.get(matchId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(matchId);
    }
    const key = `${TIMEOUT_KEY_PREFIX}${matchId}`;
    this.redis.del(key).catch(() => {});
  }

  /**
   * Cleans up all active timers (called on module destroy / graceful shutdown).
   */
  clearAll(): void {
    for (const [matchId, timer] of this.timers.entries()) {
      clearTimeout(timer);
      this.cancelTimer(matchId);
    }
    this.timers.clear();
    this.logger.log('All turn timers cleared on shutdown.');
  }
}
