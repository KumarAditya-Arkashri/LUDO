import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionType, DepositStatus, WithdrawalStatus } from '@prisma/client';

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      depositsTodayAgg,
      withdrawalsTodayAgg,
      gameEntriesAgg,
      gameWinsAgg,
      latestDeposits,
      latestWithdrawals
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.deposit.aggregate({
        _sum: { amount: true },
        where: { status: DepositStatus.APPROVED, createdAt: { gte: today } }
      }),
      this.prisma.withdrawal.aggregate({
        _sum: { amount: true },
        where: { status: WithdrawalStatus.APPROVED, createdAt: { gte: today } }
      }),
      this.prisma.ledger.aggregate({
        _sum: { amount: true },
        where: { transactionType: TransactionType.GAME_ENTRY }
      }),
      this.prisma.ledger.aggregate({
        _sum: { amount: true },
        where: { transactionType: TransactionType.GAME_WIN }
      }),
      this.prisma.deposit.findMany({
        where: { status: DepositStatus.APPROVED },
        include: { user: { select: { name: true } }, verifiedBy: { select: { name: true } } },
        orderBy: { verifiedAt: 'desc' },
        take: 3
      }),
      this.prisma.withdrawal.findMany({
        where: { status: WithdrawalStatus.APPROVED },
        include: { user: { select: { name: true } }, verifiedBy: { select: { name: true } } },
        orderBy: { verifiedAt: 'desc' },
        take: 3
      })
    ]);

    // Revenue calculation
    const totalEntries = Math.abs(Number(gameEntriesAgg._sum.amount ?? 0));
    const totalWins = Number(gameWinsAgg._sum.amount ?? 0);
    const platformRevenue = totalEntries - totalWins;

    // Combine latest approvals
    const latestApprovals = [
      ...latestDeposits.map(d => ({ ...d, type: 'DEPOSIT' })),
      ...latestWithdrawals.map(w => ({ ...w, type: 'WITHDRAWAL' }))
    ].sort((a, b) => (b.verifiedAt?.getTime() ?? 0) - (a.verifiedAt?.getTime() ?? 0))
     .slice(0, 5);

    return {
      totalUsers,
      depositsToday: Number(depositsTodayAgg._sum.amount ?? 0),
      payoutsToday: Number(withdrawalsTodayAgg._sum.amount ?? 0),
      platformRevenue,
      latestApprovals,
    };
  }
}
