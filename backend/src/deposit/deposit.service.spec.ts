import { Test, TestingModule } from '@nestjs/testing';
import { DepositService } from './deposit.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { DepositStatus, TransactionType, WalletType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('DepositService', () => {
  let service: DepositService;
  let prisma: PrismaService;
  let walletService: WalletService;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositService,
        {
          provide: PrismaService,
          useValue: {
            deposit: {
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

    service = module.get<DepositService>(DepositService);
    prisma = module.get<PrismaService>(PrismaService);
    walletService = module.get<WalletService>(WalletService);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('createDeposit', () => {
    it('should throw if amount is less than or equal to 0', async () => {
      await expect(service.createDeposit('user1', 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createDeposit('user1', -100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a pending deposit', async () => {
      (prisma.deposit.create as jest.Mock).mockResolvedValue({
        id: 'dep1',
        status: DepositStatus.PENDING,
      });
      const result = await service.createDeposit('user1', 100);
      expect(prisma.deposit.create).toHaveBeenCalled();
      expect(result.id).toBe('dep1');
    });
  });

  describe('submitUtr', () => {
    it('should throw if deposit not found', async () => {
      (prisma.deposit.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.submitUtr('dep1', 'user1', 'utr123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user is unauthorized', async () => {
      (prisma.deposit.findUnique as jest.Mock).mockResolvedValue({
        userId: 'otherUser',
        status: DepositStatus.PENDING,
      });
      await expect(
        service.submitUtr('dep1', 'user1', 'utr123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if deposit is not pending', async () => {
      (prisma.deposit.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user1',
        status: DepositStatus.APPROVED,
      });
      await expect(
        service.submitUtr('dep1', 'user1', 'utr123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if utr already exists globally', async () => {
      (prisma.deposit.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          userId: 'user1',
          status: DepositStatus.PENDING,
        }) // first call for deposit check
        .mockResolvedValueOnce({ id: 'otherDep' }); // second call for utr uniqueness

      await expect(
        service.submitUtr('dep1', 'user1', 'utr123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update UTR', async () => {
      (prisma.deposit.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'dep1',
          userId: 'user1',
          status: DepositStatus.PENDING,
        })
        .mockResolvedValueOnce(null); // UTR is unique

      await service.submitUtr('dep1', 'user1', 'utr123');
      expect(prisma.deposit.update).toHaveBeenCalledWith({
        where: { id: 'dep1' },
        data: { utr: 'utr123' },
      });
    });
  });

  describe('approveDeposit', () => {
    it('should throw if deposit lacks UTR', async () => {
      (prisma.deposit.findUnique as jest.Mock).mockResolvedValue({
        id: 'dep1',
        status: DepositStatus.PENDING,
        utr: null,
      });

      await expect(service.approveDeposit('dep1', 'admin1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should approve deposit and credit wallet', async () => {
      (prisma.deposit.findUnique as jest.Mock).mockResolvedValue({
        id: 'dep1',
        userId: 'user1',
        amount: new Prisma.Decimal(500),
        status: DepositStatus.PENDING,
        utr: 'utr123',
      });

      await service.approveDeposit('dep1', 'admin1');

      expect(prisma.deposit.update).toHaveBeenCalledWith({
        where: { id: 'dep1' },
        data: {
          status: DepositStatus.APPROVED,
          verifiedAt: expect.any(Date),
          verifiedById: 'admin1',
        },
      });

      expect(walletService.transact).toHaveBeenCalledWith(
        'user1',
        WalletType.MAIN,
        TransactionType.DEPOSIT,
        new Prisma.Decimal(500),
        'DEP_dep1',
        expect.any(String),
        expect.anything(),
      );

      expect(auditService.logEvent).toHaveBeenCalledWith(
        'DEPOSIT_APPROVE',
        expect.any(String),
        'admin1',
      );
    });
  });

  describe('rejectDeposit', () => {
    it('should reject deposit and log audit event', async () => {
      (prisma.deposit.findUnique as jest.Mock).mockResolvedValue({
        id: 'dep1',
        status: DepositStatus.PENDING,
      });

      await service.rejectDeposit('dep1', 'admin1', 'Fake UTR');

      expect(prisma.deposit.update).toHaveBeenCalledWith({
        where: { id: 'dep1' },
        data: {
          status: DepositStatus.REJECTED,
          rejectReason: 'Fake UTR',
          verifiedAt: expect.any(Date),
          verifiedById: 'admin1',
        },
      });

      expect(auditService.logEvent).toHaveBeenCalledWith(
        'DEPOSIT_REJECT',
        expect.any(String),
        'admin1',
      );
    });
  });
});
