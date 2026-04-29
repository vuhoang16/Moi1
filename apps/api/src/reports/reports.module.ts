import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfService } from './pdf.service';

@Module({
  providers: [ReportsService, PdfService],
  controllers: [ReportsController],
})
export class ReportsModule {}
