import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralConfigService } from './referral-config/referral-config.service';
import { ReferralController } from './referral.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
  providers: [ReferralService, ReferralConfigService],
  controllers: [ReferralController],
  exports: [ReferralService, ReferralConfigService],
})
export class ReferralModule {}
