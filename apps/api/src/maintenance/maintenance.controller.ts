import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import {
  MaintenanceService,
  CreateTicketDto,
  UpdateTicketDto,
  RateTicketDto,
} from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.maintenance.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.maintenance.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.maintenance.findOne(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.maintenance.update(id, user.id, dto);
  }

  @Patch(':id/rate')
  rate(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RateTicketDto) {
    return this.maintenance.rate(id, user.id, dto);
  }
}
