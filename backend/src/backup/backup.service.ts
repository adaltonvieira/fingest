import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAll(userId: string) {
    const [
      user,
      accounts,
      categories,
      costCenters,
      transactions,
      creditCards,
      invoices,
      goals,
      recurringRules,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      this.prisma.account.findMany({ where: { userId } }),
      this.prisma.category.findMany({ where: { userId } }),
      this.prisma.costCenter.findMany({ where: { userId } }),
      this.prisma.transaction.findMany({ where: { userId } }),
      this.prisma.creditCard.findMany({ where: { userId } }),
      this.prisma.invoice.findMany({
        where: { creditCard: { userId } },
        include: { items: true },
      }),
      this.prisma.goal.findMany({ where: { userId }, include: { contributions: true } }),
      this.prisma.recurringRule.findMany({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      user,
      accounts,
      categories,
      costCenters,
      transactions,
      creditCards,
      invoices,
      goals,
      recurringRules,
    };
  }
}
