import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: 'player1' },
    update: {},
    create: {
      id: 'player1',
      name: 'Player 1',
      mobile: '1111111111',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'dummy'
    }
  });
  
  await prisma.ledger.create({
    data: {
      userId: 'player1',
      wallet: 'MAIN',
      type: 'ADMIN_CREDIT',
      amount: 1000,
      balance: 1000,
      description: 'Initial'
    }
  }).catch(() => {});

  await prisma.user.upsert({
    where: { id: 'player2' },
    update: {},
    create: {
      id: 'player2',
      name: 'Player 2',
      mobile: '2222222222',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'dummy'
    }
  });

  await prisma.ledger.create({
    data: {
      userId: 'player2',
      wallet: 'MAIN',
      type: 'ADMIN_CREDIT',
      amount: 1000,
      balance: 1000,
      description: 'Initial'
    }
  }).catch(() => {});

  console.log("Seeded users");
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
