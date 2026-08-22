import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MatchmakingService } from './src/matchmaking/matchmaking.service';
import { PrismaService } from './src/prisma/prisma.service';
import { WalletService } from './src/wallet/wallet.service';
import { WalletType, TransactionType } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const matchmakingService = app.get(MatchmakingService);
  const prisma = app.get(PrismaService);
  const walletService = app.get(WalletService);

  const userId = crypto.randomUUID();
  const hash = await bcrypt.hash('test', 10);
  await prisma.user.create({ data: { id: userId, mobile: `98${Date.now()}`, name: 'RefundTest', passwordHash: hash, referralCode: `R${Date.now()}` }});
  await walletService.transact(userId, WalletType.MAIN, TransactionType.DEPOSIT, 1000, `DEP_${userId}`, 'Test');

  const battle = await matchmakingService.createBattle(userId, 'RefundTest', 50);
  console.log('Battle created:', battle.id);
  
  const before = await walletService.getBalance(userId);
  console.log('Before cancel:', before.MAIN?.toString());
  
  // Try to cancel 5 times concurrently
  const results = await Promise.allSettled([
    matchmakingService.cancelBattle(userId, battle.id),
    matchmakingService.cancelBattle(userId, battle.id),
    matchmakingService.cancelBattle(userId, battle.id),
    matchmakingService.cancelBattle(userId, battle.id),
    matchmakingService.cancelBattle(userId, battle.id),
  ]);
  
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failCount = results.filter(r => r.status === 'rejected').length;
  console.log(`Results: ${successCount} succeeded, ${failCount} failed`);
  
  const after = await walletService.getBalance(userId);
  console.log('After cancel:', after.MAIN?.toString(), '(expected: 1000)');
  
  // Count refund entries
  const refundCount = await prisma.ledger.count({
    where: { userId, transactionType: TransactionType.REFUND }
  });
  console.log(`REFUND ledger entries: ${refundCount} (expected: 1)`);
  console.log(`Refund idempotency: ${refundCount === 1 && after.MAIN?.toNumber() === 1000 ? 'PASS' : 'FAIL'}`);
  
  // Cleanup
  await prisma.ledger.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await app.close();
}

run().catch(console.error).finally(() => process.exit(0));
