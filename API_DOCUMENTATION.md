# Ludo Arena — API Documentation

> Base URL: `http://localhost:3000` (dev) | `https://api.ludoarena.app` (prod)  
> All endpoints require `Authorization: Bearer <token>` unless marked **Public**.  
> Interactive docs (Swagger): `GET /v1/api/docs`

---

## Authentication

### POST /auth/register  _(Public)_
Register a new player account.

**Body**
```json
{ "name": "string", "mobile": "string", "password": "string", "referralCode": "string?" }
```
**Response 201**
```json
{ "accessToken": "string", "refreshToken": "string", "user": { "id": "...", "name": "...", "mobile": "..." } }
```

---

### POST /auth/login  _(Public)_
Authenticate with mobile + password.

**Body**
```json
{ "mobile": "string", "password": "string" }
```
**Response 200**
```json
{ "accessToken": "string", "refreshToken": "string", "user": { ... } }
```

---

### POST /auth/refresh  _(Public)_
Exchange a refresh token for a new access token.

**Body**
```json
{ "refreshToken": "string" }
```
**Response 200**
```json
{ "accessToken": "string", "refreshToken": "string" }
```

---

### POST /auth/logout
Invalidate the current session.

**Response 200** `{ "message": "Logged out" }`

---

## Users

### GET /users/me
Get the authenticated player's profile.

**Response 200**
```json
{ "id": "string", "name": "string", "mobile": "string", "referralCode": "string", "createdAt": "ISO8601" }
```

---

### GET /users  _(Admin only)_
List all registered users.

**Response 200** `User[]`

---

## Wallet

### GET /wallet/summary
Get the authenticated player's wallet balances.

**Response 200**
```json
{ "MAIN": "Decimal", "WINNING": "Decimal", "REFERRAL": "Decimal" }
```

---

### GET /wallet/history
Get the authenticated player's transaction ledger.

**Response 200** `Transaction[]`

```json
[{
  "id": "string",
  "type": "deposit | withdraw | entry_fee | win | referral_bonus | refund",
  "amount": "number",
  "status": "PENDING | COMPLETED | FAILED",
  "reference": "string?",
  "createdAt": "ISO8601"
}]
```

---

## Deposit

### POST /deposit
Request a new deposit (UPI transfer).

**Body**
```json
{ "amount": 100, "utr": "string" }
```
**Response 201** `Deposit`

---

### PUT /deposit/:id/utr
Update the UTR on an existing deposit.

**Body**
```json
{ "utr": "string" }
```

---

### PUT /deposit/:id/screenshot
Upload a screenshot reference for a deposit.

**Body**
```json
{ "screenshotUrl": "string" }
```

---

### GET /deposit/history
Get the authenticated player's deposit history.

**Response 200** `Deposit[]`

---

### GET /deposit/:id
Get a specific deposit by ID.

**Response 200** `Deposit`

---

## Withdrawal

### POST /withdrawal
Request a withdrawal.

**Body**
```json
{ "amount": 200, "upiId": "name@okaxis" }
```
**Response 201** `Withdrawal`

---

### POST /withdrawal/:id/cancel
Cancel a pending withdrawal.

**Response 200** `Withdrawal`

---

### GET /withdrawal/history
Get the authenticated player's withdrawal history.

**Response 200** `Withdrawal[]`

---

### GET /withdrawal/:id
Get a specific withdrawal by ID.

**Response 200** `Withdrawal`

---

## Referral

### GET /referral/dashboard
Get the referral dashboard for the current player.

**Response 200**
```json
{
  "referralCode": "string",
  "referralLink": "string",
  "totalEarned": "number",
  "referredCount": "number"
}
```

---

### GET /referral/history
Get all players referred by the current user.

**Response 200** `User[]`

---

## Admin — Deposits

### GET /admin/deposit/pending  _(Admin only)_
List all pending deposit requests.

### GET /admin/deposit/:id  _(Admin only)_
Get a specific deposit.

### POST /admin/deposit/:id/approve  _(Admin only)_
Approve a deposit and credit the player's main wallet.

### POST /admin/deposit/:id/reject  _(Admin only)_
Reject a deposit with an optional reason.

**Body**
```json
{ "reason": "string" }
```

---

## Admin — Withdrawals

### GET /admin/withdrawal/pending  _(Admin only)_
List all pending withdrawal requests.

### POST /admin/withdrawal/:id/approve  _(Admin only)_
Approve a withdrawal and debit the player's winning wallet.

### POST /admin/withdrawal/:id/reject  _(Admin only)_
Reject a withdrawal.

**Body**
```json
{ "reason": "string" }
```

### PUT /admin/withdrawal/:id/utr  _(Admin only)_
Set the UTR of a processed withdrawal.

**Body**
```json
{ "utr": "string" }
```

### PUT /admin/withdrawal/:id/notes  _(Admin only)_
Add internal notes to a withdrawal.

**Body**
```json
{ "notes": "string" }
```

---

## Admin — Wallet

### POST /admin/wallet/credit  _(Admin only)_
Manually credit a player's wallet.

**Body**
```json
{ "userId": "string", "walletType": "MAIN | WINNING | REFERRAL", "amount": 100, "reason": "string" }
```

### POST /admin/wallet/debit  _(Admin only)_
Manually debit a player's wallet.

**Body**
```json
{ "userId": "string", "walletType": "MAIN | WINNING | REFERRAL", "amount": 100, "reason": "string" }
```

---

## Admin — Referral Config

### GET /admin/referral/config  _(Admin only)_
Get the current referral reward configuration.

**Response 200**
```json
{ "rewardAmount": 10 }
```

### PUT /admin/referral/config  _(Admin only)_
Update the referral reward amount.

**Body**
```json
{ "rewardAmount": 15 }
```

---

## Health

### GET /health  _(Public)_
Check API and database health.

**Response 200**
```json
{ "status": "ok", "info": { "database": { "status": "up" } } }
```

---

## WebSocket Events

**Gateway URL**: `ws://localhost:3000/game`  
**Auth**: Pass `Authorization: Bearer <token>` as socket `auth.token` during handshake.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `JOIN_ROOM` | `{ matchId }` | Join a game room |
| `LEAVE_ROOM` | — | Leave the current room |
| `ROLL_DICE` | `{ matchId }` | Roll the dice (server validates it's your turn) |
| `MOVE_TOKEN` | `{ matchId, tokenId }` | Move a token after rolling |
| `HEARTBEAT` | — | Keep connection alive |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `GAME_STATE` | `{ matchId, compressedState }` | Full compressed game state |
| `TURN_CHANGE` | `{ currentPlayer }` | Turn changed |
| `MATCH_START` | `{ matchId }` | Match has started |
| `MATCH_END` | `{ matchId, winnerId, compressedState }` | Match is over |
| `PLAYER_DISCONNECT` | `{ playerId }` | A player disconnected |
| `PLAYER_RECONNECT` | `{ playerId }` | A player reconnected |
| `ERROR` | `{ code, message }` | An error occurred |

---

## Error Codes

| HTTP Code | Meaning |
|---|---|
| 400 | Bad Request / Validation error |
| 401 | Unauthorized — invalid or expired token |
| 403 | Forbidden — insufficient role |
| 404 | Resource not found |
| 409 | Conflict — duplicate entry |
| 422 | Unprocessable entity |
| 429 | Rate limited |
| 500 | Internal server error |
