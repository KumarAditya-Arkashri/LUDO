# Realtime Gateway (Sprint 7.1)

The Realtime Gateway provides the Socket.IO communication layer for the Ludo game. It strictly handles socket connections, room management, authentication, and event broadcasting, while completely delegating all game logic to the pure functions of the `GameStateEngine`.

## Architecture

The module is structured as follows:
- **`game.gateway.ts`**: The main `@WebSocketGateway` that subscribes to incoming events and broadcasts outgoing events.
- **`ws-auth.middleware.ts`**: Socket.IO middleware that intercepts handshakes and validates the JWT against the server secret, immediately rejecting unauthorized connections before they consume resources.
- **`room.manager.ts`**: Manages the in-memory state of active matches (`Map<string, GameState>`) and player connections. It handles the reconnect timeout logic.
- **`state.compressor.ts`**: Utilizes Node's native `zlib.deflateSync` to compress the stringified `GameState` into a Base64 string to reduce network payload sizes.

## Core Workflows

### 1. Connection & Authentication
Clients must connect to the `/game` namespace with their JWT token in the handshake:
```javascript
const socket = io('http://localhost:3000/game', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

### 2. Joining a Match
- Client emits `JOIN_ROOM` with `{ matchId }`.
- Gateway verifies the player is an active participant in that match.
- If the player is already connected from another device, the old connection is forcibly closed (`DUPLICATE_CONNECTION`).
- The player joins the Socket.IO room.
- A `GAME_STATE` event is emitted back to the player with the current compressed state.

### 3. Playing the Game
- **Roll Dice**: Client emits `ROLL_DICE` with `{ matchId }`. Gateway fetches the state, runs `GameStateEngine.rollDice()`, updates the room manager, and broadcasts the new state.
- **Move Token**: Client emits `MOVE_TOKEN` with `{ matchId, tokenId }`. Gateway fetches the state, runs `GameStateEngine.moveToken()`, updates the room manager, and broadcasts the new state.

### 4. Reconnection & Abandonment
- If a socket disconnects, `PLAYER_DISCONNECT` is broadcasted.
- A 60-second timer starts. If the player reconnects within this window, `PLAYER_RECONNECT` is broadcasted and the game resumes.
- If the timer expires, the match is abandoned (`MatchEngine.leaveMatch`) and a `MATCH_END` event is broadcasted.

## Events Reference

### Incoming (Client -> Server)
| Event | Payload | Description |
|-------|---------|-------------|
| `JOIN_ROOM` | `{ matchId: string }` | Joins a match room and requests state. |
| `LEAVE_ROOM` | None | Voluntarily leaves the room. |
| `ROLL_DICE` | `{ matchId: string }` | Requests to roll the dice for the current turn. |
| `MOVE_TOKEN` | `{ matchId: string, tokenId: string }` | Requests to move a specific token. |
| `HEARTBEAT` | None | Keeps the connection alive. |

### Outgoing (Server -> Client)
| Event | Payload | Description |
|-------|---------|-------------|
| `GAME_STATE` | `{ matchId: string, compressedState: string }` | Broadcasts the updated game state. |
| `MATCH_END` | `{ matchId: string, winnerId: string, compressedState: string }` | Broadcasts the end of a match. |
| `PLAYER_DISCONNECT` | `{ playerId: string }` | Notifies that a player dropped. |
| `PLAYER_RECONNECT` | `{ playerId: string }` | Notifies that a player returned. |
| `ERROR` | `{ code: string, message: string }` | Sent specifically to the client that caused an error. |

## Compression Format

The `compressedState` string is a Base64 encoded ZLIB deflated JSON string.
To decode it on the frontend (Node.js example):
```typescript
const buffer = Buffer.from(compressedState, 'base64');
const decompressed = zlib.inflateSync(buffer);
const state = JSON.parse(decompressed.toString('utf-8'));
```
*(In the browser, use libraries like `pako` to inflate the zlib payload).*
