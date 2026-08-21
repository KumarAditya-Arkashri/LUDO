import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalService } from './withdrawal.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { WithdrawalStatus, TransactionType, WalletType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let prisma: PrismaService;
  let walletService: WalletService;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        {
          provide: PrismaService,
          useValue: {
            withdrawal: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
        {
          provide: WalletService,
          useValue: {
            getBalance: jest.fn(),
            getWalletBalanceTx: jest.fn(),
            transact: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    prisma = module.get<PrismaService>(PrismaService);
    walletService = module.get<WalletService>(WalletService);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('create', () => {
    it('should throw if no bank or upi details', async () => {
      await expect(service.create('user1', 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if amount below minimum', async () => {
      await expect(service.create('user1', 10, 'upi@ybl')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if insufficient winning balance', async () => {
      (walletService.getBalance as jest.Mock).mockResolvedValue({
        [WalletType.WINNING]: new Prisma.Decimal(50),
      });

      await expect(service.create('user1', 100, 'upi@ybl')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a pending withdrawal', async () => {
      (walletService.getBalance as jest.Mock).mockResolvedValue({
        [WalletType.WINNING]: new Prisma.Decimal(200),
      });
      (prisma.withdrawal.create as jest.Mock).mockResolvedValue({ id: 'wdl1' });

      const result = await service.create('user1', 100, 'upi@ybl');
      expect(result.id).toBe('wdl1');
      expect(walletService.transact).toHaveBeenCalledWith(
        'user1',
        WalletType.WINNING,
        TransactionType.WITHDRAWAL,
        new Prisma.Decimal(-100),
        'WDL_wdl1',
        'Withdrawal Request',
        expect.anything(),
      );
    });
  });

  describe('approve', () => {
    it('should throw if withdrawal not pending', async () => {
      (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({
        status: WithdrawalStatus.APPROVED,
      });
      await expect(service.approve('wdl1', 'admin1', 'utr123')).rejects.toThrow(
        BadRequestException,
      );
    });



    it('should approve and log audit without debiting wallet again', async () => {
      (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({
        id: 'wdl1',
        status: WithdrawalStatus.PENDING,
        amount: new Prisma.Decimal(500),
        userId: 'user1',
        utr: null,
      });

      await service.approve('wdl1', 'admin1', 'utr123');

      expect(walletService.transact).not.toHaveBeenCalled();

      expect(prisma.withdrawal.update).toHaveBeenCalledWith({
        where: { id: 'wdl1' },
        data: {
          status: WithdrawalStatus.APPROVED,
          utr: 'utr123',
          verifiedAt: expect.any(Date),
          verifiedById: 'admin1',
        },
      });

      expect(auditService.logEvent).toHaveBeenCalledWith(
        'WITHDRAWAL_APPROVE',
        expect.any(String),
        'admin1',
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending withdrawal', async () => {
      (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({
        id: 'wdl1',
        userId: 'user1',
        status: WithdrawalStatus.PENDING,
        amount: new Prisma.Decimal(100),
      });

      await service.cancel('user1', 'wdl1');
      expect(prisma.withdrawal.update).toHaveBeenCalledWith({
        where: { id: 'wdl1' },
        data: { status: WithdrawalStatus.CANCELLED },
      });
      expect(walletService.transact).toHaveBeenCalledWith(
        'user1',
        WalletType.WINNING,
        TransactionType.REFUND,
        new Prisma.Decimal(100),
        'WDL_CANCEL_wdl1',
        'Withdrawal Cancelled Refund',
        expect.anything(),
      );
    });

    it('should throw if unauthorized to cancel', async () => {
      (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({
        id: 'wdl1',
        userId: 'other_user',
        status: WithdrawalStatus.PENDING,
      });

      await expect(service.cancel('user1', 'wdl1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
