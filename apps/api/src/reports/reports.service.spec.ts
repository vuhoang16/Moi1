import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../common/prisma/prisma.service';

const makePrisma = () => ({
  property: { findUnique: jest.fn() },
  invoice: { findMany: jest.fn() },
  room: { findMany: jest.fn() },
});

const makeInvoice = (overrides: Partial<{
  billingMonth: string;
  baseRent: number;
  electricityAmount: number;
  waterAmount: number;
  otherFees: number;
  totalAmount: number;
  paidAt: Date;
  room: { roomNumber: string };
}> = {}) => ({
  billingMonth: '2024-01',
  baseRent: 3_000_000,
  electricityAmount: 200_000,
  waterAmount: 100_000,
  otherFees: 50_000,
  totalAmount: 3_350_000,
  paidAt: new Date('2024-01-15'),
  room: { roomNumber: '101' },
  ...overrides,
});

const makeRoom = (roomNumber: string, status: string) => ({
  roomNumber,
  status,
  _count: { invoices: 1 },
});

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: ReturnType<typeof makePrisma>;

  const landlordId = 'landlord-1';
  const propertyId = 'property-1';
  const from = '2024-01-01';
  const to = '2024-01-31';

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── guard checks ──────────────────────────────────────────────────────────

  describe('getFinancialSummary — guard checks', () => {
    it('throws ForbiddenException when property is not found', async () => {
      prisma.property.findUnique.mockResolvedValue(null);

      await expect(service.getFinancialSummary(landlordId, propertyId, from, to))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when property belongs to a different landlord', async () => {
      prisma.property.findUnique.mockResolvedValue({ landlordId: 'other-landlord' });

      await expect(service.getFinancialSummary(landlordId, propertyId, from, to))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── revenue totals ────────────────────────────────────────────────────────

  describe('getFinancialSummary — revenue totals', () => {
    beforeEach(() => {
      prisma.property.findUnique.mockResolvedValue({ landlordId });
      prisma.room.findMany.mockResolvedValue([]);
    });

    it('returns correct totalRevenue as sum of all invoice totalAmounts', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        makeInvoice({ totalAmount: 3_000_000 }),
        makeInvoice({ totalAmount: 2_500_000 }),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.totalRevenue).toBe(5_500_000);
    });

    it('returns correct totalRent as sum of all invoice baseRent values', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        makeInvoice({ baseRent: 3_000_000 }),
        makeInvoice({ baseRent: 4_000_000 }),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.totalRent).toBe(7_000_000);
    });

    it('returns correct totalElectricity as sum of all invoice electricityAmounts', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        makeInvoice({ electricityAmount: 150_000 }),
        makeInvoice({ electricityAmount: 250_000 }),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.totalElectricity).toBe(400_000);
    });

    it('returns correct totalWater as sum of all invoice waterAmounts', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        makeInvoice({ waterAmount: 80_000 }),
        makeInvoice({ waterAmount: 120_000 }),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.totalWater).toBe(200_000);
    });

    it('returns invoiceCount equal to the number of invoices', async () => {
      prisma.invoice.findMany.mockResolvedValue([makeInvoice(), makeInvoice(), makeInvoice()]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.invoiceCount).toBe(3);
    });

    it('returns zero totals and empty arrays when there are no invoices', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalRent).toBe(0);
      expect(result.totalElectricity).toBe(0);
      expect(result.totalWater).toBe(0);
      expect(result.invoiceCount).toBe(0);
      expect(result.byMonth).toEqual([]);
      expect(result.invoices).toEqual([]);
    });
  });

  // ── byMonth grouping ──────────────────────────────────────────────────────

  describe('getFinancialSummary — byMonth grouping', () => {
    beforeEach(() => {
      prisma.property.findUnique.mockResolvedValue({ landlordId });
      prisma.room.findMany.mockResolvedValue([]);
    });

    it('aggregates two invoices for the same month into one entry', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        makeInvoice({ billingMonth: '2024-01', totalAmount: 1_000_000 }),
        makeInvoice({ billingMonth: '2024-01', totalAmount: 2_000_000 }),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.byMonth).toHaveLength(1);
      expect(result.byMonth[0]).toEqual({ month: '2024-01', total: 3_000_000 });
    });

    it('returns two separate entries for invoices from different months', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        makeInvoice({ billingMonth: '2024-02', totalAmount: 1_500_000 }),
        makeInvoice({ billingMonth: '2024-01', totalAmount: 2_000_000 }),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.byMonth).toHaveLength(2);
      expect(result.byMonth[0]).toEqual({ month: '2024-01', total: 2_000_000 });
      expect(result.byMonth[1]).toEqual({ month: '2024-02', total: 1_500_000 });
    });

    it('sorts byMonth entries in ascending order by month string', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        makeInvoice({ billingMonth: '2024-03', totalAmount: 500_000 }),
        makeInvoice({ billingMonth: '2024-01', totalAmount: 500_000 }),
        makeInvoice({ billingMonth: '2024-02', totalAmount: 500_000 }),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.byMonth.map((e: any) => e.month)).toEqual(['2024-01', '2024-02', '2024-03']);
    });
  });

  // ── occupancy ─────────────────────────────────────────────────────────────

  describe('getFinancialSummary — occupancy', () => {
    beforeEach(() => {
      prisma.property.findUnique.mockResolvedValue({ landlordId });
      prisma.invoice.findMany.mockResolvedValue([]);
    });

    it('returns correct total, occupied, and vacant counts', async () => {
      prisma.room.findMany.mockResolvedValue([
        makeRoom('101', 'da_thue'),
        makeRoom('102', 'da_thue'),
        makeRoom('103', 'trong'),
        makeRoom('104', 'trong'),
        makeRoom('105', 'dang_sua'),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.occupancy.total).toBe(5);
      expect(result.occupancy.occupied).toBe(2);
      expect(result.occupancy.vacant).toBe(2);
    });

    it('returns zero counts when there are no rooms', async () => {
      prisma.room.findMany.mockResolvedValue([]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.occupancy).toEqual({ total: 0, occupied: 0, vacant: 0 });
    });

    it('counts only da_thue rooms as occupied', async () => {
      prisma.room.findMany.mockResolvedValue([
        makeRoom('101', 'da_thue'),
        makeRoom('102', 'dang_sua'),
        makeRoom('103', 'cho_thue'),
      ]);

      const result = await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(result.occupancy.occupied).toBe(1);
      expect(result.occupancy.vacant).toBe(0);
    });
  });

  // ── date range forwarding ─────────────────────────────────────────────────

  describe('getFinancialSummary — date range forwarding', () => {
    beforeEach(() => {
      prisma.property.findUnique.mockResolvedValue({ landlordId });
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.room.findMany.mockResolvedValue([]);
    });

    it('passes fromDate and toDate as Date objects to the invoice query', async () => {
      await service.getFinancialSummary(landlordId, propertyId, '2024-01-01', '2024-03-31');

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paidAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-03-31'),
            },
          }),
        }),
      );
    });

    it('includes landlordId, propertyId, and status filters in the invoice query', async () => {
      await service.getFinancialSummary(landlordId, propertyId, from, to);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            landlordId,
            room: { propertyId },
            status: 'da_thanh_toan',
          }),
        }),
      );
    });
  });
});
