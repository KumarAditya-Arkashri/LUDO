import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { WithdrawalStatus, WalletType, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  // Configuration Constants
  private readonly MIN_WITHDRAWAL = new Prisma.Decimal(50);
  private readonly MAX_WITHDRAWAL = new Prisma.Decimal(100000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    userId: string,
    amount: number,
    upiId?: string,
    bankDetails?: string,
  ) {
    if (!upiId && !bankDetails) {
      throw new BadRequestException(
        'Either upiId or bankDetails must be provided',
      );
    }

    const decimalAmount = new Prisma.Decimal(amount);

    if (decimalAmount.lessThan(this.MIN_WITHDRAWAL)) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${this.MIN_WITHDRAWAL.toString()}`,
      );
    }

    if (decimalAmount.greaterThan(this.MAX_WITHDRAWAL)) {
      throw new BadRequestException(
        `Maximum withdrawal amount is ${this.MAX_WITHDRAWAL.toString()}`,
      );
    }

    // Ensure the user actually has enough balance at the time of creation
    const balances = await this.walletService.getBalance(userId);
    const winningBalance = balances[WalletType.WINNING];

    if (winningBalance.lessThan(decimalAmount)) {
      throw new BadRequestException('Insufficient WINNING wallet balance');
    }

    // Immediate deduction using transaction
    return this.prisma.$transaction(async (tx) => {
      // Create the withdrawal record first to get its ID
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          walletType: WalletType.WINNING,
          amount: decimalAmount,
          status: WithdrawalStatus.PENDING,
          upiId,
          bankDetails,
        },
      });

      // Debit the WINNING wallet immediately
      await this.walletService.transact(
        userId,
        WalletType.WINNING,
        TransactionType.WITHDRAWAL,
        decimalAmount.negated(),
        `WDL_${withdrawal.id}`,
        'Withdrawal Request',
        tx,
      );

      return withdrawal;
    });
  }

  async cancel(userId: string, withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) throw new BadRequestException('Withdrawal not found');
    if (withdrawal.userId !== userId)
      throw new BadRequestException('Unauthorized');
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel withdrawal because it is ${withdrawal.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: WithdrawalStatus.CANCELLED },
      });

      // Refund the frozen funds
      await this.walletService.transact(
        userId,
        WalletType.WINNING,
        TransactionType.REFUND,
        withdrawal.amount,
        `WDL_CANCEL_${withdrawalId}`,
        'Withdrawal Cancelled Refund',
        tx,
      );

      return updated;
    });
  }

  async getHistory(userId: string, skip: number = 0, take: number = 20) {
    return Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.withdrawal.count({ where: { userId } }),
    ]).then(([withdrawals, total]) => ({ withdrawals, total }));
  }

  async getDetails(withdrawalId: string, userId?: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new BadRequestException('Withdrawal not found');
    if (userId && withdrawal.userId !== userId)
      throw new BadRequestException('Unauthorized');
    return withdrawal;
  }

  // --- ADMIN METHODS ---

  async getPendingWithdrawals(skip: number = 0, take: number = 20) {
    return Promise.all([
      this.prisma.withdrawal.findMany({
        where: { status: WithdrawalStatus.PENDING },
        include: { user: { select: { name: true, mobile: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.withdrawal.count({
        where: { status: WithdrawalStatus.PENDING },
      }),
    ]).then(([withdrawals, total]) => ({ withdrawals, total }));
  }

  async getHistoryAdmin(skip: number = 0, take: number = 20) {
    return Promise.all([
      this.prisma.withdrawal.findMany({
        where: { status: { not: WithdrawalStatus.PENDING } },
        include: { 
          user: { select: { name: true, mobile: true } },
          verifiedBy: { select: { name: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.withdrawal.count({
        where: { status: { not: WithdrawalStatus.PENDING } },
      }),
    ]).then(([withdrawals, total]) => ({ withdrawals, total }));
  }

  async approve(withdrawalId: string, adminId: string, utr?: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) throw new BadRequestException('Withdrawal not found');
      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException(
          `Withdrawal cannot be approved because it is ${withdrawal.status}`,
        );
      }

      if (utr) {
        // Enforce global uniqueness across the system if provided
        const existingUtr = await tx.withdrawal.findUnique({ where: { utr } });
        if (existingUtr && existingUtr.id !== withdrawalId) {
          throw new BadRequestException('UTR already exists in the system');
        }
      }

      const finalUtr = utr || withdrawal.utr;
      if (!finalUtr) {
        throw new BadRequestException(
          'Cannot approve withdrawal without a UTR',
        );
      }

      // Note: The funds were already deducted during create().
      // We don't need to deduct them again. We just approve the state.

      // Mark withdrawal as approved
      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.APPROVED,
          utr: finalUtr,
          verifiedAt: new Date(),
          verifiedById: adminId,
        },
      });

      await this.auditService.logEvent(
        'WITHDRAWAL_APPROVE',
        `Approved withdrawal ${withdrawalId} of amount ${withdrawal.amount}`,
        adminId,
      );

      return updated;
    });
  }

  async reject(withdrawalId: string, adminId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) throw new BadRequestException('Withdrawal not found');
      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException(
          `Withdrawal cannot be rejected because it is ${withdrawal.status}`,
        );
      }

      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectReason: reason,
          verifiedAt: new Date(),
          verifiedById: adminId,
        },
      });

      // Refund the frozen funds
      await this.walletService.transact(
        withdrawal.userId,
        WalletType.WINNING,
        TransactionType.REFUND,
        withdrawal.amount,
        `WDL_REJECT_${withdrawalId}`,
        `Withdrawal Rejected Refund: ${reason}`,
        tx,
      );

      await this.auditService.logEvent(
        'WITHDRAWAL_REJECT',
        `Rejected withdrawal ${withdrawalId} due to: ${reason}`,
        adminId,
      );

      return updated;
    });
  }

  async addUtr(withdrawalId: string, adminId: string, utr: string) {
    const existingUtr = await this.prisma.withdrawal.findUnique({
      where: { utr },
    });
    if (existingUtr && existingUtr.id !== withdrawalId) {
      throw new BadRequestException('UTR already exists in the system');
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { utr },
    });

    await this.auditService.logEvent(
      'WITHDRAWAL_UTR_ADDED',
      `Added UTR ${utr} to withdrawal ${withdrawalId}`,
      adminId,
    );
    return updated;
  }

  async addNotes(withdrawalId: string, adminId: string, notes: string) {
    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { adminNotes: notes },
    });

    await this.auditService.logEvent(
      'WITHDRAWAL_NOTES_ADDED',
      `Added notes to withdrawal ${withdrawalId}`,
      adminId,
    );
    return updated;
  }
}
