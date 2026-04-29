import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../common/prisma/prisma.service';
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
      update: jest.fn(),
    },
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

  describe('create', () => {
    it('should create a room if property belongs to landlord', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ landlordId: 'landlord1' });
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

      await expect(service.create('landlord1', { propertyId: 'prop1', roomNumber: '101', baseRent: 5000 } as any)).rejects.toThrow('Forbidden');
    });
  });

});
