import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, WalletModule, AuditModule],
  providers: [WithdrawalService],
  controllers: [WithdrawalController],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
