import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateTransactionDto,
  QueryTransactionDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const account = await this.prisma.account.findUnique({ where: { id: dto.accountId } });
    if (!account || account.userId !== userId) {
      throw new ForbiddenException('Conta inválida');
    }

    const installments = dto.installments ?? 1;
    const defaultStatus: TransactionStatus =
      dto.status ?? (dto.type === 'RECEITA' ? 'PENDENTE' : 'PENDENTE');

    const installmentGroupId = installments > 1 ? randomUUID() : null;
    const installmentAmount = Number((dto.amount / installments).toFixed(2));

    const baseDate = new Date(dto.date);

    const records = Array.from({ length: installments }).map((_, index) => {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(installmentDate.getMonth() + index);

      return {
        userId,
        type: dto.type,
        description: dto.description,
        amount: installmentAmount,
        status: defaultStatus,
        date: installmentDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : installmentDate,
        competencia: dto.competencia ? new Date(dto.competencia) : installmentDate,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        costCenterId: dto.costCenterId,
        paymentMethod: dto.paymentMethod,
        clientOrSupplier: dto.clientOrSupplier,
        installmentGroupId,
        installmentNumber: installments > 1 ? index + 1 : null,
        installmentTotal: installments > 1 ? installments : null,
        notes: dto.notes,
      };
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.transaction.createMany({ data: records });

      // Se já nasce como pago/recebido, impacta saldo imediatamente (apenas 1ª parcela à vista tipicamente)
      const settled = records.filter((r) => r.status === 'PAGO' || r.status === 'RECEBIDO');
      if (settled.length > 0) {
        const total = settled.reduce((sum, r) => sum + r.amount, 0);
        const delta = dto.type === 'RECEITA' ? total : -total;
        await tx.account.update({
          where: { id: dto.accountId },
          data: { currentBalance: { increment: delta } },
        });
      }

      return tx.transaction.findMany({
        where: { installmentGroupId: installmentGroupId ?? undefined, userId },
        orderBy: { installmentNumber: 'asc' },
      });
    });

    if (installments === 1) {
      const created = await this.prisma.transaction.findFirst({
        where: { userId, accountId: dto.accountId, description: dto.description },
        orderBy: { createdAt: 'desc' },
      });
      await this.audit.log({
        userId,
        action: 'CREATE',
        entity: 'Transaction',
        entityId: created?.id,
        description: `Criou lançamento "${dto.description}" de ${dto.type === 'RECEITA' ? '+' : '-'}R$ ${dto.amount.toFixed(2)}`,
      });
      return created;
    }

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Transaction',
      description: `Criou lançamento parcelado "${dto.description}" em ${installments}x, total R$ ${dto.amount.toFixed(2)}`,
    });

    return result;
  }

  async findAll(userId: string, query: QueryTransactionDto) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.accountId) where.accountId = query.accountId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.description = { contains: query.search, mode: 'insensitive' };
    }

    return this.prisma.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { category: true, account: true },
    });
    if (!transaction) throw new NotFoundException('Lançamento não encontrado');
    if (transaction.userId !== userId) throw new ForbiddenException();
    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const current = await this.findOne(userId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const wasSettled = current.status === 'PAGO' || current.status === 'RECEBIDO';
      const willBeSettled = dto.status === 'PAGO' || dto.status === 'RECEBIDO';

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          ...dto,
          date: dto.date ? new Date(dto.date) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          paidAt: willBeSettled && !wasSettled ? new Date() : undefined,
        },
      });

      // Ajusta saldo se status de liquidação mudou
      if (!wasSettled && willBeSettled) {
        const delta = current.type === 'RECEITA' ? Number(updated.amount) : -Number(updated.amount);
        await tx.account.update({
          where: { id: current.accountId },
          data: { currentBalance: { increment: delta } },
        });
      } else if (wasSettled && dto.status && !willBeSettled) {
        const delta = current.type === 'RECEITA' ? -Number(current.amount) : Number(current.amount);
        await tx.account.update({
          where: { id: current.accountId },
          data: { currentBalance: { increment: delta } },
        });
      }

      return updated;
    });

    await this.logUpdate(userId, current, updated);
    return updated;
  }

  private async logUpdate(userId: string, current: any, updated: any) {
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Transaction',
      entityId: current.id,
      description: `Editou lançamento "${current.description}"${
        current.status !== updated.status ? ` — status: ${current.status} → ${updated.status}` : ''
      }`,
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (current.status === 'PAGO' || current.status === 'RECEBIDO') {
        const delta = current.type === 'RECEITA' ? -Number(current.amount) : Number(current.amount);
        await tx.account.update({
          where: { id: current.accountId },
          data: { currentBalance: { increment: delta } },
        });
      }
      return tx.transaction.delete({ where: { id } });
    }).then(async (deleted) => {
      await this.audit.log({
        userId,
        action: 'DELETE',
        entity: 'Transaction',
        entityId: id,
        description: `Excluiu lançamento "${current.description}" de R$ ${Number(current.amount).toFixed(2)}`,
      });
      return deleted;
    });
  }
}
