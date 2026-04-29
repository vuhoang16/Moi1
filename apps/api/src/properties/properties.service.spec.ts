import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: PrismaService;

  const mockPrisma = {
    property: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
  });

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
});
