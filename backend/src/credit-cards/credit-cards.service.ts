import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import {
  CreateCreditCardDto,
  CreatePurchaseDto,
  PayInvoiceDto,
  UpdateCreditCardDto,
} from './dto/credit-card.dto';

function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CARTÕES ----------

  create(userId: string, dto: CreateCreditCardDto) {
    return this.prisma.creditCard.create({ data: { ...dto, userId } });
  }

  findAll(userId: string) {
    return this.prisma.creditCard.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const card = await this.prisma.creditCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Cartão não encontrado');
    if (card.userId !== userId) throw new ForbiddenException();
    return card;
  }

  async update(userId: string, id: string, dto: UpdateCreditCardDto) {
    await this.findOne(userId, id);
    return this.prisma.creditCard.update({ where: { id }, data: dto });
  }

  async archive(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.creditCard.update({ where: { id }, data: { archived: true } });
  }

  // ---------- FATURAS ----------

  /** Calcula a que fatura (mês de referência) uma compra pertence, dado o dia de fechamento. */
  private resolveReferenceMonth(purchaseDate: Date, closingDay: number): Date {
    const day = purchaseDate.getUTCDate();
    const year = purchaseDate.getUTCFullYear();
    const month = purchaseDate.getUTCMonth();
    // Se a compra ocorreu depois do fechamento, ela cai na fatura do mês seguinte.
    return day > closingDay ? startOfMonth(year, month + 1) : startOfMonth(year, month);
  }

  private async findOrCreateInvoice(
    creditCardId: string,
    referenceMonth: Date,
    closingDay: number,
    dueDay: number,
  ) {
    const existing = await this.prisma.invoice.findUnique({
      where: { creditCardId_referenceMonth: { creditCardId, referenceMonth } },
    });
    if (existing) return existing;

    const closingDate = new Date(referenceMonth);
    closingDate.setUTCDate(closingDay);

    // Vencimento: se o dia de vencimento é antes/igual ao de fechamento, o vencimento
    // cai no mês seguinte ao fechamento (padrão da maioria dos cartões).
    const dueDate = new Date(referenceMonth);
    if (dueDay <= closingDay) {
      dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);
    }
    dueDate.setUTCDate(dueDay);

    return this.prisma.invoice.create({
      data: { creditCardId, referenceMonth, closingDate, dueDate },
    });
  }

  async addPurchase(userId: string, cardId: string, dto: CreatePurchaseDto) {
    const card = await this.findOne(userId, cardId);
    const installments = dto.installments ?? 1;
    const installmentAmount = Number((dto.amount / installments).toFixed(2));
    const installmentGroupId = installments > 1 ? randomUUID() : null;
    const baseDate = new Date(dto.date);

    const createdItems = [];
    for (let i = 0; i < installments; i++) {
      const purchaseDate = new Date(baseDate);
      purchaseDate.setUTCMonth(purchaseDate.getUTCMonth() + i);

      const referenceMonth = this.resolveReferenceMonth(purchaseDate, card.closingDay);
      const invoice = await this.findOrCreateInvoice(
        card.id,
        referenceMonth,
        card.closingDay,
        card.dueDay,
      );

      const item = await this.prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description:
            installments > 1 ? `${dto.description} (${i + 1}/${installments})` : dto.description,
          amount: installmentAmount,
          date: purchaseDate,
          categoryId: dto.categoryId,
          installmentGroupId,
          installmentNumber: installments > 1 ? i + 1 : null,
          installmentTotal: installments > 1 ? installments : null,
        },
      });
      createdItems.push(item);
    }

    return createdItems;
  }

  async listInvoices(userId: string, cardId: string) {
    await this.findOne(userId, cardId);
    const invoices = await this.prisma.invoice.findMany({
      where: { creditCardId: cardId },
      include: { items: true },
      orderBy: { referenceMonth: 'desc' },
    });
    return invoices.map((inv) => ({
      ...inv,
      total: inv.items.reduce((sum, item) => sum + Number(item.amount), 0),
    }));
  }

  async getInvoice(userId: string, cardId: string, invoiceId: string) {
    await this.findOne(userId, cardId);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: { orderBy: { date: 'asc' } } },
    });
    if (!invoice || invoice.creditCardId !== cardId) {
      throw new NotFoundException('Fatura não encontrada');
    }
    return {
      ...invoice,
      total: invoice.items.reduce((sum, item) => sum + Number(item.amount), 0),
    };
  }

  async payInvoice(userId: string, cardId: string, invoiceId: string, dto: PayInvoiceDto) {
    const card = await this.findOne(userId, cardId);
    const invoice = await this.getInvoice(userId, cardId, invoiceId);

    if (invoice.status === 'PAGA') {
      throw new ForbiddenException('Esta fatura já foi paga');
    }

    const account = await this.prisma.account.findUnique({ where: { id: dto.accountId } });
    if (!account || account.userId !== userId) {
      throw new ForbiddenException('Conta inválida');
    }

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'DESPESA',
          description: `Fatura ${card.name} — ${invoice.referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
          amount: invoice.total,
          status: 'PAGO',
          date: new Date(),
          dueDate: invoice.dueDate,
          paidAt: new Date(),
          accountId: dto.accountId,
        },
      });

      await tx.account.update({
        where: { id: dto.accountId },
        data: { currentBalance: { decrement: invoice.total } },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAGA', paidAt: new Date(), paidTransactionId: transaction.id },
      });

      return updatedInvoice;
    });
  }
}
