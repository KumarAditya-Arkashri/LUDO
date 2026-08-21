# Rule Engine (Sprint 6.4)

The Rule Engine is the mathematical "brain" or referee of the game. It acts as an orchestrator for the Dice, Token, and Board engines. Crucially, **it never mutates their state**. It purely evaluates game conditions and outputs mathematical `RuleResult` structures that the master Game Engine will execute.

## Core Concepts

### 1. `RuleResult` Model
Every move evaluation results in a mathematically pure `RuleResult`.
- `isValid`: Was the move legal?
- `reason`: Why the move failed (if invalid).
- `nextPlayerId`: Whose turn it is next.
- `extraTurn`: Did the current player earn an extra turn?
- `capture`: Did this move result in an opponent being captured?
- `capturedTokenId`: The ID of the captured token, if any.
- `winner`: The player ID of the winner, if the game was won.
- `gameOver`: Flag to indicate if the entire game is over (based on active players).

### 2. Pure Execution (`RuleEngine.evaluateMove`)
The engine absorbs a `MoveRequest` (Player, Token, Dice value) alongside the current immutable states (`TokenState[]`, `activePlayerIds`). It follows a strict sequence:

1. **Player Validation:** Validates the player actually owns the target token.
2. **Move Legality:** Rejects moves that overshoot the finish line, attempts to move locked tokens without a 6, or moves a finished token.
3. **Third-Six Rule:** Immediately fails the move and passes the turn if the `MoveRequest` flagged `isThirdSix` as true.
4. **Capture Calculation:** Scans the destination cell for vulnerable opponent tokens. It inherently understands that `SAFE` cells protect tokens.
5. **Win Detection:** Counts how many tokens the current player has `FINISHED`, adding the current token if it reached step 57. If the count reaches `TOKENS_TO_WIN` (4), it triggers a win.
6. **Turn Delegation:** Calculates the next player in the cycle array. A player keeps their turn *only* if they rolled a 6 or captured a token (and didn't win the game on that move).

### 3. Cycle Calculation
The `calculateNextPlayer` mechanism uses a dynamic array of `activePlayerIds`. This is designed for the future Matchmaking engine: if Player 1 wins and leaves the game, the array becomes `[Player 2, Player 3, Player 4]`, and the Turn Engine will seamlessly skip Player 1.

## Strict Immutability
To guarantee we can simulate and validate moves in memory without corrupting live games:
- The `RuleResult` is frozen via `Object.freeze()`.
- The engine does not interact with the database.
- The engine does not interact with WebSockets.
- The engine does not call `TokenEngine.moveToken()`. It merely acts as a validator, so the master Game Engine can confidently call `moveToken()` and broadcast the result safely.
