import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BackupService } from './backup.service';

@ApiTags('backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('backup')
export class BackupController {
  constructor(private readonly service: BackupService) {}

  @Get('export')
  async exportAll(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const data = await this.service.exportAll(user.userId);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fingest-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.send(JSON.stringify(data, null, 2));
  }
}
