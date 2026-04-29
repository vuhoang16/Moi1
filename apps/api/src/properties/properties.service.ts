import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(landlordId: string, dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: { ...dto, landlordId },
      include: { _count: { select: { rooms: true } } },
    });
  }

  async findAll(landlordId: string, query: QueryPropertyDto) {
    const { search, district, city, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      landlordId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(district && { district }),
      ...(city && { city }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { rooms: true } } },
      }),
      this.prisma.property.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, landlordId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: { _count: { select: { contracts: true } } },
        },
      },
    });
    if (!property) throw new NotFoundException('Không tìm thấy bất động sản');
    if (property.landlordId !== landlordId) throw new ForbiddenException();
    return property;
  }

  async update(id: string, landlordId: string, dto: UpdatePropertyDto) {
    await this.assertOwner(id, landlordId);
    return this.prisma.property.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, landlordId: string) {
    await this.assertOwner(id, landlordId);
    return this.prisma.property.delete({ where: { id } });
  }

  private async assertOwner(propertyId: string, landlordId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { landlordId: true },
    });
    if (!property) throw new NotFoundException('Không tìm thấy bất động sản');
    if (property.landlordId !== landlordId) throw new ForbiddenException();
  }
}
