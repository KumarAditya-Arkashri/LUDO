import { GameStateEngine } from './dist/game-engine/state/game-state.engine.js';
import { MatchEngine } from './dist/game-engine/match/match.engine.js';
import { GameStateSerializer } from './dist/game-engine/state/game-state.serializer.js';
import { StateCompressor } from './dist/realtime/serializer/state.compressor.js';

const p1 = { playerId: 'user1', displayName: 'User 1', connectionState: 'CONNECTED', hasLeft: false, joinedAt: new Date(), disconnectedAt: null };
const p2 = { playerId: 'user2', displayName: 'User 2', connectionState: 'CONNECTED', hasLeft: false, joinedAt: new Date(), disconnectedAt: null };

let matchState = MatchEngine.createMatch('match1', p1, { entryFee: 10 });
matchState = MatchEngine.joinMatch(matchState, p2);
let initialState = GameStateEngine.initialize(matchState);

const startEvents = MatchEngine.startMatch(initialState.matchState, initialState.version);
for (const event of startEvents) {
  initialState = GameStateEngine.applyEvent(initialState, event);
}

const stateWithMeta = {
  ...initialState,
  matchState: {
    ...initialState.matchState,
    metadata: {
      ...initialState.matchState.metadata,
      entryFee: 10,
    },
  },
};

const serialized = GameStateSerializer.snapshot(stateWithMeta);
console.log("JSON STRING length:", serialized.length);
const restored = GameStateSerializer.restore(serialized);
console.log("Restored token count:", restored.matchState.tokenStates?.length);

const compressed = StateCompressor.compress(restored);
const finalObj = StateCompressor.decompress(compressed);
console.log("Final decompressed token count:", finalObj.matchState.tokenStates?.length);
console.log("Final token 0 state:", finalObj.matchState.tokenStates[0].state);

