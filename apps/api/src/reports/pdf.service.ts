import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  async generateFinancialReport(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Báo cáo tài chính', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, { align: 'right' });
      doc.moveDown(2);

      // Summary
      doc.fontSize(16).text('Tổng quan');
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Tổng thu: ${this.formatCurrency(data.totalRevenue)}`);
      doc.moveDown(2);

      // Breakdown
      doc.fontSize(16).text('Chi tiết doanh thu');
      doc.moveDown(0.5);

      data.byMonth.forEach((item: any) => {
        doc.fontSize(12).text(`Tháng ${item.month}: ${this.formatCurrency(item.total)}`);
      });

      doc.end();
    });
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }
}
