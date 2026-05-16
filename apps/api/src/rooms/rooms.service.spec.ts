import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: PrismaService;

  const mockPrisma = {
    property: {
      findUnique: jest.fn(),
    },
    room: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
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
    it('should create a room if property belongs to landlord', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
      mockPrisma.room.findUnique.mockResolvedValue(null); // no duplicate
      const dto = { roomNumber: '101', floor: 1, baseRent: 5000000, area: 25 };
      mockPrisma.room.create.mockResolvedValue({ id: 'room1', ...dto });

      const result = await service.create('landlord1', { ...dto, propertyId: 'prop1' });

      expect(prisma.room.create).toHaveBeenCalledWith({
        data: { ...dto, propertyId: 'prop1', amenities: [], imageUrls: [] },
      });
      expect(result.id).toBe('room1');
    });

    it('should throw ForbiddenException if landlord does not own property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord2' });

      await expect(service.create('landlord1', { propertyId: 'prop1', roomNumber: '101', baseRent: 5000 } as any)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.create('landlord1', { propertyId: 'prop1', roomNumber: '101', baseRent: 5000 } as any)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when room number already exists in the property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
      mockPrisma.room.findUnique.mockResolvedValue({ id: 'existing-room' });

      await expect(service.create('landlord1', { propertyId: 'prop1', roomNumber: '101', baseRent: 5000 } as any)).rejects.toThrow(ConflictException);
    });

    it('defaults amenities and imageUrls to empty arrays when not provided', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
      mockPrisma.room.findUnique.mockResolvedValue(null);
      mockPrisma.room.create.mockResolvedValue({ id: 'room1' });

      await service.create('landlord1', { propertyId: 'prop1', roomNumber: '101', baseRent: 5000 } as any);

      const call = mockPrisma.room.create.mock.calls[0][0] as any;
      expect(call.data.amenities).toEqual([]);
      expect(call.data.imageUrls).toEqual([]);
    });
  });

  // ── findByProperty ────────────────────────────────────────────────────────

  describe('findByProperty', () => {
    beforeEach(() => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
    });

    it('returns paginated rooms for the property', async () => {
      mockPrisma.$transaction.mockResolvedValue([[{ id: 'room1' }], 1]);

      const result = await service.findByProperty('prop1', 'landlord1', {});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('returns pagination metadata', async () => {
      const result = await service.findByProperty('prop1', 'landlord1', { page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('throws ForbiddenException when landlord does not own the property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'other-landlord' });

      await expect(service.findByProperty('prop1', 'landlord1', {})).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.findByProperty('prop1', 'landlord1', {})).rejects.toThrow(NotFoundException);
    });

    it('applies status filter when provided', async () => {
      mockPrisma.$transaction.mockImplementation(async (ops: any[]) =>
        Promise.all(ops.map((op) => op)),
      );
      mockPrisma.room.findMany.mockResolvedValue([]);
      mockPrisma.room.count.mockResolvedValue(0);

      await service.findByProperty('prop1', 'landlord1', { status: RoomStatus.da_thue });

      const transactionCall = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionCall).toBeDefined();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    const room = {
      id: 'room1',
      property: { landlordId: 'landlord1', name: 'Building A', electricityRate: 3500, waterRate: 15000 },
      contracts: [],
    };

    it('returns the room when landlord owns the property', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(room);

      const result = await service.findOne('room1', 'landlord1');

      expect(result).toBe(room);
    });

    it('throws NotFoundException when room does not exist', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.findOne('room-999', 'landlord1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own the property', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        ...room,
        property: { ...room.property, landlordId: 'other-landlord' },
      });

      await expect(service.findOne('room1', 'landlord1')).rejects.toThrow(ForbiddenException);
    });

    it('queries room with property and active contracts', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(room);

      await service.findOne('room1', 'landlord1');

      const call = mockPrisma.room.findUnique.mock.calls[0][0] as any;
      expect(call.include.property).toBeDefined();
      expect(call.include.contracts).toBeDefined();
    });
  });

  // ── findOneForTenant ──────────────────────────────────────────────────────

  describe('findOneForTenant', () => {
    it('returns room when tenant has an active contract for it', async () => {
      const room = {
        id: 'room1',
        property: { name: 'Building A', address: '123 St', electricityRate: 3500, waterRate: 15000 },
        contracts: [{ id: 'contract-1' }],
      };
      mockPrisma.room.findUnique.mockResolvedValue(room);

      const result = await service.findOneForTenant('room1', 'tenant1');

      expect(result).toBe(room);
    });

    it('throws NotFoundException when room does not exist', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.findOneForTenant('room-999', 'tenant1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when tenant has no active contract for the room', async () => {
      const room = {
        id: 'room1',
        property: { name: 'Building A', address: '123 St', electricityRate: 3500, waterRate: 15000 },
        contracts: [],
      };
      mockPrisma.room.findUnique.mockResolvedValue(room);

      await expect(service.findOneForTenant('room1', 'tenant1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    const roomWithProperty = {
      id: 'room1',
      status: RoomStatus.trong,
      property: { landlordId: 'landlord1' },
    };

    it('updates the room when landlord owns the property', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(roomWithProperty);
      mockPrisma.room.update.mockResolvedValue({ id: 'room1', baseRent: 6_000_000 });

      const result = await service.update('room1', 'landlord1', { baseRent: 6_000_000 });

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room1' },
        data: { baseRent: 6_000_000 },
      });
      expect(result.baseRent).toBe(6_000_000);
    });

    it('throws NotFoundException when room does not exist', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.update('room-999', 'landlord1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own the room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        ...roomWithProperty,
        property: { landlordId: 'other-landlord' },
      });

      await expect(service.update('room1', 'landlord1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    const roomWithProperty = {
      id: 'room1',
      status: RoomStatus.trong,
      property: { landlordId: 'landlord1' },
    };

    it('deletes the room when it is vacant', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(roomWithProperty);
      mockPrisma.room.delete.mockResolvedValue({ id: 'room1' });

      const result = await service.remove('room1', 'landlord1');

      expect(prisma.room.delete).toHaveBeenCalledWith({ where: { id: 'room1' } });
      expect(result.id).toBe('room1');
    });

    it('throws ConflictException when room is currently rented (da_thue)', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        ...roomWithProperty,
        status: RoomStatus.da_thue,
      });

      await expect(service.remove('room1', 'landlord1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when room does not exist', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.remove('room-999', 'landlord1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own the room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        ...roomWithProperty,
        property: { landlordId: 'other-landlord' },
      });

      await expect(service.remove('room1', 'landlord1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getCalendar ───────────────────────────────────────────────────────────

  describe('getCalendar', () => {
    beforeEach(() => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
      mockPrisma.room.findMany.mockResolvedValue([]);
    });

    it('returns rooms with contract occupancy data for the month', async () => {
      const rooms = [{ id: 'room1', roomNumber: '101', status: RoomStatus.trong, contracts: [] }];
      mockPrisma.room.findMany.mockResolvedValue(rooms);

      const result = await service.getCalendar('prop1', 'landlord1', '2026-05');

      expect(result).toBe(rooms);
    });

    it('throws ForbiddenException when landlord does not own property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'other-landlord' });

      await expect(service.getCalendar('prop1', 'landlord1', '2026-05')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.getCalendar('prop1', 'landlord1', '2026-05')).rejects.toThrow(NotFoundException);
    });

    it('filters rooms by the given propertyId', async () => {
      await service.getCalendar('prop1', 'landlord1', '2026-05');

      const call = mockPrisma.room.findMany.mock.calls[0][0] as any;
      expect(call.where.propertyId).toBe('prop1');
    });

    it('orders rooms by roomNumber asc', async () => {
      await service.getCalendar('prop1', 'landlord1', '2026-05');

      const call = mockPrisma.room.findMany.mock.calls[0][0] as any;
      expect(call.orderBy).toEqual({ roomNumber: 'asc' });
    });

    it('constructs correct start/end dates for the requested month', async () => {
      await service.getCalendar('prop1', 'landlord1', '2026-05');

      const call = mockPrisma.room.findMany.mock.calls[0][0] as any;
      const contractWhere = call.select.contracts.where;
      // May 2026: start = May 1, end = May 31
      expect(contractWhere.endDate.gte).toEqual(new Date(2026, 4, 1));
      expect(contractWhere.startDate.lte).toEqual(new Date(2026, 5, 0)); // last day of May
    });
  });
});
