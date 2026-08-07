import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { ConfirmImportDto } from './dto/confirm-import.dto';

@ApiTags('import-export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ImportExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
  ) {}

  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.exportService.exportCsv(user.userId, from, to);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lancamentos.csv"');
    res.send(csv);
  }

  @Get('export/xlsx')
  async exportXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buffer = await this.exportService.exportXlsx(user.userId, from, to);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="lancamentos.xlsx"');
    res.send(buffer);
  }

  @Post('import/preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');

    // XLSX/DOCX/ZIP começam com a assinatura binária "PK" — detectamos pelo
    // conteúdo real, não pela extensão do nome (evita erro se o arquivo foi
    // renomeado incorretamente, ex: um .xlsx salvo como .csv).
    const isZipBased = file.buffer.length > 2 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;

    let rows;
    if (isZipBased) {
      rows = await this.importService.parseXlsx(file.buffer);
    } else {
      const content = file.buffer.toString('utf-8');
      const isOfx = content.includes('<OFX>') || content.includes('<ofx>');
      rows = isOfx ? this.importService.parseOfx(content) : this.importService.parseCsv(content);
    }

    return { rows, count: rows.length };
  }

  @Post('import/confirm')
  confirmImport(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmImportDto) {
    return this.importService.confirmImport(user.userId, dto.accountId, dto.rows, dto.categoryId);
  }
}
