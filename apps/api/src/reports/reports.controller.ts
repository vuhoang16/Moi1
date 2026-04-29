import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly pdf: PdfService,
  ) {}

  @Get('financial/:propertyId')
  getFinancial(
    @CurrentUser() user: any,
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reports.getFinancialSummary(user.id, propertyId, from, to);
  }

  @Get('export/:propertyId')
  async exportReport(
    @CurrentUser() user: any,
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const data = await this.reports.getFinancialSummary(user.id, propertyId, from, to);
    const pdfBuffer = await this.pdf.generateFinancialReport(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=report-${propertyId}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
