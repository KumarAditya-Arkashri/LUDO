import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MatchmakingService } from './src/matchmaking/matchmaking.service';
import { SettlementService } from './src/settlement/settlement.service';
import { PrismaService } from './src/prisma/prisma.service';
import { WalletService } from './src/wallet/wallet.service';
import { RedisService } from './src/redis/redis.service';
import { WalletType, TransactionType } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const matchmaking = app.get(MatchmakingService);
  const settlement = app.get(SettlementService);
  const prisma = app.get(PrismaService);
  const walletService = app.get(WalletService);
  const redis = app.get(RedisService);

  const hash = await bcrypt.hash('test', 10);
  const p1id = crypto.randomUUID();
  const p2id = crypto.randomUUID();
  
  await prisma.user.create({ data: { id: p1id, mobile: `97${Date.now()}`, name: 'FinTest1', passwordHash: hash, referralCode: `F1${Date.now()}` }});
  await prisma.user.create({ data: { id: p2id, mobile: `96${Date.now()}`, name: 'FinTest2', passwordHash: hash, referralCode: `F2${Date.now()}` }});
  
  const DEPOSIT = 500;
  const ENTRY_FEE = 50;
  
  await walletService.transact(p1id, WalletType.MAIN, TransactionType.DEPOSIT, DEPOSIT, `DP1_${p1id}`, 'Deposit P1');
  await walletService.transact(p2id, WalletType.MAIN, TransactionType.DEPOSIT, DEPOSIT, `DP2_${p2id}`, 'Deposit P2');
  
  const b1Before = await walletService.getBalance(p1id);
  const b2Before = await walletService.getBalance(p2id);
  console.log('=== FINANCIAL RECONCILIATION ===');
  console.log(`P1 Opening: MAIN=${b1Before.MAIN} WINNING=${b1Before.WINNING}`);
  console.log(`P2 Opening: MAIN=${b2Before.MAIN} WINNING=${b2Before.WINNING}`);
  
  // Create and accept battle
  const battle = await matchmaking.createBattle(p1id, 'FinTest1', ENTRY_FEE);
  await matchmaking.acceptBattle(p2id, 'FinTest2', battle.id);
  const matchId = await matchmaking.startBattle(p1id, battle.id);
  
  console.log(`\nAfter Battle Start (Match: ${matchId})`);
  const b1AfterStart = await walletService.getBalance(p1id);
  const b2AfterStart = await walletService.getBalance(p2id);
  console.log(`P1 MAIN: ${b1AfterStart.MAIN} (expected: ${DEPOSIT - ENTRY_FEE})`);
  console.log(`P2 MAIN: ${b2AfterStart.MAIN} (expected: ${DEPOSIT - ENTRY_FEE})`);
  
  // Settle as P1 winning
  const fakeState: any = {
    version: 1,
    matchState: {
      id: matchId,
      metadata: { entryFee: ENTRY_FEE },
      players: [{ id: p1id }, { id: p2id }],
      winner: p1id,
      state: 'COMPLETED'
    }
  };
  await redis.getClient().del(`settled:${matchId}`);
  await settlement.settleMatch(matchId, fakeState);
  
  const b1Final = await walletService.getBalance(p1id);
  const b2Final = await walletService.getBalance(p2id);
  
  const totalPot = ENTRY_FEE * 2;
  const commission = totalPot * 0.05;
  const expectedPayout = totalPot - commission;
  
  console.log('\n=== FINAL RECONCILIATION ===');
  console.log(`P1 Final: MAIN=${b1Final.MAIN} WINNING=${b1Final.WINNING}`);
  console.log(`P2 Final: MAIN=${b2Final.MAIN} WINNING=${b2Final.WINNING}`);
  console.log(`Expected P1 WINNING: ${expectedPayout}`);
  
  const p1ExpectedMain = DEPOSIT - ENTRY_FEE;
  const p2ExpectedMain = DEPOSIT - ENTRY_FEE;
  
  console.log('\n=== BALANCE EQUATION ===');
  console.log(`P1: ${DEPOSIT} DEPOSIT - ${ENTRY_FEE} ENTRY + ${expectedPayout} WIN = ${DEPOSIT - ENTRY_FEE + expectedPayout}`);
  console.log(`P1 Actual total value: ${Number(b1Final.MAIN) + Number(b1Final.WINNING)}`);
  console.log(`P2: ${DEPOSIT} DEPOSIT - ${ENTRY_FEE} ENTRY = ${DEPOSIT - ENTRY_FEE}`);
  console.log(`P2 Actual total value: ${Number(b2Final.MAIN) + Number(b2Final.WINNING)}`);
  
  const p1MainOk = Number(b1Final.MAIN) === p1ExpectedMain;
  const p1WinOk = Math.abs(Number(b1Final.WINNING) - expectedPayout) < 0.01;
  const p2MainOk = Number(b2Final.MAIN) === p2ExpectedMain;
  const p2WinOk = Number(b2Final.WINNING) === 0;
  
  console.log('\n=== VERIFICATION ===');
  console.log(`P1 Main balance: ${p1MainOk ? 'PASS' : 'FAIL'}`);
  console.log(`P1 Winning credit: ${p1WinOk ? 'PASS' : 'FAIL'}`);
  console.log(`P2 Main balance: ${p2MainOk ? 'PASS' : 'FAIL'}`);
  console.log(`P2 No winning credit: ${p2WinOk ? 'PASS' : 'FAIL'}`);
  console.log(`Overall Financial Reconciliation: ${p1MainOk && p1WinOk && p2MainOk && p2WinOk ? 'PASS' : 'FAIL'}`);
  
  // Cleanup
  await prisma.ledger.deleteMany({ where: { userId: { in: [p1id, p2id] } } });
  await prisma.user.delete({ where: { id: p1id } });
  await prisma.user.delete({ where: { id: p2id } });
  await app.close();
}

run().catch(console.error).finally(() => process.exit(0));
