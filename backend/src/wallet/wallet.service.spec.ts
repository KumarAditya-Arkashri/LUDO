import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletType, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: {
            ledger: {
              groupBy: jest.fn(),
              aggregate: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
            $executeRawUnsafe: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transact', () => {
    it('should throw BadRequestException if amount is zero', async () => {
      await expect(
        service.transact('user1', WalletType.MAIN, TransactionType.DEPOSIT, 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for insufficient funds on debit', async () => {
      // Mock balance to be 50
      (prisma.ledger.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(50) },
      });

      await expect(
        service.transact(
          'user1',
          WalletType.MAIN,
          TransactionType.WITHDRAWAL,
          -100,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create double entry for valid transaction', async () => {
      (prisma.ledger.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(100) },
      });

      const userEntryMock = { id: '1' };
      (prisma.ledger.create as jest.Mock)
        .mockResolvedValueOnce(userEntryMock) // first call returns user entry
        .mockResolvedValueOnce({ id: '2' }); // second call returns system entry

      const result = await service.transact(
        'user1',
        WalletType.MAIN,
        TransactionType.DEPOSIT,
        100,
        'ref123',
      );

      expect(result).toBe(userEntryMock);
      expect(prisma.ledger.create).toHaveBeenCalledTimes(2);

      // Verify system entry has negative amount
      const systemCallArgs = (prisma.ledger.create as jest.Mock).mock
        .calls[1][0];
      expect(systemCallArgs.data.userId).toBeNull();
      expect(systemCallArgs.data.walletType).toBe(WalletType.SYSTEM);
      expect(systemCallArgs.data.amount.equals(new Prisma.Decimal(-100))).toBe(
        true,
      );
    });
  });
});
