# Token Engine (Sprint 6.3)

The Token Engine is a mathematically pure, immutable state machine responsible for managing the lifecycle of Ludo tokens. Like the Board and Dice engines, it has absolutely zero dependency on the network layer (Socket.IO) or the database, making it 100% testable and completely impervious to race conditions.

## Core Concepts

### 1. Immutable State (`TokenState`)
Each of the 4 tokens owned by a player is represented by an immutable `TokenState`.
- `tokenId`: Unique identifier (e.g. `P1_T1`)
- `currentCellId`: The cell the token is standing on. If the token is off the board, this is `null`.
- `stepsMoved`: Tracks how far the token has traveled on the board (Max: 57).
- `state`: The phase of the token's lifecycle.
- `isMovable`: A derived flag confirming if a token is in play.

### 2. State Machine (`TokenStateEnum`)
A token transitions strictly through these states:
- `LOCKED`: Initial state, resting in the player's base.
- `ACTIVE`: On the main path, vulnerable to capture.
- `SAFE`: On a safe star cell on the main path, immune to capture.
- `HOME_PATH`: On the colored stretch leading to the center.
- `FINISHED`: Reached exactly 57 steps. Permanently locked in the center.
- `CAPTURED`: Knocked off by an opponent. Must roll a 6 to re-spawn.

### 3. Core Engine Mechanics (`TokenEngine`)
Because `TokenState` is frozen via `Object.freeze`, `TokenEngine` operates as a set of pure mathematical functions:
- `spawnToken(state, startCellId)` -> Spawns a locked token onto the board.
- `moveToken(state, destCell, steps, isSafe, isHomePath, isFinish)` -> Safely transitions the token along the path based on input from the Board Engine.
- `captureToken(state)` -> Resets a token to `CAPTURED`, setting steps to 0 and stripping its cell coordinate.
- `getMovableTokens(tokens, diceValue)` -> Calculates which tokens are legally allowed to be moved. It prevents moving finished tokens, over-shooting the finish line, or attempting to spawn without a 6.

## Validation Strategy
The `TokenValidator` acts as a strict firewall:
- You cannot capture a token on a safe cell or home path.
- You cannot move a finished or locked token.
- You cannot move past step 57.

## Future Integration (Game State)
The Token Engine provides the *pieces*, the Board Engine provides the *map*, and the Dice Engine provides the *fuel*.
In the next sprint, the overarching **Game Engine** will wire these together:
1. `GameState` holds 1 Board, 4 Players, 16 Tokens, 4 DiceStates.
2. Player rolls the dice.
3. `TokenEngine.getMovableTokens()` filters out impossible moves.
4. Player chooses a token.
5. Game calls `BoardEngine.getNextCell()` multiple times to trace the path.
6. Game calls `TokenEngine.moveToken()` with the final cell parameters.
7. Game checks if an opponent is on that cell. If so, `TokenEngine.captureToken()`.
