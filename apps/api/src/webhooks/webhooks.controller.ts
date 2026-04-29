import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentsService } from '../payments/payments.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly payments: PaymentsService) {}

  @Post('momo')
  @HttpCode(204)
  async momoCallback(@Body() body: any) {
    const { MOMO_SECRET_KEY } = process.env;
    const { orderId, resultCode, transId, message } = body;

    const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${body.amount}&extraData=${body.extraData}&message=${message}&orderId=${orderId}&orderInfo=${body.orderInfo}&orderType=${body.orderType}&partnerCode=${body.partnerCode}&payType=${body.payType}&requestId=${body.requestId}&responseTime=${body.responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const expectedSig = crypto.createHmac('sha256', MOMO_SECRET_KEY!).update(rawSignature).digest('hex');

    if (body.signature !== expectedSig) {
      this.logger.warn(`MoMo webhook signature mismatch for order ${orderId}`);
      throw new BadRequestException('Invalid signature');
    }

    const success = resultCode === 0;
    await this.payments.reconcile(
      orderId,
      success ? 'success' : 'failure',
      success ? String(transId) : undefined,
      body,
    );
  }

  @Post('zalopay')
  @HttpCode(200)
  async zalopayCallback(@Body() body: any) {
    const { ZALOPAY_KEY2 } = process.env;
    const { data: rawData, mac } = body;
    const expectedMac = crypto.createHmac('sha256', ZALOPAY_KEY2!).update(rawData).digest('hex');

    if (mac !== expectedMac) {
      this.logger.warn('ZaloPay webhook MAC mismatch');
      return { return_code: -1, return_message: 'mac not equal' };
    }

    const parsed = JSON.parse(rawData);
    const success = parsed.return_code === 1;
    await this.payments.reconcile(
      parsed.app_trans_id,
      success ? 'success' : 'failure',
      success ? parsed.zp_trans_id : undefined,
      parsed,
    );

    return { return_code: 1, return_message: 'success' };
  }

  @Post('sepay')
  @HttpCode(200)
  async sepayCallback(
    @Body() body: any,
    @Headers('x-api-key') apiKey: string,
  ) {
    if (apiKey !== process.env.SEPAY_WEBHOOK_SECRET) {
      throw new BadRequestException('Invalid API key');
    }

    const { transferAmount, description } = body;
    const match = description?.match(/RENT-([a-zA-Z0-9]{8}-\d+)/);
    if (!match) return { success: true };

    const orderId = match[0];
    await this.payments.reconcile(orderId, 'success', body.referenceCode, body);
    return { success: true };
  }
}
