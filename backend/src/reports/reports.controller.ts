import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('comparison')
  getComparison(@CurrentUser() user: AuthenticatedUser, @Query('months') months?: string) {
    return this.service.getMonthlyComparison(user.userId, months ? Number(months) : 6);
  }

  @Get('monthly')
  getMonthly(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getMonthlyReport(user.userId, Number(year), Number(month));
  }
}
