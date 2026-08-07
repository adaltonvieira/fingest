import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RecurringRulesService } from './recurring-rules.service';
import { CreateRecurringRuleDto, UpdateRecurringRuleDto } from './dto/recurring-rule.dto';

@ApiTags('recurring-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring-rules')
export class RecurringRulesController {
  constructor(private readonly service: RecurringRulesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecurringRuleDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.userId);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringRuleDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.userId, id);
  }

  /**
   * Dispara manualmente a geração de lançamentos do dia — útil para testar sem
   * esperar a virada de dia real (o cron automático roda à meia-noite).
   */
  @Post('run-now')
  runNow() {
    return this.service.generateDueTransactions();
  }
}
