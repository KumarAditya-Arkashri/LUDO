import { Module, forwardRef } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { WalletModule } from '../wallet/wallet.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [WalletModule, forwardRef(() => RealtimeModule)],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
