import { Test } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

const makePrisma = () => ({
  contract: { findUnique: jest.fn() },
  room: { findUnique: jest.fn() },
  maintenanceTicket: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(MaintenanceService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const tenantId = 'tenant-1';
    const dto = {
      contractId: 'contract-1',
      title: 'Máy lạnh bị hỏng',
      description: 'Máy lạnh phòng 101 không lạnh',
      mediaUrls: ['https://example.com/photo.jpg'],
      priority: MaintenancePriority.cao,
    };

    const baseContract = { id: 'contract-1', tenantId, landlordId: 'landlord-1', roomId: 'room-1' };
    const baseRoom = { propertyId: 'property-1' };

    it('creates ticket with correct data', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.room.findUnique.mockResolvedValue(baseRoom);
      const ticket = { id: 'ticket-1', tenantId, landlordId: 'landlord-1' };
      prisma.maintenanceTicket.create.mockResolvedValue(ticket);

      const result = await service.create(tenantId, dto);

      expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            roomId: 'room-1',
            propertyId: 'property-1',
            tenantId,
            landlordId: 'landlord-1',
            title: dto.title,
            priority: MaintenancePriority.cao,
          }),
        }),
      );
      expect(result).toBe(ticket);
    });

    it('defaults mediaUrls to [] when not provided', async () => {
      const dtoNoMedia = { contractId: 'contract-1', title: 'Ống nước rò', description: 'Rò rỉ' };
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.room.findUnique.mockResolvedValue(baseRoom);
      prisma.maintenanceTicket.create.mockResolvedValue({ id: 'ticket-2' });

      await service.create(tenantId, dtoNoMedia);

      expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ mediaUrls: [] }) }),
      );
    });

    it('defaults priority to trung_binh when not provided', async () => {
      const dtoNoPriority = { contractId: 'contract-1', title: 'Bóng đèn hỏng', description: 'Cháy bóng' };
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.room.findUnique.mockResolvedValue(baseRoom);
      prisma.maintenanceTicket.create.mockResolvedValue({ id: 'ticket-3' });

      await service.create(tenantId, dtoNoPriority);

      expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ priority: MaintenancePriority.trung_binh }) }),
      );
    });

    it('sets initial statusHistory with cho_xu_ly', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      prisma.room.findUnique.mockResolvedValue(baseRoom);
      prisma.maintenanceTicket.create.mockResolvedValue({ id: 'ticket-4' });

      await service.create(tenantId, dto);

      expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusHistory: [expect.objectContaining({ status: MaintenanceStatus.cho_xu_ly })],
          }),
        }),
      );
    });

    it('throws NotFoundException when contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.create(tenantId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when tenant does not own contract', async () => {
      prisma.contract.findUnique.mockResolvedValue({ ...baseContract, tenantId: 'other-tenant' });

      await expect(service.create(tenantId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('queries by landlordId when role is chu_nha', async () => {
      prisma.maintenanceTicket.findMany.mockResolvedValue([]);

      await service.findAll('landlord-1', 'chu_nha');

      expect(prisma.maintenanceTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { landlordId: 'landlord-1' } }),
      );
    });

    it('queries by tenantId for non-chu_nha role', async () => {
      prisma.maintenanceTicket.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', 'nguoi_thue');

      expect(prisma.maintenanceTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
    });

    it('orders results by createdAt desc', async () => {
      prisma.maintenanceTicket.findMany.mockResolvedValue([]);

      await service.findAll('landlord-1', 'chu_nha');

      expect(prisma.maintenanceTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    const baseTicket = { id: 'ticket-1', tenantId: 'tenant-1', landlordId: 'landlord-1' };

    it('returns ticket for tenant', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(baseTicket);

      const result = await service.findOne('ticket-1', 'tenant-1');

      expect(result).toBe(baseTicket);
    });

    it('returns ticket for landlord', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(baseTicket);

      const result = await service.findOne('ticket-1', 'landlord-1');

      expect(result).toBe(baseTicket);
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ticket-999', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is neither tenant nor landlord', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(baseTicket);

      await expect(service.findOne('ticket-1', 'intruder')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    const landlordId = 'landlord-1';
    const ticketId = 'ticket-1';
    const makeBaseTicket = () => ({
      id: ticketId,
      landlordId,
      tenantId: 'tenant-1',
      statusHistory: [{ status: MaintenanceStatus.cho_xu_ly, at: '2026-04-01T08:00:00.000Z' }],
    });

    it('appends new status entry to statusHistory when dto.status is provided', async () => {
      const dto = { status: MaintenanceStatus.dang_xu_ly };
      prisma.maintenanceTicket.findUnique.mockResolvedValue(makeBaseTicket());
      prisma.maintenanceTicket.update.mockResolvedValue({ id: ticketId });

      await service.update(ticketId, landlordId, dto);

      expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusHistory: expect.arrayContaining([
              expect.objectContaining({ status: MaintenanceStatus.cho_xu_ly }),
              expect.objectContaining({ status: MaintenanceStatus.dang_xu_ly }),
            ]),
          }),
        }),
      );
    });

    it('statusHistory grows by 1 when dto.status is provided', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(makeBaseTicket());
      prisma.maintenanceTicket.update.mockResolvedValue({ id: ticketId });

      await service.update(ticketId, landlordId, { status: MaintenanceStatus.hoan_thanh });

      const callArgs = prisma.maintenanceTicket.update.mock.calls[0][0] as any;
      expect(callArgs.data.statusHistory).toHaveLength(2);
    });

    it('does not append to statusHistory when dto.status is not provided', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(makeBaseTicket());
      prisma.maintenanceTicket.update.mockResolvedValue({ id: ticketId });

      await service.update(ticketId, landlordId, { assignedWorker: 'Thợ sửa' });

      const callArgs = prisma.maintenanceTicket.update.mock.calls[0][0] as any;
      expect(callArgs.data.statusHistory).toHaveLength(1);
    });

    it('converts scheduledAt string to Date', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(makeBaseTicket());
      prisma.maintenanceTicket.update.mockResolvedValue({ id: ticketId });

      await service.update(ticketId, landlordId, { scheduledAt: '2026-05-01T09:00:00.000Z' });

      expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduledAt: new Date('2026-05-01T09:00:00.000Z') }),
        }),
      );
    });

    it('converts resolvedAt string to Date', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(makeBaseTicket());
      prisma.maintenanceTicket.update.mockResolvedValue({ id: ticketId });

      await service.update(ticketId, landlordId, { resolvedAt: '2026-05-02T15:30:00.000Z' });

      expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: new Date('2026-05-02T15:30:00.000Z') }),
        }),
      );
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(null);

      await expect(service.update(ticketId, landlordId, {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when landlord does not own ticket', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue({ ...makeBaseTicket(), landlordId: 'other' });

      await expect(service.update(ticketId, landlordId, {})).rejects.toThrow(ForbiddenException);
    });
  });

  // ── rate ──────────────────────────────────────────────────────────────────

  describe('rate', () => {
    const tenantId = 'tenant-1';
    const ticketId = 'ticket-1';
    const dto = { tenantRating: 5, tenantFeedback: 'Sửa rất nhanh và tốt' };
    const baseTicket = { id: ticketId, tenantId, landlordId: 'landlord-1' };

    it('saves rating and feedback', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(baseTicket);
      const updated = { ...baseTicket, tenantRating: 5, tenantFeedback: dto.tenantFeedback };
      prisma.maintenanceTicket.update.mockResolvedValue(updated);

      const result = await service.rate(ticketId, tenantId, dto);

      expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ticketId },
          data: expect.objectContaining({ tenantRating: 5, tenantFeedback: dto.tenantFeedback }),
        }),
      );
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue(null);

      await expect(service.rate(ticketId, tenantId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when tenant does not own ticket', async () => {
      prisma.maintenanceTicket.findUnique.mockResolvedValue({ ...baseTicket, tenantId: 'other' });

      await expect(service.rate(ticketId, tenantId, dto)).rejects.toThrow(ForbiddenException);
    });
  });
});
