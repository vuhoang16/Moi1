import { Test } from '@nestjs/testing';
import { ChecklistsService } from './checklists.service';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChecklistPhase } from '@prisma/client';

const makePrisma = () => ({
  contract: { findUnique: jest.fn() },
  checklist: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

describe('ChecklistsService', () => {
  let service: ChecklistsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [
        ChecklistsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ChecklistsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const landlordId = 'landlord-1';
    const dto = {
      contractId: 'contract-1',
      phase: ChecklistPhase.ban_giao,
      notes: 'Tình trạng tốt',
      records: [
        { name: 'Điều hòa', category: 'Thiết bị điện', quantity: 1, conditionOnCheckin: 'Tốt', photoUrls: ['https://example.com/photo1.jpg'] },
      ],
    };

    const baseContract = { id: 'contract-1', landlordId, tenantId: 'tenant-1', roomId: 'room-1' };

    it('creates checklist with records', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.checklist.findUnique.mockResolvedValue(null);
      const created = { id: 'checklist-1', contractId: 'contract-1', records: [] };
      prisma.checklist.create.mockResolvedValue(created);

      const result = await service.create(landlordId, dto);

      expect(prisma.checklist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ contractId: 'contract-1', phase: ChecklistPhase.ban_giao }),
          include: { records: true },
        }),
      );
      expect(result).toBe(created);
    });

    it('defaults quantity to 1 and photoUrls to [] when not provided', async () => {
      const dtoMinimal = { contractId: 'contract-1', phase: ChecklistPhase.ban_giao, records: [{ name: 'Bàn', category: 'Nội thất' }] };
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.checklist.findUnique.mockResolvedValue(null);
      prisma.checklist.create.mockResolvedValue({ id: 'cl-2', records: [] });

      await service.create(landlordId, dtoMinimal);

      expect(prisma.checklist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            records: { create: [expect.objectContaining({ quantity: 1, photoUrls: [] })] },
          }),
        }),
      );
    });

    it('throws NotFoundException when contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.create(landlordId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own contract', async () => {
      prisma.contract.findUnique.mockResolvedValue({ ...baseContract, landlordId: 'other-landlord' });

      await expect(service.create(landlordId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when checklist for that phase already exists', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.checklist.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(landlordId, dto)).rejects.toThrow(ConflictException);
    });

    it('looks up existing checklist by contractId_phase composite key', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.checklist.findUnique.mockResolvedValue(null);
      prisma.checklist.create.mockResolvedValue({ id: 'cl-1', records: [] });

      await service.create(landlordId, dto);

      expect(prisma.checklist.findUnique).toHaveBeenCalledWith({
        where: { contractId_phase: { contractId: 'contract-1', phase: ChecklistPhase.ban_giao } },
      });
    });
  });

  // ── findByContract ────────────────────────────────────────────────────────

  describe('findByContract', () => {
    const contractId = 'contract-1';
    const baseContract = { id: contractId, landlordId: 'landlord-1', tenantId: 'tenant-1' };

    it('returns checklists for landlord', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      const checklists = [{ id: 'cl-1', records: [] }];
      prisma.checklist.findMany.mockResolvedValue(checklists);

      const result = await service.findByContract(contractId, 'landlord-1');

      expect(prisma.checklist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { contractId }, include: { records: true } }),
      );
      expect(result).toBe(checklists);
    });

    it('returns checklists for tenant', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.checklist.findMany.mockResolvedValue([]);

      await expect(service.findByContract(contractId, 'tenant-1')).resolves.toBeDefined();
    });

    it('throws NotFoundException when contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.findByContract(contractId, 'landlord-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is neither landlord nor tenant', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);

      await expect(service.findByContract(contractId, 'intruder')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── confirmByTenant ───────────────────────────────────────────────────────

  describe('confirmByTenant', () => {
    const tenantId = 'tenant-1';
    const checklistId = 'checklist-1';
    const dto = { notes: 'Đồng ý' };
    const baseChecklist = { id: checklistId, confirmedByTenantAt: null, contract: { tenantId } };

    it('confirms checklist and sets confirmedByTenantAt', async () => {
      prisma.checklist.findUnique.mockResolvedValue(baseChecklist);
      const updated = { id: checklistId, confirmedByTenantAt: new Date() };
      prisma.checklist.update.mockResolvedValue(updated);

      const result = await service.confirmByTenant(checklistId, tenantId, dto);

      expect(prisma.checklist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confirmedByTenantAt: expect.any(Date), notes: dto.notes }),
        }),
      );
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when checklist does not exist', async () => {
      prisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.confirmByTenant(checklistId, tenantId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when tenant does not own contract', async () => {
      prisma.checklist.findUnique.mockResolvedValue({ ...baseChecklist, contract: { tenantId: 'other' } });

      await expect(service.confirmByTenant(checklistId, tenantId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when already confirmed', async () => {
      prisma.checklist.findUnique.mockResolvedValue({ ...baseChecklist, confirmedByTenantAt: new Date() });

      await expect(service.confirmByTenant(checklistId, tenantId, dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── confirmByLandlord ─────────────────────────────────────────────────────

  describe('confirmByLandlord', () => {
    const landlordId = 'landlord-1';
    const checklistId = 'checklist-1';
    const baseChecklist = {
      id: checklistId,
      confirmedByTenantAt: new Date('2026-04-10T09:00:00Z'),
      contract: { landlordId, tenantId: 'tenant-1' },
    };

    it('confirms checklist and sets confirmedByLandlordAt', async () => {
      prisma.checklist.findUnique.mockResolvedValue(baseChecklist);
      const updated = { id: checklistId, confirmedByLandlordAt: new Date() };
      prisma.checklist.update.mockResolvedValue(updated);

      const result = await service.confirmByLandlord(checklistId, landlordId);

      expect(prisma.checklist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confirmedByLandlordAt: expect.any(Date) }),
        }),
      );
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when checklist does not exist', async () => {
      prisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.confirmByLandlord(checklistId, landlordId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own contract', async () => {
      prisma.checklist.findUnique.mockResolvedValue({
        ...baseChecklist,
        contract: { landlordId: 'other-landlord', tenantId: 'tenant-1' },
      });

      await expect(service.confirmByLandlord(checklistId, landlordId)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when tenant has not confirmed yet', async () => {
      prisma.checklist.findUnique.mockResolvedValue({ ...baseChecklist, confirmedByTenantAt: null });

      await expect(service.confirmByLandlord(checklistId, landlordId)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with correct Vietnamese message', async () => {
      prisma.checklist.findUnique.mockResolvedValue({ ...baseChecklist, confirmedByTenantAt: null });

      await expect(service.confirmByLandlord(checklistId, landlordId)).rejects.toThrow('Người thuê chưa xác nhận');
    });
  });
});
