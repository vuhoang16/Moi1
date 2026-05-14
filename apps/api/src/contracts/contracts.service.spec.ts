import { Test } from '@nestjs/testing';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, RoomStatus } from '@prisma/client';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://storage.supabase.co/signatures/mock.png' },
        })),
      })),
    },
  })),
}));

const makePrisma = () => ({
  room: { findUnique: jest.fn(), update: jest.fn() },
  contract: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  deposit: { create: jest.fn() },
  chatConversation: { create: jest.fn() },
  $transaction: jest.fn(),
});

const makePdfQueue = () => ({ add: jest.fn() });

describe('ContractsService — state machine', () => {
  let service: ContractsService;
  let prisma: ReturnType<typeof makePrisma>;
  let pdfQueue: ReturnType<typeof makePdfQueue>;

  beforeEach(async () => {
    prisma = makePrisma();
    pdfQueue = makePdfQueue();

    const module = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('pdf'), useValue: pdfQueue },
      ],
    }).compile();

    service = module.get(ContractsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const landlordId = 'landlord-1';
    const dto = {
      roomId: 'room-1',
      tenantId: 'tenant-1',
      startDate: '2026-05-01',
      endDate: '2027-04-30',
      monthlyRent: 5_000_000,
      depositAmount: 10_000_000,
      paymentDueDay: 5,
      electricityStartReading: 100,
      waterStartReading: 50,
      terms: 'Điều khoản hợp đồng',
    };

    it('throws NotFoundException when room does not exist', async () => {
      prisma.room.findUnique.mockResolvedValue(null);

      await expect(service.create(landlordId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if landlord does not own room', async () => {
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.trong,
        property: { landlordId: 'other-landlord' },
      });

      await expect(service.create(landlordId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if room is already rented', async () => {
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.da_thue,
        property: { landlordId },
      });

      await expect(service.create(landlordId, dto)).rejects.toThrow(BadRequestException);
    });

    it('creates contract and queues PDF generation job', async () => {
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.trong,
        property: { landlordId },
      });
      prisma.contract.create.mockResolvedValue({ id: 'contract-1', ...dto });

      const result = await service.create(landlordId, dto);

      expect(prisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roomId: dto.roomId,
            landlordId,
            tenantId: dto.tenantId,
            monthlyRent: dto.monthlyRent,
          }),
        }),
      );
      expect(pdfQueue.add).toHaveBeenCalledWith('generate-contract', { contractId: 'contract-1' });
      expect(result.id).toBe('contract-1');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('filters by landlordId for chu_nha role', async () => {
      prisma.contract.findMany.mockResolvedValue([]);

      await service.findAll('landlord-1', 'chu_nha');

      expect(prisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { landlordId: 'landlord-1' } }),
      );
    });

    it('filters by tenantId for non-chu_nha role', async () => {
      prisma.contract.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', 'nguoi_thue');

      expect(prisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    const landlordId = 'landlord-1';
    const tenantId = 'tenant-1';
    const contractId = 'contract-1';
    const baseContract = {
      id: contractId,
      landlordId,
      tenantId,
      status: ContractStatus.hieu_luc,
      room: { id: 'room-1', property: { name: 'Chung cư ABC' } },
      landlord: { fullName: 'Chủ nhà', phone: '0901000001', email: 'landlord@example.com' },
      tenant: { fullName: 'Khách thuê', phone: '0901000002', email: 'tenant@example.com' },
      deposit: null,
    };

    it('throws NotFoundException when contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.findOne(contractId, landlordId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is neither landlord nor tenant', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);

      await expect(service.findOne(contractId, 'random-user')).rejects.toThrow(ForbiddenException);
    });

    it('returns contract when accessed by landlord', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);

      const result = await service.findOne(contractId, landlordId);

      expect(result).toEqual(baseContract);
    });

    it('returns contract when accessed by tenant', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);

      const result = await service.findOne(contractId, tenantId);

      expect(result).toEqual(baseContract);
    });
  });

  // ── signAsLandlord ──────────────────────────────────────────────────────────

  describe('signAsLandlord', () => {
    const landlordId = 'landlord-1';
    const contractId = 'contract-1';
    const dto = { signatureBase64: 'data:image/png;base64,abc123' };

    it('throws NotFoundException if contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.signAsLandlord(contractId, landlordId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is not the landlord', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId: 'other-landlord',
        status: ContractStatus.nhap,
      });

      await expect(service.signAsLandlord(contractId, landlordId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if contract is not in nhap state', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId,
        status: ContractStatus.cho_ky,
      });

      await expect(service.signAsLandlord(contractId, landlordId, dto)).rejects.toThrow(BadRequestException);
    });

    it('transitions nhap → cho_ky and saves landlord signature', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId,
        status: ContractStatus.nhap,
        roomId: 'room-1',
      });
      prisma.contract.update.mockResolvedValue({ id: contractId, status: ContractStatus.cho_ky });
      jest.spyOn(service as any, 'uploadSignature').mockResolvedValue('https://storage/sig.png');

      const result = await service.signAsLandlord(contractId, landlordId, dto);

      expect(result.status).toBe(ContractStatus.cho_ky);
      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ContractStatus.cho_ky }),
        }),
      );
    });
  });

  // ── signAsTenant ────────────────────────────────────────────────────────────

  describe('signAsTenant', () => {
    const tenantId = 'tenant-1';
    const contractId = 'contract-1';
    const dto = { signatureBase64: 'data:image/png;base64,xyz789' };
    const baseContract = {
      id: contractId,
      tenantId,
      landlordId: 'landlord-1',
      roomId: 'room-1',
      depositAmount: 10_000_000,
      status: ContractStatus.cho_ky,
    };

    it('throws NotFoundException if contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.signAsTenant(contractId, tenantId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if tenant mismatch', async () => {
      prisma.contract.findUnique.mockResolvedValue({ ...baseContract, tenantId: 'other-tenant' });

      await expect(service.signAsTenant(contractId, tenantId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if contract is not in cho_ky state', async () => {
      prisma.contract.findUnique.mockResolvedValue({ ...baseContract, status: ContractStatus.nhap });

      await expect(service.signAsTenant(contractId, tenantId, dto)).rejects.toThrow(BadRequestException);
    });

    it('transitions cho_ky → hieu_luc, marks room da_thue, creates deposit + chat, queues embed-signatures', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      jest.spyOn(service as any, 'uploadSignature').mockResolvedValue('https://storage/sig.png');

      const txResult = { ...baseContract, status: ContractStatus.hieu_luc };
      const txContract = { update: jest.fn().mockResolvedValue(txResult) };
      const txRoom = { update: jest.fn().mockResolvedValue({}) };
      const txDeposit = { create: jest.fn().mockResolvedValue({}) };
      const txChat = { create: jest.fn().mockResolvedValue({}) };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { contract: txContract, room: txRoom, deposit: txDeposit, chatConversation: txChat };
        return fn(tx);
      });

      const result = await service.signAsTenant(contractId, tenantId, dto);

      expect(result.status).toBe(ContractStatus.hieu_luc);
      expect(txContract.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: ContractStatus.hieu_luc }) }),
      );
      expect(txRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: RoomStatus.da_thue }) }),
      );
      expect(txDeposit.create).toHaveBeenCalled();
      expect(txChat.create).toHaveBeenCalled();
      expect(pdfQueue.add).toHaveBeenCalledWith('embed-signatures', { contractId });
    });
  });

  // ── terminate ───────────────────────────────────────────────────────────────

  describe('terminate', () => {
    const landlordId = 'landlord-1';
    const contractId = 'contract-1';

    it('throws NotFoundException if contract does not exist', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.terminate(contractId, landlordId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is not the landlord', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId: 'other-landlord',
        status: ContractStatus.nhap,
      });

      await expect(service.terminate(contractId, landlordId)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when trying to terminate a hieu_luc contract', async () => {
      prisma.contract.findUnique.mockResolvedValue({ id: contractId, landlordId, status: ContractStatus.hieu_luc });

      await expect(service.terminate(contractId, landlordId)).rejects.toThrow(BadRequestException);
    });

    it('terminates a nhap contract successfully', async () => {
      prisma.contract.findUnique.mockResolvedValue({ id: contractId, landlordId, status: ContractStatus.nhap });
      prisma.contract.update.mockResolvedValue({ id: contractId, status: ContractStatus.da_huy });

      const result = await service.terminate(contractId, landlordId);

      expect(result.status).toBe(ContractStatus.da_huy);
    });

    it('terminates a cho_ky contract successfully', async () => {
      prisma.contract.findUnique.mockResolvedValue({ id: contractId, landlordId, status: ContractStatus.cho_ky });
      prisma.contract.update.mockResolvedValue({ id: contractId, status: ContractStatus.da_huy });

      await expect(service.terminate(contractId, landlordId)).resolves.toBeDefined();
    });
  });
});
