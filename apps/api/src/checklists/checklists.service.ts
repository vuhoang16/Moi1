import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ChecklistPhase } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export class CreateChecklistDto {
  contractId: string;
  phase: ChecklistPhase;
  notes?: string;
  records: {
    name: string;
    category: string;
    quantity?: number;
    conditionOnCheckin?: string;
    conditionOnCheckout?: string;
    photoUrls?: string[];
  }[];
}

export class ConfirmChecklistDto {
  notes?: string;
}

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(landlordId: string, dto: CreateChecklistDto) {
    const contract = await this.prisma.contract.findUnique({ where: { id: dto.contractId } });
    if (!contract) throw new NotFoundException();
    if (contract.landlordId !== landlordId) throw new ForbiddenException();

    const existing = await this.prisma.checklist.findUnique({
      where: { contractId_phase: { contractId: dto.contractId, phase: dto.phase } },
    });
    if (existing) throw new ConflictException('Biên bản bàn giao đã tồn tại');

    return this.prisma.checklist.create({
      data: {
        contractId: dto.contractId,
        roomId: contract.roomId,
        phase: dto.phase,
        notes: dto.notes,
        records: {
          create: dto.records.map((r) => ({
            name: r.name,
            category: r.category,
            quantity: r.quantity ?? 1,
            conditionOnCheckin: r.conditionOnCheckin,
            conditionOnCheckout: r.conditionOnCheckout,
            photoUrls: r.photoUrls ?? [],
          })),
        },
      },
      include: { records: true },
    });
  }

  async findByContract(contractId: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException();
    if (contract.landlordId !== userId && contract.tenantId !== userId) throw new ForbiddenException();

    return this.prisma.checklist.findMany({
      where: { contractId },
      include: { records: true },
    });
  }

  async confirmByTenant(checklistId: string, tenantId: string, dto: ConfirmChecklistDto) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { contract: { select: { tenantId: true } } },
    });
    if (!checklist) throw new NotFoundException();
    if (checklist.contract.tenantId !== tenantId) throw new ForbiddenException();
    if (checklist.confirmedByTenantAt) throw new ConflictException('Đã xác nhận rồi');

    return this.prisma.checklist.update({
      where: { id: checklistId },
      data: { confirmedByTenantAt: new Date(), notes: dto.notes },
    });
  }

  async confirmByLandlord(checklistId: string, landlordId: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { contract: { select: { landlordId: true, tenantId: true } } },
    });
    if (!checklist) throw new NotFoundException();
    if (checklist.contract.landlordId !== landlordId) throw new ForbiddenException();
    if (!checklist.confirmedByTenantAt) {
      throw new BadRequestException('Người thuê chưa xác nhận');
    }

    return this.prisma.checklist.update({
      where: { id: checklistId },
      data: { confirmedByLandlordAt: new Date() },
    });
  }
}
