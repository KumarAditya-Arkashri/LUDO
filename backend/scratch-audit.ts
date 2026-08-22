import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3000/v1';

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

  console.log("==========================================");
  console.log("PHASE 3 - CREATE BATTLE");
  const c1 = await axios.post(`${API}/battles/create`, { amount: 50 }, { headers: { Authorization: `Bearer ${t1}` } });
  const battle = c1.data.data;
  console.log("Battle created:", battle.id);
  console.log("P1 After Create:", await getWallet(p1.id));
  const l1 = await getLedger(p1.id);
  console.log("P1 Ledger:");
  l1.forEach(l => console.log(`  ${l.transactionType} | ${l.amount} | ${l.referenceId}`));

  console.log("==========================================");
  console.log("PHASE 4 - ACCEPT BATTLE");
  await axios.post(`${API}/battles/accept/${battle.id}`, {}, { headers: { Authorization: `Bearer ${t2}` } });
  console.log("Battle accepted by P2");
  console.log("P2 After Accept:", await getWallet(p2.id));
  const l2 = await getLedger(p2.id);
  console.log("P2 Ledger:");
  l2.forEach(l => console.log(`  ${l.transactionType} | ${l.amount} | ${l.referenceId}`));

}

run().catch(console.error).finally(() => prisma.$disconnect());
