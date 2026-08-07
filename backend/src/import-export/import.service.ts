import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma.service';

export interface ParsedImportRow {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // sempre positivo
  type: 'RECEITA' | 'DESPESA';
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Detecta separador (vírgula ou ponto-e-vírgula) e mapeia colunas por nome, com flexibilidade de idioma. */
  parseCsv(fileContent: string): ParsedImportRow[] {
    const content = fileContent.replace(/^\uFEFF/, '').trim();
    const delimiter = content.split('\n')[0].includes(';') ? ';' : ',';
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('Arquivo CSV vazio ou sem dados');
    }

    const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

    const findCol = (candidates: string[]) =>
      header.findIndex((h) => candidates.some((c) => h.includes(c)));

    const dateIdx = findCol(['data', 'date']);
    const descIdx = findCol(['descri', 'histor', 'memo', 'description']);
    const amountIdx = findCol(['valor', 'amount', 'value']);

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      throw new BadRequestException(
        'Não foi possível identificar as colunas de Data, Descrição e Valor no CSV. Verifique o cabeçalho do arquivo.',
      );
    }

    const rows: ParsedImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter);
      if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

      const rawDate = cols[dateIdx].trim().replace(/"/g, '');
      const rawDesc = cols[descIdx].trim().replace(/"/g, '');
      const rawAmount = cols[amountIdx].trim().replace(/"/g, '');

      const date = this.parseDate(rawDate);
      const amount = this.parseAmount(rawAmount);
      if (!date || amount === null) continue;

      rows.push({
        date,
        description: rawDesc || 'Importado',
        amount: Math.abs(amount),
        type: amount >= 0 ? 'RECEITA' : 'DESPESA',
      });
    }

    return rows;
  }

  /** Parser simples de OFX: extrai blocos STMTTRN com data, valor e memo/nome. */
  parseOfx(fileContent: string): ParsedImportRow[] {
    const blocks = fileContent.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];
    if (blocks.length === 0) {
      throw new BadRequestException('Nenhuma transação encontrada no arquivo OFX');
    }

    const extract = (block: string, tag: string) => {
      const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, 'i'));
      return match ? match[1].trim() : '';
    };

    const rows: ParsedImportRow[] = [];
    for (const block of blocks) {
      const dtPosted = extract(block, 'DTPOSTED'); // formato YYYYMMDDHHMMSS
      const amountStr = extract(block, 'TRNAMT');
      const memo = extract(block, 'MEMO') || extract(block, 'NAME');

      if (!dtPosted || !amountStr) continue;

      const date = `${dtPosted.slice(0, 4)}-${dtPosted.slice(4, 6)}-${dtPosted.slice(6, 8)}`;
      const amount = parseFloat(amountStr.replace(',', '.'));
      if (isNaN(amount)) continue;

      rows.push({
        date,
        description: memo || 'Importado (OFX)',
        amount: Math.abs(amount),
        type: amount >= 0 ? 'RECEITA' : 'DESPESA',
      });
    }

    return rows;
  }

  /** Parser de planilhas Excel (.xlsx), usado quando o arquivo é detectado como binário XLSX. */
  async parseXlsx(buffer: Buffer): Promise<ParsedImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('A planilha está vazia');
    }

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = String(cell.value ?? '').trim().toLowerCase();
    });

    const findCol = (candidates: string[]) =>
      headers.findIndex((h) => h && candidates.some((c) => h.includes(c)));

    const dateIdx = findCol(['data', 'date']);
    const descIdx = findCol(['descri', 'histor', 'memo', 'description']);
    const amountIdx = findCol(['valor', 'amount', 'value']);

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      throw new BadRequestException(
        'Não foi possível identificar as colunas de Data, Descrição e Valor na planilha.',
      );
    }

    const rows: ParsedImportRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // pula cabeçalho

      const dateCell = row.getCell(dateIdx).value;
      const descCell = row.getCell(descIdx).value;
      const amountCell = row.getCell(amountIdx).value;

      const date =
        dateCell instanceof Date
          ? dateCell.toISOString().slice(0, 10)
          : this.parseDate(String(dateCell ?? '').trim());

      const amount =
        typeof amountCell === 'number' ? amountCell : this.parseAmount(String(amountCell ?? ''));

      if (!date || amount === null) return;

      rows.push({
        date,
        description: String(descCell ?? 'Importado').trim() || 'Importado',
        amount: Math.abs(amount),
        type: amount >= 0 ? 'RECEITA' : 'DESPESA',
      });
    });

    return rows;
  }

  async confirmImport(
    userId: string,
    accountId: string,
    rows: ParsedImportRow[],
    categoryId?: string,
  ) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== userId) {
      throw new ForbiddenException('Conta inválida');
    }
    if (rows.length === 0) {
      return { created: 0 };
    }

    await this.prisma.transaction.createMany({
      data: rows.map((r) => ({
        userId,
        type: r.type,
        description: r.description,
        amount: r.amount,
        status: 'PENDENTE' as const,
        date: new Date(r.date),
        dueDate: new Date(r.date),
        accountId,
        categoryId,
      })),
    });

    return { created: rows.length };
  }

  private parseDate(raw: string): string | null {
    // Aceita DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return raw;

    const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dashMatch) return `${dashMatch[3]}-${dashMatch[2]}-${dashMatch[1]}`;

    return null;
  }

  private parseAmount(raw: string): number | null {
    // Aceita "1234.56", "1.234,56", "-50,00"
    let normalized = raw.replace(/\s/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }
    const value = parseFloat(normalized);
    return isNaN(value) ? null : value;
  }
}
