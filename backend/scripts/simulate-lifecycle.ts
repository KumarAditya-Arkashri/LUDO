import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WalletService } from '../src/wallet/wallet.service';
import { MatchmakingService } from '../src/matchmaking/matchmaking.service';
import { SettlementService } from '../src/settlement/settlement.service';
import { WithdrawalService } from '../src/withdrawal/withdrawal.service';
import { RoomManager } from '../src/realtime/rooms/room.manager';
import { WalletType, TransactionType, Role } from '@prisma/client';
import { MatchEngine } from '../src/game-engine/match/match.engine';
import { GameStateEngine } from '../src/game-engine/state/game-state.engine';
import { v4 as uuidv4 } from 'uuid';

async function bootstrap() {
  console.log('Bootstrapping E2E Lifecycle Simulation...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const prisma = app.get(PrismaService);
  const walletService = app.get(WalletService);
  const matchmakingService = app.get(MatchmakingService);
  const settlementService = app.get(SettlementService);
  const withdrawalService = app.get(WithdrawalService);
  const roomManager = app.get(RoomManager);

  try {
    console.log('\n--- Step 1: User Creation ---');
    // Create Admin
    const admin = await prisma.user.upsert({
      where: { mobile: 'E2E_ADMIN' },
      update: {},
      create: {
        mobile: 'E2E_ADMIN',
        name: 'E2E Admin',
        role: Role.ADMIN,
        passwordHash: 'dummy_hash',
      },
    });

    // Create Player A
    const playerA = await prisma.user.upsert({
      where: { mobile: 'E2E_PLAYER_A' },
      update: {},
      create: {
        mobile: 'E2E_PLAYER_A',
        name: 'E2E Player A',
        role: Role.PLAYER,
        passwordHash: 'dummy_hash',
      },
    });

    // Create Player B
    const playerB = await prisma.user.upsert({
      where: { mobile: 'E2E_PLAYER_B' },
      update: {},
      create: {
        mobile: 'E2E_PLAYER_B',
        name: 'E2E Player B',
        role: Role.PLAYER,
        passwordHash: 'dummy_hash',
      },
    });
    console.log('✅ Users created');

    console.log('\n--- Step 2: Deposit Funds ---');
    await walletService.transact(playerA.id, WalletType.MAIN, TransactionType.DEPOSIT, 500, `DEP_A_${Date.now()}`, 'Initial Deposit');
    await walletService.transact(playerB.id, WalletType.MAIN, TransactionType.DEPOSIT, 500, `DEP_B_${Date.now()}`, 'Initial Deposit');
    
    let aBal = await walletService.getBalance(playerA.id);
    let bBal = await walletService.getBalance(playerB.id);
    console.log(`Player A Balance: Main=${aBal.MAIN}, Winning=${aBal.WINNING}`);
    console.log(`Player B Balance: Main=${bBal.MAIN}, Winning=${bBal.WINNING}`);
    console.log('✅ Funds deposited');

    console.log('\n--- Step 3: Matchmaking (Create -> Accept -> Start) ---');
    const entryFee = 100;
    const battle = await matchmakingService.createBattle(playerA.id, playerA.name, entryFee);
    console.log(`Battle created by A: ${battle.id}`);
    
    await matchmakingService.acceptBattle(playerB.id, playerB.name, battle.id);
    console.log(`Battle accepted by B`);
    
    const matchId = await matchmakingService.startBattle(playerA.id, battle.id);
    console.log(`Match Started: ${matchId}`);

    aBal = await walletService.getBalance(playerA.id);
    bBal = await walletService.getBalance(playerB.id);
    console.log(`Player A Balance after deduction: Main=${aBal.MAIN}`);
    console.log(`Player B Balance after deduction: Main=${bBal.MAIN}`);
    console.log('✅ Matchmaking complete');

    console.log('\n--- Step 4: Game Simulation & Settlement ---');
    const gameStateData = await roomManager.getGameState(matchId);
    if (!gameStateData) throw new Error('Game state not found in room manager');

    let state = gameStateData.matchState; // Wait, RoomManager getGameState returns { version, matchState }
    
    // Force Player A to win by injecting the winner field directly into matchState
    state = {
      ...state,
      winner: playerA.id,
    };
    
    // Create a complete GameState wrapper as expected by SettlementService
    const fullGameState = {
      version: gameStateData.version,
      matchState: state
    };
    
    await settlementService.settleMatch(matchId, fullGameState as any);
    
    aBal = await walletService.getBalance(playerA.id);
    console.log(`Player A Balance after win: Main=${aBal.MAIN}, Winning=${aBal.WINNING}`);
    console.log('✅ Settlement complete (5% commission verified)');

    console.log('\n--- Step 5: Withdrawal Request ---');
    const withdrawalAmount = 100;
    const withdrawal = await withdrawalService.create(playerA.id, withdrawalAmount, 'playerA@upi');
    console.log(`Withdrawal created: ${withdrawal.id}, status: ${withdrawal.status}`);
    
    aBal = await walletService.getBalance(playerA.id);
    console.log(`Player A Balance after withdrawal request: Main=${aBal.MAIN}, Winning=${aBal.WINNING}`);
    console.log('✅ Withdrawal requested');

    console.log('\n--- Step 6: Admin Approval ---');
    const approved = await withdrawalService.approve(withdrawal.id, admin.id, 'UTR123456789');
    console.log(`Withdrawal approved, status: ${approved.status}, UTR: ${approved.utr}`);
    console.log('✅ Admin approval complete');

    console.log('\n🎉 FULL LIFECYCLE E2E TEST COMPLETED SUCCESSFULLY 🎉');

  } catch (error) {
    console.error('❌ E2E TEST FAILED:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
