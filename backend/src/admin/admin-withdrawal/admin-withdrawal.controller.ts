import {
  Controller,
  Get,
  Post,
  Put,
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
import { WithdrawalService } from '../../withdrawal/withdrawal.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

class ApproveWithdrawalDto {
  @IsOptional()
  @IsString()
  utr?: string;
}

class RejectWithdrawalDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

class AddUtrDto {
  @IsString()
  @IsNotEmpty()
  utr: string;
}

class AddNotesDto {
  @IsString()
  @IsNotEmpty()
  notes: string;
}

@ApiTags('admin-withdrawal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/withdrawal')
export class AdminWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List all pending withdrawals' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getPending(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.withdrawalService.getPendingWithdrawals(skip || 0, take || 20);
  }

  @Get('history')
  @ApiOperation({ summary: 'List withdrawal history (approved/rejected/cancelled)' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getHistory(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.withdrawalService.getHistoryAdmin(skip || 0, take || 20);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending withdrawal' })
  async approve(
    @Param('id') withdrawalId: string,
    @Body() dto: ApproveWithdrawalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.withdrawalService.approve(withdrawalId, adminId, dto.utr);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending withdrawal' })
  async reject(
    @Param('id') withdrawalId: string,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.withdrawalService.reject(withdrawalId, adminId, dto.reason);
  }

  @Put(':id/utr')
  @ApiOperation({ summary: 'Add UTR to a withdrawal' })
  async addUtr(
    @Param('id') withdrawalId: string,
    @Body() dto: AddUtrDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.withdrawalService.addUtr(withdrawalId, adminId, dto.utr);
  }

  @Put(':id/notes')
  @ApiOperation({ summary: 'Add admin notes to a withdrawal' })
  async addNotes(
    @Param('id') withdrawalId: string,
    @Body() dto: AddNotesDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.withdrawalService.addNotes(withdrawalId, adminId, dto.notes);
  }
}
