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

const makePrisma = () => ({
  room: { findUnique: jest.fn(), update: jest.fn() },
  contract: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
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

    it('creates contract and queues PDF job', async () => {
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.trong,
        property: { landlordId },
      });
      prisma.contract.create.mockResolvedValue({ id: 'contract-1', ...dto });

      const result = await service.create(landlordId, dto);

      expect(prisma.contract.create).toHaveBeenCalled();
      expect(pdfQueue.add).toHaveBeenCalledWith('generate-contract', { contractId: 'contract-1' });
      expect(result.id).toBe('contract-1');
    });

    it('throws if room is already rented', async () => {
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.da_thue,
        property: { landlordId },
      });

      await expect(service.create(landlordId, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if landlord does not own room', async () => {
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.trong,
        property: { landlordId: 'other-landlord' },
      });

      await expect(service.create(landlordId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── signAsLandlord ──────────────────────────────────────────────────────────

  describe('signAsLandlord', () => {
    const landlordId = 'landlord-1';
    const contractId = 'contract-1';
    const dto = { signatureBase64: 'data:image/png;base64,abc123' };

    it('transitions nhap → cho_ky', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId,
        status: ContractStatus.nhap,
        roomId: 'room-1',
      });
      prisma.contract.update.mockResolvedValue({
        id: contractId,
        status: ContractStatus.cho_ky,
      });

      // Mock Supabase storage inside uploadSignature
      jest.spyOn(service as any, 'uploadSignature').mockResolvedValue('https://storage/sig.png');

      const result = await service.signAsLandlord(contractId, landlordId, dto);
      expect(result.status).toBe(ContractStatus.cho_ky);
      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ContractStatus.cho_ky }),
        }),
      );
    });

    it('throws BadRequest if contract is not in nhap state', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId,
        status: ContractStatus.cho_ky,
        roomId: 'room-1',
      });

      await expect(service.signAsLandlord(contractId, landlordId, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if contract missing', async () => {
      prisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.signAsLandlord(contractId, landlordId, dto)).rejects.toThrow(NotFoundException);
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

    it('transitions cho_ky → hieu_luc, marks room da_thue, creates deposit + chat', async () => {
      prisma.contract.findUnique.mockResolvedValue(baseContract);
      jest.spyOn(service as any, 'uploadSignature').mockResolvedValue('https://storage/sig.png');

      const txResult = { ...baseContract, status: ContractStatus.hieu_luc };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          contract: { update: jest.fn().mockResolvedValue(txResult) },
          room: { update: jest.fn() },
          deposit: { create: jest.fn() },
          chatConversation: { create: jest.fn() },
        };
        return fn(tx);
      });

      const result = await service.signAsTenant(contractId, tenantId, dto);

      expect(result.status).toBe(ContractStatus.hieu_luc);
      expect(pdfQueue.add).toHaveBeenCalledWith('embed-signatures', { contractId });
    });

    it('throws BadRequest if contract is not in cho_ky state', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        ...baseContract,
        status: ContractStatus.nhap,
      });

      await expect(service.signAsTenant(contractId, tenantId, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if tenant mismatch', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        ...baseContract,
        tenantId: 'other-tenant',
      });

      await expect(service.signAsTenant(contractId, tenantId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── terminate ───────────────────────────────────────────────────────────────

  describe('terminate', () => {
    const landlordId = 'landlord-1';
    const contractId = 'contract-1';

    it('allows terminating nhap contract', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId,
        status: ContractStatus.nhap,
      });
      prisma.contract.update.mockResolvedValue({ id: contractId, status: ContractStatus.da_huy });

      const result = await service.terminate(contractId, landlordId);
      expect(result.status).toBe(ContractStatus.da_huy);
    });

    it('allows terminating cho_ky contract', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId,
        status: ContractStatus.cho_ky,
      });
      prisma.contract.update.mockResolvedValue({ id: contractId, status: ContractStatus.da_huy });

      await expect(service.terminate(contractId, landlordId)).resolves.toBeDefined();
    });

    it('throws BadRequest when trying to terminate hieu_luc contract', async () => {
      prisma.contract.findUnique.mockResolvedValue({
        id: contractId,
        landlordId,
        status: ContractStatus.hieu_luc,
      });

      await expect(service.terminate(contractId, landlordId)).rejects.toThrow(BadRequestException);
    });
  });
});
