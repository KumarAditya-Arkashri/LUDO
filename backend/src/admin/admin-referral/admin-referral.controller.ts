import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralConfigService } from '../../referral/referral-config/referral-config.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role, WalletType } from '@prisma/client';
import {
  IsBoolean,
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
} from 'class-validator';
import { Prisma } from '@prisma/client';

export class UpdateReferralConfigDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsNumber() rewardAmount?: number;
  @IsOptional() @IsEnum(WalletType) rewardWalletType?: WalletType;
  @IsOptional() @IsString() activationRule?: string;
  @IsOptional() @IsNumber() minWithdrawal?: number;
}

@ApiTags('admin-referral')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/referral')
export class AdminReferralController {
  constructor(private readonly configService: ReferralConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get current referral configuration (Admin Only)' })
  async getConfig() {
    return this.configService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Update referral configuration (Admin Only)' })
  async updateConfig(@Body() dto: UpdateReferralConfigDto) {
    const updateData: any = {};
    if (dto.isEnabled !== undefined) updateData.isEnabled = dto.isEnabled;
    if (dto.rewardAmount !== undefined)
      updateData.rewardAmount = new Prisma.Decimal(dto.rewardAmount);
    if (dto.rewardWalletType)
      updateData.rewardWalletType = dto.rewardWalletType;
    if (dto.activationRule) updateData.activationRule = dto.activationRule;
    if (dto.minWithdrawal !== undefined)
      updateData.minWithdrawal = new Prisma.Decimal(dto.minWithdrawal);

    return this.configService.updateConfig(updateData);
  }
}
