import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from './referral.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralConfigService } from './referral-config/referral-config.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType, WalletType } from '@prisma/client';

describe('ReferralService', () => {
  let service: ReferralService;
  let prisma: PrismaService;
  let configService: ReferralConfigService;
  let walletService: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            ledger: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ReferralConfigService,
          useValue: {
            getConfig: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: {
            transact: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ReferralConfigService>(ReferralConfigService);
    walletService = module.get<WalletService>(WalletService);
  });

  it('should not process if config is disabled', async () => {
    (configService.getConfig as jest.Mock).mockResolvedValue({
      isEnabled: false,
    });
    await service.processReferralReward('user1', 'ON_REGISTER');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should not process if activation rule does not match', async () => {
    (configService.getConfig as jest.Mock).mockResolvedValue({
      isEnabled: true,
      activationRule: 'ON_KYC',
    });
    await service.processReferralReward('user1', 'ON_REGISTER');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should issue reward if valid', async () => {
    (configService.getConfig as jest.Mock).mockResolvedValue({
      isEnabled: true,
      activationRule: 'ON_REGISTER',
      rewardAmount: 10,
      rewardWalletType: WalletType.BONUS,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      referredById: 'referrer1',
      name: 'John',
    });
    (prisma.ledger.findUnique as jest.Mock).mockResolvedValue(null);

    await service.processReferralReward('user1', 'ON_REGISTER');

    expect(walletService.transact).toHaveBeenCalledWith(
      'referrer1',
      WalletType.BONUS,
      TransactionType.REFERRAL_REWARD,
      10,
      'REF_user1',
      'Reward for referring John',
    );
  });

  it('should be idempotent and not issue twice', async () => {
    (configService.getConfig as jest.Mock).mockResolvedValue({
      isEnabled: true,
      activationRule: 'ON_REGISTER',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      referredById: 'referrer1',
      name: 'John',
    });
    (prisma.ledger.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-ledger',
    });

    await service.processReferralReward('user1', 'ON_REGISTER');

    expect(walletService.transact).not.toHaveBeenCalled();
  });
});
