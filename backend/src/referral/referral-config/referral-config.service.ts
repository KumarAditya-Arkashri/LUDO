import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralConfig, WalletType } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReferralConfigService implements OnModuleInit {
  private readonly logger = new Logger(ReferralConfigService.name);
  private cachedConfig: ReferralConfig | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshConfig();
  }

  async getConfig(): Promise<ReferralConfig> {
    if (!this.cachedConfig) {
      await this.refreshConfig();
    }
    return this.cachedConfig as ReferralConfig;
  }

  async updateConfig(data: Partial<ReferralConfig>): Promise<ReferralConfig> {
    const current = await this.getConfig();
    const updated = await this.prisma.referralConfig.update({
      where: { id: current.id },
      data,
    });
    this.cachedConfig = updated;
    return updated;
  }

  async refreshConfig() {
    let config = await this.prisma.referralConfig.findFirst();
    if (!config) {
      this.logger.log('Seeding default ReferralConfig');
      config = await this.prisma.referralConfig.create({
        data: {
          isEnabled: true,
          rewardAmount: new Prisma.Decimal(10),
          rewardWalletType: WalletType.BONUS,
          activationRule: 'ON_REGISTER',
          minWithdrawal: new Prisma.Decimal(50),
        },
      });
    }
    this.cachedConfig = config;
  }
}
