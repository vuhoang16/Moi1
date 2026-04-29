import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinancialSummary(landlordId: string, propertyId: string, from: string, to: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { landlordId: true },
    });
    if (!property || property.landlordId !== landlordId) throw new ForbiddenException();

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        landlordId,
        room: { propertyId },
        status: 'da_thanh_toan',
        paidAt: { gte: fromDate, lte: toDate },
      },
      select: {
        billingMonth: true,
        baseRent: true,
        electricityAmount: true,
        waterAmount: true,
        otherFees: true,
        totalAmount: true,
        paidAt: true,
        room: { select: { roomNumber: true } },
      },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalRent = invoices.reduce((sum, inv) => sum + inv.baseRent, 0);
    const totalElectricity = invoices.reduce((sum, inv) => sum + inv.electricityAmount, 0);
    const totalWater = invoices.reduce((sum, inv) => sum + inv.waterAmount, 0);

    const byMonth = Object.values(
      invoices.reduce<Record<string, { month: string; total: number }>>((acc, inv) => {
        const m = inv.billingMonth;
        if (!acc[m]) acc[m] = { month: m, total: 0 };
        acc[m].total += inv.totalAmount;
        return acc;
      }, {}),
    ).sort((a, b) => a.month.localeCompare(b.month));

    const occupancyData = await this.prisma.room.findMany({
      where: { propertyId },
      select: {
        roomNumber: true,
        status: true,
        _count: { select: { invoices: true } },
      },
    });

    return {
      totalRevenue,
      totalRent,
      totalElectricity,
      totalWater,
      invoiceCount: invoices.length,
      byMonth,
      invoices,
      occupancy: {
        total: occupancyData.length,
        occupied: occupancyData.filter((r) => r.status === 'da_thue').length,
        vacant: occupancyData.filter((r) => r.status === 'trong').length,
      },
    };
  }
}
