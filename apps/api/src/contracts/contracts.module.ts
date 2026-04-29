import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'pdf' })],
  providers: [ContractsService],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
