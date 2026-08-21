import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralConfigService } from './referral-config/referral-config.service';

@ApiTags('referral')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referral')
export class ReferralController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ReferralConfigService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user referral dashboard stats' })
  async getDashboard(@CurrentUser('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, name: true },
    });

    const config = await this.configService.getConfig();

    const referredCount = await this.prisma.user.count({
      where: { referredById: userId },
    });

    const earnings = await this.prisma.ledger.aggregate({
      where: {
        userId,
        transactionType: 'REFERRAL_REWARD',
      },
      _sum: { amount: true },
    });

    return {
      referralCode: user?.referralCode,
      referralLink: `https://ludoarena.app/join?ref=${user?.referralCode}`,
      referredCount,
      totalEarned: earnings._sum.amount || 0,
      config: {
        isEnabled: config.isEnabled,
        rewardAmount: config.rewardAmount,
        rewardWalletType: config.rewardWalletType,
        activationRule: config.activationRule,
      },
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated list of referred users' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { referredById: userId },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 20,
      }),
      this.prisma.user.count({ where: { referredById: userId } }),
    ]);

    return { users, total };
  }
}
