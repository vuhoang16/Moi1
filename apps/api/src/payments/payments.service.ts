import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { PaymentMethod, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async initiate(tenantId: string, dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { room: { select: { roomNumber: true, property: { select: { name: true } } } } },
    });
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (invoice.tenantId !== tenantId) throw new ForbiddenException();
    if (invoice.status === InvoiceStatus.da_thanh_toan) {
      throw new BadRequestException('Hóa đơn đã được thanh toán');
    }

    const orderId = `RENT-${invoice.id.replace(/-/g, '').slice(0, 8)}-${crypto.randomBytes(8).toString('hex')}`;
    const orderInfo = `Thanh toán hóa đơn ${invoice.billingMonth} - ${invoice.room.roomNumber}`;

    let gatewayData: { deeplink?: string; qrCodeUrl?: string; payUrl?: string };

    switch (dto.method) {
      case PaymentMethod.momo:
        gatewayData = await this.createMoMoOrder(orderId, invoice.totalAmount, orderInfo);
        break;
      case PaymentMethod.zalopay:
        gatewayData = await this.createZaloPayOrder(orderId, invoice.totalAmount, orderInfo, tenantId);
        break;
      case PaymentMethod.vietqr:
        gatewayData = await this.createVietQR(orderId, invoice.totalAmount, orderInfo);
        break;
      default:
        throw new BadRequestException('Phương thức thanh toán không hỗ trợ');
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        tenantId,
        landlordId: invoice.landlordId,
        amount: invoice.totalAmount,
        method: dto.method,
        gatewayOrderId: orderId,
      },
    });

    return { payment, ...gatewayData };
  }

  async findByInvoice(invoiceId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException();
    if (invoice.tenantId !== userId && invoice.landlordId !== userId) throw new ForbiddenException();

    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reconcile(
    orderId: string,
    status: 'success' | 'failure',
    transactionId?: string,
    gatewayResponse?: object,
    expectedAmount?: number,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { gatewayOrderId: orderId } });
    if (!payment) return;

    if (expectedAmount !== undefined && payment.amount !== expectedAmount) {
      this.logger.warn(`Amount mismatch for ${orderId}: expected ${payment.amount}, received ${expectedAmount}`);
      return;
    }

    if (status === 'success') {
      // Atomic idempotency guard — only one concurrent delivery can win this transition
      const claimed = await this.prisma.payment.updateMany({
        where: { gatewayOrderId: orderId, status: PaymentStatus.cho_xu_ly },
        data: {
          status: PaymentStatus.thanh_cong,
          gatewayTransactionId: transactionId,
          gatewayResponse: gatewayResponse as any,
          paidAt: new Date(),
        },
      });
      if (claimed.count === 0) return;

      await this.prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: InvoiceStatus.da_thanh_toan, paidAt: new Date() },
      });
    } else {
      await this.prisma.payment.updateMany({
        where: { gatewayOrderId: orderId, status: PaymentStatus.cho_xu_ly },
        data: {
          status: PaymentStatus.that_bai,
          gatewayResponse: gatewayResponse as any,
        },
      });
    }
  }

  private async createMoMoOrder(orderId: string, amount: number, orderInfo: string) {
    const { MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_ENDPOINT, MOMO_REDIRECT_URL, MOMO_IPN_URL } = process.env;
    const requestId = orderId;
    const rawSignature = `accessKey=${MOMO_ACCESS_KEY}&amount=${amount}&extraData=&ipnUrl=${MOMO_IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_PARTNER_CODE}&redirectUrl=${MOMO_REDIRECT_URL}&requestId=${requestId}&requestType=payWithMethod`;
    const signature = crypto.createHmac('sha256', MOMO_SECRET_KEY!).update(rawSignature).digest('hex');

    const { data } = await axios.post(MOMO_ENDPOINT!, {
      partnerCode: MOMO_PARTNER_CODE,
      accessKey: MOMO_ACCESS_KEY,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: MOMO_REDIRECT_URL,
      ipnUrl: MOMO_IPN_URL,
      requestType: 'payWithMethod',
      extraData: '',
      lang: 'vi',
      signature,
    });

    if (data.resultCode !== 0) {
      this.logger.error(`MoMo order creation failed for ${orderId}: [${data.resultCode}] ${data.message}`);
      throw new BadRequestException('Không thể tạo thanh toán MoMo. Vui lòng thử lại.');
    }
    return { deeplink: data.deeplink, payUrl: data.payUrl };
  }

  private async createZaloPayOrder(orderId: string, amount: number, description: string, userId: string) {
    const { ZALOPAY_APP_ID, ZALOPAY_KEY1, ZALOPAY_ENDPOINT, ZALOPAY_CALLBACK_URL } = process.env;
    const appTime = Date.now();
    const embedData = JSON.stringify({ redirecturl: 'rentapp://payment/result' });
    const hmacInput = `${ZALOPAY_APP_ID}|${orderId}|${amount}|${appTime}|${embedData}|${description}|${userId}`;
    const mac = crypto.createHmac('sha256', ZALOPAY_KEY1!).update(hmacInput).digest('hex');

    const { data } = await axios.post(ZALOPAY_ENDPOINT!, {
      app_id: Number(ZALOPAY_APP_ID),
      app_trans_id: orderId,
      app_user: userId,
      app_time: appTime,
      amount,
      item: '[]',
      embed_data: embedData,
      description,
      bank_code: '',
      mac,
      callback_url: ZALOPAY_CALLBACK_URL,
    });

    if (data.return_code !== 1) {
      this.logger.error(`ZaloPay order creation failed for ${orderId}: [${data.return_code}] ${data.return_message}`);
      throw new BadRequestException('Không thể tạo thanh toán ZaloPay. Vui lòng thử lại.');
    }
    return { payUrl: data.order_url };
  }

  private async createVietQR(orderId: string, amount: number, description: string) {
    const qrCodeUrl = `https://img.vietqr.io/image/${process.env.SEPAY_BANK_CODE}-${process.env.SEPAY_ACCOUNT_NUMBER}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(orderId)}&accountName=${encodeURIComponent('CONG TY THUE NHA')}`;
    return { qrCodeUrl };
  }
}
