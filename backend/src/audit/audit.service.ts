import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Nunca deve derrubar a operação principal — falha de log é registrada mas engolida. */
  async log(params: {
    userId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER';
    entity: string;
    entityId?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          description: params.description,
          metadata: params.metadata as any,
        },
      });
    } catch (err) {
      this.logger.warn(`Falha ao registrar log de auditoria: ${(err as Error).message}`);
    }
  }

  async findRecent(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
