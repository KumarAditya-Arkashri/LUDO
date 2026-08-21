import * as zlib from 'zlib';
import { GameState } from '../../game-engine/state/game-state.model';
import { GameStateSerializer } from '../../game-engine/state/game-state.serializer';

export class StateCompressor {
  /**
   * Serializes a GameState, compresses it using zlib, and encodes it in base64.
   */
  static compress(state: GameState): string {
    const strippedState = new GameState(
      state.matchState,
      state.history.slice(-5), // Keep only last 5 history events for payload size
      state.version,
    );
    const serializedData = GameStateSerializer.snapshot(strippedState);
    const compressedBuffer = zlib.deflateSync(
      Buffer.from(serializedData, 'utf-8'),
    );
    return compressedBuffer.toString('base64');
  }

  /**
   * Decodes a base64 compressed GameState, inflates it using zlib, and deserializes it.
   */
  static decompress(compressedBase64: string): GameState {
    const compressedBuffer = Buffer.from(compressedBase64, 'base64');
    const decompressedBuffer = zlib.inflateSync(compressedBuffer);
    const serializedData = decompressedBuffer.toString('utf-8');
    return GameStateSerializer.restore(serializedData);
  }
}
