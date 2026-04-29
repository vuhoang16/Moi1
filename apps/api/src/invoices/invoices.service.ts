import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(landlordId: string, dto: CreateInvoiceDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: dto.contractId },
      include: {
        room: {
          include: { property: { select: { electricityRate: true, waterRate: true } } },
        },
      },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    if (contract.landlordId !== landlordId) throw new ForbiddenException();

    const duplicate = await this.prisma.invoice.findUnique({
      where: { contractId_billingMonth: { contractId: dto.contractId, billingMonth: dto.billingMonth } },
    });
    if (duplicate) throw new ConflictException('Hóa đơn tháng này đã tồn tại');

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { contractId: dto.contractId },
      orderBy: { createdAt: 'desc' },
    });

    const electricityPrev = lastInvoice?.electricityCurrentReading ?? contract.electricityStartReading;
    const waterPrev = lastInvoice?.waterCurrentReading ?? contract.waterStartReading;

    const electricityUsage = dto.electricityCurrentReading - electricityPrev;
    const waterUsage = dto.waterCurrentReading - waterPrev;
    const { electricityRate, waterRate } = contract.room.property;
    const electricityAmount = electricityUsage * electricityRate;
    const waterAmount = waterUsage * waterRate;
    const otherFeesTotal = (dto.otherFees ?? []).reduce((sum, f) => sum + f.amount, 0);
    const totalAmount = contract.monthlyRent + electricityAmount + waterAmount + otherFeesTotal;

    return this.prisma.invoice.create({
      data: {
        contractId: dto.contractId,
        roomId: contract.roomId,
        tenantId: contract.tenantId,
        landlordId,
        billingMonth: dto.billingMonth,
        dueDate: new Date(dto.dueDate),
        baseRent: contract.monthlyRent,
        electricityPrevReading: electricityPrev,
        electricityCurrentReading: dto.electricityCurrentReading,
        electricityUsage,
        electricityAmount,
        waterPrevReading: waterPrev,
        waterCurrentReading: dto.waterCurrentReading,
        waterUsage,
        waterAmount,
        otherFees: (dto.otherFees ?? []) as any,
        totalAmount,
        notes: dto.notes,
      },
    });
  }

  async findAll(userId: string, role: string) {
    const where =
      role === 'chu_nha' ? { landlordId: userId } : { tenantId: userId };

    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { roomNumber: true, property: { select: { name: true } } } },
        payments: { select: { status: true, paidAt: true } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        contract: { select: { monthlyRent: true } },
        room: { include: { property: true } },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (invoice.tenantId !== userId && invoice.landlordId !== userId) throw new ForbiddenException();
    return invoice;
  }
}
