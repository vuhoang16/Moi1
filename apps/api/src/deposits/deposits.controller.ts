import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DepositsService, UpdateDepositDto } from './deposits.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private readonly deposits: DepositsService) {}

  @Get('by-contract/:contractId')
  findByContract(@CurrentUser() user: any, @Param('contractId') contractId: string) {
    return this.deposits.findByContract(contractId, user.id);
  }

  @Patch('by-contract/:contractId')
  update(
    @CurrentUser() user: any,
    @Param('contractId') contractId: string,
    @Body() dto: UpdateDepositDto,
  ) {
    return this.deposits.update(contractId, user.id, dto);
  }
}
