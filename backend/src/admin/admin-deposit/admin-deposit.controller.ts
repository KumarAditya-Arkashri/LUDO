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
import { DepositService } from '../../deposit/deposit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsString, IsNotEmpty } from 'class-validator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

class RejectDepositDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

@ApiTags('admin-deposit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/deposit')
export class AdminDepositController {
  constructor(private readonly depositService: DepositService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List all pending deposits' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getPending(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.depositService.getPendingDeposits(skip || 0, take || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific deposit' })
  async getDetails(@Param('id') depositId: string) {
    return this.depositService.getDepositDetails(depositId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending deposit' })
  async approve(
    @Param('id') depositId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.depositService.approveDeposit(depositId, adminId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending deposit' })
  async reject(
    @Param('id') depositId: string,
    @Body() dto: RejectDepositDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.depositService.rejectDeposit(depositId, adminId, dto.reason);
  }
}
