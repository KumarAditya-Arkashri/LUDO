# Match Engine (Sprint 6.5)

The Match Engine acts as the top-level orchestrator and container for a live Ludo game. It encapsulates the `MatchState`, maintaining references to the `DiceState` and `TokenState` of all players, and managing the overall lifecycle from lobbying to conclusion.

## Architecture

The Match Engine acts mathematically on the `MatchState`. Just like the Rule Engine, it is a pure execution environment that does not rely on databases, network connections, or WebSockets. It receives an immutable `MatchState`, applies logic, and outputs a new immutable `MatchState`.

### The State Hierarchy
```
MatchState
 ├── status (WAITING | READY | RUNNING | PAUSED | COMPLETED | ABANDONED)
 ├── players (Player ID, Display Name, Connection State)
 ├── currentPlayer (ID of who rolls next)
 ├── turnNumber (Incremental counter)
 ├── diceStates (Dictionary of DiceState by Player ID)
 ├── tokenStates (Array of 8 TokenStates across the board)
 └── startedAt / endedAt / winner
```

## Lifecycle States & Flows

1. **WAITING:** A match is created with a single player (`createMatch`).
2. **READY:** The opponent joins (`joinMatch`).
3. **RUNNING:** The game is started (`startMatch`). The engine instantiates `DiceState` for all players and generates 8 `TokenState` pieces (all starting in `LOCKED`). It assigns turn 1.
4. **PAUSED:** If a player disconnects, `pauseMatch` is called. The `ConnectionState` transitions to `DISCONNECTED`.
5. **COMPLETED:** When a player wins (as decided by the Rule Engine), `endMatch` transitions the state and flags the winner.
6. **ABANDONED:** If a player explicitly clicks "Leave Game" while playing, `leaveMatch` instantly ends the game and awards the opponent the victory.

## Integration with the Full Ecosystem

The `MatchEngine` is the bridge between our Core Logic and NestJS. 
In the upcoming Socket.IO implementation:
- **Client Connects:** NestJS calls `joinMatch()`.
- **Client Disconnects:** NestJS catches the socket drop and calls `pauseMatch()`. It starts a `setTimeout` for 60 seconds (`RECONNECT_TIMEOUT_MS`).
- **Client Reconnects:** NestJS calls `resumeMatch()`.
- **Client Abandons:** If the timeout fires before reconnection, NestJS calls `leaveMatch()` to auto-award the opponent.

## Serialization
The entire `MatchState` (including deeply nested Dice and Token states) can be converted to JSON via `MatchSerializer.snapshot()` and restored via `MatchSerializer.restore()`. This allows us to persist active games into Redis or PostgreSQL, ensuring matches survive server restarts.
