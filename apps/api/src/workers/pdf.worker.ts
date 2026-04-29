import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../common/prisma/prisma.service';
import { contractTemplate } from './templates/contract.template';

@Injectable()
@Processor('pdf')
export class PdfWorker {
  private readonly logger = new Logger(PdfWorker.name);

  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  constructor(private readonly prisma: PrismaService) {}

  @Process('generate-contract')
  async generateContract(job: Job<{ contractId: string }>) {
    const { contractId } = job.data;
    this.logger.log(`Generating PDF for contract ${contractId}`);

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        room: { include: { property: true } },
        landlord: true,
        tenant: true,
      },
    });
    if (!contract) return;

    const html = contractTemplate(contract as any);
    const pdf = await this.renderPdf(html);
    const path = `${contractId}/contract.pdf`;

    const { error } = await this.supabase.storage
      .from(process.env.STORAGE_BUCKET_CONTRACTS!)
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });

    if (error) {
      this.logger.error(`PDF upload failed: ${error.message}`);
      throw error;
    }

    const { data } = this.supabase.storage
      .from(process.env.STORAGE_BUCKET_CONTRACTS!)
      .getPublicUrl(path);

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { pdfUrl: data.publicUrl },
    });

    this.logger.log(`PDF stored at ${data.publicUrl}`);
  }

  @Process('embed-signatures')
  async embedSignatures(job: Job<{ contractId: string }>) {
    const { contractId } = job.data;
    this.logger.log(`Embedding signatures for contract ${contractId}`);

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        room: { include: { property: true } },
        landlord: true,
        tenant: true,
      },
    });
    if (!contract?.landlordSignatureUrl || !contract?.tenantSignatureUrl) return;

    const html = contractTemplate(contract as any, {
      landlordSignatureUrl: contract.landlordSignatureUrl,
      tenantSignatureUrl: contract.tenantSignatureUrl,
    });
    const pdf = await this.renderPdf(html);
    const path = `${contractId}/contract-signed.pdf`;

    await this.supabase.storage
      .from(process.env.STORAGE_BUCKET_CONTRACTS!)
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });

    const { data } = this.supabase.storage
      .from(process.env.STORAGE_BUCKET_CONTRACTS!)
      .getPublicUrl(path);

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { pdfUrl: data.publicUrl },
    });
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN ?? undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
