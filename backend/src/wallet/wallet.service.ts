import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletType, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the balance of all wallets for a specific user
   * by summing up the Ledger entries.
   */
  async getBalance(userId: string) {
    const group = await this.prisma.ledger.groupBy({
      by: ['walletType'],
      where: { userId },
      _sum: { amount: true },
    });

    const balances = {
      [WalletType.MAIN]: new Prisma.Decimal(0),
      [WalletType.WINNING]: new Prisma.Decimal(0),
      [WalletType.REFERRAL]: new Prisma.Decimal(0),
      [WalletType.BONUS]: new Prisma.Decimal(0),
      [WalletType.SYSTEM]: new Prisma.Decimal(0),
    };

    group.forEach((g) => {
      balances[g.walletType] = g._sum.amount || new Prisma.Decimal(0);
    });

    return balances;
  }

  /**
   * Internal helper to calculate balance of a specific wallet type for a user
   * safely inside a transaction.
   */
  async getWalletBalanceTx(
    tx: Prisma.TransactionClient,
    userId: string,
    walletType: WalletType,
  ): Promise<Prisma.Decimal> {
    const result = await tx.ledger.aggregate({
      where: { userId, walletType },
      _sum: { amount: true },
    });
    return result._sum.amount || new Prisma.Decimal(0);
  }

  /**
   * Executes a double-entry transaction.
   * Checks for sufficient funds if the amount is negative for the user.
   */
  async transact(
    userId: string,
    walletType: WalletType,
    transactionType: TransactionType,
    amount: Prisma.Decimal | number,
    referenceId?: string,
    description?: string,
    externalTx?: Prisma.TransactionClient,
  ) {
    const decimalAmount = new Prisma.Decimal(amount);

    // Disallow 0 or empty transactions conceptually (optional, but good practice)
    if (decimalAmount.isZero()) {
      throw new BadRequestException('Transaction amount cannot be zero');
    }

    const doTransact = async (tx: Prisma.TransactionClient) => {
      // 0. Pessimistic Lock on User to serialize wallet updates
      if (userId) {
        await tx.$executeRawUnsafe(
          `SELECT id FROM "User" WHERE id = $1 FOR UPDATE`,
          userId,
        );
      }

      // 1. Check idempotency if referenceId is provided
      if (referenceId) {
        const existing = await tx.ledger.findUnique({
          where: {
            userId_referenceId_transactionType: {
              userId,
              referenceId,
              transactionType,
            },
          },
        });
        if (existing) {
          // Idempotent return or throw? Usually return the existing transaction.
          return existing;
        }
      }

      // 2. If it's a debit (negative amount), ensure sufficient funds
      if (decimalAmount.isNegative()) {
        const currentBalance = await this.getWalletBalanceTx(
          tx,
          userId,
          walletType,
        );
        if (currentBalance.plus(decimalAmount).isNegative()) {
          throw new BadRequestException(
            `Insufficient funds in ${walletType} wallet`,
          );
        }
      }

      // 3. Create the user's ledger entry
      const userEntry = await tx.ledger.create({
        data: {
          userId,
          walletType,
          transactionType,
          amount: decimalAmount,
          referenceId,
          description,
        },
      });

      // 4. Create the corresponding double-entry for the SYSTEM (House)
      // The house absorbs the inverse of the user's transaction.
      await tx.ledger.create({
        data: {
          userId: null, // Null indicates the house/system
          walletType: WalletType.SYSTEM,
          transactionType,
          amount: decimalAmount.negated(),
          referenceId: referenceId ? `SYS_${referenceId}` : undefined,
          description: `Double-entry for user ${userId}: ${description || ''}`,
        },
      });

      return userEntry;
    };

    return externalTx
      ? doTransact(externalTx)
      : this.prisma.$transaction(doTransact);
  }

  /**
   * Executes multiple transactions atomically within a single database transaction.
   * Useful for partial wallet deductions (e.g. some from MAIN, some from WINNING).
   */
  async transactMultiple(
    transactions: {
      userId: string;
      walletType: WalletType;
      transactionType: TransactionType;
      amount: Prisma.Decimal | number;
      referenceId?: string;
      description?: string;
    }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const t of transactions) {
        const res = await this.transact(
          t.userId,
          t.walletType,
          t.transactionType,
          t.amount,
          t.referenceId,
          t.description,
          tx,
        );
        results.push(res);
      }
      return results;
    });
  }

  /**
   * Retrieves paginated transaction history for a user
   */
  async getHistory(userId: string, skip: number = 0, take: number = 20) {
    const [transactions, total] = await Promise.all([
      this.prisma.ledger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.ledger.count({ where: { userId } }),
    ]);

    return { transactions, total };
  }
}
