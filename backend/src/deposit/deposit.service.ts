import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { DepositStatus, WalletType, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) {}

  async createDeposit(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be strictly positive');
    }

    return this.prisma.deposit.create({
      data: {
        userId,
        amount: new Prisma.Decimal(amount),
        status: DepositStatus.PENDING,
      },
    });
  }

  async submitUtr(depositId: string, userId: string, utr: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) throw new BadRequestException('Deposit not found');
    if (deposit.userId !== userId)
      throw new BadRequestException('Unauthorized');
    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update UTR. Deposit is ${deposit.status}`,
      );
    }

    // Check UTR uniqueness across the system globally
    const existingUtr = await this.prisma.deposit.findUnique({
      where: { utr },
    });
    if (existingUtr && existingUtr.id !== depositId) {
      throw new BadRequestException('UTR already exists in the system');
    }

    return this.prisma.deposit.update({
      where: { id: depositId },
      data: { utr },
    });
  }

  async uploadScreenshot(
    depositId: string,
    userId: string,
    screenshotUrl: string,
  ) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) throw new BadRequestException('Deposit not found');
    if (deposit.userId !== userId)
      throw new BadRequestException('Unauthorized');
    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException(
        `Cannot upload screenshot. Deposit is ${deposit.status}`,
      );
    }

    return this.prisma.deposit.update({
      where: { id: depositId },
      data: { screenshotUrl },
    });
  }

  async getHistory(userId: string, skip: number = 0, take: number = 20) {
    return Promise.all([
      this.prisma.deposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.deposit.count({ where: { userId } }),
    ]).then(([deposits, total]) => ({ deposits, total }));
  }

  async getDepositDetails(depositId: string, userId?: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });
    if (!deposit) throw new BadRequestException('Deposit not found');
    if (userId && deposit.userId !== userId)
      throw new BadRequestException('Unauthorized');
    return deposit;
  }

  async approveDeposit(depositId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
      if (!deposit) throw new BadRequestException('Deposit not found');

      if (deposit.status !== DepositStatus.PENDING) {
        throw new BadRequestException(
          `Deposit cannot be approved because it is ${deposit.status}`,
        );
      }

      if (!deposit.utr) {
        throw new BadRequestException('Cannot approve deposit without UTR');
      }

      // Update deposit
      const updated = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.APPROVED,
          verifiedAt: new Date(),
          verifiedById: adminId,
        },
      });

      // Issue funds
      await this.walletService.transact(
        deposit.userId,
        WalletType.MAIN,
        TransactionType.DEPOSIT,
        deposit.amount,
        `DEP_${deposit.id}`,
        `Manual QR Deposit Approved (UTR: ${deposit.utr})`,
        tx,
      );

      // Audit log (outside tx conceptually, but works fine here if it's the same DB)
      await this.auditService.logEvent(
        'DEPOSIT_APPROVE',
        `Approved deposit ${depositId} of amount ${deposit.amount}`,
        adminId,
      );

      return updated;
    });
  }

  async rejectDeposit(depositId: string, adminId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
      if (!deposit) throw new BadRequestException('Deposit not found');

      if (deposit.status !== DepositStatus.PENDING) {
        throw new BadRequestException(
          `Deposit cannot be rejected because it is ${deposit.status}`,
        );
      }

      const updated = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.REJECTED,
          rejectReason: reason,
          verifiedAt: new Date(),
          verifiedById: adminId,
        },
      });

      await this.auditService.logEvent(
        'DEPOSIT_REJECT',
        `Rejected deposit ${depositId} due to: ${reason}`,
        adminId,
      );

      return updated;
    });
  }

  async getPendingDeposits(skip: number = 0, take: number = 20) {
    return Promise.all([
      this.prisma.deposit.findMany({
        where: { status: DepositStatus.PENDING },
        include: { user: { select: { name: true, mobile: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.deposit.count({ where: { status: DepositStatus.PENDING } }),
    ]).then(([deposits, total]) => ({ deposits, total }));
  }
}
