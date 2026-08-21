# Board Engine (Sprint 6.1)

The Board Engine is the foundational layout and graph layer for the Ludo Game Engine. It operates as a purely mathematical and graph-based module, completely isolated from network transport (Socket.IO), persistence, or token state.

## Core Concepts

### 1. The Immutable Graph
The `Board` class represents an immutable snapshot of the 52-cell main path, home paths, and finish zones. It does NOT track where player tokens are located. Instead, it provides the structural context needed to answer questions like:
- "If Player A is on MAIN_50, what is their next cell?" -> `A_HOME_1`
- "If Player B is on MAIN_51, what is their next cell?" -> `MAIN_0`
- "Is MAIN_8 a safe cell?" -> `true`

### 2. Cell Model
Every position on the board is represented by a `Cell`.
- **id**: A guaranteed unique string (e.g., `MAIN_0`, `B_HOME_4`, `A_FINISH`).
- **index**: The logical index relative to its path type.
- **type**: `MAIN`, `HOME`, `START`, or `FINISH`.
- **isSafe**: `true` for standard stars.
- **owner**: `null` for public paths, or `PLAYER_A`/`PLAYER_B` for home paths and start cells.

### 3. Coordinate System
The Board generates physical logical coordinates (e.g., `x, y` inside a 15x15 grid) for every cell.
Currently, this is a placeholder mathematical mapping, but it enforces the strict requirement that every cell must be placeable on a logical grid. The UI can optionally override these coordinates with its own responsive grid system based on the `Cell.id`.

## Validation Strategy
The Board Engine strictly enforces constraints through `BoardValidator`:
- A board cannot be instantiated with duplicated cell IDs.
- A cell cannot have a negative index.
- A cell lookup for a non-existent ID throws a hard `Error`.

## Serialization
Since AI clients, spectating clients, or saved games need the context of the board, the `BoardSerializer` provides `serialize` and `deserialize` methods. This reduces the Board object tree into a plain, transport-safe JSON structure, and can inflate it back into functional class instances perfectly.

## Future Integration (Dice & Movement)
In upcoming sprints, a `GameState` module will be built *on top* of the Board Engine.
The GameState will:
1. Hold a reference to a `Board` instance.
2. Maintain a map of Tokens `Map<TokenId, CellId>`.
3. Roll the dice (via a Dice Engine).
4. Iterate `board.getNextCell()` N times based on the dice roll to determine the final destination of a token.
5. Check if the final destination contains an opponent's token on a non-safe cell, and if so, capture it.
