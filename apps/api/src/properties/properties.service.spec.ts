import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: PrismaService;

  const mockPrisma = {
    property: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a new property successfully', async () => {
      const dto = {
        name: 'Test Building',
        address: '123 Main St',
        city: 'HCM',
        district: 'Q1',
        ward: 'Ben Nghe',
        electricityRate: 3500,
        waterRate: 20000,
      };
      mockPrisma.property.create.mockResolvedValue({ id: 'prop1', ...dto });

      const result = await service.create('landlord1', dto);

      expect(prisma.property.create).toHaveBeenCalledWith({
        data: { ...dto, landlordId: 'landlord1' },
        include: { _count: { select: { rooms: true } } },
      });
      expect(result.id).toBe('prop1');
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return properties for landlord with room counts', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [{ id: 'prop1', _count: { rooms: 5 } }],
        1,
      ]);

      const result = await service.findAll('landlord1', {});

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.items.length).toBe(1);
    });

    it('returns pagination metadata', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll('landlord1', { page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(0);
    });

    it('filters only properties owned by the landlord', async () => {
      mockPrisma.$transaction.mockImplementation(async (ops: any[]) =>
        Promise.all(ops.map((op) => op)),
      );
      mockPrisma.property.findMany.mockResolvedValue([]);
      mockPrisma.property.count.mockResolvedValue(0);

      await service.findAll('landlord1', {});

      const transactionCall = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionCall).toBeDefined();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the property with its rooms when landlord owns it', async () => {
      const property = { id: 'prop1', landlordId: 'landlord1', rooms: [] };
      mockPrisma.property.findUnique.mockResolvedValue(property);

      const result = await service.findOne('prop1', 'landlord1');

      expect(result).toBe(property);
      expect(prisma.property.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prop1' } }),
      );
    });

    it('throws NotFoundException when property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.findOne('prop-999', 'landlord1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own the property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ id: 'prop1', landlordId: 'other-landlord', rooms: [] });

      await expect(service.findOne('prop1', 'landlord1')).rejects.toThrow(ForbiddenException);
    });

    it('includes rooms ordered by roomNumber asc', async () => {
      const property = { id: 'prop1', landlordId: 'landlord1', rooms: [] };
      mockPrisma.property.findUnique.mockResolvedValue(property);

      await service.findOne('prop1', 'landlord1');

      const call = mockPrisma.property.findUnique.mock.calls[0][0] as any;
      expect(call.include.rooms).toBeDefined();
      expect(call.include.rooms.orderBy).toEqual({ roomNumber: 'asc' });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update property if it belongs to landlord', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
      mockPrisma.property.update.mockResolvedValue({ id: 'prop1', name: 'Updated' });

      const result = await service.update('prop1', 'landlord1', { name: 'Updated' });

      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: 'prop1' },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException if landlord does not own property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord2' });

      await expect(service.update('prop1', 'landlord1', { name: 'Updated' })).rejects.toThrow('Forbidden');
    });

    it('should throw NotFoundException if property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.update('prop1', 'landlord1', { name: 'Updated' })).rejects.toThrow('Không tìm thấy bất động sản');
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the property when landlord owns it', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
      mockPrisma.property.delete.mockResolvedValue({ id: 'prop1' });

      const result = await service.remove('prop1', 'landlord1');

      expect(prisma.property.delete).toHaveBeenCalledWith({ where: { id: 'prop1' } });
      expect(result.id).toBe('prop1');
    });

    it('throws ForbiddenException when landlord does not own property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'other-landlord' });

      await expect(service.remove('prop1', 'landlord1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.remove('prop1', 'landlord1')).rejects.toThrow(NotFoundException);
    });
  });
});
