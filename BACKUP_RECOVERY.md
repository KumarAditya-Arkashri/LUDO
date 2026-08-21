# Ludo Arena — Backup & Recovery Guide

---

## Overview

This document covers the backup strategy for all stateful services in the Ludo Arena platform:
- PostgreSQL (primary database — all user, wallet, match, and transaction data)
- Redis (ephemeral game state — can be reconstructed but recovery is desirable)

---

## PostgreSQL Backup

### Automated Daily Backup (recommended)

Create a backup script at `/opt/scripts/backup.sh`:

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
BACKUP_FILE="$BACKUP_DIR/ludo_arena_$TIMESTAMP.sql.gz"
CONTAINER="ludo-arena-postgres"

mkdir -p "$BACKUP_DIR"

# Dump database
docker exec "$CONTAINER" pg_dump -U user ludo_arena | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"

# Retain only the last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Old backups pruned."
```

Make executable:
```bash
chmod +x /opt/scripts/backup.sh
```

Schedule with cron (daily at 3 AM):
```bash
0 3 * * * /opt/scripts/backup.sh >> /var/log/ludo-backup.log 2>&1
```

---

### Manual Backup

```bash
# Full database dump
docker exec ludo-arena-postgres pg_dump -U user ludo_arena > backup_$(date +%Y%m%d).sql

# Compressed
docker exec ludo-arena-postgres pg_dump -U user ludo_arena | gzip > backup_$(date +%Y%m%d).sql.gz

# Specific tables only
docker exec ludo-arena-postgres pg_dump -U user ludo_arena -t "User" -t "Transaction" -t "Deposit" -t "Withdrawal" > critical_tables_backup.sql
```

---

### Restore from Backup

> ⚠️ **CAUTION**: Restore will overwrite existing data. Only do this after stopping the application.

```bash
# 1. Stop the application
docker-compose down backend

# 2. Drop and recreate database
docker exec ludo-arena-postgres psql -U user -c "DROP DATABASE IF EXISTS ludo_arena;"
docker exec ludo-arena-postgres psql -U user -c "CREATE DATABASE ludo_arena;"

# 3. Restore from backup file
# For uncompressed:
cat backup_20240101.sql | docker exec -i ludo-arena-postgres psql -U user ludo_arena

# For compressed:
gunzip -c backup_20240101.sql.gz | docker exec -i ludo-arena-postgres psql -U user ludo_arena

# 4. Re-run Prisma migrations to ensure schema is up to date
cd backend && npx prisma migrate deploy

# 5. Restart application
docker-compose up -d backend
```

---

### Point-in-Time Recovery (Advanced)

For production with WAL archiving enabled:

```bash
# In postgresql.conf:
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'

# Restore to specific point in time:
# 1. Copy base backup to data directory
# 2. Create recovery.signal file
# 3. Set recovery_target_time in postgresql.conf
# 4. Start Postgres — it will replay WAL to target time
```

---

## Redis Backup

Redis game state is ephemeral — active matches are stored in Redis with a TTL. If Redis is lost during an active match, the match may be unresolvable.

### RDB Snapshot (default)

Redis saves snapshots automatically. Verify in `redis.conf`:
```
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /data
```

### Manual Snapshot

```bash
# Trigger immediate snapshot
docker exec ludo-arena-redis redis-cli BGSAVE

# Copy the dump file
docker cp ludo-arena-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Restore Redis

```bash
# 1. Stop Redis
docker-compose stop redis

# 2. Copy backup file to container volume
docker cp redis-backup-20240101.rdb ludo-arena-redis:/data/dump.rdb

# 3. Start Redis — it will load from dump.rdb
docker-compose start redis
```

---

## Critical Data Priority

| Data | Priority | Backup Frequency |
|---|---|---|
| User accounts | Critical | Daily + WAL |
| Wallet transactions | Critical | Daily + WAL |
| Deposits / Withdrawals | Critical | Daily + WAL |
| Match results | High | Daily |
| Active Redis game state | Medium | RDB snapshots |
| Audit logs | High | Daily |

---

## Recovery Time Objectives (RTO / RPO)

| Scenario | Expected Recovery Time | Data Loss (max) |
|---|---|---|
| Backend restart | < 1 minute | None |
| Database restore from backup | 15–30 minutes | Up to 24 hours |
| Full infrastructure rebuild | 1–2 hours | Up to 24 hours |
| Database restore with WAL | 30–60 minutes | Minutes |

---

## Backup Verification

Run monthly backup verification:

```bash
# Restore backup to a test environment
docker exec postgres-test pg_dump -U user ludo_arena_test | gzip > /tmp/test_restore.sql.gz

# Verify row counts match production
docker exec postgres-test psql -U user -c "SELECT COUNT(*) FROM \"User\";"
docker exec postgres-prod psql -U user -c "SELECT COUNT(*) FROM \"User\";"
```

Document the test result with timestamp in the backup log.

---

## Offsite Storage

After daily backup, copy to a remote location:

```bash
# Example: Copy to S3-compatible storage
aws s3 cp /backups/postgres/ludo_arena_$(date +%Y%m%d).sql.gz s3://ludo-arena-backups/postgres/

# Example: Copy to remote server
scp /backups/postgres/latest.sql.gz backup-server:/backups/ludo-arena/
```

Keep at least **30 days** of backups in offsite storage.
