import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(landlordId: string, dto: CreateRoomDto) {
    await this.assertPropertyOwner(dto.propertyId, landlordId);

    const duplicate = await this.prisma.room.findUnique({
      where: { propertyId_roomNumber: { propertyId: dto.propertyId, roomNumber: dto.roomNumber } },
    });
    if (duplicate) throw new ConflictException('Số phòng đã tồn tại trong tòa nhà này');

    return this.prisma.room.create({
      data: {
        ...dto,
        amenities: dto.amenities ?? [],
        imageUrls: dto.imageUrls ?? [],
      },
    });
  }

  async findByProperty(propertyId: string, landlordId: string, query: QueryRoomDto) {
    await this.assertPropertyOwner(propertyId, landlordId);
    const { status, page = 1, limit = 50 } = query;

    const where = { propertyId, ...(status && { status }) };
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { roomNumber: 'asc' },
      }),
      this.prisma.room.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, landlordId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        property: { select: { landlordId: true, name: true, electricityRate: true, waterRate: true } },
        contracts: {
          where: { status: { in: ['hieu_luc', 'cho_ky'] } },
          take: 1,
          include: {
            tenant: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.property.landlordId !== landlordId) throw new ForbiddenException();
    return room;
  }

  async findOneForTenant(id: string, tenantId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        property: { select: { name: true, address: true, electricityRate: true, waterRate: true } },
        contracts: {
          where: { tenantId, status: 'hieu_luc' },
          take: 1,
        },
      },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    const hasAccess = room.contracts.length > 0;
    if (!hasAccess) throw new ForbiddenException();
    return room;
  }

  async update(id: string, landlordId: string, dto: UpdateRoomDto) {
    await this.assertRoomOwner(id, landlordId);
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async remove(id: string, landlordId: string) {
    const room = await this.assertRoomOwner(id, landlordId);
    if (room.status === RoomStatus.da_thue) {
      throw new ConflictException('Không thể xoá phòng đang có hợp đồng hiệu lực');
    }
    return this.prisma.room.delete({ where: { id } });
  }

  async getCalendar(propertyId: string, landlordId: string, month: string) {
    await this.assertPropertyOwner(propertyId, landlordId);

    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(year, mon - 1, 1);
    const endOfMonth = new Date(year, mon, 0);

    const rooms = await this.prisma.room.findMany({
      where: { propertyId },
      select: {
        id: true,
        roomNumber: true,
        status: true,
        contracts: {
          where: {
            status: { in: ['hieu_luc', 'cho_ky'] },
            endDate: { gte: startOfMonth },
            startDate: { lte: endOfMonth },
          },
          select: { startDate: true, endDate: true, status: true },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    return rooms;
  }

  private async assertPropertyOwner(propertyId: string, landlordId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { landlordId: true },
    });
    if (!property) throw new NotFoundException('Không tìm thấy bất động sản');
    if (property.landlordId !== landlordId) throw new ForbiddenException();
    return property;
  }

  private async assertRoomOwner(roomId: string, landlordId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { property: { select: { landlordId: true } } },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.property.landlordId !== landlordId) throw new ForbiddenException();
    return room;
  }
}
