import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SettlementService } from './src/settlement/settlement.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const settlementService = app.get(SettlementService);
  
  const matchId = process.argv[2];
  const winnerId = process.argv[3];
  const p1Id = process.argv[4];
  const p2Id = process.argv[5];
  
  const fullGameState = {
    version: 1,
    matchState: {
      id: matchId,
      metadata: { entryFee: 50 },
      players: [{id: p1Id}, {id: p2Id}],
      winner: winnerId,
      state: 'COMPLETED'
    }
  };
  
  await settlementService.settleMatch(matchId, fullGameState as any);
  await app.close();
}

run().catch(console.error).finally(() => process.exit(0));
