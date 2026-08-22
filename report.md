# P0 ROOT-CAUSE REPORT

## 1. P0-A: Player B Routing Failure (Dashboard Stranding)
**Root Cause Analysis:**
The disconnection occurs due to aggressive listener clobbering in the socket store. In `game-store.ts`, the `connectLobby` function unconditionally calls `socket.off(SOCKET_EVENTS.matchFound)` before registering the store's listener. Because `_player.dashboard.tsx` registers its own `MATCH_FOUND` listener (which triggers `navigate({ to: "/game" })`) inside a `useEffect`, any subsequent invocation of `connectLobby` (due to React 18 strict-mode mount/unmount cycles, HMR, or re-renders) entirely wipes out the dashboard's navigation listener. Player A often survives this race condition because they initiate the `startBattle` flow and transition immediately, whereas Player B sits idle waiting, leaving their listener vulnerable to being unregistered before Player A clicks "Start". 

**Resolution Path:**
Refactor the socket event subscriptions. Remove blanket `socket.off("MATCH_FOUND")` calls. Instead, use explicit listener references when removing events (e.g., `socket.off(event, specificCallback)`). Alternatively, consolidate the `MATCH_FOUND` routing logic entirely within the global `game-store.ts` to guarantee both state hydration and navigation occur atomically without relying on component-level listeners.

## 2. P0-B: Token Synchronization & Rendering
**Root Cause Analysis:**
The tokens (gotis) are completely missing from the backend authoritative state due to a critical state-mutation bug in `MatchmakingService.startBattle`. 
During game initialization, the engine correctly applies the `MATCH_START` event, generating a populated `finalState` containing all 8 token instances. However, immediately after this, the code explicitly constructs the payload for Redis using `initialState` (which was created *before* the `MATCH_START` event and has `tokenStates: []`):
```typescript
const stateWithMeta = {
  ...initialState, // BUG: Uses initialState instead of finalState!
  matchState: {
    ...initialState.matchState, // BUG: Empty tokens
```
Consequently, the game is saved to Redis and synced to the frontend with zero tokens. The frontend rendering logic loops over an empty array, resulting in an empty board.

**Resolution Path:**
Update `MatchmakingService.startBattle` to use `finalState` instead of `initialState` when constructing `stateWithMeta` and persisting to `roomManager.createRoom`. This will ensure the tokens spawned by the `MATCH_START` event are actually committed to the game room.

## 3. P0-C: Dice & Gameplay Loop Disconnect
**Root Cause Analysis:**
The absence of tokens (from P0-B) fatally breaks the gameplay loop. When a player clicks the dice, the frontend sends a `ROLL_DICE` command. The backend successfully calculates a 1-6 result, but `MatchEngine.handleRollDice` then scans the player's `tokenStates` to determine if any legal moves exist. Since `tokenStates` is completely empty, the engine determines the player has `hasValidMove = false` and immediately generates a `TURN_CHANGE` event. 
As a result, the turn instantly passes to the next player before the frontend's 800ms dice animation even finishes, causing the dice state to reset or lock up, making it appear as though the dice result is ignored.

**Resolution Path:**
Resolving P0-B automatically unblocks P0-C. Once tokens exist in the state, rolling a 6 will correctly allow the token to spawn (via `TOKEN_SPAWN`), and `hasValidMove` will evaluate to `true`, preventing the premature `TURN_CHANGE` event.

## 4. Wallet Deduction Asymmetry
**Root Cause Analysis:**
The backend successfully deducts entry fees for both players via `this.walletService.transactMultiple`. The asymmetry is purely a frontend synchronization illusion caused by race conditions.
In `_player.dashboard.tsx` (and `game-store.ts`), actions like `acceptBattle` do not wait for an explicit WebSocket acknowledgment. Instead, they use a blind `setTimeout(..., 500)` to resolve the promise. Exactly at T+500ms, the UI fires `useWalletStore.getState().fetchWallet()`. If the backend's Prisma transaction (which locks tables and processes double-entry ledgers) takes slightly longer than 500ms, the frontend fetches the user's *stale* wallet balance. A manual page refresh would reveal the correct, deducted balance.

**Resolution Path:**
Eliminate the arbitrary 500ms `setTimeout` in the frontend socket actions. The frontend must listen for explicit acknowledgment events (e.g., `BATTLE_UPDATED` or a dedicated `ACK` callback from the backend gateway) before triggering `fetchWallet()`.
