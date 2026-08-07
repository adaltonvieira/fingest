import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AddContributionDto, CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        targetAmount: dto.targetAmount,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        color: dto.color,
        icon: dto.icon,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: { contributions: { orderBy: { date: 'desc' } } },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    if (goal.userId !== userId) throw new ForbiddenException();
    return goal;
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(userId, id);
    return this.prisma.goal.update({
      where: { id },
      data: { ...dto, deadline: dto.deadline ? new Date(dto.deadline) : undefined },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.goal.delete({ where: { id } });
  }

  async addContribution(userId: string, goalId: string, dto: AddContributionDto) {
    const goal = await this.findOne(userId, goalId);

    if (dto.accountId) {
      const account = await this.prisma.account.findUnique({ where: { id: dto.accountId } });
      if (!account || account.userId !== userId) {
        throw new ForbiddenException('Conta inválida');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const contribution = await tx.goalContribution.create({
        data: {
          goalId,
          amount: dto.amount,
          date: new Date(),
          accountId: dto.accountId,
          notes: dto.notes,
        },
      });

      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: { currentAmount: { increment: dto.amount } },
      });

      if (dto.accountId) {
        await tx.account.update({
          where: { id: dto.accountId },
          data: { currentBalance: { decrement: dto.amount } },
        });
      }

      return { contribution, goal: updatedGoal };
    });
  }
}
