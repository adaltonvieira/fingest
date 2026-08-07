import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { CreateRecurringRuleDto, UpdateRecurringRuleDto } from './dto/recurring-rule.dto';

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

@Injectable()
export class RecurringRulesService {
  private readonly logger = new Logger(RecurringRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateRecurringRuleDto) {
    return this.prisma.recurringRule.create({ data: { ...dto, userId } });
  }

  findAll(userId: string) {
    return this.prisma.recurringRule.findMany({
      where: { userId },
      include: { },
      orderBy: { dayOfMonth: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const rule = await this.prisma.recurringRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Automação não encontrada');
    if (rule.userId !== userId) throw new ForbiddenException();
    return rule;
  }

  async update(userId: string, id: string, dto: UpdateRecurringRuleDto) {
    await this.findOne(userId, id);
    return this.prisma.recurringRule.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.recurringRule.delete({ where: { id } });
  }

  /**
   * Roda todo dia à meia-noite (horário do servidor). Para cada regra ativa cujo
   * dia do mês bate com hoje, e que ainda não gerou lançamento neste mês, cria a
   * transação correspondente automaticamente.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyGeneration() {
    await this.generateDueTransactions();
  }

  /** Extraído em método público para permitir disparo manual (ex: endpoint de teste). */
  async generateDueTransactions(referenceDate: Date = new Date()) {
    const today = referenceDate.getUTCDate();
    const currentMonth = startOfMonth(referenceDate);

    const dueRules = await this.prisma.recurringRule.findMany({
      where: {
        active: true,
        dayOfMonth: today,
        OR: [{ lastGeneratedMonth: null }, { lastGeneratedMonth: { lt: currentMonth } }],
      },
    });

    for (const rule of dueRules) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId: rule.userId,
              type: rule.type,
              description: `${rule.description} (automático)`,
              amount: rule.amount,
              status: 'PENDENTE',
              date: referenceDate,
              dueDate: referenceDate,
              accountId: rule.accountId,
              categoryId: rule.categoryId,
              paymentMethod: rule.paymentMethod,
            },
          });
          await tx.recurringRule.update({
            where: { id: rule.id },
            data: { lastGeneratedMonth: currentMonth },
          });
        });
        this.logger.log(`Lançamento automático gerado para a regra "${rule.description}"`);
      } catch (err) {
        this.logger.error(`Falha ao gerar lançamento para a regra ${rule.id}`, err as Error);
      }
    }

    return { generated: dueRules.length };
  }
}
