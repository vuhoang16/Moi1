import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ContractStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('pdf') private readonly pdfQueue: Queue,
  ) {}

  async create(landlordId: string, dto: CreateContractDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: { property: { select: { landlordId: true } } },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.property.landlordId !== landlordId) throw new ForbiddenException();
    if (room.status === RoomStatus.da_thue) {
      throw new BadRequestException('Phòng đang có hợp đồng hiệu lực');
    }

    const contract = await this.prisma.contract.create({
      data: {
        roomId: dto.roomId,
        landlordId,
        tenantId: dto.tenantId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        monthlyRent: dto.monthlyRent,
        depositAmount: dto.depositAmount,
        paymentDueDay: dto.paymentDueDay,
        electricityStartReading: dto.electricityStartReading,
        waterStartReading: dto.waterStartReading,
        terms: dto.terms,
      },
      include: {
        tenant: { select: { fullName: true, phone: true, email: true } },
        room: { include: { property: true } },
      },
    });

    await this.pdfQueue.add('generate-contract', { contractId: contract.id });

    return contract;
  }

  async findAll(userId: string, role: string) {
    const where =
      role === 'chu_nha'
        ? { landlordId: userId }
        : { tenantId: userId };

    return this.prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { roomNumber: true, property: { select: { name: true } } } },
        tenant: { select: { fullName: true, phone: true } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        room: { include: { property: true } },
        landlord: { select: { fullName: true, phone: true, email: true } },
        tenant: { select: { fullName: true, phone: true, email: true } },
        deposit: true,
      },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    if (contract.landlordId !== userId && contract.tenantId !== userId) {
      throw new ForbiddenException();
    }
    return contract;
  }

  async signAsLandlord(contractId: string, landlordId: string, dto: SignContractDto) {
    const contract = await this.assertLandlord(contractId, landlordId);
    if (contract.status !== ContractStatus.nhap) {
      throw new BadRequestException('Hợp đồng không ở trạng thái có thể ký');
    }

    const signatureUrl = await this.uploadSignature(dto.signatureBase64, `landlord-${contractId}`);

    return this.prisma.contract.update({
      where: { id: contractId },
      data: {
        landlordSignatureUrl: signatureUrl,
        landlordSignedAt: new Date(),
        status: ContractStatus.cho_ky,
      },
    });
  }

  async signAsTenant(contractId: string, tenantId: string, dto: SignContractDto) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException();
    if (contract.tenantId !== tenantId) throw new ForbiddenException();
    if (contract.status !== ContractStatus.cho_ky) {
      throw new BadRequestException('Chủ nhà chưa ký hợp đồng');
    }

    const signatureUrl = await this.uploadSignature(dto.signatureBase64, `tenant-${contractId}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const c = await tx.contract.update({
        where: { id: contractId },
        data: {
          tenantSignatureUrl: signatureUrl,
          tenantSignedAt: new Date(),
          status: ContractStatus.hieu_luc,
        },
      });

      await tx.room.update({
        where: { id: c.roomId },
        data: { status: RoomStatus.da_thue, currentContractId: c.id },
      });

      await tx.deposit.create({
        data: {
          contractId: c.id,
          tenantId: c.tenantId,
          landlordId: c.landlordId,
          amount: c.depositAmount,
        },
      });

      await tx.chatConversation.create({
        data: {
          contractId: c.id,
          landlordId: c.landlordId,
          tenantId: c.tenantId,
        },
      });

      return c;
    });

    await this.pdfQueue.add('embed-signatures', { contractId });

    return updated;
  }

  async terminate(contractId: string, landlordId: string) {
    const contract = await this.assertLandlord(contractId, landlordId);
    if (!['nhap', 'cho_ky'].includes(contract.status)) {
      throw new BadRequestException('Chỉ có thể huỷ hợp đồng chưa hiệu lực');
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.da_huy },
    });
  }

  private async assertLandlord(contractId: string, landlordId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    if (contract.landlordId !== landlordId) throw new ForbiddenException();
    return contract;
  }

  private async uploadSignature(base64: string, name: string): Promise<string> {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
    const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const path = `signatures/${name}.png`;
    const { error } = await supabase.storage
      .from(process.env.STORAGE_BUCKET_CONTRACTS!)
      .upload(path, buffer, { contentType: 'image/png', upsert: true });
    if (error) throw new BadRequestException('Lỗi lưu chữ ký: ' + error.message);

    const { data } = supabase.storage
      .from(process.env.STORAGE_BUCKET_CONTRACTS!)
      .getPublicUrl(path);
    return data.publicUrl;
  }
}
