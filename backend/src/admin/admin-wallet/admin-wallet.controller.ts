import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from '../../wallet/wallet.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role, WalletType, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

class AdminTransactDto {
  userId: string;
  amount: number;
  walletType: WalletType;
  description?: string;
}

@ApiTags('admin-wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/wallet')
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('credit')
  @ApiOperation({ summary: 'Credit funds to a user wallet (Admin Only)' })
  async credit(@Body() dto: AdminTransactDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.walletService.transact(
      dto.userId,
      dto.walletType,
      TransactionType.ADMIN_CREDIT,
      new Prisma.Decimal(dto.amount),
      `ADM_CREDIT_${crypto.randomUUID()}`,
      dto.description,
    );
  }

  @Post('debit')
  @ApiOperation({ summary: 'Debit funds from a user wallet (Admin Only)' })
  async debit(@Body() dto: AdminTransactDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.walletService.transact(
      dto.userId,
      dto.walletType,
      TransactionType.ADMIN_DEBIT,
      new Prisma.Decimal(-dto.amount), // Negative for debit
      `ADM_DEBIT_${crypto.randomUUID()}`,
      dto.description,
    );
  }
}
