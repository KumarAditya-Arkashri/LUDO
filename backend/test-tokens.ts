import { GameStateEngine } from './src/game-engine/state/game-state.engine';
import { MatchEngine } from './src/game-engine/match/match.engine';

const p1 = { playerId: 'user1', displayName: 'User 1', connectionState: 'CONNECTED' as any, hasLeft: false, joinedAt: new Date(), disconnectedAt: null };
const p2 = { playerId: 'user2', displayName: 'User 2', connectionState: 'CONNECTED' as any, hasLeft: false, joinedAt: new Date(), disconnectedAt: null };

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

console.log('Final length:', stateWithMeta.matchState.tokenStates.length);
