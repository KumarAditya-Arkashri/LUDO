# Ludo Arena — Operations Runbook

This runbook covers common production scenarios for on-call engineers.

---

## Service Architecture

```
Internet → Nginx (443/80) → NestJS API (3000) → PostgreSQL (5432)
                                              → Redis (6379)
          Socket.IO (443 wss://) → NestJS WS → Redis (game state)
```

---

## Health Check

```bash
curl https://api.ludoarena.app/health
```

Expected response:
```json
{ "status": "ok", "info": { "database": { "status": "up" } } }
```

If this fails, check:
1. NestJS process is running
2. PostgreSQL connectivity
3. Nginx proxy configuration

---

## Starting / Stopping Services

### Docker
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Restart backend only
docker-compose -f docker-compose.prod.yml restart backend

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Stop all
docker-compose -f docker-compose.prod.yml down
```

### Manual
```bash
# Backend
cd /app/backend && node dist/main.js

# Check if running
ps aux | grep "node dist/main"

# Graceful kill (NestJS handles SIGTERM)
kill -SIGTERM <PID>
```

---

## Common Incidents

### 1. Backend is down (5xx errors)

**Symptoms**: Players cannot log in, all API calls fail.

**Steps**:
1. `curl https://api.ludoarena.app/health` — check response
2. `docker logs ludo-backend --tail 100` — check for startup errors
3. Check database: `docker exec ludo-postgres pg_isready`
4. Check env vars: `docker exec ludo-backend env | grep DATABASE_URL`
5. Restart: `docker-compose restart backend`

---

### 2. Database connection failure

**Symptoms**: `health` returns `{ "status": "error", "info": { "database": { "status": "down" } } }`

**Steps**:
1. `docker exec ludo-postgres pg_isready -U user` — is Postgres running?
2. `docker stats ludo-postgres` — check memory/disk
3. `df -h` — check disk space (Postgres fails silently on full disk)
4. Review `DATABASE_URL` for correct credentials
5. If disk full: free up space, then restart Postgres

---

### 3. Redis connectivity issues

**Symptoms**: Socket.IO game state not persisting, match state lost on reconnect.

**Steps**:
1. `docker exec ludo-redis redis-cli ping` — should return `PONG`
2. Check Redis logs: `docker logs ludo-redis --tail 50`
3. Check memory: `docker exec ludo-redis redis-cli info memory | grep used_memory_human`
4. Flush stale game data (CAUTION - only if necessary):
   ```bash
   docker exec ludo-redis redis-cli keys "match:*" | xargs docker exec ludo-redis redis-cli del
   ```
5. Restart Redis: `docker-compose restart redis`

---

### 4. Stuck pending deposits

**Symptoms**: Players report deposit not credited after long wait.

**Investigation**:
```sql
SELECT * FROM "Deposit" WHERE status = 'PENDING' ORDER BY "createdAt" ASC;
```

**Actions**:
1. Verify UTR with payment provider
2. If valid: Use Admin Panel → Deposits → Approve
3. If invalid: Admin Panel → Deposits → Reject
4. If system error: Manually credit via Admin → Wallet → Credit

---

### 5. Match stuck / not settling

**Symptoms**: Game appears over but winner not credited.

**Investigation**:
```bash
# Check Redis for stuck match state
docker exec ludo-redis redis-cli keys "match:*"
docker exec ludo-redis redis-cli get "match:<matchId>"
```

```sql
-- Check match in DB
SELECT * FROM "Match" WHERE id = '<matchId>';

-- Check settlement
SELECT * FROM "Transaction" WHERE "referenceId" LIKE '%<matchId>%';
```

**Actions**:
1. If match is over in Redis but DB not updated: Trigger settlement manually
2. Check backend logs for settlement errors:
   ```bash
   docker logs ludo-backend | grep "Settlement"
   ```
3. Manual settlement: Use Admin → Wallet → Credit for the winner

---

### 6. Player can't withdraw

**Symptoms**: Player submits withdrawal but nothing happens.

**Investigation**:
```sql
SELECT * FROM "Withdrawal" WHERE "userId" = '<userId>' ORDER BY "createdAt" DESC;
```

**Check**:
- Is the status `PENDING`? → Admin needs to approve
- Is the status `FAILED`? → Check error logs
- Does the player have sufficient Winning Wallet balance?

---

### 7. JWT / Auth errors (401 floods)

**Symptoms**: Many 401 errors in logs.

**Check**:
1. Is `JWT_ACCESS_SECRET` set correctly?
2. Did the secret change? (Invalidates all existing sessions — users need to log in again)
3. Clock skew between servers? (JWT validation depends on time)

---

## Database Maintenance

### View slow queries
```sql
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Check table sizes
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Run migration (never rollback in prod without testing)
```bash
cd backend
npx prisma migrate deploy
```

---

## Log Locations

| Service | Log Command |
|---|---|
| Backend | `docker logs ludo-backend -f` |
| Postgres | `docker logs ludo-postgres -f` |
| Redis | `docker logs ludo-redis -f` |
| Nginx | `docker logs ludo-nginx -f` |

---

## Emergency Contacts

| Role | Contact |
|---|---|
| Lead Developer | developer@ludoarena.app |
| Database Admin | dba@ludoarena.app |
| Infrastructure | infra@ludoarena.app |
