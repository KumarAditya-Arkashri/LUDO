import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferralService } from '../referral/referral.service';
import { Request } from 'express';
import { WalletType, TransactionType } from '@prisma/client';
import crypto from 'crypto';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private auditService: AuditService,
    private referralService: ReferralService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByMobile(dto.mobile);
    if (existing) {
      throw new BadRequestException('Mobile number already in use');
    }

    let referredById: string | undefined;

    // 1. Process Referral Code if provided
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode },
      });

      if (referrer) {
        // Fraud Check: Ensure not the same device
        let isFraud = false;

        if (dto.deviceId && dto.deviceId === referrer.deviceId) {
          isFraud = true;
          this.logger.warn(
            `Referral fraud blocked: same device id ${dto.deviceId} for referrer ${referrer.id}`,
          );
        }

        if (!isFraud) {
          referredById = referrer.id;
        }
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.create({
      mobile: dto.mobile,
      name: dto.name,
      passwordHash,
      deviceId: dto.deviceId,
      ...(referredById
        ? { referredBy: { connect: { id: referredById } } }
        : {}),
    });

    // Process referral reward for 'ON_REGISTER'
    if (referredById) {
      await this.referralService.processReferralReward(user.id, 'ON_REGISTER');
    }

    // Give 1000 credit to newly registered users
    await this.prisma.ledger.create({
      data: {
        userId: user.id,
        walletType: WalletType.MAIN,
        transactionType: TransactionType.DEPOSIT,
        amount: 1000,
        referenceId: crypto.randomUUID(),
        description: 'Signup Bonus',
      }
    });

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { mobile: loginDto.mobile },
    });
    if (!user) {
      await this.auditService.logEvent(
        'FAILED_LOGIN',
        'User not found',
        undefined,
        loginDto.mobile,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      await this.auditService.logEvent(
        'FAILED_LOGIN',
        'Invalid password',
        user.id,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    await this.auditService.logEvent('LOGIN', 'User logged in', user.id);

    return tokens;
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.isRevoked ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Refresh Token Rotation: Revoke the old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(tokenRecord.user);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    await this.auditService.logEvent('LOGOUT', 'User logged out', userId);
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, mobile: user.mobile, role: user.role };

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is required');

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: '15m',
    });

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is required');

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        referralCode: user.referralCode,
      },
      accessToken,
      refreshToken,
    };
  }
}
