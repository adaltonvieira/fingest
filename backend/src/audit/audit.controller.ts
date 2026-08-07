import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-log')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  findRecent(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.service.findRecent(user.userId, limit ? Number(limit) : 50);
  }
}
