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
import { DepositService } from './deposit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsNumber, IsString, IsUrl } from 'class-validator';

class CreateDepositDto {
  @IsNumber()
  amount: number;
}

class SubmitUtrDto {
  @IsString()
  utr: string;
}

class UploadScreenshotDto {
  @IsUrl()
  screenshotUrl: string;
}

@ApiTags('deposit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deposit')
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pending deposit request' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositService.createDeposit(userId, dto.amount);
  }

  @Put(':id/utr')
  @ApiOperation({ summary: 'Submit UTR for a pending deposit' })
  async submitUtr(
    @CurrentUser('id') userId: string,
    @Param('id') depositId: string,
    @Body() dto: SubmitUtrDto,
  ) {
    return this.depositService.submitUtr(depositId, userId, dto.utr);
  }

  @Put(':id/screenshot')
  @ApiOperation({ summary: 'Upload screenshot for a pending deposit' })
  async uploadScreenshot(
    @CurrentUser('id') userId: string,
    @Param('id') depositId: string,
    @Body() dto: UploadScreenshotDto,
  ) {
    return this.depositService.uploadScreenshot(
      depositId,
      userId,
      dto.screenshotUrl,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user deposit history' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.depositService.getHistory(userId, skip || 0, take || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific deposit' })
  async getDetails(
    @CurrentUser('id') userId: string,
    @Param('id') depositId: string,
  ) {
    return this.depositService.getDepositDetails(depositId, userId);
  }
}
