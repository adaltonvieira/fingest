import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const accounts = await this.prisma.account.findMany({
      where: { userId, archived: false },
    });
    const saldoAtual = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

    const [receitasMes, despesasMes, contasAPagar, contasAReceber] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'RECEITA',
          date: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'CANCELADO' },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'DESPESA',
          date: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'CANCELADO' },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'DESPESA', status: 'PENDENTE' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'RECEITA', status: 'PENDENTE' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const receitas = Number(receitasMes._sum.amount ?? 0);
    const despesas = Number(despesasMes._sum.amount ?? 0);

    const ultimasMovimentacoes = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10,
      include: { category: true, account: true },
    });

    const porCategoria = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'DESPESA',
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELADO' },
      },
      _sum: { amount: true },
    });

    const categorias = await this.prisma.category.findMany({
      where: { id: { in: porCategoria.map((p) => p.categoryId).filter(Boolean) as string[] } },
    });

    const despesasPorCategoria = porCategoria.map((p) => {
      const cat = categorias.find((c) => c.id === p.categoryId);
      return {
        categoryId: p.categoryId,
        categoryName: cat?.name ?? 'Sem categoria',
        color: cat?.color ?? '#94A3B8',
        total: Number(p._sum.amount ?? 0),
      };
    });

    return {
      saldoAtual,
      receitasMes: receitas,
      despesasMes: despesas,
      lucroMes: receitas - despesas,
      contasAPagar: {
        total: Number(contasAPagar._sum.amount ?? 0),
        quantidade: contasAPagar._count,
      },
      contasAReceber: {
        total: Number(contasAReceber._sum.amount ?? 0),
        quantidade: contasAReceber._count,
      },
      saldoPrevisto:
        saldoAtual + Number(contasAReceber._sum.amount ?? 0) - Number(contasAPagar._sum.amount ?? 0),
      ultimasMovimentacoes,
      despesasPorCategoria,
      contas: accounts,
    };
  }
}
