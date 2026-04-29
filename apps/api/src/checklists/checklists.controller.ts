import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import {
  ChecklistsService,
  CreateChecklistDto,
  ConfirmChecklistDto,
} from './checklists.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklists: ChecklistsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateChecklistDto) {
    return this.checklists.create(user.id, dto);
  }

  @Get('by-contract/:contractId')
  findByContract(@CurrentUser() user: any, @Param('contractId') contractId: string) {
    return this.checklists.findByContract(contractId, user.id);
  }

  @Patch(':id/confirm-tenant')
  confirmByTenant(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ConfirmChecklistDto,
  ) {
    return this.checklists.confirmByTenant(id, user.id, dto);
  }

  @Patch(':id/confirm-landlord')
  confirmByLandlord(@CurrentUser() user: any, @Param('id') id: string) {
    return this.checklists.confirmByLandlord(id, user.id);
  }
}
