import { Test } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

const makePrisma = () => ({
  contract: { findUnique: jest.fn() },
  invoice: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
});

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(InvoicesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create — invoice amount auto-calculation', () => {
    const landlordId = 'landlord-1';
    const baseContract = {
      id: 'contract-1',
      landlordId,
      roomId: 'room-1',
      tenantId: 'tenant-1',
      monthlyRent: 5_000_000,
      electricityStartReading: 100,
      waterStartReading: 50,
      room: {
        property: { electricityRate: 4_000, waterRate: 15_000 },
      },
    };

    const baseDto = {
      contractId: 'contract-1',
      billingMonth: '2026-04',
      dueDate: '2026-04-20',
      electricityCurrentReading: 150,
      waterCurrentReading: 70,
      otherFees: [] as any[],
    };

    beforeEach(() => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.invoice.findUnique.mockResolvedValue(null);
      prisma.invoice.create.mockImplementation((args: any) => Promise.resolve(args.data));
    });

    it('uses contract start readings when no previous invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      const result = await service.create(landlordId, baseDto);

      // electricity: (150 - 100) * 4000 = 200_000
      expect(result.electricityPrevReading).toBe(100);
      expect(result.electricityUsage).toBe(50);
      expect(result.electricityAmount).toBe(200_000);

      // water: (70 - 50) * 15000 = 300_000
      expect(result.waterPrevReading).toBe(50);
      expect(result.waterUsage).toBe(20);
      expect(result.waterAmount).toBe(300_000);

      // total: 5_000_000 + 200_000 + 300_000 = 5_500_000
      expect(result.totalAmount).toBe(5_500_000);
    });

    it('uses last invoice readings when previous invoice exists', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        electricityCurrentReading: 130,
        waterCurrentReading: 60,
      });

      const result = await service.create(landlordId, baseDto);

      // electricity: (150 - 130) * 4000 = 80_000
      expect(result.electricityPrevReading).toBe(130);
      expect(result.electricityUsage).toBe(20);
      expect(result.electricityAmount).toBe(80_000);

      // water: (70 - 60) * 15000 = 150_000
      expect(result.waterPrevReading).toBe(60);
      expect(result.waterUsage).toBe(10);
      expect(result.waterAmount).toBe(150_000);

      expect(result.totalAmount).toBe(5_000_000 + 80_000 + 150_000);
    });

    it('includes otherFees in total', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      const dto = {
        ...baseDto,
        otherFees: [
          { name: 'Phí quản lý', amount: 100_000 },
          { name: 'Phí internet', amount: 200_000 },
        ],
      };

      const result = await service.create(landlordId, dto);

      // base: 5_500_000 + 100_000 + 200_000 = 5_800_000
      expect(result.totalAmount).toBe(5_800_000);
    });

    it('throws ConflictException on duplicate billing month', async () => {
      prisma.invoice.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(landlordId, baseDto)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.create(landlordId, baseDto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own contract', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        ...baseContract,
        landlordId: 'other-landlord',
      });

      await expect(service.create(landlordId, baseDto)).rejects.toThrow(ForbiddenException);
    });

    it('persists correct fields to the database', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockResolvedValue({ id: 'inv-new' });

      await service.create(landlordId, baseDto);

      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            roomId: 'room-1',
            tenantId: 'tenant-1',
            landlordId,
            billingMonth: '2026-04',
            baseRent: 5_000_000,
          }),
        }),
      );
    });

    it('converts dueDate string to a Date object', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockResolvedValue({ id: 'inv-new' });

      await service.create(landlordId, baseDto);

      const call = prisma.invoice.create.mock.calls[0][0] as any;
      expect(call.data.dueDate).toBeInstanceOf(Date);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('filters by landlordId when role is chu_nha', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      await service.findAll('landlord-1', 'chu_nha');

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { landlordId: 'landlord-1' },
        }),
      );
    });

    it('filters by tenantId when role is not chu_nha', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', 'khach_thue');

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        }),
      );
    });

    it('orders results by createdAt desc', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      await service.findAll('landlord-1', 'chu_nha');

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('includes room and payments in the result', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      await service.findAll('landlord-1', 'chu_nha');

      const call = prisma.invoice.findMany.mock.calls[0][0] as any;
      expect(call.include.room).toBeDefined();
      expect(call.include.payments).toBeDefined();
    });

    it('returns the list of invoices', async () => {
      const invoices = [{ id: 'inv-1' }, { id: 'inv-2' }];
      prisma.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.findAll('landlord-1', 'chu_nha');

      expect(result).toBe(invoices);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    const invoice = {
      id: 'inv-1',
      landlordId: 'landlord-1',
      tenantId: 'tenant-1',
    };

    it('returns invoice when landlord requests it', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);

      const result = await service.findOne('inv-1', 'landlord-1');

      expect(result).toBe(invoice);
    });

    it('returns invoice when tenant requests it', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);

      const result = await service.findOne('inv-1', 'tenant-1');

      expect(result).toBe(invoice);
    });

    it('throws NotFoundException when invoice does not exist', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inv-999', 'landlord-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is neither landlord nor tenant', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);

      await expect(service.findOne('inv-1', 'intruder')).rejects.toThrow(ForbiddenException);
    });

    it('includes contract, room, and payments in the query', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);

      await service.findOne('inv-1', 'landlord-1');

      const call = prisma.invoice.findUnique.mock.calls[0][0] as any;
      expect(call.include.contract).toBeDefined();
      expect(call.include.room).toBeDefined();
      expect(call.include.payments).toBeDefined();
    });
  });
});
