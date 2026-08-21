import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsNumber, IsString, IsOptional } from 'class-validator';

class CreateWithdrawalDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsString()
  bankDetails?: string;
}

@ApiTags('withdrawal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withdrawal')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pending withdrawal request' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.create(
      userId,
      dto.amount,
      dto.upiId,
      dto.bankDetails,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending withdrawal request' })
  async cancel(
    @CurrentUser('id') userId: string,
    @Param('id') withdrawalId: string,
  ) {
    return this.withdrawalService.cancel(userId, withdrawalId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user withdrawal history' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.withdrawalService.getHistory(userId, skip || 0, take || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific withdrawal' })
  async getDetails(
    @CurrentUser('id') userId: string,
    @Param('id') withdrawalId: string,
  ) {
    return this.withdrawalService.getDetails(withdrawalId, userId);
  }
}
