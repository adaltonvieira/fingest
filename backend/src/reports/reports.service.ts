import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}
function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna receitas/despesas/lucro dos últimos `monthsCount` meses (incluindo o atual). */
  async getMonthlyComparison(userId: string, monthsCount = 6) {
    const now = new Date();
    const months: { year: number; month: number }[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }

    const results = await Promise.all(
      months.map(async ({ year, month }) => {
        const from = startOfMonth(year, month);
        const to = endOfMonth(year, month);

        const [receitas, despesas] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: {
              userId,
              type: 'RECEITA',
              date: { gte: from, lte: to },
              status: { not: 'CANCELADO' },
            },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: {
              userId,
              type: 'DESPESA',
              date: { gte: from, lte: to },
              status: { not: 'CANCELADO' },
            },
            _sum: { amount: true },
          }),
        ]);

        const receitasTotal = Number(receitas._sum.amount ?? 0);
        const despesasTotal = Number(despesas._sum.amount ?? 0);

        return {
          year,
          month: month + 1,
          label: from.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          receitas: receitasTotal,
          despesas: despesasTotal,
          lucro: receitasTotal - despesasTotal,
        };
      }),
    );

    return results;
  }

  /** Relatório detalhado de um único mês: totais, por categoria, e lançamentos. */
  async getMonthlyReport(userId: string, year: number, month: number) {
    const from = startOfMonth(year, month - 1);
    const to = endOfMonth(year, month - 1);

    const [receitasAgg, despesasAgg, porCategoria, transactions] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'RECEITA', date: { gte: from, lte: to }, status: { not: 'CANCELADO' } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'DESPESA', date: { gte: from, lte: to }, status: { not: 'CANCELADO' } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where: { userId, date: { gte: from, lte: to }, status: { not: 'CANCELADO' } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: from, lte: to } },
        include: { category: true, account: true },
        orderBy: { date: 'desc' },
      }),
    ]);

    const categoryIds = porCategoria.map((p) => p.categoryId).filter(Boolean) as string[];
    const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });

    const breakdown = porCategoria.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return {
        categoryId: p.categoryId,
        categoryName: cat?.name ?? 'Sem categoria',
        color: cat?.color ?? '#94A3B8',
        type: p.type,
        total: Number(p._sum.amount ?? 0),
      };
    });

    const receitas = Number(receitasAgg._sum.amount ?? 0);
    const despesas = Number(despesasAgg._sum.amount ?? 0);

    return {
      year,
      month,
      receitas,
      despesas,
      lucro: receitas - despesas,
      quantidadeReceitas: receitasAgg._count,
      quantidadeDespesas: despesasAgg._count,
      breakdown,
      transactions,
    };
  }
}
