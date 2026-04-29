import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  initiate(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.payments.initiate(user.id, dto);
  }

  @Get('by-invoice/:invoiceId')
  findByInvoice(@CurrentUser() user: any, @Param('invoiceId') invoiceId: string) {
    return this.payments.findByInvoice(invoiceId, user.id);
  }
}
