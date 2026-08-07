import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  private async getTransactions(userId: string, from?: string, to?: string) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    });
  }

  private rows(transactions: Awaited<ReturnType<ExportService['getTransactions']>>) {
    return transactions.map((t) => ({
      Data: new Date(t.date).toLocaleDateString('pt-BR'),
      Tipo: t.type === 'RECEITA' ? 'Receita' : 'Despesa',
      Descrição: t.description,
      Categoria: t.category?.name ?? '',
      Conta: t.account.name,
      Status: t.status,
      Valor: Number(t.amount),
    }));
  }

  async exportCsv(userId: string, from?: string, to?: string): Promise<string> {
    const transactions = await this.getTransactions(userId, from, to);
    const rows = this.rows(transactions);

    const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Status', 'Valor'];
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [
      header.join(';'),
      ...rows.map((r) => header.map((h) => escape((r as any)[h])).join(';')),
    ];

    return '\uFEFF' + lines.join('\n'); // BOM para acentuação correta no Excel
  }

  async exportXlsx(userId: string, from?: string, to?: string): Promise<ExcelJS.Buffer> {
    const transactions = await this.getTransactions(userId, from, to);
    const rows = this.rows(transactions);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lançamentos');

    sheet.columns = [
      { header: 'Data', key: 'Data', width: 12 },
      { header: 'Tipo', key: 'Tipo', width: 10 },
      { header: 'Descrição', key: 'Descrição', width: 30 },
      { header: 'Categoria', key: 'Categoria', width: 18 },
      { header: 'Conta', key: 'Conta', width: 18 },
      { header: 'Status', key: 'Status', width: 12 },
      { header: 'Valor', key: 'Valor', width: 14, style: { numFmt: '"R$" #,##0.00' } },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow(r));

    return workbook.xlsx.writeBuffer();
  }
}
