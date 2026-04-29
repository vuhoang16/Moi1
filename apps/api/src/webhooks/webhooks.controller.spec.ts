import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebhooksController } from './webhooks.controller';
import { PaymentsService } from '../payments/payments.service';

const makePaymentsService = () => ({ reconcile: jest.fn() });

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let payments: ReturnType<typeof makePaymentsService>;

  beforeEach(async () => {
    payments = makePaymentsService();
    const module = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: PaymentsService, useValue: payments }],
    }).compile();
    controller = module.get(WebhooksController);

    process.env.MOMO_ACCESS_KEY = 'momo-access';
    process.env.MOMO_SECRET_KEY = 'momo-secret';
    process.env.ZALOPAY_KEY2 = 'zalopay-key2';
    process.env.SEPAY_WEBHOOK_SECRET = 'sepay-secret';
  });

  afterEach(() => jest.clearAllMocks());

  // ── MoMo ────────────────────────────────────────────────────────────────────

  describe('POST /webhooks/momo', () => {
    function buildMomoBody(resultCode: number, override?: Partial<any>) {
      const body = {
        partnerCode: 'MOMOPARTNER',
        accessKey: 'momo-access',
        requestId: 'RENT-abc12345-1714320000000',
        orderId: 'RENT-abc12345-1714320000000',
        orderInfo: 'Thanh toán hóa đơn 2026-04',
        orderType: 'momo_wallet',
        transId: 987654321,
        resultCode,
        message: resultCode === 0 ? 'Successful.' : 'Failed.',
        payType: 'wallet',
        responseTime: 1714320001000,
        extraData: '',
        amount: 5_500_000,
        ...override,
      };

      const rawSignature = `accessKey=${body.accessKey}&amount=${body.amount}&extraData=${body.extraData}&message=${body.message}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&orderType=${body.orderType}&partnerCode=${body.partnerCode}&payType=${body.payType}&requestId=${body.requestId}&responseTime=${body.responseTime}&resultCode=${body.resultCode}&transId=${body.transId}`;
      const signature = crypto.createHmac('sha256', 'momo-secret').update(rawSignature).digest('hex');

      return { ...body, signature };
    }

    it('reconciles success when resultCode === 0', async () => {
      const body = buildMomoBody(0);
      await controller.momoCallback(body);

      expect(payments.reconcile).toHaveBeenCalledWith(
        body.orderId,
        'success',
        String(body.transId),
        body,
      );
    });

    it('reconciles failure when resultCode !== 0', async () => {
      const body = buildMomoBody(99);
      await controller.momoCallback(body);

      expect(payments.reconcile).toHaveBeenCalledWith(body.orderId, 'failure', undefined, body);
    });

    it('throws BadRequestException on invalid signature', async () => {
      const body = buildMomoBody(0);
      body.signature = 'tampered-signature';

      await expect(controller.momoCallback(body)).rejects.toThrow(BadRequestException);
      expect(payments.reconcile).not.toHaveBeenCalled();
    });
  });

  // ── ZaloPay ─────────────────────────────────────────────────────────────────

  describe('POST /webhooks/zalopay', () => {
    function buildZalopayBody(returnCode: number) {
      const parsed = {
        app_trans_id: 'RENT-abc12345-1714320000000',
        zp_trans_id: '2604241234567',
        return_code: returnCode,
        return_message: returnCode === 1 ? 'success' : 'fail',
      };
      const rawData = JSON.stringify(parsed);
      const mac = crypto.createHmac('sha256', 'zalopay-key2').update(rawData).digest('hex');
      return { data: rawData, mac };
    }

    it('reconciles success on return_code 1', async () => {
      const body = buildZalopayBody(1);
      const result = await controller.zalopayCallback(body);

      expect(payments.reconcile).toHaveBeenCalledWith(
        'RENT-abc12345-1714320000000',
        'success',
        '2604241234567',
        expect.objectContaining({ return_code: 1 }),
      );
      expect(result).toEqual({ return_code: 1, return_message: 'success' });
    });

    it('reconciles failure on return_code !== 1', async () => {
      const body = buildZalopayBody(2);
      await controller.zalopayCallback(body);

      expect(payments.reconcile).toHaveBeenCalledWith(
        'RENT-abc12345-1714320000000',
        'failure',
        undefined,
        expect.objectContaining({ return_code: 2 }),
      );
    });

    it('returns mac not equal on invalid MAC', async () => {
      const body = buildZalopayBody(1);
      body.mac = 'tampered-mac';

      const result = await controller.zalopayCallback(body);
      expect(result).toEqual({ return_code: -1, return_message: 'mac not equal' });
      expect(payments.reconcile).not.toHaveBeenCalled();
    });
  });

  // ── SePay ───────────────────────────────────────────────────────────────────

  describe('POST /webhooks/sepay', () => {
    const validBody = {
      transferAmount: 5_500_000,
      description: 'Chuyen khoan RENT-abc12345-1714320000',
      referenceCode: 'FT26114123456',
    };

    it('reconciles when orderId found in description', async () => {
      await controller.sepayCallback(validBody, 'sepay-secret');

      expect(payments.reconcile).toHaveBeenCalledWith(
        'RENT-abc12345-1714320000',
        'success',
        'FT26114123456',
        validBody,
      );
    });

    it('returns success without reconciling when no orderId in description', async () => {
      const body = { ...validBody, description: 'Chuyen khoan thang 4' };
      const result = await controller.sepayCallback(body, 'sepay-secret');

      expect(result).toEqual({ success: true });
      expect(payments.reconcile).not.toHaveBeenCalled();
    });

    it('throws BadRequestException on invalid API key', async () => {
      await expect(controller.sepayCallback(validBody, 'wrong-key')).rejects.toThrow(BadRequestException);
      expect(payments.reconcile).not.toHaveBeenCalled();
    });
  });
});
