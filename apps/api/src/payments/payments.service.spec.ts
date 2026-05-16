import { Test } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

const makePrisma = () => ({
  invoice: { findUnique: jest.fn(), update: jest.fn() },
  payment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
});

const baseInvoice = {
  id: 'inv-1',
  tenantId: 'tenant-1',
  landlordId: 'landlord-1',
  contractId: 'contract-1',
  totalAmount: 5_500_000,
  billingMonth: '2026-04',
  status: InvoiceStatus.chua_thanh_toan,
  room: { roomNumber: '101', property: { name: 'Chung cư ABC' } },
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PaymentsService);

    process.env.MOMO_PARTNER_CODE = 'MOMOPARTNER';
    process.env.MOMO_ACCESS_KEY = 'momo-access';
    process.env.MOMO_SECRET_KEY = 'momo-secret';
    process.env.MOMO_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/create';
    process.env.MOMO_REDIRECT_URL = 'rentapp://payment/result';
    process.env.MOMO_IPN_URL = 'https://api.example.com/v1/webhooks/momo';
    process.env.ZALOPAY_APP_ID = '2553';
    process.env.ZALOPAY_KEY1 = 'zalopay-key1';
    process.env.ZALOPAY_ENDPOINT = 'https://sb-openapi.zalopay.vn/v2/create';
    process.env.ZALOPAY_CALLBACK_URL = 'https://api.example.com/v1/webhooks/zalopay';
    process.env.SEPAY_BANK_CODE = 'VCB';
    process.env.SEPAY_ACCOUNT_NUMBER = '1234567890';
  });

  afterEach(() => jest.clearAllMocks());

  describe('initiate', () => {
    it('throws NotFoundException when invoice missing', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(service.initiate('tenant-1', { invoiceId: 'inv-1', method: PaymentMethod.vietqr }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when tenant mismatch', async () => {
      prisma.invoice.findUnique.mockResolvedValue({ ...baseInvoice, tenantId: 'other-tenant' });
      await expect(service.initiate('tenant-1', { invoiceId: 'inv-1', method: PaymentMethod.vietqr }))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequest when invoice already paid', async () => {
      prisma.invoice.findUnique.mockResolvedValue({ ...baseInvoice, status: InvoiceStatus.da_thanh_toan });
      await expect(service.initiate('tenant-1', { invoiceId: 'inv-1', method: PaymentMethod.vietqr }))
        .rejects.toThrow(BadRequestException);
    });

    it('generates VietQR URL without external call', async () => {
      prisma.invoice.findUnique.mockResolvedValue(baseInvoice);
      prisma.payment.create.mockResolvedValue({ id: 'pay-1' });

      const result = await service.initiate('tenant-1', { invoiceId: 'inv-1', method: PaymentMethod.vietqr });

      expect(result.qrCodeUrl).toContain('img.vietqr.io');
      expect(result.qrCodeUrl).toContain('amount=5500000');
      expect(result.qrCodeUrl).toContain('VCB');
      expect(result.qrCodeUrl).toContain('1234567890');
    });

    it('initiates MoMo and returns deeplink', async () => {
      prisma.invoice.findUnique.mockResolvedValue(baseInvoice);
      prisma.payment.create.mockResolvedValue({ id: 'pay-1' });
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { resultCode: 0, deeplink: 'momo://payment', payUrl: 'https://pay.momo.vn/link' },
      });

      const result = await service.initiate('tenant-1', { invoiceId: 'inv-1', method: PaymentMethod.momo });

      expect(result.deeplink).toBe('momo://payment');
      expect(result.payUrl).toBe('https://pay.momo.vn/link');
    });

    it('throws BadRequest on MoMo API error', async () => {
      prisma.invoice.findUnique.mockResolvedValue(baseInvoice);
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { resultCode: 99, message: 'Invalid request' },
      });

      await expect(service.initiate('tenant-1', { invoiceId: 'inv-1', method: PaymentMethod.momo }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('reconcile — idempotency', () => {
    const pendingPayment = {
      id: 'pay-1',
      invoiceId: 'inv-1',
      amount: 5_500_000,
      gatewayOrderId: 'RENT-abc-123',
      status: PaymentStatus.cho_xu_ly,
    };

    it('atomically updates payment and then updates invoice on success', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.invoice.update.mockResolvedValue({});

      await service.reconcile('RENT-abc-123', 'success', 'txn-456', { rawData: true });

      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { gatewayOrderId: 'RENT-abc-123', status: PaymentStatus.cho_xu_ly },
          data: expect.objectContaining({ status: PaymentStatus.thanh_cong, gatewayTransactionId: 'txn-456' }),
        }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({ status: InvoiceStatus.da_thanh_toan }),
        }),
      );
    });

    it('does nothing when payment already reconciled (idempotency — updateMany count === 0)', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, status: PaymentStatus.thanh_cong });
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });

      await service.reconcile('RENT-abc-123', 'success', 'txn-456');

      // updateMany with cho_xu_ly condition returns 0 → invoice must not be touched
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('does nothing when payment not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.reconcile('RENT-unknown', 'success', 'txn-789');

      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('skips reconciliation and returns when expectedAmount does not match DB amount', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);

      await service.reconcile('RENT-abc-123', 'success', 'txn-789', {}, 1);

      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('proceeds normally when expectedAmount matches DB amount', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.invoice.update.mockResolvedValue({});

      await service.reconcile('RENT-abc-123', 'success', 'txn-789', {}, 5_500_000);

      expect(prisma.payment.updateMany).toHaveBeenCalled();
      expect(prisma.invoice.update).toHaveBeenCalled();
    });

    it('marks payment as that_bai on failure using updateMany', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.reconcile('RENT-abc-fail', 'failure');

      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PaymentStatus.cho_xu_ly }),
          data: expect.objectContaining({ status: PaymentStatus.that_bai }),
        }),
      );
    });

    it('does not update invoice on failure', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.reconcile('RENT-abc-fail', 'failure');

      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });
});
