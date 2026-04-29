import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.invoices.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoices.findOne(id, user.id);
  }
}
