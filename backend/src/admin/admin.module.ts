import { Module } from '@nestjs/common';
import { AdminWalletController } from './admin-wallet/admin-wallet.controller';
import { AdminReferralController } from './admin-referral/admin-referral.controller';
import { AdminDepositController } from './admin-deposit/admin-deposit.controller';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralModule } from '../referral/referral.module';
import { DepositModule } from '../deposit/deposit.module';
import { AdminWithdrawalController } from './admin-withdrawal/admin-withdrawal.controller';
import { WithdrawalModule } from '../withdrawal/withdrawal.module';
import { AdminOverviewController } from './admin-overview/admin-overview.controller';
import { AdminOverviewService } from './admin-overview/admin-overview.service';

@Module({
  imports: [WalletModule, ReferralModule, DepositModule, WithdrawalModule],
  controllers: [
    AdminWalletController,
    AdminReferralController,
    AdminDepositController,
    AdminWithdrawalController,
    AdminOverviewController,
  ],
  providers: [AdminOverviewService],
})
export class AdminModule {}
