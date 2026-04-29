import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateContractDto) {
    return this.contracts.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.contracts.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contracts.findOne(id, user.id);
  }

  @Post(':id/sign-landlord')
  signAsLandlord(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SignContractDto,
  ) {
    return this.contracts.signAsLandlord(id, user.id, dto);
  }

  @Post(':id/sign-tenant')
  signAsTenant(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SignContractDto,
  ) {
    return this.contracts.signAsTenant(id, user.id, dto);
  }

  @Patch(':id/terminate')
  terminate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contracts.terminate(id, user.id);
  }
}
