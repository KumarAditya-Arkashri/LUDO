# Performance Profiling Report

## State Management
- **Redis Compression**: The `GameState` payload sizes are natively reduced via `zlib.deflateSync` inside `StateCompressor` before emitting over Socket.IO. This drastically reduces bandwidth consumption across large client clusters.
- **State Expiry**: Redis `GameState` values natively persist in memory without expiration while active. Upon match termination (`closeRoom`), a strict TTL of 3600 seconds is applied, guaranteeing automatic memory reclamation.

## Matchmaking
- **Queue System**: Standard arrays stored in Redis. This approach scales reasonably up to millions of queue entries, but may introduce minor latency when checking queue array lengths compared to native sets.
- **Match Formation**: Executed synchronously, but correctly implements atomic lua locks to prevent race conditions during heavy matchmaking spikes.

## Known Bottlenecks (MEDIUM Severity)
### N+1 Query Vector: `WalletService.getBalance`
- **Description**: Calculating user balances relies on executing Prisma aggregations over the entire `Ledger` history (`sum(amount) group by walletType`). 
- **Impact**: As a highly active user accumulates thousands of ledger entries, fetching their balance inside hot-paths (e.g. queue joins, socket handshakes) will introduce heavy O(N) database load.
- **Recommendation**: Implement a materialized view in PostgreSQL, or natively persist `mainBalance` and `winningBalance` columns directly inside the `User` table, updating them simultaneously during `$transaction` ledger operations. (Not immediately resolved in Sprint 7.3 as it necessitates minor schema alterations, but highly advised before a 500k+ MAU scale).
