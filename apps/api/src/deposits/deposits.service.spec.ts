import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DepositStatus } from '@prisma/client';
import { DepositsService, UpdateDepositDto } from './deposits.service';
import { PrismaService } from '../common/prisma/prisma.service';

const makePrisma = () => ({
  deposit: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

describe('DepositsService', () => {
  let service: DepositsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<DepositsService>(DepositsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findByContract ────────────────────────────────────────────────────────

  describe('findByContract', () => {
    const contractId = 'contract-1';
    const landlordId = 'user-landlord';
    const tenantId = 'user-tenant';
    const deposit = {
      id: 'dep-1',
      contractId,
      contract: { landlordId, tenantId },
    };

    it('returns the deposit for the landlord', async () => {
      prisma.deposit.findUnique.mockResolvedValue(deposit);

      const result = await service.findByContract(contractId, landlordId);

      expect(result).toEqual(deposit);
      expect(prisma.deposit.findUnique).toHaveBeenCalledWith({
        where: { contractId },
        include: { contract: { select: { landlordId: true, tenantId: true } } },
      });
    });

    it('returns the deposit for the tenant', async () => {
      prisma.deposit.findUnique.mockResolvedValue(deposit);

      const result = await service.findByContract(contractId, tenantId);

      expect(result).toEqual(deposit);
    });

    it('throws NotFoundException when deposit does not exist', async () => {
      prisma.deposit.findUnique.mockResolvedValue(null);

      await expect(service.findByContract(contractId, landlordId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for an unrelated user', async () => {
      prisma.deposit.findUnique.mockResolvedValue(deposit);

      await expect(service.findByContract(contractId, 'stranger')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update — guard checks ─────────────────────────────────────────────────

  describe('update — guard checks', () => {
    const contractId = 'contract-1';
    const landlordId = 'user-landlord';
    const dto: UpdateDepositDto = { action: 'collect' };

    it('throws NotFoundException when deposit does not exist', async () => {
      prisma.deposit.findUnique.mockResolvedValue(null);

      await expect(service.update(contractId, landlordId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is not the landlord', async () => {
      prisma.deposit.findUnique.mockResolvedValue({
        id: 'dep-1',
        contractId,
        status: DepositStatus.dang_giu,
        contract: { landlordId: 'other-landlord' },
      });

      await expect(service.update(contractId, landlordId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update — collect ──────────────────────────────────────────────────────

  describe('update — collect', () => {
    const contractId = 'contract-1';
    const landlordId = 'user-landlord';
    const depositDangGiu = {
      id: 'dep-1',
      contractId,
      status: DepositStatus.dang_giu,
      contract: { landlordId },
    };

    it('sets collectedAt to a Date and passes method/transactionId/notes', async () => {
      prisma.deposit.findUnique.mockResolvedValue(depositDangGiu);
      const updated = { ...depositDangGiu, collectedAt: new Date() };
      prisma.deposit.update.mockResolvedValue(updated);

      const dto: UpdateDepositDto = {
        action: 'collect',
        method: 'bank_transfer',
        transactionId: 'txn-abc',
        notes: 'Collected on time',
      };

      const result = await service.update(contractId, landlordId, dto);

      expect(prisma.deposit.update).toHaveBeenCalledWith({
        where: { contractId },
        data: expect.objectContaining({
          collectedAt: expect.any(Date),
          collectionMethod: 'bank_transfer',
          collectionTransactionId: 'txn-abc',
          notes: 'Collected on time',
        }),
      });
      expect(result).toEqual(updated);
    });

    it('throws BadRequestException when deposit status is NOT dang_giu', async () => {
      prisma.deposit.findUnique.mockResolvedValue({
        ...depositDangGiu,
        status: DepositStatus.da_hoan,
      });

      await expect(service.update(contractId, landlordId, { action: 'collect' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with Vietnamese message when status is NOT dang_giu', async () => {
      prisma.deposit.findUnique.mockResolvedValue({
        ...depositDangGiu,
        status: DepositStatus.da_tru_mot_phan,
      });

      await expect(service.update(contractId, landlordId, { action: 'collect' })).rejects.toThrow('Đặt cọc đã được xử lý');
    });
  });

  // ── update — partial-deduct ───────────────────────────────────────────────

  describe('update — partial-deduct', () => {
    const contractId = 'contract-1';
    const landlordId = 'user-landlord';
    const deposit = {
      id: 'dep-1',
      contractId,
      status: DepositStatus.dang_giu,
      contract: { landlordId },
    };

    it('sets status to da_tru_mot_phan, deductedAmount, and deductionReason', async () => {
      prisma.deposit.findUnique.mockResolvedValue(deposit);
      const updated = { ...deposit, status: DepositStatus.da_tru_mot_phan };
      prisma.deposit.update.mockResolvedValue(updated);

      const dto: UpdateDepositDto = {
        action: 'partial-deduct',
        deductedAmount: 500_000,
        deductionReason: 'Hư cửa',
      };

      const result = await service.update(contractId, landlordId, dto);

      expect(prisma.deposit.update).toHaveBeenCalledWith({
        where: { contractId },
        data: {
          status: DepositStatus.da_tru_mot_phan,
          deductedAmount: 500_000,
          deductionReason: 'Hư cửa',
        },
      });
      expect(result).toEqual(updated);
    });
  });

  // ── update — refund ───────────────────────────────────────────────────────

  describe('update — refund', () => {
    const contractId = 'contract-1';
    const landlordId = 'user-landlord';
    const deposit = {
      id: 'dep-1',
      contractId,
      status: DepositStatus.dang_giu,
      contract: { landlordId },
    };

    it('sets status to da_hoan and refundedAt to a Date', async () => {
      prisma.deposit.findUnique.mockResolvedValue(deposit);
      prisma.deposit.update.mockResolvedValue({ ...deposit, status: DepositStatus.da_hoan });

      await service.update(contractId, landlordId, { action: 'refund', method: 'cash', transactionId: 'txn-1' });

      expect(prisma.deposit.update).toHaveBeenCalledWith({
        where: { contractId },
        data: expect.objectContaining({
          status: DepositStatus.da_hoan,
          refundedAt: expect.any(Date),
        }),
      });
    });

    it('passes refundMethod and refundTransactionId', async () => {
      prisma.deposit.findUnique.mockResolvedValue(deposit);
      prisma.deposit.update.mockResolvedValue({});

      await service.update(contractId, landlordId, { action: 'refund', method: 'bank_transfer', transactionId: 'txn-xyz' });

      const callData = prisma.deposit.update.mock.calls[0][0].data;
      expect(callData.refundMethod).toBe('bank_transfer');
      expect(callData.refundTransactionId).toBe('txn-xyz');
    });
  });

  // ── update — invalid action ───────────────────────────────────────────────

  describe('update — invalid action', () => {
    it('throws BadRequestException with Vietnamese message for unknown action', async () => {
      prisma.deposit.findUnique.mockResolvedValue({
        id: 'dep-1',
        contractId: 'contract-1',
        status: DepositStatus.dang_giu,
        contract: { landlordId: 'user-landlord' },
      });

      await expect(service.update('contract-1', 'user-landlord', { action: 'invalid-action' as any }))
        .rejects.toThrow('Hành động không hợp lệ');
    });
  });
});
