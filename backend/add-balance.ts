import { PrismaClient, WalletType, TransactionType } from '@prisma/client';
import crypto from 'crypto';

async function addBalance() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    await prisma.ledger.create({
      data: {
        userId: user.id,
        walletType: WalletType.MAIN,
        transactionType: TransactionType.DEPOSIT,
        amount: 1000,
        referenceId: crypto.randomUUID(),
        description: 'Testing Bonus',
      }
    });
    console.log(`Added 1000 to user ${user.mobile} (${user.id})`);
  }
  await prisma.$disconnect();
}
addBalance();
