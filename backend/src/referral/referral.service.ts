import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralConfigService } from './referral-config/referral-config.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ReferralConfigService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Processes a referral reward if the trigger condition is met.
   * Typically called when a user registers, completes KYC, etc.
   */
  async processReferralReward(newUserId: string, triggerEvent: string) {
    try {
      const config = await this.configService.getConfig();
      if (!config.isEnabled) return;
      if (config.activationRule !== triggerEvent) return;

      const newUser = await this.prisma.user.findUnique({
        where: { id: newUserId },
        select: { referredById: true, name: true },
      });

      if (!newUser || !newUser.referredById) return; // Not referred by anyone

      // Make sure the referrer hasn't been rewarded for this specific user yet
      // The idempotency key here is `REF_${newUserId}`
      const referenceId = `REF_${newUserId}`;
      const existingLedger = await this.prisma.ledger.findUnique({
        where: {
          userId_referenceId_transactionType: {
            userId: newUser.referredById,
            referenceId,
            transactionType: TransactionType.REFERRAL_REWARD,
          },
        },
      });

      if (existingLedger) {
        this.logger.debug(
          `Referral reward already issued for referrer ${newUser.referredById} due to user ${newUserId}`,
        );
        return;
      }

      // Issue the reward to the referrer
      await this.walletService.transact(
        newUser.referredById,
        config.rewardWalletType,
        TransactionType.REFERRAL_REWARD,
        config.rewardAmount,
        referenceId,
        `Reward for referring ${newUser.name || 'a new user'}`,
      );

      this.logger.log(
        `Issued referral reward to ${newUser.referredById} for referring ${newUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process referral reward for new user ${newUserId}`,
        error,
      );
    }
  }
}
