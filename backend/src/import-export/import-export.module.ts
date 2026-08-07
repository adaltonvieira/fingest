import { Module } from '@nestjs/common';
import { ImportExportController } from './import-export.controller';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ImportExportController],
  providers: [ExportService, ImportService, PrismaService],
})
export class ImportExportModule {}
