import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MaintenanceStatus, MaintenancePriority } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export class CreateTicketDto {
  contractId: string;
  title: string;
  description: string;
  mediaUrls?: string[];
  priority?: MaintenancePriority;
}

export class UpdateTicketDto {
  status?: MaintenanceStatus;
  assignedWorker?: string;
  workerPhone?: string;
  scheduledAt?: string;
  resolvedAt?: string;
}

export class RateTicketDto {
  tenantRating: number;
  tenantFeedback?: string;
}

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTicketDto) {
    const contract = await this.prisma.contract.findUnique({ where: { id: dto.contractId } });
    if (!contract) throw new NotFoundException();
    if (contract.tenantId !== tenantId) throw new ForbiddenException();

    const room = await this.prisma.room.findUnique({
      where: { id: contract.roomId },
      select: { propertyId: true },
    });

    const ticket = await this.prisma.maintenanceTicket.create({
      data: {
        contractId: dto.contractId,
        roomId: contract.roomId,
        propertyId: room!.propertyId,
        tenantId,
        landlordId: contract.landlordId,
        title: dto.title,
        description: dto.description,
        mediaUrls: dto.mediaUrls ?? [],
        priority: dto.priority ?? MaintenancePriority.trung_binh,
        statusHistory: [{ status: MaintenanceStatus.cho_xu_ly, at: new Date().toISOString() }],
      },
    });

    return ticket;
  }

  async findAll(userId: string, role: string) {
    const where =
      role === 'chu_nha' ? { landlordId: userId } : { tenantId: userId };
    return this.prisma.maintenanceTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { roomNumber: true } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException();
    if (ticket.tenantId !== userId && ticket.landlordId !== userId) throw new ForbiddenException();
    return ticket;
  }

  async update(id: string, landlordId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException();
    if (ticket.landlordId !== landlordId) throw new ForbiddenException();

    const history = ticket.statusHistory as any[];
    if (dto.status) {
      history.push({ status: dto.status, at: new Date().toISOString() });
    }

    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
        statusHistory: history,
      },
    });
  }

  async rate(id: string, tenantId: string, dto: RateTicketDto) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException();
    if (ticket.tenantId !== tenantId) throw new ForbiddenException();

    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: { tenantRating: dto.tenantRating, tenantFeedback: dto.tenantFeedback },
    });
  }
}
