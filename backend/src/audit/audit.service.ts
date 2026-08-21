import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logEvent(
    action: string,
    details?: string,
    userId?: string,
    ipAddress?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          details,
          userId,
          ipAddress,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log', error);
    }
  }
}
