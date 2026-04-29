import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateRoomDto) {
    return this.rooms.create(user.id, dto);
  }

  @Get('by-property/:propertyId')
  findByProperty(
    @CurrentUser() user: any,
    @Param('propertyId') propertyId: string,
    @Query() query: QueryRoomDto,
  ) {
    return this.rooms.findByProperty(propertyId, user.id, query);
  }

  @Get('calendar/:propertyId')
  getCalendar(
    @CurrentUser() user: any,
    @Param('propertyId') propertyId: string,
    @Query('month') month: string,
  ) {
    return this.rooms.getCalendar(propertyId, user.id, month);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rooms.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.rooms.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rooms.remove(id, user.id);
  }
}
