import { Module } from '@nestjs/common';
import { RecurringRulesController } from './recurring-rules.controller';
import { RecurringRulesService } from './recurring-rules.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [RecurringRulesController],
  providers: [RecurringRulesService, PrismaService],
})
export class RecurringRulesModule {}
