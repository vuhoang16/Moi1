import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DepositStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export class UpdateDepositDto {
  action: 'collect' | 'refund' | 'partial-deduct';
  method?: string;
  transactionId?: string;
  deductedAmount?: number;
  deductionReason?: string;
  notes?: string;
}

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByContract(contractId: string, userId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { contractId },
      include: { contract: { select: { landlordId: true, tenantId: true } } },
    });
    if (!deposit) throw new NotFoundException();
    if (deposit.contract.landlordId !== userId && deposit.contract.tenantId !== userId) {
      throw new ForbiddenException();
    }
    return deposit;
  }

  async update(contractId: string, landlordId: string, dto: UpdateDepositDto) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { contractId },
      include: { contract: { select: { landlordId: true } } },
    });
    if (!deposit) throw new NotFoundException();
    if (deposit.contract.landlordId !== landlordId) throw new ForbiddenException();

    switch (dto.action) {
      case 'collect':
        if (deposit.status !== DepositStatus.dang_giu) {
          throw new BadRequestException('Đặt cọc đã được xử lý');
        }
        return this.prisma.deposit.update({
          where: { contractId },
          data: {
            collectedAt: new Date(),
            collectionMethod: dto.method,
            collectionTransactionId: dto.transactionId,
            notes: dto.notes,
          },
        });

      case 'partial-deduct':
        return this.prisma.deposit.update({
          where: { contractId },
          data: {
            status: DepositStatus.da_tru_mot_phan,
            deductedAmount: dto.deductedAmount,
            deductionReason: dto.deductionReason,
          },
        });

      case 'refund':
        return this.prisma.deposit.update({
          where: { contractId },
          data: {
            status: DepositStatus.da_hoan,
            refundedAt: new Date(),
            refundMethod: dto.method,
            refundTransactionId: dto.transactionId,
          },
        });

      default:
        throw new BadRequestException('Hành động không hợp lệ');
    }
  }
}
