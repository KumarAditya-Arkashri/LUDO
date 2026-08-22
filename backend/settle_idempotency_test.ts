import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SettlementService } from './src/settlement/settlement.service';
import { PrismaService } from './src/prisma/prisma.service';
import { RedisService } from './src/redis/redis.service';
import { WalletService } from './src/wallet/wallet.service';
import { WalletType, TransactionType } from '@prisma/client';
import * as crypto from 'crypto';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const settlementService = app.get(SettlementService);
  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);
  const walletService = app.get(WalletService);

  // Create test user
  const userId = crypto.randomUUID();
  await prisma.user.create({ data: { id: userId, mobile: `99${Date.now()}`, name: 'Test', passwordHash: 'x', referralCode: `T${Date.now()}` }});
  
  // Fund user
  await walletService.transact(userId, WalletType.MAIN, TransactionType.DEPOSIT, 1000, `DEP_${userId}`, 'Test deposit');
  
  const matchId = 'test-match-idempotency-001';
  const fakeState = {
    version: 1,
    matchState: {
      id: matchId,
      metadata: { entryFee: 50 },
      players: [{ id: userId }, { id: crypto.randomUUID() }],
      winner: userId,
      state: 'COMPLETED'
    }
  };
  
  // Clear any existing settlement lock
  await redis.getClient().del(`settled:${matchId}`);
  await redis.getClient().del(`lock:settlement:${matchId}`);

  console.log('=== IDEMPOTENCY TEST: Call settleMatch 5 times ===');
  
  const beforeBalance = await walletService.getBalance(userId);
  console.log('Before:', { MAIN: beforeBalance.MAIN?.toString(), WINNING: beforeBalance.WINNING?.toString() });
  
  // Call 5 times concurrently
  const results = await Promise.allSettled([
    settlementService.settleMatch(matchId, fakeState as any),
    settlementService.settleMatch(matchId, fakeState as any),
    settlementService.settleMatch(matchId, fakeState as any),
    settlementService.settleMatch(matchId, fakeState as any),
    settlementService.settleMatch(matchId, fakeState as any),
  ]);
  
  const afterBalance = await walletService.getBalance(userId);
  console.log('After:', { MAIN: afterBalance.MAIN?.toString(), WINNING: afterBalance.WINNING?.toString() });
  
  // Count GAME_WIN entries
  const winEntries = await prisma.ledger.count({
    where: { userId, transactionType: TransactionType.GAME_WIN }
  });
  console.log(`GAME_WIN ledger entries count: ${winEntries} (expected: 1)`);
  console.log(`Idempotency: ${winEntries === 1 ? 'PASS' : 'FAIL - DUPLICATE PAYOUT!'}`);
  
  // Cleanup
  await prisma.ledger.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await redis.getClient().del(`settled:${matchId}`);
  
  await app.close();
}

run().catch(console.error).finally(() => process.exit(0));
