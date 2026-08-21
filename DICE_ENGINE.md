# Dice Engine (Sprint 6.2)

The Dice Engine is a standalone, deterministic, and cryptographically secure module that handles the lifecycle of Ludo dice rolls. It operates completely independently of the Board Engine and Token Engine.

## Core Concepts

### 1. Immutable State (`DiceState`)
Every single dice roll generates a mathematically immutable `DiceState` instance. The state tracks:
- `currentValue` (1-6)
- `previousValues` (History of rolls this turn)
- `consecutiveSixes` (Count of 6s rolled in a row)
- `rolledAt` (Timestamp)

Because the state is immutable, the `DiceEngine` operates as a pure function: `roll(currentState) => newState`. This guarantees that race conditions cannot mutate the dice mid-flight.

### 2. The Three-Sixes Rule
Ludo has a strict rule: if a player rolls three `6`s consecutively, they immediately lose their turn and their dice history is wiped.
The Engine natively enforces this. On the third `6`, `DiceEngine.shouldLoseTurn(state)` returns true, and the returned state's history is aggressively cleared to prevent UI/state drift.

### 3. Extra Turn Grants
If a player rolls a `6` (and it's not their 3rd consecutive), `DiceEngine.grantExtraTurn(state)` returns true. The validator (`DiceValidator.validateCanRoll`) will allow them to pass this state back into the `roll()` function for another throw.

### 4. Random Provider Abstraction
`Math.random()` is inherently flawed for gambling/real-money systems as V8's PRNG state can be deduced. To protect against seed-prediction attacks, randomness is abstracted through `DiceRandomProvider`. 
The default implementation (`CryptoDiceRandomProvider`) utilizes Node's `crypto.randomInt(1, 7)` to pull entropy from the OS, guaranteeing cryptographically secure and un-guessable dice values.

## Serialization
The state can be compressed into `SerializedDiceState` (JSON) using `DiceSerializer`. When deserialized, `DiceValidator.validateState` runs a structural and mathematical check (e.g. ensuring no values < 1 or > 6 exist in history) to prevent client manipulation.

## Future Integration
In future sprints, the Turn Engine will utilize this module like so:
1. Player requests roll over Socket.
2. Turn Engine pulls player's active `DiceState`.
3. Calls `DiceEngine.roll(state, cryptoProvider)`.
4. Saves new `DiceState` to memory.
5. If `shouldLoseTurn` -> Pass turn to next player.
6. If `!grantExtraTurn` and no valid tokens to move -> Pass turn to next player.
7. Otherwise -> Wait for player to select a token.
