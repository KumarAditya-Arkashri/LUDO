import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { io } from 'socket.io-client';
import { createClient } from 'redis';

const prisma = new PrismaClient();
const API = 'http://localhost:3000/v1';
const WS = 'http://localhost:3000/matchmaking';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function getLedger(userId: string) {
  return prisma.ledger.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

async function getWallet(userId: string) {
  const group = await prisma.ledger.groupBy({
      by: ['walletType'],
      where: { userId },
      _sum: { amount: true },
  });
  const res = { MAIN: 0, WINNING: 0, REFERRAL: 0, BONUS: 0 };
  group.forEach(g => {
    res[g.walletType] = g._sum.amount?.toNumber() || 0;
  });
  return res;
}

async function run() {
  console.log("==========================================");
  console.log("PHASE 2 - 2 REAL PLAYERS");
  const p1Mobile = "99999" + Math.floor(10000+Math.random()*90000);
  const p2Mobile = "88888" + Math.floor(10000+Math.random()*90000);

  const r1 = await axios.post(`${API}/auth/register`, { name: 'Player1', mobile: p1Mobile, password: 'password' });
  const p1 = r1.data.data.user;
  const t1 = r1.data.data.accessToken;

  const r2 = await axios.post(`${API}/auth/register`, { name: 'Player2', mobile: p2Mobile, password: 'password' });
  const p2 = r2.data.data.user;
  const t2 = r2.data.data.accessToken;

  console.log(`P1: ${p1.id}, P2: ${p2.id}`);

  // Inject 100 Rs
  await prisma.ledger.create({ data: { userId: p1.id, walletType: 'MAIN', transactionType: 'DEPOSIT', amount: 100, referenceId: 'DEP1_'+Date.now() }});
  await prisma.ledger.create({ data: { userId: p2.id, walletType: 'MAIN', transactionType: 'DEPOSIT', amount: 100, referenceId: 'DEP2_'+Date.now() }});

  console.log("P1 Before:", await getWallet(p1.id));
  console.log("P2 Before:", await getWallet(p2.id));

  // Connect sockets
  const s1 = io(WS, { extraHeaders: { Authorization: `Bearer ${t1}` } });
  const s2 = io(WS, { extraHeaders: { Authorization: `Bearer ${t2}` } });
  
  await new Promise<void>(r => s1.on('connect', () => r()));
  await new Promise<void>(r => s2.on('connect', () => r()));

  console.log("==========================================");
  console.log("PHASE 3 - CREATE BATTLE");
  s1.emit('CREATE_BATTLE', { entryFee: 50 });
  
  let battle: any;
  await new Promise<void>(r => {
    s1.on('BATTLE_ADDED', (data) => {
      battle = data;
      r();
    });
  });
  console.log("Battle created:", battle.id);
  
  await delay(1000); // give DB time
  console.log("P1 After Create:", await getWallet(p1.id));
  const l1 = await getLedger(p1.id);
  console.log("P1 Ledger:");
  l1.forEach(l => console.log(`  ${l.transactionType} | ${l.amount} | ${l.referenceId}`));

  console.log("==========================================");
  console.log("PHASE 10 - CANCEL BATTLE / REFUND");
  s1.emit('CANCEL_BATTLE', { battleId: battle.id });
  await new Promise<void>(r => {
    s1.on('BATTLE_REMOVED', () => r());
  });
  await delay(1000);
  console.log("P1 After Cancel:", await getWallet(p1.id));
  const l1c = await getLedger(p1.id);
  console.log("P1 Ledger after Cancel:");
  l1c.forEach(l => console.log(`  ${l.transactionType} | ${l.amount} | ${l.referenceId}`));


  console.log("==========================================");
  console.log("PHASE 4 - ACCEPT BATTLE (creating new battle first)");
  s1.emit('CREATE_BATTLE', { entryFee: 50 });
  await new Promise<void>(r => {
    s1.on('BATTLE_ADDED', (data) => {
      battle = data;
      r();
    });
  });

  s2.emit('ACCEPT_BATTLE', { battleId: battle.id });
  await new Promise<void>(r => {
    s2.on('BATTLE_UPDATED', (b) => {
      if (b.status === 'ACCEPTED') r();
    });
  });
  console.log("Battle accepted by P2");
  
  await delay(1000);
  console.log("P2 After Accept:", await getWallet(p2.id));
  const l2 = await getLedger(p2.id);
  console.log("P2 Ledger:");
  l2.forEach(l => console.log(`  ${l.transactionType} | ${l.amount} | ${l.referenceId}`));

  console.log("==========================================");
  console.log("START BATTLE & GAME SETTLEMENT");
  s1.emit('START_BATTLE', { battleId: battle.id });
  await new Promise<void>(r => {
    s1.on('BATTLE_REMOVED', () => r()); // It moves to active state and is removed from lobby
  });
  
  await delay(1000); // Give game engine time to initialize
  console.log("Battle started, sending mock GAME_ENDED event via redis...");

  // Send a settlement pub/sub message directly to simulate backend game engine completing
  const redis = createClient({ url: 'redis://localhost:6379' });
  await redis.connect();
  const gameEndedState = {
    matchState: {
      id: battle.id,
      metadata: { entryFee: 50 },
      players: [{id: p1.id}, {id: p2.id}],
      winner: p1.id,
      state: 'COMPLETED'
    }
  };
  require('child_process').execSync(`npx ts-node scratch-audit-ws-settlement.ts ${battle.id} ${p1.id} ${p1.id} ${p2.id}`, {stdio: 'inherit'});
  
  console.log("Waiting 2s for settlement to process...");
  await delay(2000);

  console.log("P1 Final Wallet:", await getWallet(p1.id));
  console.log("P2 Final Wallet:", await getWallet(p2.id));
  const lf1 = await getLedger(p1.id);
  console.log("P1 Final Ledger:");
  lf1.forEach(l => console.log(`  ${l.transactionType} | ${l.amount} | ${l.referenceId}`));

  s1.disconnect();
  s2.disconnect();
  await redis.disconnect();
}

run().catch(console.error).finally(() => prisma.$disconnect());
