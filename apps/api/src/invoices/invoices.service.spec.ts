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
  });
});
